use std::collections::HashMap;
use tauri::Window;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct HttpResponsePayload {
    pub status: u16,
    pub body: String,
    pub cookies: Vec<String>,
}

#[tauri::command]
fn minimize_window(window: Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn toggle_maximize_window(window: Window) {
    if let Ok(is_maximized) = window.is_maximized() {
        if is_maximized {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
fn close_window(window: Window) {
    let _ = window.close();
}

#[tauri::command]
fn drag_window(window: Window) {
    let _ = window.start_dragging();
}

#[tauri::command]
async fn ncm_http_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<HttpResponsePayload, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = match method.to_uppercase().as_str() {
        "POST" => client.post(&url),
        "GET" => client.get(&url),
        _ => return Err(format!("Unsupported method: {}", method)),
    };

    for (k, v) in headers {
        if let (Ok(name), Ok(val)) = (
            reqwest::header::HeaderName::from_bytes(k.as_bytes()),
            reqwest::header::HeaderValue::from_str(&v),
        ) {
            req = req.header(name, val);
        }
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();

    let mut cookies = Vec::new();
    for val in resp.headers().get_all(reqwest::header::SET_COOKIE) {
        if let Ok(s) = val.to_str() {
            cookies.push(s.to_string());
        }
    }

    let body_text = resp.text().await.map_err(|e| e.to_string())?;

    Ok(HttpResponsePayload {
        status,
        body: body_text,
        cookies,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            minimize_window,
            toggle_maximize_window,
            close_window,
            drag_window,
            ncm_http_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
