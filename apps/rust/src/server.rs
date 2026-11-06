use crate::app;
use crate::shared::lib::db::connect_db;
use std::env;

pub async fn start_server() {
    dotenvy::dotenv().ok();

    // Refuse to boot with missing/weak JWT secrets instead of forging a
    // predictable signing key for every deployment.
    crate::shared::utils::jwt::validate_jwt_secrets();

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
