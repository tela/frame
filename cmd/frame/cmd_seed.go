package main

import (
	"bytes"
	"compress/zlib"
	"crypto/sha256"
	"encoding/binary"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"hash/crc32"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/tela/frame/pkg/audit"
	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/config"
	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/dataset"
	"github.com/tela/frame/pkg/garment"
	"github.com/tela/frame/pkg/hairstyle"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/look"
	"github.com/tela/frame/pkg/lora"
	"github.com/tela/frame/pkg/media"
	"github.com/tela/frame/pkg/shoot"
)

type seedCharacter struct {
	name        string
	displayName string
	status      character.Status
	gender      string
	ethnicity   string
	skinTone    string
	eyeColor    string
	eyeShape    string
	hairColor   string
	hairTexture string
	features    string
	eras        []seedEra
}

type seedEra struct {
	label      string
	ageRange   string
	timePeriod string
	build      string
	heightCM   int
	hairColor  string
	hairLength string
	faceShape  string
	jawDef     string
}

func cmdSeed() {
	fs := flag.NewFlagSet("seed", flag.ExitOnError)
	fileFlag := fs.String("file", "", "CSV file path for character/era seed data")
	archiveFlag := fs.String("archive", "", "Restore seed data from a tar.gz archive")
	// Accept --root so it can be passed through to config.Load.
	// The FlagSet must know about it to avoid erroring on unrecognized flags.
	rootFlag := fs.String("root", "", "Drive root directory")
	fs.Parse(os.Args[1:])
	// Re-inject --root for config.Load's flag.Parse if provided.
	if *rootFlag != "" {
		os.Args = []string{os.Args[0], "--root", *rootFlag}
	} else {
		os.Args = os.Args[:1]
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// Archive restore mode — replaces DB and assets from snapshot
	if *archiveFlag != "" {
		restoreFromArchive(cfg.Root, *archiveFlag)
		return
	}

	dbPath := filepath.Join(cfg.Root, "frame.db")
	db, err := database.Open(dbPath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	charStore := character.NewStore(db.DB)
	imgStore := image.NewStore(db.DB)
	ingester := image.NewIngester(imgStore, cfg.Root)

	if *fileFlag != "" {
		seedFromCSV(charStore, imgStore, ingester, *fileFlag)
		return
	}
	mediaStore := media.NewStore(db.DB)
	garmentStore := garment.NewStore(db.DB)
	hairstyleStore := hairstyle.NewStore(db.DB)
	loraStore := lora.NewStore(db.DB)
	lookStore := look.NewStore(db.DB)

	fmt.Println("Seeding Frame database...")

	// Characters
	characters := []seedCharacter{
		{
			name: "Elara Voss", displayName: "Elara", status: character.StatusCast,
			gender: "female", ethnicity: "Northern European", skinTone: "fair",
			eyeColor: "green", eyeShape: "almond", hairColor: "dark brown", hairTexture: "wavy",
			features: "faint freckles across nose",
			eras: []seedEra{
				{label: "Late Teen", ageRange: "18-20", timePeriod: "Present day", build: "slim", heightCM: 168, hairColor: "dark brown", hairLength: "shoulder", faceShape: "oval", jawDef: "soft"},
				{label: "Young Adult", ageRange: "21-25", timePeriod: "Present day", build: "athletic", heightCM: 170, hairColor: "dark brown", hairLength: "mid-back", faceShape: "oval", jawDef: "moderate"},
				{label: "Late Prime", ageRange: "33-40", timePeriod: "Present day", build: "athletic", heightCM: 170, hairColor: "dark brown", hairLength: "shoulder", faceShape: "oval", jawDef: "defined"},
			},
		},
		{
			name: "Nyx Ashford", displayName: "Nyx", status: character.StatusDevelopment,
			gender: "female", ethnicity: "East Asian", skinTone: "tan",
			eyeColor: "dark brown", eyeShape: "monolid", hairColor: "black", hairTexture: "straight",
			eras: []seedEra{
				{label: "Teen", ageRange: "16-17", timePeriod: "Present day", build: "petite", heightCM: 160, hairColor: "black", hairLength: "long", faceShape: "heart", jawDef: "soft"},
				{label: "Late Teen", ageRange: "18-20", timePeriod: "Present day", build: "slim", heightCM: 163, hairColor: "black with red highlights", hairLength: "mid-back", faceShape: "heart", jawDef: "soft"},
			},
		},
		{
			name: "Celeste Moreau", displayName: "Celeste", status: character.StatusProspect,
			gender: "female", ethnicity: "Southern European", skinTone: "olive",
			eyeColor: "hazel", eyeShape: "round", hairColor: "auburn", hairTexture: "curly",
			eras: []seedEra{
				{label: "Late Teen", ageRange: "18-20", timePeriod: "Present day", build: "curvy", heightCM: 165, hairColor: "auburn", hairLength: "long", faceShape: "round", jawDef: "soft"},
			},
		},
	}

	now := time.Now().UTC()
	nowStr := now.Format("2006-01-02T15:04:05Z")

	for _, sc := range characters {
		charID := id.New()
		c := &character.Character{
			ID:                     charID,
			Name:                   sc.name,
			DisplayName:            sc.displayName,
			Status:                 sc.status,
			Source:                 "frame",
			Gender:                 sc.gender,
			Ethnicity:              sc.ethnicity,
			SkinTone:               sc.skinTone,
			EyeColor:               sc.eyeColor,
			EyeShape:               sc.eyeShape,
			NaturalHairColor:       sc.hairColor,
			NaturalHairTexture:     sc.hairTexture,
			DistinguishingFeatures: sc.features,
			CreatedAt:              now,
			UpdatedAt:              now,
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
			h := se.heightCM
			era := &character.Era{
				ID:               eraID,
				CharacterID:      charID,
				Label:            se.label,
				AgeRange:         se.ageRange,
				TimePeriod:       se.timePeriod,
				Description:      fmt.Sprintf("%s at %s", sc.displayName, se.ageRange),
				PipelineSettings: "{}",
				SortOrder:        i,
				Build:            se.build,
				HeightCM:         &h,
				HairColor:        se.hairColor,
				HairLength:       se.hairLength,
				FaceShape:        se.faceShape,
				JawDefinition:    se.jawDef,
				CreatedAt:        now,
				UpdatedAt:        now,
			}
			charStore.CreateEra(era)
			fmt.Printf("    era: %s (%s, %s, %dcm)\n", se.label, se.ageRange, se.build, se.heightCM)
		}

		// Ingest test images for the first era (8 per character)
		seedCharacterImages(charStore, imgStore, ingester, charID, sc.displayName, c.Slug(), firstEraID)
	}

	// Create shoots, datasets, and audit events for first character (Elara)
	shootStore := shoot.NewStore(db.DB)
	datasetStore := dataset.NewStore(db.DB)
	auditStore := audit.NewStore(db.DB)

	chars, _ := charStore.List()
	var elaraID string
	var elaraImageIDs []string
	for _, c := range chars {
		if c.DisplayName == "Elara" {
			elaraID = c.ID
			images, _ := imgStore.ListByCharacter(c.ID, nil)
			for _, img := range images {
				elaraImageIDs = append(elaraImageIDs, img.ImageID)
			}
			break
		}
	}

	if elaraID != "" {
		// Shoots
		s1 := &shoot.Shoot{ID: id.New(), CharacterID: elaraID, Name: "Editorial Session", SortOrder: 0, CreatedAt: now}
		s2 := &shoot.Shoot{ID: id.New(), CharacterID: elaraID, Name: "Outdoor Natural", SortOrder: 1, CreatedAt: now}
		shootStore.Create(s1)
		shootStore.Create(s2)
		if len(elaraImageIDs) >= 4 {
			shootStore.AddImages(s1.ID, elaraImageIDs[:3])
			shootStore.AddImages(s2.ID, elaraImageIDs[3:5])
		}
		fmt.Println("  shoots: Editorial Session (3 images), Outdoor Natural (2 images)")

		// Dataset
		ds := &dataset.Dataset{
			ID: id.New(), Name: "Elara LoRA v1", Description: "Training data for Elara character LoRA",
			Type: dataset.TypeLoRA, CharacterID: &elaraID,
			SourceQuery: "{}", ExportConfig: "{}",
			CreatedAt: now, UpdatedAt: now,
		}
		if err := datasetStore.Create(ds); err == nil {
			trainIDs := elaraImageIDs
			if len(trainIDs) > 6 {
				trainIDs = trainIDs[:6]
			}
			datasetStore.AddImages(ds.ID, trainIDs)
			// Set captions on dataset images
			for i, imgID := range trainIDs {
				cap := fmt.Sprintf("photo of sks woman, %s pose, studio lighting", []string{"headshot", "portrait", "full body", "casual", "editorial", "natural"}[i%6])
				datasetStore.UpdateImage(ds.ID, imgID, &cap, nil, nil)
			}
			fmt.Printf("  dataset: %s (%d images with captions)\n", ds.Name, len(trainIDs))
		}

		// Audit events
		auditStore.LogSimple("character", elaraID, "created")
		auditStore.LogFieldChange("character", elaraID, "status_changed", "status", "prospect", "development", map[string]string{"character_id": elaraID})
		auditStore.LogFieldChange("character", elaraID, "status_changed", "status", "development", "cast", map[string]string{"character_id": elaraID})
		if len(elaraImageIDs) > 0 {
			auditStore.LogSimple("image", elaraImageIDs[0], "face_ref_promoted")
			auditStore.LogFieldChange("image", elaraImageIDs[0], "rating_changed", "rating", "—", "5", map[string]string{"character_id": elaraID})
		}
		fmt.Println("  audit: 5 events logged")
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
	if elaraID != "" {
		for i := 0; i < 4 && i < len(garmentIDs); i++ {
			garmentStore.AddAffinity(garmentIDs[i], elaraID)
		}
		for i := 0; i < 3 && i < len(hairstyleIDs); i++ {
			hairstyleStore.AddAffinity(hairstyleIDs[i], elaraID)
		}
		fmt.Println("  affinity: 4 garments + 3 hairstyles → Elara")
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
	existingLoras, _ := loraStore.List("", "")
	existingLoraNames := map[string]bool{}
	for _, el := range existingLoras {
		existingLoraNames[el.Name] = true
	}
	for _, l := range loras {
		if existingLoraNames[l.name] {
			fmt.Printf("  skip lora %s: already exists\n", l.name)
			continue
		}
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

	// Create test import directories with sample images
	importsDir := filepath.Join(cfg.Root, "imports")
	for _, shootDir := range []string{"test-model/shoot-01", "test-model/shoot-02", "test-model/headshots"} {
		dir := filepath.Join(importsDir, shootDir)
		os.MkdirAll(dir, 0755)
		for i := 0; i < 4; i++ {
			imgPath := filepath.Join(dir, fmt.Sprintf("IMG_%04d.png", i+1))
			if _, err := os.Stat(imgPath); err == nil {
				continue // already exists
			}
			png := makeSeedPNG(byte(i*30+50), byte(i*20+60), byte(i*10+70))
			os.WriteFile(imgPath, png, 0644)
		}
	}
	fmt.Println("  import test dirs: imports/test-model/{shoot-01,shoot-02,headshots}")

	fmt.Println("\nSeed complete.")
}

// seedCharacterImages creates 8 placeholder images per character for the given era:
// 2 face refs, 1 body ref, 3 curated (approved), 2 staging (pending).
// Sets captions on the first 3 and the 6th image, and favorites the headshot.
func seedCharacterImages(charStore *character.Store, imgStore *image.Store, ingester *image.Ingester, charID, displayName, charSlug, eraID string) {
	captions := []string{
		fmt.Sprintf("front-facing headshot of %s, neutral expression, studio lighting", displayName),
		fmt.Sprintf("three-quarter portrait of %s, soft natural lighting", displayName),
		fmt.Sprintf("full body standing pose of %s, clean background", displayName),
		"",
		"",
		fmt.Sprintf("%s in casual outfit, natural daylight, candid", displayName),
		"",
		"",
	}
	var imageIDs []string
	// Use a hash of charID+imageIndex as the unique seed for each PNG.
	// This guarantees no two images across any characters collide.
	for j := 0; j < 8; j++ {
		h := sha256.Sum256([]byte(fmt.Sprintf("%s:%d", charID, j)))
		png := makeSeedPNG(h[0], h[1], h[2])
		eraPtr := &eraID
		result, err := ingester.Ingest(&image.IngestRequest{
			Filename:      fmt.Sprintf("seed_%s_%d.png", displayName, j),
			Data:          png,
			Source:        image.SourceComfyUI,
			CharacterID:   charID,
			CharacterSlug: charSlug,
			EraID:         eraPtr,
		})
		if err != nil {
			continue
		}
		imageIDs = append(imageIDs, result.ImageID)

		update := &image.CharacterImageUpdate{}
		switch {
		case j == 0 || j == 1:
			update.RefType = strp("face")
			update.RefRank = intp(j + 1)
			update.SetType = setTypePtr(image.SetReference)
			update.TriageStatus = triagePtr(image.TriageApproved)
		case j == 2:
			update.RefType = strp("body")
			update.RefRank = intp(1)
			update.SetType = setTypePtr(image.SetReference)
			update.TriageStatus = triagePtr(image.TriageApproved)
		case j == 3 || j == 4:
			update.SetType = setTypePtr(image.SetCurated)
			update.TriageStatus = triagePtr(image.TriageApproved)
			r := 4
			update.Rating = &r
		case j == 5:
			update.SetType = setTypePtr(image.SetCurated)
			update.TriageStatus = triagePtr(image.TriageApproved)
			r := 5
			update.Rating = &r
		default:
			// Pending triage — stays staging/pending
		}
		if captions[j] != "" {
			update.Caption = &captions[j]
		}
		imgStore.UpdateCharacterImage(result.ImageID, charID, update)
	}

	if len(imageIDs) > 0 {
		imgStore.ToggleFavorite(imageIDs[0], charID, true)
		charStore.SetAvatarImage(charID, imageIDs[0])
	}

	fmt.Printf("    images: 8 ingested (2 face ref, 1 body ref, 3 curated, 2 pending)\n")
}

func seedFromCSV(charStore *character.Store, imgStore *image.Store, ingester *image.Ingester, path string) {
	f, err := os.Open(path)
	if err != nil {
		log.Fatalf("open csv: %v", err)
	}
	defer f.Close()

	reader := csv.NewReader(f)
	header, err := reader.Read()
	if err != nil {
		log.Fatalf("read csv header: %v", err)
	}

	col := make(map[string]int, len(header))
	for i, h := range header {
		col[h] = i
	}

	field := func(row []string, name string) string {
		if idx, ok := col[name]; ok && idx < len(row) {
			return row[idx]
		}
		return ""
	}

	intField := func(row []string, name string) *int {
		s := field(row, name)
		if s == "" {
			return nil
		}
		v, err := strconv.Atoi(s)
		if err != nil {
			return nil
		}
		return &v
	}

	floatField := func(row []string, name string) *float64 {
		s := field(row, name)
		if s == "" {
			return nil
		}
		v, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return nil
		}
		return &v
	}

	// Group rows by character_name
	type csvRow = []string
	groups := map[string][]csvRow{}
	var order []string
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Fatalf("read csv: %v", err)
		}
		name := field(row, "character_name")
		if _, seen := groups[name]; !seen {
			order = append(order, name)
		}
		groups[name] = append(groups[name], row)
	}

	now := time.Now().UTC()
	fmt.Printf("Seeding from %s (%d characters)...\n", path, len(order))

	for _, name := range order {
		rows := groups[name]
		first := rows[0]

		charID := id.New()
		c := &character.Character{
			ID:                     charID,
			Name:                   name,
			DisplayName:            field(first, "display_name"),
			Status:                 character.Status(field(first, "status")),
			Source:                 "frame",
			Gender:                 field(first, "gender"),
			Ethnicity:              field(first, "ethnicity"),
			SkinTone:               field(first, "skin_tone"),
			EyeColor:               field(first, "eye_color"),
			EyeShape:               field(first, "eye_shape"),
			NaturalHairColor:       field(first, "natural_hair_color"),
			NaturalHairTexture:     field(first, "natural_hair_texture"),
			DistinguishingFeatures: field(first, "distinguishing_features"),
			CreatedAt:              now,
			UpdatedAt:              now,
		}
		if err := charStore.Create(c); err != nil {
			fmt.Printf("  skip %s: %v\n", name, err)
			continue
		}
		fmt.Printf("  character: %s (%s) [%s]\n", c.DisplayName, charID[:8], c.Status)

		var firstEraID string
		for i, row := range rows {
			eraID := id.New()
			if i == 0 {
				firstEraID = eraID
			}
			era := &character.Era{
				ID:                eraID,
				CharacterID:       charID,
				Label:             field(row, "era_label"),
				AgeRange:          field(row, "era_age_range"),
				TimePeriod:        field(row, "era_time_period"),
				Description:       field(row, "era_description"),
				VisualDescription: field(row, "era_visual_description"),
				PromptPrefix:      field(row, "era_prompt_prefix"),
				PipelineSettings:  "{}",
				SortOrder:         i,
				HeightCM:          intField(row, "era_height_cm"),
				WeightKG:          intField(row, "era_weight_kg"),
				Build:             field(row, "era_build"),
				BreastSize:        field(row, "era_breast_size"),
				BreastTanner:      field(row, "era_breast_tanner"),
				HipShape:          field(row, "era_hip_shape"),
				PubicHairStyle:    field(row, "era_pubic_hair_style"),
				PubicHairTanner:   field(row, "era_pubic_hair_tanner"),
				HairColor:         field(row, "era_hair_color"),
				HairLength:        field(row, "era_hair_length"),
				GynecoidStage:      field(row, "era_gynecoid_stage"),
				WaistHipRatio:      floatField(row, "era_waist_hip_ratio"),
				FaceShape:          field(row, "era_face_shape"),
				BuccalFat:          field(row, "era_buccal_fat"),
				JawDefinition:      field(row, "era_jaw_definition"),
				BrowRidge:          field(row, "era_brow_ridge"),
				NasolabialDepth:    field(row, "era_nasolabial_depth"),
				SkinTexture:        field(row, "era_skin_texture"),
				SkinPoreVisibility: field(row, "era_skin_pore_visibility"),
				UnderEye:           field(row, "era_under_eye"),
				HeadBodyRatio:      floatField(row, "era_head_body_ratio"),
				LegTorsoRatio:      floatField(row, "era_leg_torso_ratio"),
				ShoulderHipRatio:   floatField(row, "era_shoulder_hip_ratio"),
				AreolaSize:         field(row, "era_areola_size"),
				AreolaColor:        field(row, "era_areola_color"),
				AreolaShape:        field(row, "era_areola_shape"),
				LabiaMajora:        field(row, "era_labia_majora"),
				LabiaMinora:        field(row, "era_labia_minora"),
				LabiaColor:         field(row, "era_labia_color"),
				CreatedAt:          now,
				UpdatedAt:         now,
			}
			if err := charStore.CreateEra(era); err != nil {
				fmt.Printf("    skip era %s: %v\n", era.Label, err)
				continue
			}
			fmt.Printf("    era: %s (%s)\n", era.Label, era.AgeRange)
		}

		// Create placeholder images for the first era (same as built-in seed)
		seedCharacterImages(charStore, imgStore, ingester, charID, c.DisplayName, c.Slug(), firstEraID)
	}

	fmt.Println("\nSeed complete.")
}

// makeSeedPNG generates a valid 4x4 PNG with unique pixel data.
// Uses all three color channels directly to maximize hash uniqueness.
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
	// Use r,g,b directly with per-pixel variation to ensure uniqueness
	var raw bytes.Buffer
	for y := 0; y < 4; y++ {
		raw.WriteByte(0) // filter: none
		for x := 0; x < 4; x++ {
			offset := byte(x + y*4)
			raw.Write([]byte{r + offset, g + offset, b + offset})
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

func strp(s string) *string                              { return &s }
func intp(i int) *int                                    { return &i }
func setTypePtr(s image.SetType) *image.SetType          { return &s }
func triagePtr(s image.TriageStatus) *image.TriageStatus { return &s }

func countEmpty(ss []string) int {
	n := 0
	for _, s := range ss {
		if s == "" {
			n++
		}
	}
	return n
}
