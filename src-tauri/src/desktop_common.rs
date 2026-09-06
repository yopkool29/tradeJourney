use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fs;
use std::io::Write;
use std::net::{TcpListener, TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::thread::sleep;
use std::time::{Duration, Instant};
use tauri::Manager;

pub type DesktopResult<T> = Result<T, Box<dyn Error>>;

// Log générique qui append dans app.log dans le data dir
pub fn app_log(data_dir: &Path, msg: &str) {
	if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(data_dir.join("app.log")) {
		let _ = writeln!(f, "{}", msg);
	}
}

// Log de debug — seulement si PNLTRACKER_DEBUG=1 ou fichier .debug présent dans le data dir
pub fn debug_log(data_dir: &Path, msg: &str) {
	let debug_enabled = std::env::var("PNLTRACKER_DEBUG").as_deref() == Ok("1")
		|| data_dir.join(".debug").exists();
	if debug_enabled {
		app_log(data_dir, &format!("[DEBUG] {msg}"));
	}
}

#[derive(Deserialize, Serialize)]
pub struct DesktopConfig {
	pub jwt_secret: String,
	pub admin_api_token: String,
	pub postgres_password: String,
}

// Abstraction des opérations PostgreSQL communes entre Linux (postgresql_embedded)
// et Windows (binaires portables). Chaque plateforme implémente ce trait.
pub trait PostgresHandle {
	fn psql_binary(&self) -> PathBuf;
	fn host(&self) -> &str;
	fn port(&self) -> u16;
	fn username(&self) -> &str;
	fn password(&self) -> &str;
	fn url(&self, database: &str) -> String;
	fn stop(&self) -> DesktopResult<()>;
}

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// Construit une commande psql avec les arguments communs.
// Sur Windows, empêche l'apparition de fenêtres console.
pub fn psql_command(pg: &dyn PostgresHandle, database: &str) -> Command {
	let mut command = Command::new(pg.psql_binary());
	#[cfg(windows)]
	{
		use std::os::windows::process::CommandExt;
		command.creation_flags(CREATE_NO_WINDOW);
	}
	command
		.arg("-v")
		.arg("ON_ERROR_STOP=1")
		.arg("-h")
		.arg(pg.host())
		.arg("-p")
		.arg(pg.port().to_string())
		.arg("-U")
		.arg(pg.username())
		.arg("-d")
		.arg(database)
		.env("PGPASSWORD", pg.password());
	command
}

pub fn run_psql(pg: &dyn PostgresHandle, database: &str, sql: &str) -> DesktopResult<()> {
	let mut child = psql_command(pg, database)
		.stdin(Stdio::piped())
		.spawn()?;
	child
		.stdin
		.take()
		.ok_or_else(|| std::io::Error::other("Unable to open psql stdin"))?
		.write_all(sql.as_bytes())?;
	let status = child.wait()?;
	if !status.success() {
		return Err(std::io::Error::other(format!("psql failed with {status}")).into());
	}
	Ok(())
}

pub fn run_psql_query(pg: &dyn PostgresHandle, database: &str, sql: &str) -> DesktopResult<String> {
	let output = psql_command(pg, database)
		.args(["-t", "-A", "-c", sql])
		.output()?;
	if !output.status.success() {
		return Err(std::io::Error::other(String::from_utf8_lossy(&output.stderr)).into());
	}
	Ok(String::from_utf8(output.stdout)?.trim().to_string())
}

pub fn run_psql_file(pg: &dyn PostgresHandle, database: &str, path: &Path) -> DesktopResult<()> {
	let status = psql_command(pg, database)
		.arg("-f")
		.arg(path)
		.status()?;
	if !status.success() {
		return Err(std::io::Error::other(format!("psql failed with {status}")).into());
	}
	Ok(())
}

pub fn apply_migrations(pg: &dyn PostgresHandle, data_dir: &Path) -> DesktopResult<()> {
	debug_log(data_dir, "apply_migrations: creating _desktop_migrations table");
	run_psql(
		pg,
		"pnltracker",
		"CREATE TABLE IF NOT EXISTS public.\"_desktop_migrations\" (\"name\" TEXT PRIMARY KEY, \"applied_at\" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);",
	)?;
	let migrations_dir = data_dir.join("prisma/auth/migrations");
	debug_log(data_dir, &format!("apply_migrations: migrations_dir={}", migrations_dir.display()));
	let mut migrations = fs::read_dir(&migrations_dir)?
		.filter_map(Result::ok)
		.filter(|entry| entry.file_type().is_ok_and(|file_type| file_type.is_dir()))
		.collect::<Vec<_>>();
	migrations.sort_by_key(|entry| entry.file_name());
	debug_log(data_dir, &format!("apply_migrations: {} migrations found", migrations.len()));
	for migration in migrations {
		let name = migration.file_name().to_string_lossy().to_string();
		let escaped_name = name.replace('\\', "\\\\").replace('\'', "''");
		let query = format!(
			"SELECT 1 FROM public.\"_desktop_migrations\" WHERE \"name\" = '{escaped_name}' LIMIT 1;"
		);
		if run_psql_query(pg, "pnltracker", &query)? == "1" {
			debug_log(data_dir, &format!("apply_migrations: skipping {name} (already applied)"));
			continue;
		}
		debug_log(data_dir, &format!("apply_migrations: applying {name}"));
		let sql = fs::read_to_string(migration.path().join("migration.sql"))?;
		let batch = format!(
			"BEGIN;\n{sql}\nINSERT INTO public.\"_desktop_migrations\" (\"name\") VALUES ('{escaped_name}');\nCOMMIT;\n"
		);
		run_psql(pg, "pnltracker", &batch)?;
		debug_log(data_dir, &format!("apply_migrations: {name} applied"));
	}
	debug_log(data_dir, "apply_migrations: running init-db.sql");
	run_psql_file(pg, "pnltracker", &data_dir.join("scripts/init-db.sql"))
}

// Creates the default admin user (admin@mail.fr / admin) if no user exists yet.
// Mirrors scripts/docker-create-user.ts used by the Docker deployment.
pub fn ensure_admin_user(pg: &dyn PostgresHandle, config: &DesktopConfig, data_dir: &Path) -> DesktopResult<()> {
	let count = run_psql_query(
		pg,
		"pnltracker",
		"SELECT COUNT(*) FROM \"User\";",
	)?;
	debug_log(data_dir, &format!("ensure_admin_user: user count={count}"));
	if count != "0" {
		debug_log(data_dir, "ensure_admin_user: users already exist, skipping");
		return Ok(());
	}
	// bcrypt hash of "admin" with cost 10, compatible with bcryptjs
	let hash = "$2b$10$tOQ19N.5RLZzPqjje35o2.1cqSGcBtxBVXysJhd1VtXAV8Bf7PUya";
	let token = config.admin_api_token.replace('\'', "''");
	let settings = serde_json::json!({
		"language": "fr",
		"timezone": "Europe/Paris",
		"dateFormat": "dd/MM/yyyy",
		"currency": "EUR"
	})
	.to_string()
	.replace('\'', "''");
	let sql = format!(
		"INSERT INTO \"User\" (\"email\", \"password\", \"token\", \"settings\", \"createdAt\", \"updatedAt\") \
		 VALUES ('admin@mail.fr', '{hash}', '{token}', '{settings}', NOW(), NOW());"
	);
	run_psql(pg, "pnltracker", &sql)?;
	println!("Admin user created (admin@mail.fr / admin)");
	Ok(())
}

pub fn copy_dir(source: &Path, target: &Path) -> DesktopResult<()> {
	fs::create_dir_all(target)?;
	for entry in fs::read_dir(source)? {
		let entry = entry?;
		let source_path = entry.path();
		let target_path = target.join(entry.file_name());
		if entry.file_type()?.is_dir() {
			copy_dir(&source_path, &target_path)?;
		} else {
			fs::copy(source_path, target_path)?;
		}
	}
	Ok(())
}

pub fn load_config(config_dir: &Path) -> DesktopResult<DesktopConfig> {
	let config_path = config_dir.join("desktop.json");
	if config_path.exists() {
		return Ok(serde_json::from_slice(&fs::read(config_path)?)?);
	}
	let config = DesktopConfig {
		jwt_secret: random_secret(64)?,
		admin_api_token: random_secret(64)?,
		postgres_password: random_secret(48)?,
	};
	let content = serde_json::to_vec_pretty(&config)?;
	fs::write(&config_path, content)?;
	#[cfg(unix)]
	{
		use std::os::unix::fs::PermissionsExt;
		fs::set_permissions(&config_path, fs::Permissions::from_mode(0o600))?;
	}
	Ok(config)
}

pub fn random_secret(byte_count: usize) -> DesktopResult<String> {
	let mut bytes = vec![0_u8; byte_count];
	getrandom::fill(&mut bytes)
		.map_err(|error| std::io::Error::other(format!("Unable to generate a secret: {error}")))?;
	Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

pub fn find_available_port(start: u16) -> DesktopResult<u16> {
	for port in start..=(start + 100) {
		if TcpListener::bind(("127.0.0.1", port)).is_ok() {
			return Ok(port);
		}
	}
	Err(std::io::Error::other(format!(
		"No available port found between {start} and {}",
		start + 100
	))
	.into())
}

pub fn wait_for_nitro(child: &mut Child, port: u16) -> DesktopResult<()> {
	let address = format!("127.0.0.1:{port}")
		.to_socket_addrs()?
		.next()
		.ok_or_else(|| std::io::Error::other("Unable to resolve Nitro address"))?;
	let started_at = Instant::now();
	while started_at.elapsed() < Duration::from_secs(30) {
		if let Some(status) = child.try_wait()? {
			return Err(std::io::Error::other(format!("Nitro exited with {status}")).into());
		}
		if TcpStream::connect_timeout(&address, Duration::from_millis(200)).is_ok() {
			return Ok(());
		}
		sleep(Duration::from_millis(100));
	}
	Err(std::io::Error::other("Nitro did not start within 30 seconds").into())
}

// Écrit le port et le token Nitro pour le MCP dans le data dir
pub fn write_mcp_config(data_dir: &Path, port: u16, token: &str) {
	let _ = fs::write(data_dir.join("mcp-port"), port.to_string());
	let _ = fs::write(data_dir.join("mcp-token"), token);
}

// Navigue la fenêtre principale vers Nitro et ferme le splashscreen après un délai
pub fn show_main_window(handle: &tauri::AppHandle, nitro_port: u16) {
	if let Some(main_window) = handle.get_webview_window("main") {
		let url: tauri::Url = format!("http://127.0.0.1:{nitro_port}")
			.parse()
			.unwrap_or_else(|_| "http://127.0.0.1:3003".parse().unwrap());
		let _ = main_window.navigate(url);
		let _ = main_window.show();
		let _ = main_window.set_focus();
	}
}

// Ferme le splashscreen après un délai pour laisser le temps à la fenêtre principale de charger
pub fn close_splashscreen_delayed(handle: &tauri::AppHandle, delay_ms: u64) {
	std::thread::sleep(std::time::Duration::from_millis(delay_ms));
	if let Some(splash) = handle.get_webview_window("splashscreen") {
		let _ = splash.close();
	}
}

// Nettoie le postmaster.pid stale laissé par un arrêt brutal
pub fn cleanup_postmaster_pid(data_dir: &Path) {
	let pid_file = data_dir.join("postgres/data/postmaster.pid");
	if pid_file.exists() {
		let _ = fs::remove_file(&pid_file);
	}
}

// Arrête proprement le process Nitro et tout son arbre de subprocess.
// 1. SIGTERM (Linux) / taskkill sans /F (Windows) pour un shutdown gracieux
// 2. Attend jusqu'à 5 secondes
// 3. SIGKILL (Linux) / taskkill /T /F (Windows) si encore vivant
pub fn stop_nitro_process(child: &mut Child, data_dir: &Path) {
	let pid = child.id();
	app_log(data_dir, &format!("stop_nitro_process pid={pid}"));

	#[cfg(unix)]
	{
		// SIGTERM sur le groupe de process (PID négatif = tuer le groupe)
		let pgid = pid as i32;
		debug_log(data_dir, &format!("stop_nitro: sending SIGTERM to process group -{pgid}"));
		let _ = unsafe { libc::kill(-pgid, libc::SIGTERM) };
		// Attendre jusqu'à 5s un arrêt propre
		for _ in 0..50 {
			if child.try_wait().ok().flatten().is_some() {
				app_log(data_dir, "nitro stopped gracefully (SIGTERM)");
				return;
			}
			std::thread::sleep(std::time::Duration::from_millis(100));
		}
		// Force kill le groupe entier
		app_log(data_dir, "nitro force killing process group (SIGKILL)");
		let _ = unsafe { libc::kill(-pgid, libc::SIGKILL) };
	}

	#[cfg(windows)]
	{
		use std::os::windows::process::CommandExt;
		const CREATE_NO_WINDOW: u32 = 0x08000000;
		// taskkill /T tue l'arbre complet, sans /F pour un arrêt gracieux
		let _ = Command::new("taskkill")
			.creation_flags(CREATE_NO_WINDOW)
			.args(["/T", "/PID", &pid.to_string()])
			.status();
		// Attendre jusqu'à 5s
		for _ in 0..50 {
			if child.try_wait().ok().flatten().is_some() {
				app_log(data_dir, "nitro stopped gracefully");
				return;
			}
			std::thread::sleep(std::time::Duration::from_millis(100));
		}
		// Force kill l'arbre
		app_log(data_dir, "nitro force killing process tree");
		let _ = Command::new("taskkill")
			.creation_flags(CREATE_NO_WINDOW)
			.args(["/T", "/F", "/PID", &pid.to_string()])
			.status();
	}

	let _ = child.wait();
	app_log(data_dir, "nitro process fully stopped");
}

// --- Gestion des PID orphelins ---
// Écrit les PID des process dans un fichier pour pouvoir les tuer au prochain démarrage
// si l'app a crashé sans appeler stop().

fn pid_file_path(data_dir: &Path) -> PathBuf {
	data_dir.join("runtime-pids")
}

// Écrit le PID Nitro dans le fichier. À appeler juste après le spawn de Nitro.
pub fn save_nitro_pid(data_dir: &Path, pid: u32) {
	let existing = fs::read_to_string(pid_file_path(data_dir)).unwrap_or_default();
	let mut content = String::new();
	// Garder les lignes existantes (ex: postgres=...) et mettre à jour nitro=
	for line in existing.lines() {
		if !line.starts_with("nitro=") {
			content.push_str(line);
			content.push('\n');
		}
	}
	content.push_str(&format!("nitro={pid}\n"));
	let _ = fs::write(pid_file_path(data_dir), content);
	app_log(data_dir, &format!("saved nitro pid={pid}"));
}

// Lit le PID PostgreSQL depuis postmaster.pid et l'ajoute au fichier runtime-pids.
// À appeler après le démarrage de PostgreSQL.
pub fn save_postgres_pid(data_dir: &Path) {
	let postmaster_pid = data_dir.join("postgres/data/postmaster.pid");
	debug_log(data_dir, &format!("save_postgres_pid: reading {}", postmaster_pid.display()));
	let pid = match fs::read_to_string(&postmaster_pid) {
		Ok(content) => {
			let parsed = content.lines().next().and_then(|line| line.parse::<u32>().ok());
			debug_log(data_dir, &format!("save_postgres_pid: postmaster.pid content first line: {:?}", content.lines().next()));
			parsed
		}
		Err(e) => {
			debug_log(data_dir, &format!("save_postgres_pid: cannot read postmaster.pid: {e}"));
			None
		}
	};
	if let Some(pid) = pid {
		let existing = fs::read_to_string(pid_file_path(data_dir)).unwrap_or_default();
		let mut content = String::new();
		for line in existing.lines() {
			if !line.starts_with("postgres=") {
				content.push_str(line);
				content.push('\n');
			}
		}
		content.push_str(&format!("postgres={pid}\n"));
		let _ = fs::write(pid_file_path(data_dir), content);
		app_log(data_dir, &format!("saved postgres pid={pid}"));
	}
}

// Vérifie si un process existe encore (cross-platform)
fn process_exists(pid: u32) -> bool {
	#[cfg(unix)]
	{
		(unsafe { libc::kill(pid as i32, 0) }) == 0
	}
	#[cfg(windows)]
	{
		use std::os::windows::process::CommandExt;
		const CREATE_NO_WINDOW: u32 = 0x08000000;
		let output = Command::new("tasklist")
			.creation_flags(CREATE_NO_WINDOW)
			.args(["/FI", &format!("PID eq {pid}"), "/NH"])
			.output();
		match output {
			Ok(out) => String::from_utf8_lossy(&out.stdout).contains(&pid.to_string()),
			Err(_) => false,
		}
	}
}

// Vérifie qu'un PID correspond bien à un process Nitro de l'app (node + server-start.mjs dans le data dir)
// pour éviter de tuer un process innocent dont le PID aurait été réattribué par l'OS
fn is_nitro_process(pid: u32, data_dir: &Path) -> bool {
	#[cfg(unix)]
	{
		// Lire /proc/{pid}/cmdline pour vérifier server-start.mjs
		let cmdline_path = format!("/proc/{pid}/cmdline");
		let has_cmdline = match fs::read(&cmdline_path) {
			Ok(cmdline_bytes) => {
				let cmdline = String::from_utf8_lossy(&cmdline_bytes);
				cmdline.contains("node") && cmdline.contains("server-start.mjs")
			}
			Err(_) => false,
		};
		if !has_cmdline {
			return false;
		}
		// Vérifier que le cwd du process est bien le data dir de l'app
		let cwd_link = format!("/proc/{pid}/cwd");
		match fs::read_link(&cwd_link) {
			Ok(cwd) => cwd == data_dir,
			Err(_) => false,
		}
	}
	#[cfg(windows)]
	{
		use std::os::windows::process::CommandExt;
		const CREATE_NO_WINDOW: u32 = 0x08000000;
		// wmic récupère la ligne de commande + le chemin de l'executable
		let output = Command::new("wmic")
			.creation_flags(CREATE_NO_WINDOW)
			.args(["process", "where", &format!("ProcessId={pid}"), "get", "CommandLine", "/value"])
			.output();
		match output {
			Ok(out) => {
				let cmdline = String::from_utf8_lossy(&out.stdout);
				// Sur Windows, le current_dir n'est pas facilement accessible via wmic
				// mais la ligne de commande contient le chemin complet vers server-start.mjs
				// car current_dir est le data dir
				cmdline.contains("node") && cmdline.contains("server-start.mjs")
			}
			Err(_) => false,
		}
	}
	#[cfg(not(any(unix, windows)))]
	{
		false
	}
}

// Vérifie qu'un PID correspond bien à un process PostgreSQL de l'app (data dir spécifique)
fn is_postgres_process(pid: u32, data_dir: &Path) -> bool {
	let pg_data = data_dir.join("postgres/data");
	#[cfg(unix)]
	{
		let cmdline_path = format!("/proc/{pid}/cmdline");
		match fs::read(&cmdline_path) {
			Ok(cmdline_bytes) => {
				let cmdline = String::from_utf8_lossy(&cmdline_bytes);
				cmdline.contains("postgres") && cmdline.contains(&pg_data.to_string_lossy().to_string())
			}
			Err(_) => false,
		}
	}
	#[cfg(windows)]
	{
		use std::os::windows::process::CommandExt;
		const CREATE_NO_WINDOW: u32 = 0x08000000;
		let output = Command::new("wmic")
			.creation_flags(CREATE_NO_WINDOW)
			.args(["process", "where", &format!("ProcessId={pid}"), "get", "CommandLine", "/value"])
			.output();
		match output {
			Ok(out) => {
				let cmdline = String::from_utf8_lossy(&out.stdout);
				cmdline.contains("postgres") && cmdline.contains(&pg_data.to_string_lossy().to_string())
			}
			Err(_) => false,
		}
	}
	#[cfg(not(any(unix, windows)))]
	{
		false
	}
}

// Tue un process par PID (gracieux puis forcé)
fn kill_process(pid: u32) {
	#[cfg(unix)]
	{
		let _ = unsafe { libc::kill(pid as i32, libc::SIGTERM) };
		for _ in 0..30 {
			if !process_exists(pid) {
				return;
			}
			std::thread::sleep(std::time::Duration::from_millis(100));
		}
		let _ = unsafe { libc::kill(pid as i32, libc::SIGKILL) };
	}
	#[cfg(windows)]
	{
		use std::os::windows::process::CommandExt;
		const CREATE_NO_WINDOW: u32 = 0x08000000;
		let _ = Command::new("taskkill")
			.creation_flags(CREATE_NO_WINDOW)
			.args(["/T", "/PID", &pid.to_string()])
			.status();
		for _ in 0..30 {
			if !process_exists(pid) {
				return;
			}
			std::thread::sleep(std::time::Duration::from_millis(100));
		}
		let _ = Command::new("taskkill")
			.creation_flags(CREATE_NO_WINDOW)
			.args(["/T", "/F", "/PID", &pid.to_string()])
			.status();
	}
}

// Nettoie les process orphelins d'un démarrage précédent.
// À appeler au tout début de init_backend, avant de démarrer quoi que ce soit.
pub fn cleanup_orphan_processes(data_dir: &Path) {
	let pid_file = pid_file_path(data_dir);
	let content = match fs::read_to_string(&pid_file) {
		Ok(c) => {
			debug_log(data_dir, &format!("cleanup_orphans: runtime-pids content: {c}"));
			c
		}
		Err(_) => {
			debug_log(data_dir, "cleanup_orphans: no runtime-pids file, nothing to clean");
			return;
		}
	};
	app_log(data_dir, "found runtime-pids file, checking for orphans");
	for line in content.lines() {
		if let Some((kind, pid_str)) = line.split_once('=') {
			if let Ok(pid) = pid_str.parse::<u32>() {
				debug_log(data_dir, &format!("cleanup_orphans: checking {kind}={pid}"));
				if !process_exists(pid) {
					debug_log(data_dir, &format!("cleanup_orphans: {kind}={pid} no longer exists, skipping"));
					continue;
				}
				match kind {
					"nitro" => {
						let is_nitro = is_nitro_process(pid, data_dir);
						debug_log(data_dir, &format!("cleanup_orphans: is_nitro_process({pid})={is_nitro}"));
						if is_nitro {
							app_log(data_dir, &format!("killing orphan nitro pid={pid}"));
							kill_process(pid);
							debug_log(data_dir, &format!("cleanup_orphans: nitro pid={pid} killed"));
						} else {
							app_log(data_dir, &format!("pid={pid} exists but is not nitro (reattributed), skipping"));
						}
					}
					"postgres" => {
						let is_pg = is_postgres_process(pid, data_dir);
						debug_log(data_dir, &format!("cleanup_orphans: is_postgres_process({pid})={is_pg}"));
						if is_pg {
							app_log(data_dir, &format!("killing orphan postgres pid={pid}"));
							kill_process(pid);
							debug_log(data_dir, &format!("cleanup_orphans: postgres pid={pid} killed"));
						} else {
							app_log(data_dir, &format!("pid={pid} exists but is not postgres (reattributed), skipping"));
						}
					}
					_ => {
						debug_log(data_dir, &format!("cleanup_orphans: unknown kind '{kind}', skipping"));
					}
				}
			}
		}
	}
	// Supprimer le fichier après cleanup
	let _ = fs::remove_file(&pid_file);
	debug_log(data_dir, "cleanup_orphans: runtime-pids file removed");
}

// Supprime le fichier des PID après un arrêt propre
pub fn clear_pid_file(data_dir: &Path) {
	let _ = fs::remove_file(pid_file_path(data_dir));
}
