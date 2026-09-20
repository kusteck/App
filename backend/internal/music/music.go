package music

import (
    "context"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "multiapp/internal/auth"
)

func RegisterRoutes(r fiber.Router, pool *pgxpool.Pool) {
    r.Get("/tracks", func(c *fiber.Ctx) error {
        rows, err := pool.Query(context.Background(),
            `SELECT id,title,artist,duration,cover_url,audio_url FROM tracks ORDER BY created_at DESC`)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        defer rows.Close()
        out := []fiber.Map{}
        for rows.Next() {
            var id, title, artist, audio string
            var dur int
            var cover *string
            _ = rows.Scan(&id, &title, &artist, &dur, &cover, &audio)
            out = append(out, fiber.Map{"id": id, "title": title, "artist": artist, "duration": dur, "cover_url": cover, "audio_url": audio})
        }
        return c.JSON(out)
    })
    r.Post("/tracks", func(c *fiber.Ctx) error {
    var b struct {
        Title    string `json:"title"`
        Artist   string `json:"artist"`
        Duration int    `json:"duration"`
        AudioURL string `json:"audio_url"`
        CoverURL string `json:"cover_url"`
    }
    if err := c.BodyParser(&b); err != nil {
        return fiber.NewError(400, "invalid body")
    }
    if b.Title == "" || b.Artist == "" || b.AudioURL == "" {
        return fiber.NewError(400, "title, artist, audio_url required")
    }
    var id string
    err := pool.QueryRow(context.Background(),
        `INSERT INTO tracks(title, artist, duration, audio_url, cover_url)
         VALUES($1,$2,$3,$4,NULLIF($5,'')) RETURNING id`,
        b.Title, b.Artist, b.Duration, b.AudioURL, b.CoverURL).Scan(&id)
    if err != nil {
        return fiber.NewError(500, err.Error())
    }
    return c.JSON(fiber.Map{"id": id})
})

    r.Get("/playlists", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        rows, err := pool.Query(context.Background(),
            `SELECT id,title,created_at FROM playlists WHERE user_id=$1 ORDER BY created_at DESC`, uid)
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

    r.Post("/playlists", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct{ Title string `json:"title"` }
        if err := c.BodyParser(&b); err != nil || b.Title == "" {
            return fiber.NewError(400, "title required")
        }
        var id string
        _ = pool.QueryRow(context.Background(),
            `INSERT INTO playlists(user_id,title) VALUES($1,$2) RETURNING id`, uid, b.Title).Scan(&id)
        return c.JSON(fiber.Map{"id": id})
    })

    r.Post("/playlists/:id/tracks", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var b struct{ TrackID string `json:"track_id"` }
        if err := c.BodyParser(&b); err != nil {
            return fiber.NewError(400, "invalid body")
        }
        var owner string
        _ = pool.QueryRow(context.Background(), `SELECT user_id FROM playlists WHERE id=$1`, c.Params("id")).Scan(&owner)
        if owner != uid {
            return fiber.NewError(403, "forbidden")
        }
        _, err := pool.Exec(context.Background(),
            `INSERT INTO playlist_tracks(playlist_id,track_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
            c.Params("id"), b.TrackID)
        if err != nil {
            return fiber.NewError(500, err.Error())
        }
        return c.SendStatus(204)
    })
    r.Get("/playlists/:id/tracks", func(c *fiber.Ctx) error {
    uid := auth.UID(c)
    var owner string
    _ = pool.QueryRow(context.Background(), `SELECT user_id FROM playlists WHERE id=$1`, c.Params("id")).Scan(&owner)
    if owner != uid {
        return fiber.NewError(403, "forbidden")
    }
    rows, err := pool.Query(context.Background(), `
        SELECT t.id, t.title, t.artist, t.duration, t.audio_url, COALESCE(t.cover_url, '')
        FROM playlist_tracks pt
        JOIN tracks t ON t.id = pt.track_id
        WHERE pt.playlist_id = $1
        ORDER BY pt.position, t.title`, c.Params("id"))
    if err != nil {
        return fiber.NewError(500, err.Error())
    }
    defer rows.Close()
    out := []fiber.Map{}
    for rows.Next() {
        var id, title, artist, audio, cover string
        var dur int
        _ = rows.Scan(&id, &title, &artist, &dur, &audio, &cover)
        out = append(out, fiber.Map{
            "id": id, "title": title, "artist": artist,
            "duration": dur, "audio_url": audio, "cover_url": cover,
        })
    }
    return c.JSON(out)
})

    r.Delete("/playlists/:id/tracks/:trackId", func(c *fiber.Ctx) error {
        uid := auth.UID(c)
        var owner string
        _ = pool.QueryRow(context.Background(), `SELECT user_id FROM playlists WHERE id=$1`, c.Params("id")).Scan(&owner)
        if owner != uid {
            return fiber.NewError(403, "forbidden")
        }
        _, _ = pool.Exec(context.Background(),
            `DELETE FROM playlist_tracks WHERE playlist_id=$1 AND track_id=$2`,
            c.Params("id"), c.Params("trackId"))
        return c.SendStatus(204)
    })
}