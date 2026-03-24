package testutil

import (
	"crypto/rand"
	"encoding/hex"
	"testing"

	"github.com/tela/frame/pkg/database"
)

// NewTestDB creates an in-memory SQLite database with all migrations applied.
// The database is closed automatically when the test completes.
func NewTestDB(t *testing.T) *database.DB {
	t.Helper()
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

// SeedImage inserts a minimal image record and returns its ID.
func SeedImage(t *testing.T, db *database.DB) string {
	t.Helper()
	imgID := make([]byte, 8)
	if _, err := rand.Read(imgID); err != nil {
		t.Fatal(err)
	}
	id := hex.EncodeToString(imgID)
	hash := hex.EncodeToString(imgID) + hex.EncodeToString(imgID)
	_, err := db.Exec(
		`INSERT INTO images (id, hash, format, source) VALUES (?, ?, 'png', 'manual')`,
		id, hash,
	)
	if err != nil {
		t.Fatalf("seed image: %v", err)
	}
	return id
}
