package main

import (
	"bytes"
	"compress/zlib"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"hash/crc32"
	"log"
	"path/filepath"
	"time"

	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/config"
	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
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
	imgStore := image.NewStore(db.DB)
	mediaStore := media.NewStore(db.DB)
	loraStore := lora.NewStore(db.DB)
	lookStore := look.NewStore(db.DB)
	ingester := image.NewIngester(imgStore, cfg.Root)

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

		var firstEraID string
		for i, se := range sc.eras {
			eraID := id.New()
			if i == 0 {
				firstEraID = eraID
			}
			era := &character.Era{
				ID:               eraID,
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

		// Ingest test images for the first era (5 per character)
		for j := 0; j < 5; j++ {
			png := makeSeedPNG(byte(j*40+10), byte(j*30+20), byte(j*20+30))
			eraPtr := &firstEraID
			result, err := ingester.Ingest(&image.IngestRequest{
				Filename:      fmt.Sprintf("seed_%s_%d.png", sc.displayName, j),
				Data:          png,
				Source:        image.SourceManual,
				CharacterID:   charID,
				CharacterSlug: c.Slug(),
				EraID:         eraPtr,
			})
			if err != nil {
				continue
			}
			// Mark first two as face refs, third as body ref
			if j == 0 || j == 1 {
				imgStore.UpdateCharacterImage(result.ImageID, charID, &image.CharacterImageUpdate{
					IsFaceRef:    boolp(true),
					RefRank:      intp(j + 1),
					SetType:      setTypePtr(image.SetReference),
					TriageStatus: triagePtr(image.TriageApproved),
				})
			} else if j == 2 {
				imgStore.UpdateCharacterImage(result.ImageID, charID, &image.CharacterImageUpdate{
					IsBodyRef:    boolp(true),
					RefRank:      intp(1),
					SetType:      setTypePtr(image.SetReference),
					TriageStatus: triagePtr(image.TriageApproved),
				})
			} else {
				imgStore.UpdateCharacterImage(result.ImageID, charID, &image.CharacterImageUpdate{
					TriageStatus: triagePtr(image.TriageApproved),
					SetType:      setTypePtr(image.SetCurated),
				})
			}
		}
		fmt.Printf("    images: 5 ingested (2 face ref, 1 body ref, 2 curated)\n")
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

// makeSeedPNG generates a valid 4x4 PNG with unique color data.
func makeSeedPNG(r, g, b byte) []byte {
	var buf bytes.Buffer
	buf.Write([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}) // PNG signature

	// IHDR: 4x4 pixels, 8-bit RGB
	ihdr := make([]byte, 13)
	binary.BigEndian.PutUint32(ihdr[0:4], 4)  // width
	binary.BigEndian.PutUint32(ihdr[4:8], 4)  // height
	ihdr[8] = 8                                 // bit depth
	ihdr[9] = 2                                 // color type: RGB
	writePNGChunk(&buf, "IHDR", ihdr)

	// IDAT: raw pixel data (filter byte + 4 RGB pixels per row)
	var raw bytes.Buffer
	for y := 0; y < 4; y++ {
		raw.WriteByte(0) // filter: none
		for x := 0; x < 4; x++ {
			raw.Write([]byte{r + byte(x*10), g + byte(y*10), b + byte(x+y)})
		}
	}
	var compressed bytes.Buffer
	w, _ := zlib.NewWriterLevel(&compressed, zlib.BestSpeed)
	w.Write(raw.Bytes())
	w.Close()
	writePNGChunk(&buf, "IDAT", compressed.Bytes())

	// IEND
	writePNGChunk(&buf, "IEND", nil)

	return buf.Bytes()
}

func writePNGChunk(buf *bytes.Buffer, chunkType string, data []byte) {
	var length [4]byte
	binary.BigEndian.PutUint32(length[:], uint32(len(data)))
	buf.Write(length[:])
	buf.WriteString(chunkType)
	if data != nil {
		buf.Write(data)
	}
	crc := crc32.NewIEEE()
	crc.Write([]byte(chunkType))
	if data != nil {
		crc.Write(data)
	}
	var crcBytes [4]byte
	binary.BigEndian.PutUint32(crcBytes[:], crc.Sum32())
	buf.Write(crcBytes[:])
}

func boolp(b bool) *bool             { return &b }
func intp(i int) *int                { return &i }
func setTypePtr(s image.SetType) *image.SetType       { return &s }
func triagePtr(s image.TriageStatus) *image.TriageStatus { return &s }
