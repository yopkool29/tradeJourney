use postgresql_embedded::blocking::PostgreSQL;
use postgresql_embedded::Settings;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{App, AppHandle, Manager};

use crate::desktop_common::*;

struct DesktopServices {
	nitro: Mutex<Option<Child>>,
	postgres: Mutex<Option<PostgreSQL>>,
}

// Implémentation du trait PostgresHandle pour PostgreSQL (postgresql_embedded)
impl PostgresHandle for PostgreSQL {
	fn psql_binary(&self) -> PathBuf {
		self.settings().binary_dir().join("psql")
	}
	fn host(&self) -> &str {
		&self.settings().host
	}
	fn port(&self) -> u16 {
		self.settings().port
	}
	fn username(&self) -> &str {
		&self.settings().username
	}
	fn password(&self) -> &str {
		&self.settings().password
	}
	fn url(&self, database: &str) -> String {
		self.settings().url(database)
	}
	fn stop(&self) -> DesktopResult<()> {
		PostgreSQL::stop(self)?;
		Ok(())
	}
}

pub fn start(app: &mut App) -> DesktopResult<()> {
	let resource_dir = app.path().resource_dir()?;
	let data_dir = app.path().app_data_dir()?;
	let config_dir = app.path().app_config_dir()?;
	fs::create_dir_all(&data_dir)?;
	fs::create_dir_all(&config_dir)?;

	// Lancer l'init lourde dans un thread séparé
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
				close_splashscreen_delayed(&handle, 1500);
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
) -> DesktopResult<(Child, PostgreSQL, u16, DesktopConfig)> {
	app_log(data_dir, &format!("init_backend started — resource_dir: {}, data_dir: {}, config_dir: {}", resource_dir.display(), data_dir.display(), config_dir.display()));
	cleanup_orphan_processes(data_dir);
	sync_runtime(&resource_dir.join("runtime/app"), data_dir)?;
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
	let mut nitro = match start_nitro(resource_dir, data_dir, &config, postgres.settings(), nitro_port) {
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
	app_log(data_dir, "nitro ready");
	Ok((nitro, postgres, nitro_port, config))
}

pub fn stop(app: &AppHandle) {
	let data_dir = app.path().app_data_dir().unwrap_or_default();
	app_log(&data_dir, "stop() called");
	let Some(services) = app.try_state::<DesktopServices>() else {
		app_log(&data_dir, "stop() no services");
		return;
	};
	// Tuer Nitro en premier (libère le port) — arrêt propre puis force kill
	if let Some(mut child) = services
		.nitro
		.lock()
		.ok()
		.and_then(|mut nitro| nitro.take())
	{
		debug_log(&data_dir, "stop: stopping nitro");
		stop_nitro_process(&mut child, &data_dir);
		debug_log(&data_dir, "stop: nitro stopped");
	} else {
		debug_log(&data_dir, "stop: no nitro process in state");
	}
	// Arrêter PostgreSQL
	if let Some(server) = services
		.postgres
		.lock()
		.ok()
		.and_then(|mut postgres| postgres.take())
	{
		app_log(&data_dir, "stopping postgres");
		let _ = server.stop();
		app_log(&data_dir, "postgres stopped");
	} else {
		debug_log(&data_dir, "stop: no postgres process in state");
	}
	// Nettoyer le postmaster.pid au cas où
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
	] {
		let target = data_dir.join(name);
		if target.exists() {
			fs::remove_dir_all(&target)?;
		}
		copy_dir(&source_dir.join(name), &target)?;
	}
	fs::copy(
		source_dir.join("server-start.mjs"),
		data_dir.join("server-start.mjs"),
	)?;
	fs::write(version_path, source_version)?;
	Ok(())
}

fn start_postgres(data_dir: &Path, config: &DesktopConfig) -> DesktopResult<PostgreSQL> {
	let postgres_dir = data_dir.join("postgres");
	let data_dir_pg = postgres_dir.join("data");
	// Nettoyer un postmaster.pid stale laissé par un arrêt brutal
	let postmaster_pid = data_dir_pg.join("postmaster.pid");
	if postmaster_pid.exists() {
		let should_remove = match fs::read_to_string(&postmaster_pid) {
			Ok(content) => {
				// La première ligne du postmaster.pid contient le PID
				let pid = content.lines().next().and_then(|line| line.parse::<i32>().ok());
				match pid {
					Some(pid) => {
						if unsafe { libc::kill(pid, 0) } == 0 {
							// Le process existe encore — c'est un orphelin d'un crash précédent
							// Le tuer proprement puis attendre sa mort
							unsafe { libc::kill(pid, libc::SIGTERM) };
							for _ in 0..50 {
								if unsafe { libc::kill(pid, 0) } != 0 {
									break;
								}
								std::thread::sleep(std::time::Duration::from_millis(100));
							}
							// Force kill si encore vivant
							unsafe { libc::kill(pid, libc::SIGKILL) };
							std::thread::sleep(std::time::Duration::from_millis(200));
							true
						} else {
							true // Process déjà mort, on supprime
						}
					},
					None => true, // PID illisible, on supprime
				}
			},
			Err(_) => true, // Fichier illisible, on supprime
		};
		if should_remove {
			let _ = fs::remove_file(&postmaster_pid);
		}
	}
	let mut settings = Settings::default();
	// Pin PostgreSQL 16.15 pour éviter les incompatibilités de version au démarrage
	settings.version = postgresql_embedded::VersionReq::parse("16.15.0")?;
	settings.installation_dir = postgres_dir.join("install");
	settings.data_dir = data_dir_pg;
	settings.password_file = postgres_dir.join("password");
	settings.host = "127.0.0.1".to_string();
	settings.port = 0;
	settings.username = "postgres".to_string();
	settings.password = config.postgres_password.clone();
	settings.temporary = false;
	settings
		.configuration
		.insert("listen_addresses".to_string(), "127.0.0.1".to_string());
	let mut postgres = PostgreSQL::new(settings);
	debug_log(data_dir, "start_postgres: setup()");
	postgres.setup()?;
	debug_log(data_dir, "start_postgres: setup done");
	#[cfg(unix)]
	{
		use std::os::unix::fs::PermissionsExt;
		fs::set_permissions(
			&postgres.settings().password_file,
			fs::Permissions::from_mode(0o600),
		)?;
	}
	postgres.start()?;
	debug_log(data_dir, "start_postgres: started");
	if !postgres.database_exists("pnltracker")? {
		debug_log(data_dir, "start_postgres: creating database pnltracker");
		postgres.create_database("pnltracker")?;
		debug_log(data_dir, "start_postgres: database created");
	} else {
		debug_log(data_dir, "start_postgres: database already exists");
	}
	Ok(postgres)
}

fn start_nitro(
	resource_dir: &Path,
	data_dir: &Path,
	config: &DesktopConfig,
	postgres: &Settings,
	port: u16,
) -> DesktopResult<Child> {
	let database_url = postgres.url("pnltracker");
	let node_path = resource_dir.join("runtime/node/bin/node");
	let engine_path = data_dir
		.join("prisma-engine")
		.join("libquery_engine-debian-openssl-3.0.x.so.node");
	debug_log(data_dir, &format!("start_nitro: node_path={}", node_path.display()));
	debug_log(data_dir, &format!("start_nitro: engine_path={}", engine_path.display()));
	debug_log(data_dir, &format!("start_nitro: port={port}"));

	// Générer un .env dans le data dir pour la configuration non-secrète
	// Les secrets restent passés via env vars sur le processus
	// NUXT_PUBLIC_* surcharge les valeurs runtimeConfig.public au runtime
	let env_content = format!(
		"# Généré automatiquement par PnlTracker Desktop - ne pas modifier\n\
		 NODE_ENV=production\n\
		 PNLTRACKER_DESKTOP=true\n\
		 HOST=0.0.0.0\n\
		 PORT={port}\n\
		 NITRO_HOST=0.0.0.0\n\
		 NITRO_PORT={port}\n\
		 NUXT_PUBLIC_PLUGINS_ENABLED=true\n\
		 NUXT_PUBLIC_SHOW_LOG_VIEW=false\n\
		 NUXT_PUBLIC_DEBUG_MODE=false\n\
		 NUXT_PUBLIC_ENABLE_API_LOGGER=false\n"
	);
	fs::write(data_dir.join(".env"), env_content)?;

	let mut command = Command::new(node_path);
	command
		.arg("server-start.mjs")
		.current_dir(data_dir)
		.env("POSTGRES_USER", &postgres.username)
		.env("POSTGRES_URL_AUTH", format!("{database_url}?schema=public"))
		.env("POSTGRES_URL_TEMPLATE", database_url)
		.env("JWT_SECRET", &config.jwt_secret)
		.env("ADMIN_API_TOKEN", &config.admin_api_token)
		.env("PRISMA_QUERY_ENGINE_LIBRARY", engine_path)
		.stdout(Stdio::inherit())
		.stderr(Stdio::inherit());
	// Créer un groupe de process dédié pour pouvoir tuer tout l'arbre proprement
	#[cfg(unix)]
	{
		use std::os::unix::process::CommandExt;
		command.process_group(0);
	}
	Ok(command.spawn()?)
}
