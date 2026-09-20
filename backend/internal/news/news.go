package news

import (
    "context"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"
)

func RegisterRoutes(r fiber.Router, pool *pgxpool.Pool) {
    r.Get("/news", func(c *fiber.Ctx) error {
        category := c.Query("category")
        q := `SELECT id,title,summary,category,image_url,source,created_at FROM news`
        args := []any{}
        if category != "" && category != "all" {
            q += ` WHERE category=$1`
            args = append(args, category)
        }
        q += ` ORDER BY created_at DESC LIMIT 100`
        rows, err := pool.Query(context.Background(), q, args...)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()
        out := []fiber.Map{}
        for rows.Next() {
            var id, title, summary, cat, source string
            var img *string
            var createdAt any
            _ = rows.Scan(&id, &title, &summary, &cat, &img, &source, &createdAt)
            out = append(out, fiber.Map{"id": id, "title": title, "summary": summary, "category": cat, "image_url": img, "source": source, "created_at": createdAt})
        }
        return c.JSON(out)
    })
}