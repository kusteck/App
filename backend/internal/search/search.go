package search

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterRoutes(r fiber.Router, pool *pgxpool.Pool) {
	r.Get("/search", func(c *fiber.Ctx) error {
		q := c.Query("q")
		if q == "" {
			return c.JSON(fiber.Map{
				"users": []any{}, "posts": []any{}, "videos": []any{},
				"tracks": []any{}, "images": []any{}, "news": []any{},
			})
		}
		like := "%" + q + "%"
		ctx := context.Background()

		users := queryUsers(ctx, pool, like)
		posts := queryPosts(ctx, pool, like)
		videos := queryVideos(ctx, pool, like)
		tracks := queryTracks(ctx, pool, like)
		images := queryImages(ctx, pool, like)
		news := queryNews(ctx, pool, like)

		return c.JSON(fiber.Map{
			"users": users, "posts": posts, "videos": videos,
			"tracks": tracks, "images": images, "news": news,
		})
	})
}

func queryUsers(ctx context.Context, pool *pgxpool.Pool, like string) []fiber.Map {
	rows, err := pool.Query(ctx,
		`SELECT id, username, display_name, COALESCE(avatar_url, '')
		 FROM users
		 WHERE username ILIKE $1 OR display_name ILIKE $1
		 LIMIT 20`, like)
	if err != nil {
		return []fiber.Map{}
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, username, display, avatar string
		_ = rows.Scan(&id, &username, &display, &avatar)
		out = append(out, fiber.Map{"id": id, "username": username, "display_name": display, "avatar_url": avatar})
	}
	return out
}

func queryPosts(ctx context.Context, pool *pgxpool.Pool, like string) []fiber.Map {
	rows, err := pool.Query(ctx,
		`SELECT id, COALESCE(text, '')
		 FROM posts
		 WHERE text ILIKE $1
		 LIMIT 20`, like)
	if err != nil {
		return []fiber.Map{}
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, text string
		_ = rows.Scan(&id, &text)
		out = append(out, fiber.Map{"id": id, "text": text})
	}
	return out
}

func queryVideos(ctx context.Context, pool *pgxpool.Pool, like string) []fiber.Map {
	rows, err := pool.Query(ctx,
		`SELECT id, title, COALESCE(thumbnail_url, '')
		 FROM videos
		 WHERE title ILIKE $1 OR COALESCE(description, '') ILIKE $1
		 LIMIT 20`, like)
	if err != nil {
		return []fiber.Map{}
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, title, thumb string
		_ = rows.Scan(&id, &title, &thumb)
		out = append(out, fiber.Map{"id": id, "title": title, "thumbnail_url": thumb})
	}
	return out
}

func queryTracks(ctx context.Context, pool *pgxpool.Pool, like string) []fiber.Map {
	rows, err := pool.Query(ctx,
		`SELECT id, title, artist, COALESCE(cover_url, '')
		 FROM tracks
		 WHERE title ILIKE $1 OR artist ILIKE $1
		 LIMIT 20`, like)
	if err != nil {
		return []fiber.Map{}
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, title, artist, cover string
		_ = rows.Scan(&id, &title, &artist, &cover)
		out = append(out, fiber.Map{"id": id, "title": title, "artist": artist, "cover_url": cover})
	}
	return out
}

func queryImages(ctx context.Context, pool *pgxpool.Pool, like string) []fiber.Map {
	rows, err := pool.Query(ctx,
		`SELECT id, COALESCE(title, ''), image_url
		 FROM images
		 WHERE COALESCE(title, '') ILIKE $1
		 LIMIT 20`, like)
	if err != nil {
		return []fiber.Map{}
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, title, img string
		_ = rows.Scan(&id, &title, &img)
		out = append(out, fiber.Map{"id": id, "title": title, "image_url": img})
	}
	return out
}

func queryNews(ctx context.Context, pool *pgxpool.Pool, like string) []fiber.Map {
	rows, err := pool.Query(ctx,
		`SELECT id, title, COALESCE(summary, ''), COALESCE(category, '')
		 FROM news
		 WHERE title ILIKE $1 OR COALESCE(summary, '') ILIKE $1
		 LIMIT 20`, like)
	if err != nil {
		return []fiber.Map{}
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, title, summary, cat string
		_ = rows.Scan(&id, &title, &summary, &cat)
		out = append(out, fiber.Map{"id": id, "title": title, "summary": summary, "category": cat})
	}
	return out
}