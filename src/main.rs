use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use rust_embed::RustEmbed;
use mime_guess::from_path;
use std::env;

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

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let port = env::args().nth(1).unwrap_or_else(|| "8080".to_string());
    let bind_addr = format!("127.0.0.1:{}", port);

    println!("Starting server ... http:\\\\{}", bind_addr);

    HttpServer::new(|| {
        App::new()
            .service(ping)
            .service(post_data)
            .service(serve_file)
    })
    .bind(bind_addr)?
    .run()
    .await
}
