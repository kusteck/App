package images

import (
    "context"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "multiapp/internal/auth"
)

func RegisterRoutes(r fiber.Router, pool *pgxpool.Pool) {
    r.Get("/images", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        rows, err := pool.Query(context.Background(), `
            SELECT i.id, i.title, i.image_url, i.created_at,
                   u.username, u.display_name, u.avatar_url,
                   (SELECT COUNT(*) FROM image_likes WHERE image_id=i.id),
                   EXISTS(SELECT 1 FROM image_likes WHERE image_id=i.id AND user_id=$1)
            FROM images i JOIN users u ON u.id=i.user_id
            ORDER BY i.created_at DESC LIMIT 100`, uid)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()
        out := []fiber.Map{}
        for rows.Next() {
            var id, imageURL, username, displayName string
            var title, avatar *string
            var createdAt any
            var likes int
            var liked bool
            _ = rows.Scan(&id, &title, &imageURL, &createdAt, &username, &displayName, &avatar, &likes, &liked)
            out = append(out, fiber.Map{
                "id": id, "title": title, "image_url": imageURL, "created_at": createdAt,
                "username": username, "display_name": displayName, "avatar_url": avatar,
                "likes": likes, "liked": liked,
            })
        }
        return c.JSON(out)
    })

    r.Post("/images", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct {
            Title    string `json:"title"`
            ImageURL string `json:"image_url"`
        }
        if err := c.BodyParser(&b); err != nil || b.ImageURL == "" {
            return fiber.NewError(400, "image_url required")
        }
        var id string
        _ = pool.QueryRow(context.Background(),
            `INSERT INTO images(user_id,title,image_url) VALUES($1,$2,$3) RETURNING id`,
            uid, b.Title, b.ImageURL).Scan(&id)
        return c.JSON(fiber.Map{"id": id})
    })

    r.Post("/images/:id/like", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        _, _ = pool.Exec(context.Background(),
            `INSERT INTO image_likes(image_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
            c.Params("id"), uid)
        return c.SendStatus(204)
    })

    r.Get("/boards", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        rows, err := pool.Query(context.Background(),
            `SELECT id,title,created_at FROM boards WHERE user_id=$1 ORDER BY created_at DESC`, uid)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()
        out := []fiber.Map{}
        for rows.Next() {
            var id, title string
            var createdAt any
            _ = rows.Scan(&id, &title, &createdAt)
            out = append(out, fiber.Map{"id": id, "title": title, "created_at": createdAt})
        }
        return c.JSON(out)
    })

    r.Post("/boards", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct{ Title string `json:"title"` }
        if err := c.BodyParser(&b); err != nil || b.Title == "" {
            return fiber.NewError(400, "title required")
        }
        var id string
        _ = pool.QueryRow(context.Background(),
            `INSERT INTO boards(user_id,title) VALUES($1,$2) RETURNING id`, uid, b.Title).Scan(&id)
        return c.JSON(fiber.Map{"id": id})
    })

    r.Patch("/boards/:id", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct{ Title string `json:"title"` }
        if err := c.BodyParser(&b); err != nil {
            return fiber.NewError(400, "invalid body")
        }
        _, _ = pool.Exec(context.Background(),
            `UPDATE boards SET title=$1 WHERE id=$2 AND user_id=$3`, b.Title, c.Params("id"), uid)
        return c.SendStatus(204)
    })

    r.Post("/boards/:id/images/:imageId", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var owner string
        _ = pool.QueryRow(context.Background(), `SELECT user_id FROM boards WHERE id=$1`, c.Params("id")).Scan(&owner)
        if owner != uid {
            return fiber.NewError(403, "forbidden")
        }
        _, _ = pool.Exec(context.Background(),
            `INSERT INTO board_images(board_id,image_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
            c.Params("id"), c.Params("imageId"))
        return c.SendStatus(204)
    })

    r.Delete("/boards/:id/images/:imageId", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var owner string
        _ = pool.QueryRow(context.Background(), `SELECT user_id FROM boards WHERE id=$1`, c.Params("id")).Scan(&owner)
        if owner != uid {
            return fiber.NewError(403, "forbidden")
        }
        _, _ = pool.Exec(context.Background(),
            `DELETE FROM board_images WHERE board_id=$1 AND image_id=$2`,
            c.Params("id"), c.Params("imageId"))
        return c.SendStatus(204)
    })
}