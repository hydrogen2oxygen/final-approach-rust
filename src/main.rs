mod websocket;

use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use rust_embed::RustEmbed;
use mime_guess::from_path;
use std::env;
use websocket::ws_index;

#[derive(RustEmbed)]
#[folder = "./ui/dist/ui/browser/"]
struct Asset;


#[get("/{filename:.*}")]
async fn serve_file(path: web::Path<String>) -> impl Responder {
    //println!("serve_file called with path: {}", path);
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
    println!("Received POST data: {}", body);
    HttpResponse::Ok().body("Data received")
}

// Speichere OpenLayer-Feature als JSON, Dateiname kommt aus dem JSON-Feld "name"
#[post("/api/territoryDesign")]
async fn territory_design(body: String) -> impl Responder {
    println!("Empfangene territory design Daten: {}", body);

    // Versuche, das JSON zu parsen und den Namen zu extrahieren
    let json: serde_json::Value = match serde_json::from_str(&body) {
        Ok(j) => j,
        Err(e) => {
            println!("Ungültiges JSON: {}", e);
            return HttpResponse::BadRequest().body("Ungültiges JSON");
        }
    };

    let name = match json.get("name").and_then(|n| n.as_str()) {
        Some(n) => n,
        None => {
            println!("Kein 'name' Feld im JSON gefunden");
            return HttpResponse::BadRequest().body("Kein 'name' Feld im JSON gefunden");
        }
    };

    let path = format!("./data/{}.json", name);
    if let Err(e) = std::fs::create_dir_all("./data") {
        println!("Fehler beim Erstellen des Verzeichnisses: {}", e);
        return HttpResponse::InternalServerError().body("Fehler beim Erstellen des Verzeichnisses");
    }
    if let Err(e) = std::fs::write(&path, body) {
        println!("Fehler beim Schreiben der Datei: {}", e);
        return HttpResponse::InternalServerError().body("Fehler beim Schreiben der Datei");
    }
    println!("Territory design Daten gespeichert unter {}", path);

    HttpResponse::Ok().body("Territory design Daten empfangen und gespeichert")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let port = env::args().nth(1).unwrap_or_else(|| "8080".to_string());
    let bind_addr = format!("127.0.0.1:{}", port);

    println!("Starting server ... http:\\\\{}", bind_addr);

    HttpServer::new(|| {
        App::new()
            .service(ping)
            .service(post_data)
            .route("/ws", web::get().to(ws_index))
            .service(serve_file)
    })
    .bind(bind_addr)?
    .run()
    .await
}
