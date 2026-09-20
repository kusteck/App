package users

import (
    "context"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "multiapp/internal/auth"
)

func RegisterRoutes(r fiber.Router, pool *pgxpool.Pool) {
    r.Get("/me", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        return c.JSON(fetchUser(c, pool, uid, uid))
    })

    r.Patch("/me", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct {
            DisplayName string `json:"display_name"`
            Bio         string `json:"bio"`
            AvatarURL   string `json:"avatar_url"`
        }
        if err := c.BodyParser(&b); err != nil {
            return fiber.NewError(400, "invalid body")
        }
        _, err := pool.Exec(context.Background(),
            `UPDATE users SET display_name=COALESCE(NULLIF($1,''),display_name),
                              bio=COALESCE(NULLIF($2,''),bio),
                              avatar_url=COALESCE(NULLIF($3,''),avatar_url),
                              updated_at=now()
             WHERE id=$4`, b.DisplayName, b.Bio, b.AvatarURL, uid)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        return c.JSON(fetchUser(c, pool, uid, uid))
    })

    r.Get("/users/:id", func(c *fiber.Ctx) error {
        return c.JSON(fetchUser(c, pool, c.Params("id"), auth.UID(c)))
    })

    r.Post("/users/:id/follow", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        target := c.Params("id")
        if uid == target {
            return fiber.NewError(400, "cannot follow yourself")
        }
        _, err := pool.Exec(context.Background(),
            `INSERT INTO follows(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
            uid, target)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        _, _ = pool.Exec(context.Background(),
            `INSERT INTO notifications(user_id,type,payload) VALUES($1,'follow',jsonb_build_object('from',$2))`,
            target, uid)
        return c.SendStatus(204)
    })

    r.Delete("/users/:id/follow", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        _, _ = pool.Exec(context.Background(),
            `DELETE FROM follows WHERE follower_id=$1 AND following_id=$2`, uid, c.Params("id"))
        return c.SendStatus(204)
    })

    r.Get("/users/:id/posts", func(c *fiber.Ctx) error {
        rows, err := pool.Query(context.Background(),
            `SELECT id, text, image_url, video_url, created_at FROM posts WHERE user_id=$1 ORDER BY created_at DESC`,
            c.Params("id"))
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()
        out := []fiber.Map{}
        for rows.Next() {
            var id, text, img, vid string
            var createdAt any
            _ = rows.Scan(&id, &text, &img, &vid, &createdAt)
            out = append(out, fiber.Map{"id": id, "text": text, "image_url": img, "video_url": vid, "created_at": createdAt})
        }
        return c.JSON(out)
    })
}

func fetchUser(c *fiber.Ctx, pool *pgxpool.Pool, id, me string) fiber.Map {
    var username, displayName, bio string
    var avatar *string
    var followers, following int
    var isFollowing bool
    err := pool.QueryRow(context.Background(), `
        SELECT username, display_name, COALESCE(bio,''), avatar_url,
               (SELECT COUNT(*) FROM follows WHERE following_id=u.id) AS followers,
               (SELECT COUNT(*) FROM follows WHERE follower_id=u.id) AS following,
               EXISTS(SELECT 1 FROM follows WHERE follower_id=$2 AND following_id=u.id) AS is_following
        FROM users u WHERE u.id=$1`, id, me).Scan(&username, &displayName, &bio, &avatar, &followers, &following, &isFollowing)
    if err != nil {
        return fiber.Map{"error": "not found"}
    }
    return fiber.Map{
        "id": id, "username": username, "display_name": displayName, "bio": bio,
        "avatar_url": avatar, "followers": followers, "following": following,
        "is_following": isFollowing,
    }
}