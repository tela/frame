package preprocess

import (
	"bytes"
	"fmt"
	goimage "image"
	"image/jpeg"
	"image/png"
	"math"

	"golang.org/x/image/draw"
)

// Apply executes a sequence of operations on image data and returns the result.
func Apply(data []byte, ops []Operation) ([]byte, string, error) {
	img, format, err := goimage.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, "", fmt.Errorf("decode: %w", err)
	}

	for _, op := range ops {
		img, err = applyOp(img, op)
		if err != nil {
			return nil, "", fmt.Errorf("op %s: %w", op.Type, err)
		}
		if op.Type == OpFormatConvert {
			if f, ok := op.Params["format"].(string); ok {
				format = f
			}
		}
	}

	var buf bytes.Buffer
	switch format {
	case "jpeg", "jpg":
		quality := 90
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
			return nil, "", fmt.Errorf("encode jpeg: %w", err)
		}
		format = "jpg"
	default:
		if err := png.Encode(&buf, img); err != nil {
			return nil, "", fmt.Errorf("encode png: %w", err)
		}
		format = "png"
	}

	return buf.Bytes(), format, nil
}

func applyOp(img goimage.Image, op Operation) (goimage.Image, error) {
	switch op.Type {
	case OpCrop:
		return applyCrop(img, op.Params)
	case OpResize:
		return applyResize(img, op.Params)
	case OpRotate:
		return applyRotate(img, op.Params)
	case OpPad:
		return applyPad(img, op.Params)
	case OpFormatConvert:
		return img, nil // format change handled in Apply
	default:
		return nil, fmt.Errorf("unknown operation: %s", op.Type)
	}
}

func applyCrop(img goimage.Image, params map[string]any) (goimage.Image, error) {
	x := intParam(params, "x", 0)
	y := intParam(params, "y", 0)
	w := intParam(params, "width", img.Bounds().Dx())
	h := intParam(params, "height", img.Bounds().Dy())

	rect := goimage.Rect(x, y, x+w, y+h).Intersect(img.Bounds())
	dst := goimage.NewRGBA(goimage.Rect(0, 0, rect.Dx(), rect.Dy()))
	draw.Copy(dst, goimage.Point{}, img, rect, draw.Src, nil)
	return dst, nil
}

func applyResize(img goimage.Image, params map[string]any) (goimage.Image, error) {
	w := intParam(params, "width", 0)
	h := intParam(params, "height", 0)

	if w == 0 && h == 0 {
		return nil, fmt.Errorf("resize: width or height required")
	}

	bounds := img.Bounds()
	srcW, srcH := bounds.Dx(), bounds.Dy()

	// Maintain aspect ratio if only one dimension specified
	if w == 0 {
		w = int(math.Round(float64(srcW) * float64(h) / float64(srcH)))
	} else if h == 0 {
		h = int(math.Round(float64(srcH) * float64(w) / float64(srcW)))
	}

	dst := goimage.NewRGBA(goimage.Rect(0, 0, w, h))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
	return dst, nil
}

func applyRotate(img goimage.Image, params map[string]any) (goimage.Image, error) {
	degrees := intParam(params, "degrees", 0)
	bounds := img.Bounds()
	srcW, srcH := bounds.Dx(), bounds.Dy()

	switch degrees % 360 {
	case 90, -270:
		dst := goimage.NewRGBA(goimage.Rect(0, 0, srcH, srcW))
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				dst.Set(srcH-1-(y-bounds.Min.Y), x-bounds.Min.X, img.At(x, y))
			}
		}
		return dst, nil
	case 180, -180:
		dst := goimage.NewRGBA(goimage.Rect(0, 0, srcW, srcH))
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				dst.Set(srcW-1-(x-bounds.Min.X), srcH-1-(y-bounds.Min.Y), img.At(x, y))
			}
		}
		return dst, nil
	case 270, -90:
		dst := goimage.NewRGBA(goimage.Rect(0, 0, srcH, srcW))
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				dst.Set(y-bounds.Min.Y, srcW-1-(x-bounds.Min.X), img.At(x, y))
			}
		}
		return dst, nil
	case 0:
		return img, nil
	default:
		return nil, fmt.Errorf("rotate: only 90/180/270 degree rotations supported")
	}
}

func applyPad(img goimage.Image, params map[string]any) (goimage.Image, error) {
	top := intParam(params, "top", 0)
	bottom := intParam(params, "bottom", 0)
	left := intParam(params, "left", 0)
	right := intParam(params, "right", 0)

	bounds := img.Bounds()
	newW := bounds.Dx() + left + right
	newH := bounds.Dy() + top + bottom

	dst := goimage.NewRGBA(goimage.Rect(0, 0, newW, newH))
	// Fill with background color (white by default)
	// Then draw the source image at the offset
	draw.Copy(dst, goimage.Pt(left, top), img, bounds, draw.Src, nil)
	return dst, nil
}

func intParam(params map[string]any, key string, def int) int {
	v, ok := params[key]
	if !ok {
		return def
	}
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	case int64:
		return int(n)
	default:
		return def
	}
}
