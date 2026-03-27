package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type smokeResult struct {
	passed int
	failed int
	errors []string
}

func (r *smokeResult) check(name string, ok bool, msg string) {
	if ok {
		r.passed++
		fmt.Printf("  ✓ %s\n", name)
	} else {
		r.failed++
		r.errors = append(r.errors, fmt.Sprintf("%s: %s", name, msg))
		fmt.Printf("  ✗ %s — %s\n", name, msg)
	}
}

var smokeClient = &http.Client{Timeout: 10 * time.Second}
var smokeBase = "http://localhost:7890"

func cmdSmoke() {
	// Allow custom base URL
	if len(os.Args) > 1 {
		smokeBase = os.Args[1]
	}

	fmt.Println("Frame Smoke Test")
	fmt.Println("=================")
	fmt.Printf("Target: %s\n\n", smokeBase)

	r := &smokeResult{}

	// 1. Health
	fmt.Println("Health")
	body, code := smokeGet("/health")
	r.check("health endpoint", code == 200, fmt.Sprintf("status %d", code))

	// 2. Characters
	fmt.Println("\nCharacters")
	body, code = smokeGet("/api/v1/characters")
	r.check("list characters", code == 200, fmt.Sprintf("status %d", code))
	var chars []map[string]any
	json.Unmarshal(body, &chars)
	r.check("has characters", len(chars) > 0, "no characters found — run 'frame seed' first")

	// 3. Character detail with eras
	if len(chars) > 0 {
		charID := chars[0]["id"].(string)
		body, code = smokeGet("/api/v1/characters/" + charID)
		r.check("get character detail", code == 200, fmt.Sprintf("status %d", code))

		var detail map[string]any
		json.Unmarshal(body, &detail)
		eras, _ := detail["eras"].([]any)
		r.check("character has eras", len(eras) > 0, "no eras")

		// 4. Character images
		body, code = smokeGet("/api/v1/characters/" + charID + "/images")
		r.check("list character images", code == 200, fmt.Sprintf("status %d", code))
		var images []map[string]any
		json.Unmarshal(body, &images)
		r.check("has images", len(images) > 0, "no images — run 'frame seed' first")

		// 5. Image serving
		if len(images) > 0 {
			imgID := images[0]["image_id"].(string)
			_, code = smokeGet("/api/v1/images/" + imgID)
			r.check("serve full image", code == 200, fmt.Sprintf("status %d", code))
			_, code = smokeGet("/api/v1/images/" + imgID + "/thumb")
			r.check("serve thumbnail", code == 200, fmt.Sprintf("status %d", code))
		}

		// 6. Reference package
		if len(eras) > 0 {
			era := eras[0].(map[string]any)
			eraID := era["id"].(string)
			body, code = smokeGet(fmt.Sprintf("/api/v1/characters/%s/eras/%s/reference-package", charID, eraID))
			r.check("reference package", code == 200, fmt.Sprintf("status %d", code))

			var refPkg map[string]any
			json.Unmarshal(body, &refPkg)
			faceRefs, _ := refPkg["face_refs"].([]any)
			r.check("has face refs", len(faceRefs) > 0, "no face refs")
		}

		// 7. Shoots
		body, code = smokeGet("/api/v1/characters/" + charID + "/shoots")
		r.check("list shoots", code == 200, fmt.Sprintf("status %d", code))

		// 8. Looks
		body, code = smokeGet("/api/v1/characters/" + charID + "/looks")
		r.check("list looks", code == 200, fmt.Sprintf("status %d", code))

		// 9. Pose set
		if len(eras) > 0 {
			era := eras[0].(map[string]any)
			eraID := era["id"].(string)
			body, code = smokeGet(fmt.Sprintf("/api/v1/characters/%s/pose-set?era_id=%s", charID, eraID))
			r.check("pose set status", code == 200, fmt.Sprintf("status %d", code))
			var poseSet map[string]any
			json.Unmarshal(body, &poseSet)
			total, _ := poseSet["total"].(float64)
			r.check("pose set has 26 slots", int(total) == 26, fmt.Sprintf("got %d", int(total)))
		}
	}

	// 10. Tags
	fmt.Println("\nTags & Taxonomy")
	body, code = smokeGet("/api/v1/tag-families")
	r.check("list tag families", code == 200, fmt.Sprintf("status %d", code))
	var families []map[string]any
	json.Unmarshal(body, &families)
	r.check("has 4+ tag families", len(families) >= 4, fmt.Sprintf("got %d", len(families)))

	body, code = smokeGet("/api/v1/tags")
	r.check("list tags", code == 200, fmt.Sprintf("status %d", code))

	// 11. Standard catalog
	fmt.Println("\nStandard Catalog")
	body, code = smokeGet("/api/v1/standard-poses")
	r.check("standard poses", code == 200, fmt.Sprintf("status %d", code))
	var poses []any
	json.Unmarshal(body, &poses)
	r.check("has 14 standard poses", len(poses) == 14, fmt.Sprintf("got %d", len(poses)))

	body, code = smokeGet("/api/v1/standard-outfits")
	r.check("standard outfits", code == 200, fmt.Sprintf("status %d", code))
	var outfits []any
	json.Unmarshal(body, &outfits)
	r.check("has 3 standard outfits", len(outfits) == 3, fmt.Sprintf("got %d", len(outfits)))

	// 12. LoRAs
	fmt.Println("\nLoRA Registry")
	body, code = smokeGet("/api/v1/loras")
	r.check("list loras", code == 200, fmt.Sprintf("status %d", code))
	var loras []any
	json.Unmarshal(body, &loras)
	r.check("has loras", len(loras) > 0, "no loras — run 'frame seed' first")

	// 13. Media
	fmt.Println("\nMedia Library")
	for _, mtype := range []string{"wardrobe", "prop", "location"} {
		_, code = smokeGet("/api/v1/media/" + mtype)
		r.check(fmt.Sprintf("list %s", mtype), code == 200, fmt.Sprintf("status %d", code))
	}

	// 14. Datasets
	fmt.Println("\nDatasets")
	_, code = smokeGet("/api/v1/datasets")
	r.check("list datasets", code == 200, fmt.Sprintf("status %d", code))

	// 15. Templates
	fmt.Println("\nTemplates")
	_, code = smokeGet("/api/v1/templates")
	r.check("list templates", code == 200, fmt.Sprintf("status %d", code))

	// 16. Search
	fmt.Println("\nSearch")
	body, code = smokeGet("/api/v1/images/search?limit=5")
	r.check("image search", code == 200, fmt.Sprintf("status %d", code))

	// 17. Audit
	fmt.Println("\nAudit")
	body, code = smokeGet("/api/v1/audit?limit=5")
	r.check("audit log", code == 200, fmt.Sprintf("status %d", code))

	// 18. Service status
	fmt.Println("\nServices")
	body, code = smokeGet("/api/v1/fig/status")
	r.check("fig status endpoint", code == 200, fmt.Sprintf("status %d", code))

	body, code = smokeGet("/api/v1/bifrost/status")
	r.check("bifrost status endpoint", code == 200, fmt.Sprintf("status %d", code))

	// 19. Forward-only status enforcement
	fmt.Println("\nStatus Enforcement")
	if len(chars) > 0 {
		// Find a cast character
		for _, c := range chars {
			if c["status"] == "cast" {
				cid := c["id"].(string)
				_, code = smokePatch("/api/v1/characters/"+cid, `{"status":"prospect"}`)
				r.check("reject backward transition", code == 400, fmt.Sprintf("got %d, want 400", code))
				break
			}
		}
	}

	// Summary
	fmt.Println("\n=================")
	fmt.Printf("Results: %d passed, %d failed\n", r.passed, r.failed)
	if r.failed > 0 {
		fmt.Println("\nFailures:")
		for _, e := range r.errors {
			fmt.Printf("  - %s\n", e)
		}
		os.Exit(1)
	}
	fmt.Println("All checks passed.")
}

func smokeGet(path string) ([]byte, int) {
	resp, err := smokeClient.Get(smokeBase + path)
	if err != nil {
		return nil, 0
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return body, resp.StatusCode
}

func smokePatch(path, jsonBody string) ([]byte, int) {
	req, _ := http.NewRequest("PATCH", smokeBase+path, strings.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	resp, err := smokeClient.Do(req)
	if err != nil {
		return nil, 0
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return body, resp.StatusCode
}
