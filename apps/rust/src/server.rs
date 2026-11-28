use crate::app;
use crate::shared::lib::db::connect_db;
use crate::shared::utils::jwt::ensure_jwt_secrets_configured;
use std::env;

pub async fn start_server() {
    dotenvy::dotenv().ok();
    ensure_jwt_secrets_configured();

    let pool = connect_db().await.expect("Failed to connect to DB");
    let app = app::create_app(pool);

    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "3002".to_string())
        .parse()
        .expect("PORT must be a number");

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    println!("Listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
