package preprocess

import "time"

// Operation represents a single preprocessing step.
type Operation struct {
	Type      string         `json:"type"`      // crop, resize, upscale, rotate, pad, format_convert
	Params    map[string]any `json:"params"`
	Timestamp time.Time      `json:"timestamp"`
}

// Supported operation types.
const (
	OpCrop          = "crop"
	OpResize        = "resize"
	OpUpscale       = "upscale"
	OpRotate        = "rotate"
	OpPad           = "pad"
	OpFormatConvert = "format_convert"
)

// Derivative is a preprocessed version of an image with full operation history.
type Derivative struct {
	ID            string      `json:"id"`
	SourceImageID string      `json:"source_image_id"`
	Operations    []Operation `json:"operations"`
	CreatedAt     time.Time   `json:"created_at"`
}

// Preset is a saved operation chain for reuse.
type Preset struct {
	ID         string      `json:"id"`
	Name       string      `json:"name"`
	Operations []Operation `json:"operations"`
	CreatedAt  time.Time   `json:"created_at"`
}

// Lineage traces an image back to its original through derivative chain.
type Lineage struct {
	Original    string       `json:"original"`
	Chain       []Derivative `json:"chain"`
}
