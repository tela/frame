package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type exportRequest struct {
	OutputDir        string `json:"output_dir"`
	Format           string `json:"format,omitempty"`            // "original" (default) — format conversion not yet supported
	UseCharCaptions  bool   `json:"use_char_captions,omitempty"` // fall back to character_images.caption if dataset caption is empty
	NamingConvention string `json:"naming,omitempty"`            // "id" (default), "sequential"
	RepeatCount      int    `json:"repeat_count,omitempty"`      // Kohya repeat count — creates {n}_{classtoken} subfolder
	ClassToken       string `json:"class_token,omitempty"`       // Kohya class token, e.g. "sks woman"
}

type exportResult struct {
	DatasetID string `json:"dataset_id"`
	OutputDir string `json:"output_dir"`
	Exported  int    `json:"exported"`
	Skipped   int    `json:"skipped"`
	Errors    int    `json:"errors"`
	Captions  int    `json:"captions"`
}

func (a *API) exportDataset(w http.ResponseWriter, r *http.Request) {
	dsID := r.PathValue("id")

	var req exportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.OutputDir == "" {
		writeError(w, http.StatusBadRequest, "output_dir is required")
		return
	}

	// Verify dataset exists
	ds, err := a.Datasets.Get(dsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ds == nil {
		writeError(w, http.StatusNotFound, "dataset not found")
		return
	}

	// Get included images
	images, err := a.Datasets.ListImages(dsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Determine output directory — Kohya format uses {n}_{class} subfolder
	outputDir := req.OutputDir
	if req.RepeatCount > 0 && req.ClassToken != "" {
		subdir := fmt.Sprintf("%d_%s", req.RepeatCount, req.ClassToken)
		outputDir = filepath.Join(req.OutputDir, subdir)
	}

	if err := os.MkdirAll(outputDir, 0755); err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("create output dir: %v", err))
		return
	}

	result := exportResult{
		DatasetID: dsID,
		OutputDir: outputDir,
	}

	seqNum := 0
	for _, dsImg := range images {
		if !dsImg.Included {
			result.Skipped++
			continue
		}

		// Get image metadata
		img, err := a.Images.Get(dsImg.ImageID)
		if err != nil || img == nil {
			result.Errors++
			continue
		}

		// Resolve source file path
		srcPath := a.resolveImagePath(dsImg.ImageID, img.Format)
		if srcPath == "" {
			result.Errors++
			continue
		}

		// Determine output filename
		seqNum++
		var baseName string
		if req.NamingConvention == "sequential" {
			baseName = fmt.Sprintf("%04d", seqNum)
		} else {
			baseName = dsImg.ImageID
		}
		ext := "." + img.Format
		outPath := filepath.Join(outputDir, baseName+ext)

		// Copy the file
		if err := copyFile(srcPath, outPath); err != nil {
			result.Errors++
			continue
		}

		// Resolve caption: dataset caption > character caption > none
		caption := ""
		if dsImg.Caption != nil && *dsImg.Caption != "" {
			caption = *dsImg.Caption
		} else if req.UseCharCaptions {
			ci, _ := a.Images.GetCharacterImage(dsImg.ImageID)
			if ci != nil && ci.Caption != nil && *ci.Caption != "" {
				caption = *ci.Caption
			}
		}

		// Write caption sidecar
		if caption != "" {
			captionPath := filepath.Join(outputDir, baseName+".txt")
			if err := os.WriteFile(captionPath, []byte(caption), 0644); err != nil {
				// Non-fatal — image was exported, caption failed
			} else {
				result.Captions++
			}
		}

		result.Exported++
	}

	if a.Audit != nil {
		a.Audit.Log("dataset", dsID, "exported", nil, nil, nil,
			map[string]string{"output_dir": outputDir, "exported": fmt.Sprintf("%d", result.Exported)})
	}

	writeJSON(w, http.StatusOK, result)
}

// resolveImagePath finds the filesystem path for an image.
func (a *API) resolveImagePath(imageID, format string) string {
	ci, _ := a.Images.GetCharacterImage(imageID)
	if ci != nil {
		folderName := ci.CharacterID
		char, err := a.Characters.Get(ci.CharacterID)
		if err == nil && char != nil && char.FolderName != "" {
			folderName = char.FolderName
		}
		return a.Ingester.OriginalPath(imageID, folderName, format)
	}
	return a.Ingester.ReferenceOriginalPath(imageID, format)
}

func copyFile(src, dst string) error {
	// If src doesn't exist, check without extension variants
	if _, err := os.Stat(src); os.IsNotExist(err) {
		dir := filepath.Dir(src)
		base := strings.TrimSuffix(filepath.Base(src), filepath.Ext(src))
		for _, ext := range []string{".png", ".jpg", ".jpeg", ".webp"} {
			alt := filepath.Join(dir, base+ext)
			if _, err := os.Stat(alt); err == nil {
				src = alt
				break
			}
		}
	}

	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
