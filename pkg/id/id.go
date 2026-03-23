package id

import (
	"crypto/rand"
	"encoding/hex"
)

// New generates a 16-character hex ID from 8 bytes of crypto/rand.
// This matches Fig's scout.NewID() format for cross-system compatibility.
func New() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		panic("id: crypto/rand failed")
	}
	return hex.EncodeToString(b)
}
