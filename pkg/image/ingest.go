package image

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/disintegration/imaging"

	"github.com/tela/frame/pkg/id"
)

const thumbnailWidth = 300

// Ingester handles the image ingestion pipeline.
type Ingester struct {
	store    *Store
	rootPath string // drive root for file storage
}

// NewIngester creates a new Ingester.
func NewIngester(store *Store, rootPath string) *Ingester {
	return &Ingester{store: store, rootPath: rootPath}
}

// Ingest processes an incoming image: hashes, deduplicates, writes to disk,
// generates a thumbnail, and creates database records.
func (ing *Ingester) Ingest(req *IngestRequest) (*IngestResult, error) {
	isCharacterImage := req.CharacterID != ""

	// Hash for dedup
	hash := sha256sum(req.Data)

	// Check for duplicate
	existing, err := ing.store.GetByHash(hash)
	if err != nil {
		return nil, fmt.Errorf("check duplicate: %w", err)
	}
	if existing != nil {
		// Link existing image to character if not already linked
		if isCharacterImage {
			ci := &CharacterImage{
				ImageID:      existing.ID,
				CharacterID:  req.CharacterID,
				EraID:        req.EraID,
				SetType:      SetStaging,
				TriageStatus: TriagePending,
				CreatedAt:    time.Now().UTC(),
			}
			// Ignore error if already linked (unique constraint)
			ing.store.CreateCharacterImage(ci)
		}
		return &IngestResult{
			ImageID:     existing.ID,
			Hash:        existing.Hash,
			Width:       existing.Width,
			Height:      existing.Height,
			Format:      existing.Format,
			FileSize:    existing.FileSize,
			IsDuplicate: true,
		}, nil
	}

	// Detect format and dimensions
	format, width, height, err := detectImage(req.Data)
	if err != nil {
		return nil, fmt.Errorf("detect image: %w", err)
	}

	imageID := id.New()
	now := time.Now().UTC()

	// Resolve disk path — flat storage per character or references
	var origDir, thumbDir string
	if isCharacterImage {
		charFolder := req.CharacterSlug
		if charFolder == "" {
			charFolder = req.CharacterID
		}
		origDir = filepath.Join(ing.rootPath, "assets", "characters", charFolder, "images")
		thumbDir = filepath.Join(ing.rootPath, "assets", "characters", charFolder, "thumbs")
	} else {
		origDir = filepath.Join(ing.rootPath, "assets", "references", "images")
		thumbDir = filepath.Join(ing.rootPath, "assets", "references", "thumbs")
	}

	// Write original to disk (atomic: write temp, rename into place)
	if err := os.MkdirAll(origDir, 0755); err != nil {
		return nil, fmt.Errorf("create original dir: %w", err)
	}
	origFile := filepath.Join(origDir, imageID+"."+format)
	if err := atomicWriteFile(origFile, req.Data, 0644); err != nil {
		return nil, fmt.Errorf("write original: %w", err)
	}

	// Generate thumbnail (atomic: write temp, rename into place)
	if err := os.MkdirAll(thumbDir, 0755); err != nil {
		return nil, fmt.Errorf("create thumb dir: %w", err)
	}
	if err := generateThumbnail(req.Data, filepath.Join(thumbDir, imageID+".jpg")); err != nil {
		return nil, fmt.Errorf("generate thumbnail: %w", err)
	}

	// Create DB records
	img := &Image{
		ID:               imageID,
		Hash:             hash,
		OriginalFilename: req.Filename,
		Format:           format,
		Width:            width,
		Height:           height,
		FileSize:         int64(len(req.Data)),
		Source:           req.Source,
		IngestedAt:       now,
	}
	if err := ing.store.Create(img); err != nil {
		return nil, fmt.Errorf("create image record: %w", err)
	}

	if isCharacterImage {
		ci := &CharacterImage{
			ImageID:      imageID,
			CharacterID:  req.CharacterID,
			EraID:        req.EraID,
			SetType:      SetStaging,
			TriageStatus: TriagePending,
			CreatedAt:    now,
		}
		if err := ing.store.CreateCharacterImage(ci); err != nil {
			return nil, fmt.Errorf("create character image link: %w", err)
		}
	}

	return &IngestResult{
		ImageID:  imageID,
		Hash:     hash,
		Width:    width,
		Height:   height,
		Format:   format,
		FileSize: int64(len(req.Data)),
	}, nil
}

// IngestVideo processes an incoming video: hashes, deduplicates, writes to disk,
// writes a thumbnail (from ThumbnailData or a placeholder), and creates database records.
func (ing *Ingester) IngestVideo(req *IngestRequest) (*IngestResult, error) {
	if req.CharacterID == "" {
		return nil, fmt.Errorf("character_id is required for video ingest")
	}

	hash := sha256sum(req.Data)

	existing, err := ing.store.GetByHash(hash)
	if err != nil {
		return nil, fmt.Errorf("check duplicate: %w", err)
	}
	if existing != nil {
		ci := &CharacterImage{
			ImageID:      existing.ID,
			CharacterID:  req.CharacterID,
			EraID:        req.EraID,
			SetType:      SetStaging,
			TriageStatus: TriagePending,
			CreatedAt:    time.Now().UTC(),
		}
		ing.store.CreateCharacterImage(ci)
		return &IngestResult{
			ImageID:     existing.ID,
			Hash:        existing.Hash,
			Format:      existing.Format,
			FileSize:    existing.FileSize,
			IsDuplicate: true,
		}, nil
	}

	videoID := id.New()
	now := time.Now().UTC()

	charFolder := req.CharacterSlug
	if charFolder == "" {
		charFolder = req.CharacterID
	}

	// Store video in videos/ subdir
	videoDir := filepath.Join(ing.rootPath, "assets", "characters", charFolder, "videos")
	if err := os.MkdirAll(videoDir, 0755); err != nil {
		return nil, fmt.Errorf("create video dir: %w", err)
	}
	videoFile := filepath.Join(videoDir, videoID+".mp4")
	if err := atomicWriteFile(videoFile, req.Data, 0644); err != nil {
		return nil, fmt.Errorf("write video: %w", err)
	}

	// Write thumbnail from source image data (if provided)
	thumbDir := filepath.Join(ing.rootPath, "assets", "characters", charFolder, "thumbs")
	if err := os.MkdirAll(thumbDir, 0755); err != nil {
		return nil, fmt.Errorf("create thumb dir: %w", err)
	}
	if len(req.ThumbnailData) > 0 {
		if err := generateThumbnail(req.ThumbnailData, filepath.Join(thumbDir, videoID+".jpg")); err != nil {
			// Non-fatal — video was stored, thumbnail failed
		}
	}

	img := &Image{
		ID:               videoID,
		Hash:             hash,
		OriginalFilename: req.Filename,
		Format:           "mp4",
		Width:            0,
		Height:           0,
		FileSize:         int64(len(req.Data)),
		Source:            req.Source,
		IngestedAt:       now,
	}
	if err := ing.store.Create(img); err != nil {
		return nil, fmt.Errorf("create video record: %w", err)
	}

	ci := &CharacterImage{
		ImageID:      videoID,
		CharacterID:  req.CharacterID,
		EraID:        req.EraID,
		SetType:      SetStaging,
		TriageStatus: TriagePending,
		CreatedAt:    now,
	}
	if err := ing.store.CreateCharacterImage(ci); err != nil {
		return nil, fmt.Errorf("create character video link: %w", err)
	}

	return &IngestResult{
		ImageID:  videoID,
		Hash:     hash,
		Format:   "mp4",
		FileSize: int64(len(req.Data)),
	}, nil
}

// VideoPath returns the filesystem path for a character video.
func (ing *Ingester) VideoPath(videoID, charFolder string) string {
	return filepath.Join(ing.rootPath, "assets", "characters", charFolder, "videos", videoID+".mp4")
}

// OriginalPath returns the filesystem path for an original character image.
func (ing *Ingester) OriginalPath(imageID, charFolder, format string) string {
	return filepath.Join(ing.rootPath, "assets", "characters", charFolder, "images", imageID+"."+format)
}

// ThumbnailPath returns the filesystem path for a character image thumbnail.
func (ing *Ingester) ThumbnailPath(imageID, charFolder string) string {
	return filepath.Join(ing.rootPath, "assets", "characters", charFolder, "thumbs", imageID+".jpg")
}

// ReferenceOriginalPath returns the filesystem path for a reference image original.
func (ing *Ingester) ReferenceOriginalPath(imageID, format string) string {
	return filepath.Join(ing.rootPath, "assets", "references", "images", imageID+"."+format)
}

// ReferenceThumbnailPath returns the filesystem path for a reference image thumbnail.
func (ing *Ingester) ReferenceThumbnailPath(imageID string) string {
	return filepath.Join(ing.rootPath, "assets", "references", "thumbs", imageID+".jpg")
}

func sha256sum(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}

func detectImage(data []byte) (format string, width, height int, err error) {
	reader := bytes.NewReader(data)

	// Try PNG
	if pngImg, pngErr := png.Decode(reader); pngErr == nil {
		bounds := pngImg.Bounds()
		return "png", bounds.Dx(), bounds.Dy(), nil
	}

	// Try JPEG
	reader.Reset(data)
	if jpgImg, jpgErr := jpeg.Decode(reader); jpgErr == nil {
		bounds := jpgImg.Bounds()
		return "jpg", bounds.Dx(), bounds.Dy(), nil
	}

	// Try via imaging (handles more formats)
	reader.Reset(data)
	img, imgErr := imaging.Decode(reader)
	if imgErr != nil {
		return "", 0, 0, fmt.Errorf("unsupported image format")
	}
	bounds := img.Bounds()

	// Guess format from first bytes
	format = guessFormat(data)
	return format, bounds.Dx(), bounds.Dy(), nil
}

func guessFormat(data []byte) string {
	if len(data) >= 8 {
		pngSig := []byte{0x89, 0x50, 0x4e, 0x47}
		if bytes.HasPrefix(data, pngSig) {
			return "png"
		}
	}
	if len(data) >= 2 && data[0] == 0xFF && data[1] == 0xD8 {
		return "jpg"
	}
	if len(data) >= 4 && string(data[:4]) == "RIFF" {
		return "webp"
	}
	return "unknown"
}

// atomicWriteFile writes data to a temp file then renames it into place,
// so the destination never contains a partial write.
func atomicWriteFile(path string, data []byte, perm os.FileMode) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), ".tmp-*")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpPath)
		return err
	}
	if err := os.Chmod(tmpPath, perm); err != nil {
		os.Remove(tmpPath)
		return err
	}
	return os.Rename(tmpPath, path)
}

func generateThumbnail(data []byte, outPath string) error {
	img, err := imaging.Decode(bytes.NewReader(data))
	if err != nil {
		return err
	}

	thumb := imaging.Resize(img, thumbnailWidth, 0, imaging.Lanczos)

	// Write to temp file (preserving extension for format detection)
	// then rename for atomicity.
	dir := filepath.Dir(outPath)
	ext := filepath.Ext(outPath)
	tmp, err := os.CreateTemp(dir, ".tmp-*"+ext)
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	tmp.Close()

	switch strings.ToLower(ext) {
	case ".jpg", ".jpeg":
		err = imaging.Save(thumb, tmpPath, imaging.JPEGQuality(85))
	default:
		err = imaging.Save(thumb, tmpPath)
	}
	if err != nil {
		os.Remove(tmpPath)
		return err
	}
	return os.Rename(tmpPath, outPath)
}
