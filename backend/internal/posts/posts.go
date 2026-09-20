package posts

import (
    "context"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "multiapp/internal/auth"
)

func RegisterRoutes(r fiber.Router, pool *pgxpool.Pool) {
    r.Get("/posts", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        rows, err := pool.Query(context.Background(), `
            SELECT p.id, p.user_id, u.username, u.display_name, u.avatar_url,
                   p.text, p.image_url, p.video_url, p.link_url, p.created_at,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id=p.id) AS likes,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id=p.id) AS comments,
                   EXISTS(SELECT 1 FROM post_likes WHERE post_id=p.id AND user_id=$1) AS liked
            FROM posts p JOIN users u ON u.id=p.user_id
            ORDER BY p.created_at DESC LIMIT 100`, uid)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()

        out := []fiber.Map{}
        for rows.Next() {
            var id, userID, username, displayName, text, img, vid, link string
            var avatar *string
            var createdAt any
            var likes, comments int
            var liked bool
            _ = rows.Scan(&id, &userID, &username, &displayName, &avatar, &text, &img, &vid, &link, &createdAt, &likes, &comments, &liked)
            out = append(out, fiber.Map{
                "id": id, "user_id": userID, "username": username, "display_name": displayName,
                "avatar_url": avatar, "text": text, "image_url": img, "video_url": vid,
                "link_url": link, "created_at": createdAt, "likes": likes, "comments": comments,
                "liked": liked,
            })
        }
        return c.JSON(out)
    })

    r.Post("/posts", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct {
            Text     string `json:"text"`
            ImageURL string `json:"image_url"`
            VideoURL string `json:"video_url"`
            LinkURL  string `json:"link_url"`
        }
        if err := c.BodyParser(&b); err != nil {
            return fiber.NewError(400, "invalid body")
        }
        var id string
        err := pool.QueryRow(context.Background(),
            `INSERT INTO posts(user_id,text,image_url,video_url,link_url)
             VALUES($1,$2,$3,$4,$5) RETURNING id`,
            uid, b.Text, b.ImageURL, b.VideoURL, b.LinkURL).Scan(&id)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        return c.JSON(fiber.Map{"id": id})
    })

    r.Delete("/posts/:id", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        ct, err := pool.Exec(context.Background(),
            `DELETE FROM posts WHERE id=$1 AND user_id=$2`, c.Params("id"), uid)
        if err != nil || ct.RowsAffected() == 0 {
            return fiber.NewError(403, "not allowed")
        }
        return c.SendStatus(204)
    })

    r.Post("/posts/:id/like", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        _, err := pool.Exec(context.Background(),
            `INSERT INTO post_likes(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
            c.Params("id"), uid)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        return c.SendStatus(204)
    })

    r.Delete("/posts/:id/like", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        _, _ = pool.Exec(context.Background(),
            `DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2`,
            c.Params("id"), uid)
        return c.SendStatus(204)
    })

    r.Get("/posts/:id/comments", func(c *fiber.Ctx) error {
        rows, err := pool.Query(context.Background(), `
            SELECT c.id, c.text, c.created_at, u.username, u.display_name, u.avatar_url
            FROM post_comments c JOIN users u ON u.id=c.user_id
            WHERE c.post_id=$1 ORDER BY c.created_at ASC`, c.Params("id"))
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
            out = append(out, fiber.Map{
                "id": id, "text": text, "created_at": createdAt,
                "username": username, "display_name": displayName, "avatar_url": avatar,
            })
        }
        return c.JSON(out)
    })

    r.Post("/posts/:id/comments", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct {
            Text string `json:"text"`
        }
        if err := c.BodyParser(&b); err != nil || b.Text == "" {
            return fiber.NewError(400, "text required")
        }
        _, err := pool.Exec(context.Background(),
            `INSERT INTO post_comments(post_id,user_id,text) VALUES($1,$2,$3)`,
            c.Params("id"), uid, b.Text)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        return c.SendStatus(201)
    })
}