use postgresql_embedded::blocking::PostgreSQL;
use postgresql_embedded::Settings;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fs;
use std::io::Write;
use std::net::{TcpListener, TcpStream, ToSocketAddrs};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread::sleep;
use std::time::{Duration, Instant};
use tauri::{App, AppHandle, Manager};

type DesktopResult<T> = Result<T, Box<dyn Error>>;

#[derive(Deserialize, Serialize)]
struct DesktopConfig {
    jwt_secret: String,
    admin_api_token: String,
    postgres_password: String,
}

struct DesktopServices {
    nitro: Mutex<Option<Child>>,
    postgres: Mutex<Option<PostgreSQL>>,
}

pub fn start(app: &mut App) -> DesktopResult<()> {
    let resource_dir = app.path().resource_dir()?;
    let data_dir = app.path().app_data_dir()?;
    let config_dir = app.path().app_config_dir()?;
    fs::create_dir_all(&data_dir)?;
    fs::create_dir_all(&config_dir)?;

    // Écrire le loading.html pour le splashscreen
    let loading_html = format!(r#"<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{{margin:0;padding:0;box-sizing:border-box}}body{{background:linear-gradient(to bottom,#1f1f1f,#16161f);color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;overflow:hidden;border-radius:12px}}.logo{{font-size:28px;font-weight:700;color:#c8a650;margin-bottom:4px;letter-spacing:-0.5px}}.version{{font-size:12px;color:#555;margin-bottom:24px}}.spinner{{width:36px;height:36px;border:3px solid rgba(200,166,80,0.15);border-top-color:#c8a650;border-radius:50%;animation:spin .7s linear infinite;margin-bottom:16px}}@keyframes spin{{to{{transform:rotate(360deg)}}}}.label{{font-size:13px;color:#666}}</style></head><body><div class="logo">PnlTracker</div><div class="version">v{}</div><div class="spinner"></div><div class="label">Chargement…</div></body></html>"#, env!("CARGO_PKG_VERSION"));
    let loading_file = data_dir.join("loading.html");
    fs::write(&loading_file, loading_html)?;
    let loading_url = tauri::Url::from_file_path(&loading_file)
        .map_err(|_| std::io::Error::other("Invalid loading.html path"))?;

    // Naviguer le splashscreen et la fenêtre principale vers loading.html
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.navigate(loading_url.clone());
    }
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.navigate(loading_url);
    }

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
                // Écrire le port et le token pour le MCP
                let _ = fs::write(data_dir_for_mcp.join("mcp-port"), nitro_port.to_string());
                let _ = fs::write(data_dir_for_mcp.join("mcp-token"), &config.admin_api_token);
                // Sur le thread principal : naviguer la fenêtre principale, l'afficher, puis fermer le splash
                if let Some(main_window) = handle.get_webview_window("main") {
                    let url: tauri::Url = format!("http://127.0.0.1:{nitro_port}").parse().unwrap_or_else(|_| "http://127.0.0.1:3003".parse().unwrap());
                    let _ = main_window.navigate(url);
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }
                // Attendre que la fenêtre principale ait le temps de charger avant de fermer le splash
                std::thread::sleep(std::time::Duration::from_millis(1500));
                if let Some(splash) = handle.get_webview_window("splashscreen") {
                    let _ = splash.close();
                }
                handle.manage(DesktopServices {
                    nitro: Mutex::new(Some(nitro)),
                    postgres: Mutex::new(Some(postgres)),
                });
            }
            Err(error) => {
                eprintln!("Desktop init error: {error}");
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
    sync_runtime(&resource_dir.join("runtime/app"), data_dir)?;
    let config = load_config(config_dir)?;
    let postgres = start_postgres(data_dir, &config)?;
    if let Err(error) = apply_migrations(&postgres, data_dir) {
        let _ = postgres.stop();
        return Err(error);
    }
    if let Err(error) = ensure_admin_user(&postgres, &config) {
        let _ = postgres.stop();
        return Err(error);
    }
    let nitro_port = find_available_port(3003)?;
    let mut nitro = match start_nitro(resource_dir, data_dir, &config, postgres.settings(), nitro_port) {
        Ok(nitro) => nitro,
        Err(error) => {
            let _ = postgres.stop();
            return Err(error);
        }
    };
    if let Err(error) = wait_for_nitro(&mut nitro, nitro_port) {
        let _ = nitro.kill();
        let _ = nitro.wait();
        let _ = postgres.stop();
        return Err(error);
    }
    Ok((nitro, postgres, nitro_port, config))
}

pub fn stop(app: &AppHandle) {
    let Some(services) = app.try_state::<DesktopServices>() else {
        return;
    };
    // Tuer Nitro en premier (libère le port)
    if let Some(mut child) = services
        .nitro
        .lock()
        .ok()
        .and_then(|mut nitro| nitro.take())
    {
        let _ = child.kill();
        let _ = child.wait();
    }
    // Arrêter PostgreSQL
    if let Some(server) = services
        .postgres
        .lock()
        .ok()
        .and_then(|mut postgres| postgres.take())
    {
        let _ = server.stop();
    }
    // Nettoyer le postmaster.pid au cas où
    if let Ok(data_dir) = app.path().app_data_dir() {
        let pid_file = data_dir.join("postgres/data/postmaster.pid");
        if pid_file.exists() {
            let _ = fs::remove_file(&pid_file);
        }
    }
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

fn copy_dir(source: &Path, target: &Path) -> DesktopResult<()> {
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

fn load_config(config_dir: &Path) -> DesktopResult<DesktopConfig> {
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

fn random_secret(byte_count: usize) -> DesktopResult<String> {
    let mut bytes = vec![0_u8; byte_count];
    getrandom::fill(&mut bytes)
        .map_err(|error| std::io::Error::other(format!("Unable to generate a secret: {error}")))?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn start_postgres(data_dir: &Path, config: &DesktopConfig) -> DesktopResult<PostgreSQL> {
    let postgres_dir = data_dir.join("postgres");
    let data_dir_pg = postgres_dir.join("data");
    // Nettoyer un postmaster.pid stale seulement si le process correspondant est mort
    let postmaster_pid = data_dir_pg.join("postmaster.pid");
    if postmaster_pid.exists() {
        let should_remove = match fs::read_to_string(&postmaster_pid) {
            Ok(content) => {
                // La première ligne du postmaster.pid contient le PID
                let pid = content.lines().next().and_then(|line| line.parse::<i32>().ok());
                match pid {
                    Some(pid) => {
                        // kill(pid, 0) renvoie 0 si le process existe, Err sinon
                        // On ne supprime le fichier que si le process est mort
                        unsafe { libc::kill(pid, 0) != 0 }
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
    postgres.setup()?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(
            &postgres.settings().password_file,
            fs::Permissions::from_mode(0o600),
        )?;
    }
    postgres.start()?;
    if !postgres.database_exists("pnltracker")? {
        postgres.create_database("pnltracker")?;
    }
    Ok(postgres)
}

fn apply_migrations(postgres: &PostgreSQL, data_dir: &Path) -> DesktopResult<()> {
    run_psql(
        postgres.settings(),
        "pnltracker",
        "CREATE TABLE IF NOT EXISTS public.\"_desktop_migrations\" (\"name\" TEXT PRIMARY KEY, \"applied_at\" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);",
    )?;
    let migrations_dir = data_dir.join("prisma/auth/migrations");
    let mut migrations = fs::read_dir(&migrations_dir)?
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|file_type| file_type.is_dir()))
        .collect::<Vec<_>>();
    migrations.sort_by_key(|entry| entry.file_name());
    for migration in migrations {
        let name = migration.file_name().to_string_lossy().to_string();
        let escaped_name = name.replace('\\', "\\\\").replace('\'', "''");
        let query = format!(
            "SELECT 1 FROM public.\"_desktop_migrations\" WHERE \"name\" = '{escaped_name}' LIMIT 1;"
        );
        if run_psql_query(postgres.settings(), "pnltracker", &query)? == "1" {
            continue;
        }
        let sql = fs::read_to_string(migration.path().join("migration.sql"))?;
        let batch = format!(
            "BEGIN;\n{sql}\nINSERT INTO public.\"_desktop_migrations\" (\"name\") VALUES ('{escaped_name}');\nCOMMIT;\n"
        );
        run_psql(postgres.settings(), "pnltracker", &batch)?;
    }
    run_psql_file(
        postgres.settings(),
        "pnltracker",
        &data_dir.join("scripts/init-db.sql"),
    )
}

// Creates the default admin user (admin@mail.fr / admin) if no user exists yet.
// Mirrors scripts/docker-create-user.ts used by the Docker deployment.
fn ensure_admin_user(postgres: &PostgreSQL, config: &DesktopConfig) -> DesktopResult<()> {
    let count = run_psql_query(
        postgres.settings(),
        "pnltracker",
        "SELECT COUNT(*) FROM \"User\";",
    )?;
    if count != "0" {
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
    run_psql(postgres.settings(), "pnltracker", &sql)?;
    println!("Admin user created (admin@mail.fr / admin)");
    Ok(())
}

fn psql_command(settings: &Settings, database: &str) -> Command {
    let mut command = Command::new(settings.binary_dir().join("psql"));
    command
        .arg("-v")
        .arg("ON_ERROR_STOP=1")
        .arg("-h")
        .arg(&settings.host)
        .arg("-p")
        .arg(settings.port.to_string())
        .arg("-U")
        .arg(&settings.username)
        .arg("-d")
        .arg(database)
        .env("PGPASSWORD", &settings.password);
    command
}

fn run_psql(settings: &Settings, database: &str, sql: &str) -> DesktopResult<()> {
    let mut child = psql_command(settings, database)
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

fn run_psql_query(settings: &Settings, database: &str, sql: &str) -> DesktopResult<String> {
    let output = psql_command(settings, database)
        .args(["-t", "-A", "-c", sql])
        .output()?;
    if !output.status.success() {
        return Err(std::io::Error::other(String::from_utf8_lossy(&output.stderr)).into());
    }
    Ok(String::from_utf8(output.stdout)?.trim().to_string())
}

fn run_psql_file(settings: &Settings, database: &str, path: &Path) -> DesktopResult<()> {
    let status = psql_command(settings, database)
        .arg("-f")
        .arg(path)
        .status()?;
    if !status.success() {
        return Err(std::io::Error::other(format!("psql failed with {status}")).into());
    }
    Ok(())
}

fn find_available_port(start: u16) -> DesktopResult<u16> {
    for port in start..=(start + 100) {
        if TcpListener::bind(("0.0.0.0", port)).is_ok() {
            return Ok(port);
        }
    }
    Err(std::io::Error::other(format!(
        "No available port found between {start} and {}",
        start + 100
    ))
    .into())
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

    Ok(Command::new(node_path)
        .arg("server-start.mjs")
        .current_dir(data_dir)
        .env("POSTGRES_USER", &postgres.username)
        .env("POSTGRES_URL_AUTH", format!("{database_url}?schema=public"))
        .env("POSTGRES_URL_TEMPLATE", database_url)
        .env("JWT_SECRET", &config.jwt_secret)
        .env("ADMIN_API_TOKEN", &config.admin_api_token)
        .env("PRISMA_QUERY_ENGINE_LIBRARY", engine_path)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()?)
}

fn wait_for_nitro(child: &mut Child, port: u16) -> DesktopResult<()> {
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
