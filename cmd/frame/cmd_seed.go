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
	"github.com/tela/frame/pkg/garment"
	"github.com/tela/frame/pkg/hairstyle"
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
	garmentStore := garment.NewStore(db.DB)
	hairstyleStore := hairstyle.NewStore(db.DB)
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

	// Legacy wardrobe media items (for backward compat with media library)
	wardrobeItems := []struct{ name string }{
		{"Black Silk Dress"},
		{"White Linen Blouse"},
	}
	for _, w := range wardrobeItems {
		item := &media.Item{
			ID: id.New(), ContentType: media.ContentWardrobe, Name: w.name, CreatedAt: now, UpdatedAt: now,
		}
		mediaStore.Create(item)
	}

	// Garments (new wardrobe catalog)
	type seedGarment struct {
		name, category, occasion, era, aesthetic, dominant, material, color string
	}
	garments := []seedGarment{
		{"Midnight Silk Slip Dress", "dress", "formal", "contemporary", "minimalist", "elegance", "silk", "midnight navy"},
		{"Vintage Lace Bodysuit", "lingerie", "intimate", "vintage", "dark_romantic", "vulnerability", "lace", "ivory"},
		{"Oversized Blazer", "outerwear", "formal", "contemporary", "minimalist", "power", "wool", "charcoal"},
		{"Red Sundress", "dress", "casual", "contemporary", "", "softness", "cotton", "cherry red"},
		{"Leather Harness Top", "top", "provocative", "contemporary", "maximalist", "provocation", "leather", "black"},
		{"High-Waist Trousers", "bottom", "formal", "timeless", "minimalist", "elegance", "wool", "cream"},
		{"Stiletto Heels", "footwear", "formal", "timeless", "", "power", "patent leather", "black"},
		{"Pearl Drop Earrings", "accessory", "formal", "timeless", "minimalist", "elegance", "pearl", "white"},
		{"Mesh Bodysuit", "lingerie", "intimate", "contemporary", "", "provocation", "mesh", "black"},
		{"Denim Jacket", "outerwear", "casual", "90s", "", "comfort", "denim", "medium wash"},
		{"Silk Kimono Robe", "outerwear", "loungewear", "timeless", "", "softness", "silk", "dusty rose"},
		{"Athletic Bralette", "lingerie", "athletic", "contemporary", "minimalist", "comfort", "nylon", "grey"},
	}
	var garmentIDs []string
	for _, sg := range garments {
		g := &garment.Garment{
			ID: id.New(), Name: sg.name, Category: sg.category,
			OccasionEnergy: sg.occasion, Era: sg.era, AestheticCluster: sg.aesthetic,
			DominantSignal: sg.dominant, Material: sg.material, Color: sg.color,
			Source: "manual", Status: "available",
		}
		if err := garmentStore.Create(g); err != nil {
			fmt.Printf("  skip garment %s: %v\n", sg.name, err)
			continue
		}
		garmentIDs = append(garmentIDs, g.ID)
		fmt.Printf("  garment: %s (%s, %s)\n", sg.name, sg.category, sg.occasion)
	}

	// Hairstyles
	type seedHair struct {
		name, length, texture, style, color string
	}
	hairs := []seedHair{
		{"Victory Rolls", "medium", "wavy", "structured", "honey blonde"},
		{"Loose Beach Waves", "long", "wavy", "down", "sun-kissed brown"},
		{"Sculptural Braids", "very_long", "curly", "braids", "jet black"},
		{"Minimalist Pixie", "pixie", "straight", "structured", "platinum"},
		{"Modern High Bun", "medium", "straight", "updo", "chestnut"},
		{"Botticelli Curls", "very_long", "curly", "down", "auburn"},
		{"Textured Shag", "medium", "wavy", "loose", "dark brown"},
		{"Regal Ponytail", "long", "straight", "ponytail", "black"},
		{"Messy Half-Up", "long", "wavy", "half_up", "caramel highlights"},
		{"Sleek Bob", "short", "straight", "down", "blue-black"},
	}
	var hairstyleIDs []string
	for _, sh := range hairs {
		h := &hairstyle.Hairstyle{
			ID: id.New(), Name: sh.name, Length: sh.length,
			Texture: sh.texture, Style: sh.style, Color: sh.color,
			Source: "manual", Status: "available",
		}
		if err := hairstyleStore.Create(h); err != nil {
			fmt.Printf("  skip hairstyle %s: %v\n", sh.name, err)
			continue
		}
		hairstyleIDs = append(hairstyleIDs, h.ID)
		fmt.Printf("  hairstyle: %s (%s, %s)\n", sh.name, sh.length, sh.texture)
	}

	// Character affinity — assign some garments and hairstyles to Elara
	chars, _ := charStore.List()
	var elaraID string
	for _, c := range chars {
		if c.DisplayName == "Elara" {
			elaraID = c.ID
			// Assign first 4 garments to Elara
			for i := 0; i < 4 && i < len(garmentIDs); i++ {
				garmentStore.AddAffinity(garmentIDs[i], c.ID)
			}
			// Assign first 3 hairstyles to Elara
			for i := 0; i < 3 && i < len(hairstyleIDs); i++ {
				hairstyleStore.AddAffinity(hairstyleIDs[i], c.ID)
			}
			fmt.Printf("  affinity: 4 garments + 3 hairstyles → %s\n", c.DisplayName)
			break
		}
	}
	_ = elaraID

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

	// Create a default look for Elara using garment IDs
	if elaraID != "" && len(garmentIDs) >= 3 {
		lookGarmentIDs := garmentIDs[:3]
		idsJSON, _ := json.Marshal(lookGarmentIDs)
		lk := &look.Look{
			ID:              id.New(),
			CharacterID:     elaraID,
			Name:            "Casting Day",
			WardrobeItemIDs: string(idsJSON),
			IsDefault:       true,
			CreatedAt:       nowStr,
		}
		if err := lookStore.Create(lk); err == nil {
			fmt.Printf("  look: Casting Day for Elara (%d garments)\n", len(lookGarmentIDs))
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
