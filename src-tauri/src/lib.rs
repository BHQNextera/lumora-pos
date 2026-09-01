use std::path::PathBuf;

#[tauri::command]
fn export_report_file(
    filename: String,
    contents: String,
) -> Result<String, String> {
    let safe_name: String = filename
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric()
                || matches!(ch, '.' | '-' | '_')
            {
                ch
            } else {
                '_'
            }
        })
        .collect();

    if safe_name.is_empty() {
        return Err("Invalid export filename".to_string());
    }

    let home = std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .ok_or_else(|| "Could not resolve user home folder".to_string())?;

    let mut downloads = PathBuf::from(home);
    downloads.push("Downloads");

    std::fs::create_dir_all(&downloads)
        .map_err(|error| error.to_string())?;

    let requested = downloads.join(&safe_name);
    let mut target = requested.clone();

    if target.exists() {
        let stem = requested
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("lumora-report");
        let extension = requested
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("");

        for index in 1..=9999 {
            let candidate_name = if extension.is_empty() {
                format!("{}-{}", stem, index)
            } else {
                format!("{}-{}.{}", stem, index, extension)
            };

            let candidate = downloads.join(candidate_name);

            if !candidate.exists() {
                target = candidate;
                break;
            }
        }
    }

    std::fs::write(&target, contents.as_bytes())
        .map_err(|error| error.to_string())?;

    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
fn check_internet_reachability() -> bool {
    let timeout =
        std::time::Duration::from_millis(1500);

    [
        "1.1.1.1:443",
        "8.8.8.8:443",
    ]
    .iter()
    .filter_map(|endpoint| {
        endpoint
            .parse::<std::net::SocketAddr>()
            .ok()
    })
    .any(|address| {
        std::net::TcpStream::connect_timeout(
            &address,
            timeout,
        )
        .is_ok()
    })
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![export_report_file, check_internet_reachability])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
