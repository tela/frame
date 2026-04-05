package database

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"path/filepath"
	"sort"
	"strings"

	_ "modernc.org/sqlite" // register "sqlite" driver
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// DB wraps a SQLite database connection.
type DB struct {
	*sql.DB
}

// Open opens the SQLite database at the given path, configures it for
// WAL mode and foreign keys, and runs any pending migrations.
func Open(dbPath string) (*DB, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	// Configure SQLite pragmas
	pragmas := []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA foreign_keys=ON",
		"PRAGMA busy_timeout=5000",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			db.Close()
			return nil, fmt.Errorf("exec %s: %w", p, err)
		}
	}

	d := &DB{DB: db}
	if err := d.migrate(); err != nil {
		d.Close()
		return nil, fmt.Errorf("run migrations: %w", err)
	}

	return d, nil
}

// migrate runs all embedded SQL migration files in order.
// It tracks which migrations have been applied in a schema_migrations table.
func (d *DB) migrate() error {
	// Ensure the tracking table exists
	if _, err := d.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		filename TEXT PRIMARY KEY,
		applied_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`); err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	// Collect migration files
	entries, err := fs.ReadDir(migrationFS, "migrations")
	if err != nil {
		return fmt.Errorf("read migration directory: %w", err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	// Apply each migration in a transaction
	for _, name := range files {
		var applied int
		if err := d.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE filename = ?", name).Scan(&applied); err != nil {
			return fmt.Errorf("check migration %s: %w", name, err)
		}
		if applied > 0 {
			continue
		}

		content, err := migrationFS.ReadFile(filepath.Join("migrations", name))
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}

		sql := string(content)

		// Migrations that contain PRAGMA foreign_keys=OFF need to run
		// outside a transaction (PRAGMA cannot be used in transactions).
		if strings.Contains(sql, "PRAGMA foreign_keys=OFF") {
			if _, err := d.Exec(sql); err != nil {
				return fmt.Errorf("exec migration %s: %w", name, err)
			}
			if _, err := d.Exec("INSERT INTO schema_migrations (filename) VALUES (?)", name); err != nil {
				return fmt.Errorf("record migration %s: %w", name, err)
			}
			continue
		}

		tx, err := d.Begin()
		if err != nil {
			return fmt.Errorf("begin transaction for %s: %w", name, err)
		}

		if _, err := tx.Exec(sql); err != nil {
			tx.Rollback()
			return fmt.Errorf("exec migration %s: %w", name, err)
		}

		if _, err := tx.Exec("INSERT INTO schema_migrations (filename) VALUES (?)", name); err != nil {
			tx.Rollback()
			return fmt.Errorf("record migration %s: %w", name, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %s: %w", name, err)
		}
	}

	return nil
}
