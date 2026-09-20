package videos

import (
    "context"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "multiapp/internal/auth"
)

func RegisterRoutes(r fiber.Router, pool *pgxpool.Pool) {
    r.Get("/videos", func(c *fiber.Ctx) error {
        rows, err := pool.Query(context.Background(), `
            SELECT v.id, v.title, v.thumbnail_url, v.views, v.created_at, u.username, u.display_name, u.avatar_url
            FROM videos v JOIN users u ON u.id=v.user_id ORDER BY v.created_at DESC LIMIT 60`)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()
        out := []fiber.Map{}
        for rows.Next() {
            var id, title, username, displayName string
            var thumb, avatar *string
            var views int
            var createdAt any
            _ = rows.Scan(&id, &title, &thumb, &views, &createdAt, &username, &displayName, &avatar)
            out = append(out, fiber.Map{
                "id": id, "title": title, "thumbnail_url": thumb, "views": views,
                "created_at": createdAt, "username": username, "display_name": displayName, "avatar_url": avatar,
            })
        }
        return c.JSON(out)
    })

    r.Get("/videos/:id", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        _, _ = pool.Exec(context.Background(), `UPDATE videos SET views=views+1 WHERE id=$1`, c.Params("id"))
        var id, title, description, videoURL, username, displayName string
        var thumb, avatar *string
        var views, likes int
        var liked bool
        var createdAt any
        err := pool.QueryRow(context.Background(), `
            SELECT v.id, v.title, COALESCE(v.description,''), v.video_url, v.thumbnail_url, v.views, v.created_at,
                   u.username, u.display_name, u.avatar_url,
                   (SELECT COUNT(*) FROM video_likes WHERE video_id=v.id),
                   EXISTS(SELECT 1 FROM video_likes WHERE video_id=v.id AND user_id=$2)
            FROM videos v JOIN users u ON u.id=v.user_id WHERE v.id=$1`, c.Params("id"), uid).
            Scan(&id, &title, &description, &videoURL, &thumb, &views, &createdAt, &username, &displayName, &avatar, &likes, &liked)
        if err != nil {
            return fiber.NewError(404, "not found")
        }
        return c.JSON(fiber.Map{
            "id": id, "title": title, "description": description, "video_url": videoURL,
            "thumbnail_url": thumb, "views": views, "created_at": createdAt,
            "username": username, "display_name": displayName, "avatar_url": avatar,
            "likes": likes, "liked": liked,
        })
    })

    r.Post("/videos", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct {
            Title       string `json:"title"`
            Description string `json:"description"`
            VideoURL    string `json:"video_url"`
            Thumbnail   string `json:"thumbnail_url"`
        }
        if err := c.BodyParser(&b); err != nil || b.VideoURL == "" {
            return fiber.NewError(400, "invalid body")
        }
        var id string
        err := pool.QueryRow(context.Background(), `
            INSERT INTO videos(user_id,title,description,video_url,thumbnail_url)
            VALUES($1,$2,$3,$4,NULLIF($5,'')) RETURNING id`,
            uid, b.Title, b.Description, b.VideoURL, b.Thumbnail).Scan(&id)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        return c.JSON(fiber.Map{"id": id})
    })

    r.Post("/videos/:id/like", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        _, _ = pool.Exec(context.Background(),
            `INSERT INTO video_likes(video_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
            c.Params("id"), uid)
        return c.SendStatus(204)
    })

    r.Get("/videos/:id/comments", func(c *fiber.Ctx) error {
        rows, err := pool.Query(context.Background(), `
            SELECT c.id, c.text, c.created_at, u.username, u.display_name, u.avatar_url
            FROM video_comments c JOIN users u ON u.id=c.user_id
            WHERE c.video_id=$1 ORDER BY c.created_at DESC`, c.Params("id"))
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()
        out := []fiber.Map{}
        for rows.Next() {
            var id, text, username, displayName string
            var avatar *string
            var createdAt any
            _ = rows.Scan(&id, &text, &createdAt, &username, &displayName, &avatar)
            out = append(out, fiber.Map{"id": id, "text": text, "created_at": createdAt, "username": username, "display_name": displayName, "avatar_url": avatar})
        }
        return c.JSON(out)
    })

    r.Post("/videos/:id/comments", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct{ Text string `json:"text"` }
        if err := c.BodyParser(&b); err != nil || b.Text == "" {
            return fiber.NewError(400, "text required")
        }
        _, _ = pool.Exec(context.Background(),
            `INSERT INTO video_comments(video_id,user_id,text) VALUES($1,$2,$3)`,
            c.Params("id"), uid, b.Text)
        return c.SendStatus(201)
    })
}