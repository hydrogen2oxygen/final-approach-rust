use actix_cors::Cors;
use actix_web::http::header;
use actix_web::{delete, get, post, web, App, HttpResponse, HttpServer, Responder};
use log::{error, info, warn};
use mime_guess::from_path;
use rust_embed::RustEmbed;
use serde_json::Value;
use std::env;
use std::path::PathBuf;

struct AppState {
    data_dir: PathBuf,
}

#[derive(RustEmbed)]
#[folder = "./ui/dist/ui/browser/"]
struct Asset;

/**
* Add here the datapaths you allow to use, in order to not go where nobody should go
*/
fn allowed_data_path(path: &str) -> Option<&'static str> {
    match path {
        "mapDesigns" => Some("mapDesigns"), // all map designs, polygons
        "territories" => Some("territories"), // all territory to assignee and registry relations
        "congregation" => Some("congregation"), // settings, assignees, notes and so on
        _ => None,
    }
}

/**
* allow only letters, numbers, _, -, and maybe UUID-like strings
*/
fn is_safe_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 80
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

#[get("/{filename:.*}")]
async fn serve_file(path: web::Path<String>) -> impl Responder {

    let filename = path.into_inner();
    let path = if filename.is_empty() {
        "index.html"
    } else {
        filename.as_str()
    };

    match Asset::get(path) {
        Some(content) => {
            let mime = from_path(path).first_or_octet_stream();
            HttpResponse::Ok()
                .content_type(mime)
                .body(content.data.into_owned())
        }
        None => match Asset::get("index.html") {
            Some(index) => HttpResponse::Ok()
                .content_type("text/html")
                .body(index.data.into_owned()),
            None => HttpResponse::NotFound().finish(),
        },
    }
}

#[get("/api/ping")]
async fn ping() -> impl Responder {
    HttpResponse::Ok().body("pong")
}

#[post("/api/data/{path}/{id}")]
async fn save(
    request_path: web::Path<(String,String)>,
    body: String,
    state: web::Data<AppState>,
) -> impl Responder {

    let (path, id) = request_path.into_inner();
    info!("Received data: {}", body);

    let safe_path = match allowed_data_path(&path) {
        Some(p) => p,
        None => return HttpResponse::BadRequest().body("Invalid path"),
    };

    if !is_safe_id(&id) {
        return HttpResponse::BadRequest().body("Invalid id");
    }

    match serde_json::from_str::<serde_json::Value>(&body) {
        Ok(j) => j,
        Err(e) => {
            error!("Ungültiges JSON: {}", e);
            return HttpResponse::BadRequest().body("Ungültiges JSON");
        }
    };

    let directory = state.data_dir.join(safe_path);
    if let Err(e) = std::fs::create_dir_all(&directory) {
        error!("Fehler beim Erstellen des Verzeichnisses: {}", e);
        return HttpResponse::InternalServerError()
            .body("Fehler beim Erstellen des Verzeichnisses");
    }
    if let Err(e) = std::fs::write(directory.join(format!("{}.json", id)), body) {
        error!("Fehler beim Schreiben der Datei: {}", e);
        return HttpResponse::InternalServerError().body("Fehler beim Schreiben der Datei");
    }
    info!("Daten gespeichert unter {}", safe_path);

    HttpResponse::Ok().json(serde_json::json!({"status":"ok"}))
}

#[get("/api/data/{path}")]
async fn load_all(request_path: web::Path<String>, state: web::Data<AppState>) -> impl Responder {
    let path = request_path.into_inner();

    let safe_path = match allowed_data_path(&path) {
        Some(p) => p,
        None => return HttpResponse::BadRequest().body("Invalid path"),
    };

    let path = state.data_dir.join(safe_path);
    let mut data: Vec<Value> = Vec::new();

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if entry.path().is_file()
                    && entry.path().extension().and_then(|s| s.to_str()) == Some("json")
                {
                    if let Ok(content) = std::fs::read_to_string(entry.path()) {
                        if let Ok(json) = serde_json::from_str::<Value>(&content) {
                            data.push(json);
                        }
                    }
                }
            }
        }
    }

    HttpResponse::Ok().json(data)
}

#[delete("/api/data/{path}/{id}")]
async fn delete(
    request_path: web::Path<(String,String)>,
    state: web::Data<AppState>,
) -> impl Responder {
    let (path, id) = request_path.into_inner();

    let safe_path = match allowed_data_path(&path) {
        Some(p) => p,
        None => return HttpResponse::BadRequest().body("Invalid path"),
    };

    if !is_safe_id(&id) {
        return HttpResponse::BadRequest().body("Invalid id");
    }

    let path = state.data_dir.join(safe_path).join(format!("{}.json", id));

    if std::fs::remove_file(&path).is_ok() {
        info!("{} deleted", path.display());
        HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))
    } else {
        warn!("{} not found!", path.display());
        HttpResponse::NotFound().json(serde_json::json!({"status": "not found"}))
    }
}


#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Init logger ASAP
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let port = env::args().nth(1).unwrap_or_else(|| "8080".to_string());
    let bind_addr = format!("127.0.0.1:{}", port);

    let executable_dir = env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|parent| parent.to_path_buf()))
        .unwrap_or(env::current_dir()?);
    let data_dir = executable_dir.join("data");

    for directory in ["mapDesigns", "territories", "congregation"] {
        std::fs::create_dir_all(data_dir.join(directory))?;
    }

    info!("Starting server ... http:\\\\{}", bind_addr);
    info!("Using data directory: {}", data_dir.display());

    let state = web::Data::new(AppState { data_dir });

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(
                Cors::default()
                    .allow_any_origin() // * — no origin restrictions
                    .allow_any_method() // GET, POST, PUT, DELETE, etc.
                    .allow_any_header() // allow custom headers
                    .expose_headers([header::CONTENT_DISPOSITION]) // optional
                    .max_age(3600), // cache preflight for 1h
            )
            .service(ping)
            .service(save)
            .service(load_all)
            .service(delete)
            .service(serve_file) // http server, before ws
    })
    .bind(bind_addr)?
    .run()
    .await
}
