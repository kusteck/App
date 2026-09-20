package chats

import (
    "context"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "multiapp/internal/auth"
    "multiapp/internal/ws"
)

func RegisterRoutes(r fiber.Router, pool *pgxpool.Pool, hub *ws.Hub) {
    r.Get("/chats", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        rows, err := pool.Query(context.Background(), `
            SELECT c.id, COALESCE(c.title, u.display_name) AS title, u.avatar_url, u.id AS peer_id,
                   (SELECT text FROM messages m WHERE m.chat_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_text,
                   (SELECT created_at FROM messages m WHERE m.chat_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_at,
                   (SELECT COUNT(*) FROM messages m WHERE m.chat_id=c.id AND m.user_id <> $1) AS cnt
            FROM chats c
            JOIN chat_members cm ON cm.chat_id=c.id AND cm.user_id=$1
            LEFT JOIN chat_members other ON other.chat_id=c.id AND other.user_id <> $1
            LEFT JOIN users u ON u.id=other.user_id
            WHERE c.is_group=false
            ORDER BY last_at DESC NULLS LAST`, uid)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()
        out := []fiber.Map{}
        for rows.Next() {
            var id, title, peerID string
            var avatar *string
            var lastText *string
            var lastAt any
            var cnt int
            _ = rows.Scan(&id, &title, &avatar, &peerID, &lastText, &lastAt, &cnt)
            out = append(out, fiber.Map{
                "id": id, "title": title, "avatar_url": avatar, "peer_id": peerID,
                "last_text": lastText, "last_at": lastAt, "unread": cnt,
            })
        }
        return c.JSON(out)
    })

    r.Post("/chats/with/:userId", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        peer := c.Params("userId")
        if uid == peer {
            return fiber.NewError(400, "cannot chat with yourself")
        }
        var chatID string
        err := pool.QueryRow(context.Background(), `
            SELECT c.id FROM chats c
            JOIN chat_members a ON a.chat_id=c.id AND a.user_id=$1
            JOIN chat_members b ON b.chat_id=c.id AND b.user_id=$2
            WHERE c.is_group=false LIMIT 1`, uid, peer).Scan(&chatID)
        if err == nil {
            return c.JSON(fiber.Map{"id": chatID})
        }
        tx, _ := pool.Begin(context.Background())
        defer tx.Rollback(context.Background())
        _ = tx.QueryRow(context.Background(),
            `INSERT INTO chats(is_group) VALUES(false) RETURNING id`).Scan(&chatID)
        _, _ = tx.Exec(context.Background(),
            `INSERT INTO chat_members(chat_id,user_id) VALUES($1,$2),($1,$3)`, chatID, uid, peer)
        _ = tx.Commit(context.Background())
        return c.JSON(fiber.Map{"id": chatID})
    })

    r.Get("/chats/:id/messages", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        chatID := c.Params("id")
        var allowed bool
        _ = pool.QueryRow(context.Background(),
            `SELECT EXISTS(SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2)`,
            chatID, uid).Scan(&allowed)
        if !allowed {
            return fiber.NewError(403, "forbidden")
        }
        rows, err := pool.Query(context.Background(), `
            SELECT m.id, m.user_id, u.username, u.display_name, u.avatar_url,
                   m.text, m.image_url, m.reply_to, m.edited, m.created_at
            FROM messages m JOIN users u ON u.id=m.user_id
            WHERE m.chat_id=$1 ORDER BY m.created_at ASC LIMIT 500`, chatID)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()
        out := []fiber.Map{}
        for rows.Next() {
            var id, userID, username, displayName string
            var avatar, text, image, reply *string
            var edited bool
            var createdAt any
            _ = rows.Scan(&id, &userID, &username, &displayName, &avatar, &text, &image, &reply, &edited, &createdAt)
            out = append(out, fiber.Map{
                "id": id, "user_id": userID, "username": username, "display_name": displayName,
                "avatar_url": avatar, "text": text, "image_url": image, "reply_to": reply,
                "edited": edited, "created_at": createdAt,
            })
        }
        return c.JSON(out)
    })

    r.Post("/chats/:id/messages", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        chatID := c.Params("id")
        var b struct {
            Text    string `json:"text"`
            Image   string `json:"image_url"`
            ReplyTo string `json:"reply_to"`
        }
        if err := c.BodyParser(&b); err != nil {
            return fiber.NewError(400, "invalid body")
        }
        var reply *string
        if b.ReplyTo != "" {
            reply = &b.ReplyTo
        }
        var id string
        err := pool.QueryRow(context.Background(), `
            INSERT INTO messages(chat_id,user_id,text,image_url,reply_to)
            VALUES($1,$2,$3,NULLIF($4,''),$5) RETURNING id`,
            chatID, uid, b.Text, b.Image, reply).Scan(&id)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        rows, _ := pool.Query(context.Background(),
            `SELECT user_id FROM chat_members WHERE chat_id=$1`, chatID)
        var members []string
        if rows != nil {
            defer rows.Close()
            for rows.Next() {
                var m string
                _ = rows.Scan(&m)
                members = append(members, m)
            }
        }
        hub.BroadcastChat(members, "message:new", fiber.Map{"chat_id": chatID, "id": id})
        return c.JSON(fiber.Map{"id": id})
    })

    r.Patch("/messages/:id", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct {
            Text string `json:"text"`
        }
        if err := c.BodyParser(&b); err != nil {
            return fiber.NewError(400, "invalid body")
        }
        ct, err := pool.Exec(context.Background(),
            `UPDATE messages SET text=$1, edited=true, updated_at=now() WHERE id=$2 AND user_id=$3`,
            b.Text, c.Params("id"), uid)
        if err != nil || ct.RowsAffected() == 0 {
            return fiber.NewError(403, "not allowed")
        }
        return c.SendStatus(204)
    })

    r.Delete("/messages/:id", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        ct, err := pool.Exec(context.Background(),
            `DELETE FROM messages WHERE id=$1 AND user_id=$2`, c.Params("id"), uid)
        if err != nil || ct.RowsAffected() == 0 {
            return fiber.NewError(403, "not allowed")
        }
        return c.SendStatus(204)
    })

    r.Post("/chats/:id/typing", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        rows, _ := pool.Query(context.Background(),
            `SELECT user_id FROM chat_members WHERE chat_id=$1 AND user_id<>$2`, c.Params("id"), uid)
        var members []string
        if rows != nil {
            defer rows.Close()
            for rows.Next() {
                var m string
                _ = rows.Scan(&m)
                members = append(members, m)
            }
        }
        hub.BroadcastChat(members, "typing", fiber.Map{"chat_id": c.Params("id"), "user_id": uid})
        return c.SendStatus(204)
    })
}