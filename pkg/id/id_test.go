package id_test

import (
	"testing"

	"github.com/tela/frame/pkg/id"
)

func TestNewReturns16CharHex(t *testing.T) {
	got := id.New()
	if len(got) != 16 {
		t.Errorf("length = %d, want 16", len(got))
	}
	for _, c := range got {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
			t.Errorf("non-hex character: %c", c)
		}
	}
}

func TestNewIsUnique(t *testing.T) {
	seen := make(map[string]bool)
	for i := 0; i < 1000; i++ {
		got := id.New()
		if seen[got] {
			t.Fatalf("duplicate ID after %d iterations: %s", i, got)
		}
		seen[got] = true
	}
}
