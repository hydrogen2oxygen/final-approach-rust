mod websocket;

use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use rust_embed::RustEmbed;
use mime_guess::from_path;
use std::{env};
use actix_web::http::header;
use websocket::ws_index;
use actix_cors::Cors;
use log::info;

#[derive(RustEmbed)]
#[folder = "./ui/dist/ui/browser/"]
struct Asset;

#[get("/{filename:.*}")]
async fn serve_file(path: web::Path<String>) -> impl Responder {
    //info!("serve_file called with path: {}", path);
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

#[post("/api/data")]
async fn post_data(body: String) -> impl Responder {
    info!("Received POST data: {}", body);
    HttpResponse::Ok().body("Data received")
}

#[post("/api/mapDesign")]
async fn save_map_design(body: String) -> impl Responder {
    info!("Received map design: {}", body);

    // Versuche, das JSON zu parsen und den Namen zu extrahieren
    let json: serde_json::Value = match serde_json::from_str(&body) {
        Ok(j) => j,
        Err(e) => {
            info!("Ungültiges JSON: {}", e);
            return HttpResponse::BadRequest().body("Ungültiges JSON");
        }
    };

    let name = match json.get("territoryNumber") {
        Some(n) => n,
        None => {
            info!("Kein 'territoryNumber' Feld im JSON gefunden");
            return HttpResponse::BadRequest().body("Kein 'territoryNumber' Feld im JSON gefunden");
        }
    };

    let path = format!("./data/mapDesigns/{}.json", name);
    if let Err(e) = std::fs::create_dir_all("./data/mapDesigns") {
        info!("Fehler beim Erstellen des Verzeichnisses: {}", e);
        return HttpResponse::InternalServerError().body("Fehler beim Erstellen des Verzeichnisses");
    }
    if let Err(e) = std::fs::write(&path, body) {
        info!("Fehler beim Schreiben der Datei: {}", e);
        return HttpResponse::InternalServerError().body("Fehler beim Schreiben der Datei");
    }
    info!("Territory design Daten gespeichert unter {}", path);

    HttpResponse::Ok().json(serde_json::json!({"status":"ok"}))
}

// load map design(s) from file and return as JSON array
#[get("/api/mapDesign")]
async fn load_map_design() -> impl Responder {
    let mut designs = Vec::new();
    let path = "./data/mapDesigns";
    
    // Check if the directory exists
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if entry.path().is_file() && entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = std::fs::read_to_string(entry.path()) {
                        designs.push(content);
                    }
                }
            }
        }
    }

    HttpResponse::Ok().json(designs)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {

    // Init logger ASAP
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info")
    ).init();
    
    let port = env::args().nth(1).unwrap_or_else(|| "8080".to_string());
    let bind_addr = format!("127.0.0.1:{}", port);

    info!("Starting server ... http:\\\\{}", bind_addr);

    HttpServer::new(|| {
        App::new()
            .wrap(
                Cors::default()
                    .allow_any_origin()     // * — no origin restrictions
                    .allow_any_method()     // GET, POST, PUT, DELETE, etc.
                    .allow_any_header()     // allow custom headers
                    .expose_headers([header::CONTENT_DISPOSITION]) // optional
                    .max_age(3600)          // cache preflight for 1h
            )
            .service(ping)
            .service(post_data)
            .service(save_map_design)
            .route("/ws", web::get().to(ws_index))
            .service(serve_file)
    })
    .bind(bind_addr)?
    .run()
    .await
}
