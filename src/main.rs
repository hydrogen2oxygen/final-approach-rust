mod websocket;

use actix_cors::Cors;
use actix_web::http::header;
use actix_web::{delete, get, post, web, App, HttpResponse, HttpServer, Responder};
use log::info;
use mime_guess::from_path;
use rust_embed::RustEmbed;
use serde_json::Value;
use std::env;
use websocket::ws_index;

#[derive(RustEmbed)]
#[folder = "./ui/dist/ui/browser/"]
struct Asset;

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
async fn save(request_path: web::Path<(String,String)>, body: String) -> impl Responder {
    let (path, id) = request_path.into_inner();
    info!("Received map design: {}", body);

    match serde_json::from_str::<serde_json::Value>(&body) {
        Ok(j) => j,
        Err(e) => {
            info!("Ungültiges JSON: {}", e);
            return HttpResponse::BadRequest().body("Ungültiges JSON");
        }
    };

    let path = format!("./data/{}/{}.json", path, id);
    if let Err(e) = std::fs::create_dir_all(format!("./data/{}", path)) {
        info!("Fehler beim Erstellen des Verzeichnisses: {}", e);
        return HttpResponse::InternalServerError()
            .body("Fehler beim Erstellen des Verzeichnisses");
    }
    if let Err(e) = std::fs::write(&path, body) {
        info!("Fehler beim Schreiben der Datei: {}", e);
        return HttpResponse::InternalServerError().body("Fehler beim Schreiben der Datei");
    }
    info!("Daten gespeichert unter {}", path);

    HttpResponse::Ok().json(serde_json::json!({"status":"ok"}))
}

#[get("/api/data/{path}")]
async fn load_all(request_path: web::Path<String>) -> impl Responder {
    let path = request_path.into_inner();
    let path = format!("./data/{}", path);
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
async fn delete(request_path: web::Path<(String,String)>) -> impl Responder {
    let (path, id) = request_path.into_inner();
    let path = format!("./data/{}/{}.json", path, id);

    if std::fs::remove_file(&path).is_ok() {
        info!("data/{}/{}.json deleted", path, id);
        HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))
    } else {
        info!("data/{}/{}.json not found!", path, id);
        HttpResponse::NotFound().json(serde_json::json!({"status": "not found"}))
    }
}


#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Init logger ASAP
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let port = env::args().nth(1).unwrap_or_else(|| "8080".to_string());
    let bind_addr = format!("127.0.0.1:{}", port);

    info!("Starting server ... http:\\\\{}", bind_addr);

    HttpServer::new(|| {
        App::new()
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
            .route("/ws", web::get().to(ws_index)) // leave it on last position, else CORS error arise
    })
    .bind(bind_addr)?
    .run()
    .await
}
