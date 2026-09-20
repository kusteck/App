package db

import (
    "context"
    "log"
    "os"
    "path/filepath"
    "sort"

    "github.com/jackc/pgx/v5/pgxpool"
)

func MustConnect(url string) *pgxpool.Pool {
    pool, err := pgxpool.New(context.Background(), url)
    if err != nil {
        log.Fatalf("db connect: %v", err)
    }
    return pool
}

func Migrate(pool *pgxpool.Pool) {
    ctx := context.Background()
    _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())`)
    if err != nil {
        log.Fatalf("migrations table: %v", err)
    }

    files, _ := filepath.Glob("migrations/*.sql")
    sort.Strings(files)
    for _, f := range files {
        name := filepath.Base(f)
        var exists bool
        _ = pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name=$1)`, name).Scan(&exists)
        if exists {
            continue
        }
        sql, err := os.ReadFile(f)
        if err != nil {
            log.Fatalf("read %s: %v", f, err)
        }
        if _, err := pool.Exec(ctx, string(sql)); err != nil {
            log.Fatalf("apply %s: %v", name, err)
        }
        _, _ = pool.Exec(ctx, `INSERT INTO schema_migrations(name) VALUES($1)`, name)
        log.Printf("migration applied: %s", name)
    }
}