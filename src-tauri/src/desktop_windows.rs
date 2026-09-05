use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::os::windows::process::CommandExt;
use std::sync::Mutex;
use tauri::{App, AppHandle, Manager};

use crate::desktop_common::*;

// CREATE_NO_WINDOW: empêche l'apparition de fenêtres console lors des appels aux binaires PostgreSQL/Node
const CREATE_NO_WINDOW: u32 = 0x08000000;

// PostgreSQL portable sur Windows — géré manuellement via pg_ctl
struct WindowsPostgres {
	bin_dir: PathBuf,
	data_dir: PathBuf,
	host: String,
	port: u16,
	username: String,
	password: String,
}

impl PostgresHandle for WindowsPostgres {
	fn psql_binary(&self) -> PathBuf {
		self.bin_dir.join("psql.exe")
	}
	fn host(&self) -> &str {
		&self.host
	}
	fn port(&self) -> u16 {
		self.port
	}
	fn username(&self) -> &str {
		&self.username
	}
	fn password(&self) -> &str {
		&self.password
	}
	fn url(&self, database: &str) -> String {
		format!(
			"postgresql://{}:{}@{}:{}/{}",
			self.username, self.password, self.host, self.port, database
		)
	}
	fn stop(&self) -> DesktopResult<()> {
		let _ = Command::new(self.bin_dir.join("pg_ctl.exe"))
			.creation_flags(CREATE_NO_WINDOW)
			.arg("stop")
			.arg("-D")
			.arg(&self.data_dir)
			.arg("-m")
			.arg("fast")
			.arg("-w")
			.status();
		Ok(())
	}
}

struct DesktopServices {
	nitro: Mutex<Option<Child>>,
	postgres: Mutex<Option<WindowsPostgres>>,
}

pub fn start(app: &mut App) -> DesktopResult<()> {
	let mut resource_dir = app.path().resource_dir()?;
	// En mode --no-bundle, resource_dir peut pointer vers le dossier de l'exe
	// Vérifier que le runtime existe, sinon utiliser le dossier de l'exe
	if !resource_dir.join("runtime").join("app").join("runtime-version").exists() {
		if let Ok(exe_path) = std::env::current_exe() {
			if let Some(exe_dir) = exe_path.parent() {
				if exe_dir.join("runtime").join("app").join("runtime-version").exists() {
					resource_dir = exe_dir.to_path_buf();
				}
			}
		}
	}
	let data_dir = app.path().app_data_dir()?;
	let config_dir = app.path().app_config_dir()?;
	fs::create_dir_all(&data_dir)?;
	fs::create_dir_all(&config_dir)?;

	let handle = app.handle().clone();
	let resource_dir = resource_dir.clone();
	let data_dir_for_init = data_dir.clone();
	let data_dir_for_mcp = data_dir.clone();
	let config_dir = config_dir.clone();
	std::thread::spawn(move || {
		let result = init_backend(&resource_dir, &data_dir_for_init, &config_dir);
		match result {
			Ok((nitro, postgres, nitro_port, config)) => {
				write_mcp_config(&data_dir_for_mcp, nitro_port, &config.admin_api_token);
				show_main_window(&handle, nitro_port);
				// Le frontend appelle close_splashscreen quand le DOM est pret
				handle.manage(DesktopServices {
					nitro: Mutex::new(Some(nitro)),
					postgres: Mutex::new(Some(postgres)),
				});
			}
			Err(error) => {
				eprintln!("Desktop init error: {error}");
				let _ = fs::write(data_dir_for_mcp.join("desktop-error.log"), format!("Desktop init error: {error}\n"));
			}
		}
	});
	Ok(())
}

fn init_backend(
	resource_dir: &Path,
	data_dir: &Path,
	config_dir: &Path,
) -> DesktopResult<(Child, WindowsPostgres, u16, DesktopConfig)> {
	app_log(data_dir, &format!("init_backend started — resource_dir: {}, data_dir: {}, config_dir: {}", resource_dir.display(), data_dir.display(), config_dir.display()));
	cleanup_orphan_processes(data_dir);
	let runtime_app = resource_dir.join("runtime/app");
	app_log(data_dir, &format!("runtime/app exists: {}, runtime-version exists: {}", runtime_app.exists(), runtime_app.join("runtime-version").exists()));
	sync_runtime(&runtime_app, data_dir)?;
	app_log(data_dir, "sync_runtime done");
	let config = load_config(config_dir)?;
	app_log(data_dir, "config loaded");
	let postgres = start_postgres(data_dir, &config)?;
	save_postgres_pid(data_dir);
	app_log(data_dir, "postgres started");
	if let Err(error) = apply_migrations(&postgres, data_dir) {
		app_log(data_dir, &format!("migration error: {error}"));
		let _ = postgres.stop();
		return Err(error);
	}
	app_log(data_dir, "migrations done");
	if let Err(error) = ensure_admin_user(&postgres, &config, data_dir) {
		app_log(data_dir, &format!("admin error: {error}"));
		let _ = postgres.stop();
		return Err(error);
	}
	app_log(data_dir, "admin user done");
	let nitro_port = find_available_port(3003)?;
	app_log(data_dir, &format!("nitro port: {nitro_port}"));
	let mut nitro = match start_nitro(resource_dir, data_dir, &config, &postgres, nitro_port) {
		Ok(nitro) => nitro,
		Err(error) => {
			app_log(data_dir, &format!("nitro start error: {error}"));
			let _ = postgres.stop();
			return Err(error);
		}
	};
	let nitro_pid = nitro.id();
	save_nitro_pid(data_dir, nitro_pid);
	if let Err(error) = wait_for_nitro(&mut nitro, nitro_port) {
		let _ = nitro.kill();
		let _ = nitro.wait();
		let _ = postgres.stop();
		return Err(error);
	}
	Ok((nitro, postgres, nitro_port, config))
}

pub fn stop(app: &AppHandle) {
	let data_dir = app.path().app_data_dir().unwrap_or_default();
	app_log(&data_dir, "stop() called");
	let Some(services) = app.try_state::<DesktopServices>() else {
		app_log(&data_dir, "stop() no services");
		return;
	};
	if let Some(mut child) = services
		.nitro
		.lock()
		.ok()
		.and_then(|mut nitro| nitro.take())
	{
		stop_nitro_process(&mut child, &data_dir);
	}
	if let Some(pg) = services
		.postgres
		.lock()
		.ok()
		.and_then(|mut postgres| postgres.take())
	{
		app_log(&data_dir, "stopping postgres");
		let _ = pg.stop();
		app_log(&data_dir, "postgres stopped");
	}
	cleanup_postmaster_pid(&data_dir);
	// Supprimer le fichier des PID (arrêt propre)
	clear_pid_file(&data_dir);
}

fn sync_runtime(source_dir: &Path, data_dir: &Path) -> DesktopResult<()> {
	let source_version = fs::read_to_string(source_dir.join("runtime-version"))?;
	let version_path = data_dir.join("runtime-version");
	if fs::read_to_string(&version_path).ok().as_deref() == Some(source_version.as_str())
		&& data_dir.join(".output/server/index.mjs").exists()
	{
		return Ok(());
	}
	for name in [
		".output",
		"scripts",
		"pnltracker-tools",
		"prisma",
		"prisma-engine",
		"generated",
	] {
		let target = data_dir.join(name);
		if target.exists() {
			fs::remove_dir_all(&target)?;
		}
		copy_dir(&source_dir.join(name), &target)?;
	}
	// Copier les binaires PostgreSQL sans écraser les données (postgres/data)
	let pg_install_source = source_dir.join("postgres").join("install");
	let pg_install_target = data_dir.join("postgres").join("install");
	if pg_install_target.exists() {
		fs::remove_dir_all(&pg_install_target)?;
	}
	copy_dir(&pg_install_source, &pg_install_target)?;
	fs::copy(
		source_dir.join("server-start.mjs"),
		data_dir.join("server-start.mjs"),
	)?;
	fs::write(version_path, source_version)?;
	Ok(())
}

fn start_postgres(data_dir: &Path, config: &DesktopConfig) -> DesktopResult<WindowsPostgres> {
	let postgres_dir = data_dir.join("postgres");
	let install_dir = postgres_dir.join("install");
	let data_dir_pg = postgres_dir.join("data");

	// Le binaire PostgreSQL est embarqué dans le runtime
	let bin_dir = install_dir.join("bin");

	// Nettoyer un postmaster.pid stale
	let postmaster_pid = data_dir_pg.join("postmaster.pid");
	if postmaster_pid.exists() {
		let _ = fs::remove_file(&postmaster_pid);
	}

	let pg = WindowsPostgres {
		bin_dir: bin_dir.clone(),
		data_dir: data_dir_pg.clone(),
		host: "127.0.0.1".to_string(),
		port: find_available_port(5432)?,
		username: "postgres".to_string(),
		password: config.postgres_password.clone(),
	};

	// Initialiser la base si pas déjà fait
	if !data_dir_pg.exists() || !data_dir_pg.join("PG_VERSION").exists() {
		fs::create_dir_all(&data_dir_pg)?;
		let status = Command::new(bin_dir.join("initdb.exe"))
			.creation_flags(CREATE_NO_WINDOW)
			.arg("-D")
			.arg(&data_dir_pg)
			.arg("-U")
			.arg(&pg.username)
			.arg("--auth=trust")
			.stdout(Stdio::inherit())
			.stderr(Stdio::inherit())
			.status()?;
		if !status.success() {
			return Err(std::io::Error::other("initdb failed").into());
		}
	}

	// Configurer le mot de passe
	let conf_path = data_dir_pg.join("postgresql.conf");
	let mut conf = fs::read_to_string(&conf_path)?;
	if !conf.contains("listen_addresses") {
		conf.push_str("\nlisten_addresses = '127.0.0.1'\n");
	}
	if !conf.contains(&format!("port = {}", pg.port)) {
		conf.push_str(&format!("\nport = {}\n", pg.port));
	}
	fs::write(&conf_path, conf)?;

	// Démarrer PostgreSQL avec pg_ctl
	let status = Command::new(bin_dir.join("pg_ctl.exe"))
		.creation_flags(CREATE_NO_WINDOW)
		.arg("start")
		.arg("-D")
		.arg(&data_dir_pg)
		.arg("-l")
		.arg(postgres_dir.join("pg.log"))
		.arg("-w")
		.arg("-t")
		.arg("30")
		.stdout(Stdio::inherit())
		.stderr(Stdio::inherit())
		.status()?;
	if !status.success() {
		return Err(std::io::Error::other("pg_ctl start failed").into());
	}

	// Définir le mot de passe
	let _ = Command::new(bin_dir.join("psql.exe"))
		.creation_flags(CREATE_NO_WINDOW)
		.arg("-h")
		.arg(&pg.host)
		.arg("-p")
		.arg(pg.port.to_string())
		.arg("-U")
		.arg(&pg.username)
		.arg("-d")
		.arg("postgres")
		.arg("-c")
		.arg(format!("ALTER USER postgres PASSWORD '{}';", pg.password))
		.env("PGPASSWORD", &pg.password)
		.output();

	// Créer la base pnltracker si elle n'existe pas
	let check = Command::new(bin_dir.join("psql.exe"))
		.creation_flags(CREATE_NO_WINDOW)
		.arg("-h")
		.arg(&pg.host)
		.arg("-p")
		.arg(pg.port.to_string())
		.arg("-U")
		.arg(&pg.username)
		.arg("-d")
		.arg("postgres")
		.arg("-t")
		.arg("-A")
		.arg("-c")
		.arg("SELECT 1 FROM pg_database WHERE datname='pnltracker';")
		.env("PGPASSWORD", &pg.password)
		.output()?;
	if String::from_utf8_lossy(&check.stdout).trim() == "1" {
		return Ok(pg);
	}
	let status = Command::new(bin_dir.join("createdb.exe"))
		.creation_flags(CREATE_NO_WINDOW)
		.arg("-h")
		.arg(&pg.host)
		.arg("-p")
		.arg(pg.port.to_string())
		.arg("-U")
		.arg(&pg.username)
		.arg("pnltracker")
		.env("PGPASSWORD", &pg.password)
		.status()?;
	if !status.success() {
		return Err(std::io::Error::other("createdb failed").into());
	}

	Ok(pg)
}

fn start_nitro(
	resource_dir: &Path,
	data_dir: &Path,
	config: &DesktopConfig,
	pg: &WindowsPostgres,
	port: u16,
) -> DesktopResult<Child> {
	let database_url = pg.url("pnltracker");
	let node_path = resource_dir.join("runtime/node/bin/node.exe");
	let engine_path = data_dir
		.join("prisma-engine")
		.join("query_engine-windows.dll.node");

	let env_content = format!(
		"# Généré automatiquement par PnlTracker Desktop - ne pas modifier\n\
		 NODE_ENV=production\n\
		 PNLTRACKER_DESKTOP=true\n\
		 HOST=127.0.0.1\n\
		 PORT={port}\n\
		 NITRO_HOST=127.0.0.1\n\
		 NITRO_PORT={port}\n\
		 NUXT_PUBLIC_PLUGINS_ENABLED=true\n\
		 NUXT_PUBLIC_SHOW_LOG_VIEW=false\n\
		 NUXT_PUBLIC_DEBUG_MODE=false\n\
		 NUXT_PUBLIC_ENABLE_API_LOGGER=false\n"
	);
	fs::write(data_dir.join(".env"), env_content)?;

	let nitro_log = fs::File::create(data_dir.join("nitro.log"))?;
	let nitro_log_err = fs::File::create(data_dir.join("nitro-err.log"))?;
	Ok(Command::new(node_path)
		.creation_flags(CREATE_NO_WINDOW)
		.arg("server-start.mjs")
		.current_dir(data_dir)
		.env("POSTGRES_USER", &pg.username)
		.env("POSTGRES_URL_AUTH", format!("{database_url}?schema=public"))
		.env("POSTGRES_URL_TEMPLATE", database_url)
		.env("JWT_SECRET", &config.jwt_secret)
		.env("ADMIN_API_TOKEN", &config.admin_api_token)
		.env("PRISMA_QUERY_ENGINE_LIBRARY", engine_path)
		.stdout(Stdio::from(nitro_log))
		.stderr(Stdio::from(nitro_log_err))
		.spawn()?)
}
