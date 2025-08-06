use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use rust_embed::RustEmbed;
use mime_guess::from_path;
use std::env;
use serde::{Deserialize, Serialize};
use std::fs;
//use std::sync::Mutex;

/**
* Main entry point for the web server.
* This server serves static files from the `ui/dist/ui/browser/` directory
* and provides an API to get and set user settings and more in the future.
* Build it with `cargo build --release` or run it with `cargo run --release`.
* The executable embeds the static files, so you don't need to worry about.
*/

#[derive(RustEmbed)]
#[folder = "./ui/dist/ui/browser/"]
struct Asset;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Settings {
    pub home_coordinates: String,
    pub home_zoom: u8,
}

const SETTINGS_PATH: &str = "data/settings.json";

fn read_settings() -> std::io::Result<Settings> {
    let data = fs::read_to_string(SETTINGS_PATH)?;
    let settings: Settings = serde_json::from_str(&data)?;
    Ok(settings)
}

fn write_settings(new_settings: &Settings) -> std::io::Result<()> {
    let data = serde_json::to_string_pretty(new_settings)?;
    fs::write(SETTINGS_PATH, data)?;
    println!("Settings saved to {}", SETTINGS_PATH);
    Ok(())
}

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

#[get("/api/settings")]
async fn get_settings() -> impl Responder {
    if !std::path::Path::new(SETTINGS_PATH).exists() {
        init_settings()
    } else {
        match read_settings() {
            Ok(settings) => HttpResponse::Ok().json(settings),
            Err(_) => HttpResponse::InternalServerError().body("Could not read settings."),
        }
    }
}

fn init_settings() -> HttpResponse {
    let default_settings = Settings {
        home_coordinates: "0,0".to_string(),
        home_zoom: 2,
    };
    if let Err(e) = write_settings(&default_settings) {
        return HttpResponse::InternalServerError().body(format!("Could not create settings file: {}", e));
    }
    HttpResponse::Ok().json(default_settings)
}

#[post("/api/settings")]
async fn post_settings(new_settings: web::Json<Settings>) -> impl Responder {
    match write_settings(&new_settings.into_inner()) {
        Ok(_) => HttpResponse::Ok().body("Settings saved."),
        Err(_) => HttpResponse::InternalServerError().body("Could not write settings."),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let port = env::args().nth(1).unwrap_or_else(|| "8080".to_string());
    let bind_addr = format!("127.0.0.1:{}", port);

    println!("Starting server ... http:\\\\{}", bind_addr);


    HttpServer::new(|| {
        App::new()
            .service(ping)
            .service(get_settings)
            .service(post_settings)
            .service(serve_file)
    })
    .bind(bind_addr)?
    .run()
    .await
}
