package main

import (
	"encoding/json"
	"fmt"
	"log"
	"path/filepath"
	"time"

	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/config"
	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/look"
	"github.com/tela/frame/pkg/lora"
	"github.com/tela/frame/pkg/media"
)

type seedCharacter struct {
	name        string
	displayName string
	status      character.Status
	eras        []seedEra
}

type seedEra struct {
	label      string
	ageRange   string
	timePeriod string
}

func cmdSeed() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	dbPath := filepath.Join(cfg.Root, "frame.db")
	db, err := database.Open(dbPath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	charStore := character.NewStore(db.DB)
	mediaStore := media.NewStore(db.DB)
	loraStore := lora.NewStore(db.DB)
	lookStore := look.NewStore(db.DB)

	fmt.Println("Seeding Frame database...")

	// Characters
	characters := []seedCharacter{
		{
			name: "Elara Voss", displayName: "Elara", status: character.StatusCast,
			eras: []seedEra{
				{label: "Standard", ageRange: "20", timePeriod: "Present day"},
				{label: "Young Adult", ageRange: "18-24", timePeriod: "Present day"},
				{label: "Mature", ageRange: "30-35", timePeriod: "Present day"},
			},
		},
		{
			name: "Nyx Ashford", displayName: "Nyx", status: character.StatusDevelopment,
			eras: []seedEra{
				{label: "Standard", ageRange: "20", timePeriod: "Present day"},
				{label: "Gothic Phase", ageRange: "19-22", timePeriod: "Present day"},
			},
		},
		{
			name: "Celeste Moreau", displayName: "Celeste", status: character.StatusProspect,
			eras: []seedEra{
				{label: "Standard", ageRange: "20", timePeriod: "Present day"},
			},
		},
	}

	now := time.Now().UTC()
	nowStr := now.Format("2006-01-02T15:04:05Z")

	for _, sc := range characters {
		charID := id.New()
		c := &character.Character{
			ID:          charID,
			Name:        sc.name,
			DisplayName: sc.displayName,
			Status:      sc.status,
			Source:      "frame",
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := charStore.Create(c); err != nil {
			fmt.Printf("  skip %s (already exists?): %v\n", sc.name, err)
			continue
		}
		fmt.Printf("  character: %s (%s) [%s]\n", sc.displayName, charID[:8], sc.status)

		for i, se := range sc.eras {
			era := &character.Era{
				ID:               id.New(),
				CharacterID:      charID,
				Label:            se.label,
				AgeRange:         se.ageRange,
				TimePeriod:       se.timePeriod,
				Description:      fmt.Sprintf("%s at %s", sc.displayName, se.ageRange),
				PipelineSettings: "{}",
				SortOrder:        i,
				CreatedAt:        now,
				UpdatedAt:        now,
			}
			charStore.CreateEra(era)
			fmt.Printf("    era: %s (%s)\n", se.label, se.ageRange)
		}
	}

	// Wardrobe items
	wardrobeItems := []struct{ name string }{
		{"Black Silk Dress"},
		{"White Linen Blouse"},
		{"Lace Lingerie Set"},
		{"Red Evening Gown"},
		{"Denim Jacket"},
		{"Black Heels"},
		{"Swimsuit — Black"},
		{"Swimsuit — White"},
	}
	for _, w := range wardrobeItems {
		item := &media.Item{
			ID:          id.New(),
			ContentType: media.ContentWardrobe,
			Name:        w.name,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := mediaStore.Create(item); err != nil {
			fmt.Printf("  skip wardrobe %s: %v\n", w.name, err)
			continue
		}
		fmt.Printf("  wardrobe: %s\n", w.name)
	}

	// LoRAs
	loras := []struct {
		name, filename, category, rating string
		strength                         float64
	}{
		{"Detail Enhance V2", "detail_enhance_v2.safetensors", "detail", "sfw", 0.6},
		{"Skin Texture HD", "skin_texture_hd.safetensors", "detail", "sfw", 0.5},
		{"Film Grain 35mm", "film_grain_35mm.safetensors", "style", "sfw", 0.4},
		{"Anatomical Detail", "anatomical_detail.safetensors", "detail", "nsfw", 0.7},
		{"Pose Accuracy V3", "pose_accuracy_v3.safetensors", "pose", "sfw", 0.5},
	}
	for _, l := range loras {
		lr := &lora.LoRA{
			ID:                  id.New(),
			Name:                l.name,
			Filename:            l.filename,
			Category:            l.category,
			Tags:                "[]",
			RecommendedStrength: l.strength,
			ContentRating:       l.rating,
			CompatibleModels:    `["flux2","sdxl"]`,
			CreatedAt:           nowStr,
			UpdatedAt:           nowStr,
		}
		if err := loraStore.Create(lr); err != nil {
			fmt.Printf("  skip lora %s: %v\n", l.name, err)
			continue
		}
		fmt.Printf("  lora: %s (%s, %s)\n", l.name, l.category, l.rating)
	}

	// Create a default look for the first character (Elara)
	// List characters to find Elara's ID
	chars, _ := charStore.List()
	for _, c := range chars {
		if c.DisplayName == "Elara" {
			// Get wardrobe items
			wardrobeList, _ := mediaStore.ListByType(media.ContentWardrobe)
			var garmentIDs []string
			for _, w := range wardrobeList {
				if w.Name == "Black Silk Dress" || w.Name == "Black Heels" || w.Name == "Lace Lingerie Set" {
					garmentIDs = append(garmentIDs, w.ID)
				}
			}
			idsJSON, _ := json.Marshal(garmentIDs)
			lk := &look.Look{
				ID:              id.New(),
				CharacterID:     c.ID,
				Name:            "Casting Day",
				WardrobeItemIDs: string(idsJSON),
				IsDefault:       true,
				CreatedAt:       nowStr,
			}
			if err := lookStore.Create(lk); err == nil {
				fmt.Printf("  look: %s for %s (%d garments)\n", lk.Name, c.DisplayName, len(garmentIDs))
			}
			break
		}
	}

	fmt.Println("\nSeed complete.")
}
