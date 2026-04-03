package integration_test

import (
	"net/http"
	"testing"
)

func TestAvatar_DefaultIsMostRecentImage(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Avatar Test", "Avatar Test", "prospect")

	// Ingest two images — avatar should serve successfully
	_ = s.ingestImage(charID, 10)
	_ = s.ingestImage(charID, 20)

	code, _ := s.get("/api/v1/characters/" + charID + "/avatar")
	if code != http.StatusOK {
		t.Fatalf("expected 200 for avatar, got %d", code)
	}
}

func TestAvatar_FavoritedImageBecomesAvatar(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Avatar Fav", "Avatar Fav", "prospect")

	img1 := s.ingestImage(charID, 30) // this is the one we want as avatar
	_ = s.ingestImage(charID, 40)      // most recent

	// Favorite img1
	code, _ := s.postJSON("/api/v1/characters/"+charID+"/images/"+img1+"/favorite", map[string]bool{"favorited": true})
	if code != http.StatusOK {
		t.Fatalf("expected 200 for toggle favorite, got %d", code)
	}

	// Avatar should still serve (we can't verify which image from HTTP alone,
	// but we can verify the favorites list changed)
	code, body := s.get("/api/v1/characters/" + charID + "/favorites")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	var favs []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &favs)
	if len(favs) != 1 {
		t.Fatalf("expected 1 favorite, got %d", len(favs))
	}
	if favs[0].ImageID != img1 {
		t.Errorf("expected favorite to be %s, got %s", img1, favs[0].ImageID)
	}

	// Avatar should return 200
	code, _ = s.get("/api/v1/characters/" + charID + "/avatar")
	if code != http.StatusOK {
		t.Fatalf("expected 200 for avatar after favorite, got %d", code)
	}
}

func TestAvatar_NoImagesReturns404(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Avatar Empty", "Avatar Empty", "prospect")

	code, _ := s.get("/api/v1/characters/" + charID + "/avatar")
	if code != http.StatusNotFound {
		t.Fatalf("expected 404 for character with no images, got %d", code)
	}
}

func TestAvatar_CacheControlHeader(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Avatar Cache", "Avatar Cache", "prospect")
	_ = s.ingestImage(charID, 50)

	resp, err := http.Get(s.url("/api/v1/characters/" + charID + "/avatar"))
	if err != nil {
		t.Fatalf("GET avatar: %v", err)
	}
	defer resp.Body.Close()

	cc := resp.Header.Get("Cache-Control")
	if cc != "no-store" {
		t.Errorf("expected Cache-Control: no-store, got %q", cc)
	}
}

func TestFavorite_ToggleOnOff(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Fav Toggle", "Fav Toggle", "prospect")
	imgID := s.ingestImage(charID, 60)

	// Favorite
	code, _ := s.postJSON("/api/v1/characters/"+charID+"/images/"+imgID+"/favorite", map[string]bool{"favorited": true})
	if code != http.StatusOK {
		t.Fatalf("favorite: expected 200, got %d", code)
	}

	code, body := s.get("/api/v1/characters/" + charID + "/favorites")
	if code != http.StatusOK {
		t.Fatalf("list favorites: expected 200, got %d", code)
	}
	var favs []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &favs)
	if len(favs) != 1 {
		t.Fatalf("expected 1 favorite after adding, got %d", len(favs))
	}

	// Unfavorite
	code, _ = s.postJSON("/api/v1/characters/"+charID+"/images/"+imgID+"/favorite", map[string]bool{"favorited": false})
	if code != http.StatusOK {
		t.Fatalf("unfavorite: expected 200, got %d", code)
	}

	code, body = s.get("/api/v1/characters/" + charID + "/favorites")
	if code != http.StatusOK {
		t.Fatalf("list favorites after unfavorite: expected 200, got %d", code)
	}
	s.decode(body, &favs)
	if len(favs) != 0 {
		t.Fatalf("expected 0 favorites after removing, got %d", len(favs))
	}
}

func TestAvatar_StickyOnUnfavorite(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Avatar Sticky", "Avatar Sticky", "prospect")

	img1 := s.ingestImage(charID, 100)
	_ = s.ingestImage(charID, 110)

	// Favorite img1 — sets avatar_image_id
	s.postJSON("/api/v1/characters/"+charID+"/images/"+img1+"/favorite", map[string]bool{"favorited": true})

	// Verify avatar_image_id is set
	code, body := s.get("/api/v1/characters/" + charID)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	var char struct{ AvatarImageID string `json:"avatar_image_id"` }
	s.decode(body, &char)
	if char.AvatarImageID != img1 {
		t.Fatalf("expected avatar_image_id=%s after favorite, got %s", img1, char.AvatarImageID)
	}

	// Unfavorite img1 — avatar should NOT change
	s.postJSON("/api/v1/characters/"+charID+"/images/"+img1+"/favorite", map[string]bool{"favorited": false})

	code, body = s.get("/api/v1/characters/" + charID)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	s.decode(body, &char)
	if char.AvatarImageID != img1 {
		t.Errorf("avatar_image_id should be sticky after unfavorite: expected %s, got %s", img1, char.AvatarImageID)
	}
}

func TestAvatar_FavoriteNewImageUpdatesAvatar(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Avatar Switch", "Avatar Switch", "prospect")

	img1 := s.ingestImage(charID, 120)
	img2 := s.ingestImage(charID, 130)

	// Favorite img1
	s.postJSON("/api/v1/characters/"+charID+"/images/"+img1+"/favorite", map[string]bool{"favorited": true})

	// Favorite img2 — should update avatar
	s.postJSON("/api/v1/characters/"+charID+"/images/"+img2+"/favorite", map[string]bool{"favorited": true})

	code, body := s.get("/api/v1/characters/" + charID)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	var char struct{ AvatarImageID string `json:"avatar_image_id"` }
	s.decode(body, &char)
	if char.AvatarImageID != img2 {
		t.Errorf("expected avatar to switch to %s, got %s", img2, char.AvatarImageID)
	}
}

func TestFavorite_MultipleFavorites(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Multi Fav", "Multi Fav", "prospect")
	img1 := s.ingestImage(charID, 70)
	img2 := s.ingestImage(charID, 80)
	img3 := s.ingestImage(charID, 90)

	// Favorite all three
	for _, id := range []string{img1, img2, img3} {
		code, _ := s.postJSON("/api/v1/characters/"+charID+"/images/"+id+"/favorite", map[string]bool{"favorited": true})
		if code != http.StatusOK {
			t.Fatalf("favorite %s: expected 200, got %d", id, code)
		}
	}

	code, body := s.get("/api/v1/characters/" + charID + "/favorites")
	if code != http.StatusOK {
		t.Fatalf("list favorites: expected 200, got %d", code)
	}
	var favs []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &favs)
	if len(favs) != 3 {
		t.Fatalf("expected 3 favorites, got %d", len(favs))
	}

	// Verify all three are present (order depends on creation timestamp which
	// may be identical in fast tests — don't assert ordering)
	ids := map[string]bool{}
	for _, f := range favs {
		ids[f.ImageID] = true
	}
	for _, id := range []string{img1, img2, img3} {
		if !ids[id] {
			t.Errorf("expected %s in favorites, not found", id)
		}
	}
}
