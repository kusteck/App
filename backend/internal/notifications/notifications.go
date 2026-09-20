package notifications

import (
    "context"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "multiapp/internal/auth"
    "multiapp/internal/ws"
)

func RegisterRoutes(r fiber.Router, pool *pgxpool.Pool, hub *ws.Hub) {
    r.Get("/notifications", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        rows, err := pool.Query(context.Background(),
            `SELECT id,type,payload,is_read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, uid)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()
        out := []fiber.Map{}
        for rows.Next() {
            var id, t string
            var payload any
            var isRead bool
            var createdAt any
            _ = rows.Scan(&id, &t, &payload, &isRead, &createdAt)
            out = append(out, fiber.Map{"id": id, "type": t, "payload": payload, "is_read": isRead, "created_at": createdAt})
        }
        return c.JSON(out)
    })

    r.Post("/notifications/read-all", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        _, _ = pool.Exec(context.Background(), `UPDATE notifications SET is_read=true WHERE user_id=$1`, uid)
        return c.SendStatus(204)
    })

    _ = hub
}