package main

import (
    "log"
    "os"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/websocket/v2"
    "github.com/joho/godotenv"

    "multiapp/internal/auth"
    "multiapp/internal/chats"
    "multiapp/internal/db"
    "multiapp/internal/images"
    "multiapp/internal/music"
    "multiapp/internal/news"
    "multiapp/internal/notifications"
    "multiapp/internal/posts"
    "multiapp/internal/search"
    "multiapp/internal/users"
    "multiapp/internal/videos"
    "multiapp/internal/ws"
)

func main() {
    _ = godotenv.Load()

    pool := db.MustConnect(os.Getenv("DATABASE_URL"))
    db.Migrate(pool)

    hub := ws.NewHub()
    go hub.Run()

    app := fiber.New(fiber.Config{BodyLimit: 200 * 1024 * 1024})
    app.Use(logger.New())
    app.Use(cors.New(cors.Config{
        AllowOrigins:     "*",
        AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
        AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        AllowCredentials: false,
    }))
    app.Static("/uploads", os.Getenv("UPLOAD_DIR"))

    api := app.Group("/api")

    authSvc := auth.NewService(pool, os.Getenv("JWT_SECRET"))
    auth.RegisterRoutes(api, authSvc)

    protected := api.Group("", auth.JWTMiddleware(os.Getenv("JWT_SECRET")))
    users.RegisterRoutes(protected, pool)
    posts.RegisterRoutes(protected, pool)
    chats.RegisterRoutes(protected, pool, hub)
    music.RegisterRoutes(protected, pool)
    videos.RegisterRoutes(protected, pool)
    images.RegisterRoutes(protected, pool)
    news.RegisterRoutes(protected, pool)
    search.RegisterRoutes(protected, pool)
    notifications.RegisterRoutes(protected, pool, hub)

    app.Get("/ws", websocket.New(func(c *websocket.Conn) {
        hub.HandleConn(c, authSvc)
    }))

    log.Fatal(app.Listen(":" + os.Getenv("PORT")))
}