# 40 — Video Mode in Studio

## Job

Generate short video clips of characters from the Studio. Video mode extends the existing Studio with a fourth generation mode that produces 3-5 second clips from a source image and motion description. The user selects a character image, describes the movement they want, and generates a video clip.

This is the "glamour reel" — short clips that show how a character moves, expresses emotion, and inhabits space. Used for character development, client presentations, and creative exploration.

## Who Uses This

The user developing a character who has established reference images and wants to see them in motion. Requires at least one good character image to use as the source frame.

## What It Shows

### Route: `/characters/{characterId}/eras/{eraId}/studio` (existing route, new mode tab)

Video mode is a fourth tab in the Studio's mode selector, alongside Generate, Refine, and Process.

### Mode Tab Addition

The existing mode tabs row (Generate / Refine / Process) gains a fourth tab:

- **Video** — icon: `movie` (Material Symbols), label: "Video"
- Tab styling matches existing Generate/Refine/Process tabs
- Selecting Video mode changes the panel controls below

### Video Mode Panel

When Video mode is active, the configuration panel shows these controls (replacing the standard Generate/Refine controls):

**Source Image (required):**
- Same image picker as Refine mode — thumbnail preview with select/clear
- This is the starting frame. The video model will animate this image.
- Label: "Starting Frame"
- Helper text: "Select the image to animate. The video will start from this frame."

**Motion Description (required):**
- Large text area (200px height) — replaces the standard prompt field
- Label: "Motion"
- Placeholder: "Describe the movement: slowly turns head toward camera, hair moves with the turn, subtle smile forms..."
- This is the primary creative input. It describes what happens over time.

**Camera Motion:**
- Dropdown select with options: "Static", "Slow Pan Left", "Slow Pan Right", "Dolly In", "Dolly Out", "Orbit", "Gentle Drift"
- Default: "Static"
- Label: "Camera"

**Duration:**
- Button group: 3s / 4s / 5s
- Default: 3s
- Label: "Duration"

**Style / LoRA:**
- Same LoRA selector as other modes (reuse existing component)
- Label: "Style"

**Quality:**
- Same tier selector (Lo / Mid / Hi) as other modes
- Label: "Quality"

**Content Rating:**
- Same SFW/NSFW toggle as other modes

**Generate Button:**
- Label changes to "Generate Video" when in Video mode
- Icon: `movie` with fill
- Same disabled states as other modes (requires source image + motion description)

### Video Results in Gallery

The Session History gallery needs to handle video results:

**Video card (replaces image card when result is video):**
- Same `aspect-[3/4]` container as image results
- Video thumbnail (first frame) displayed as poster
- Play button overlay: centered, 48px circle, `rgba(255,255,255,0.9)` background, `#2F3333` play icon
- On click: plays video inline in the card (not lightbox)
- Video controls: native HTML5 video controls appear on hover (play/pause, scrub, mute)
- Hover overlay: same as image cards (delete, favorite, tag, refine) but "Refine" becomes "Re-generate" for videos

**Generating state (video):**
- Same progress animation as image generation
- But longer expected duration — show "Generating video... (est. 30-60s)" text
- Processing indicator: animated film strip icon instead of model_training

### Job Selector Interaction

When a video job is selected from the Job dropdown (Glamour Clip, Movement Study, Mood Piece), Studio should:
1. Auto-switch to Video mode
2. Populate the Motion field from the job's action prompt
3. Set appropriate defaults (camera, duration, style)

The job catalog already has video jobs defined in the shared prompts package. They map naturally:
- `video_glamour_clip` → Motion: subtle natural movement, Camera: slow push-in, Duration: 3s
- `video_movement_study` → Motion: from job, Camera: static tracking, Duration: 4s
- `video_mood_piece` → Motion: subtle, Camera: barely perceptible drift, Duration: 5s

## Actions

- Select a source image as the starting frame
- Write a motion description
- Choose camera movement, duration, quality
- Generate a video clip
- Play generated video inline in the gallery
- Delete, favorite, or tag video results
- Select a video job from the job catalog to pre-fill settings

## Data

### Endpoints Used

- `POST /api/v1/generate` — same endpoint, but with:
  - `workflow`: a video workflow (e.g., `video_img2vid`, TBD based on Bifrost provider)
  - `source_image_id`: the starting frame
  - `prompt`: the motion description
  - New fields needed in GenerateRequest:
    - `camera_motion`: string (static, pan_left, etc.)
    - `duration`: string ("3s", "4s", "5s")
- Response: same structure, but the generated asset is a video file (mp4) instead of an image

### Backend Changes Needed

1. **GenerateRequest** — add `camera_motion` and `duration` fields
2. **Bifrost ImageGenRequest** — may need video-specific fields (or reuse existing prompt/meta)
3. **Ingester** — needs to handle video files (mp4) in addition to images (png/jpg)
4. **Image store** — the `images` table needs a format field that can be "mp4" (currently just "png"/"jpg")
5. **Thumbnail generation** — extract first frame of video as thumbnail
6. **File serving** — serve video files with proper Content-Type (video/mp4)

### Bifrost Dependency

Video generation requires a video provider in Bifrost. The workflow template needs to accept:
- Source image (the starting frame)
- Motion description (text prompt)
- Camera motion parameters
- Duration

Potential providers: Kling, Runway, Wan, Hunyuan. The specific provider determines the prompt format and what parameters are supported. The Studio UI should be provider-agnostic — it sends the motion description and parameters, and Bifrost routes to the appropriate provider.

## Notes

- Video mode is intentionally simple in V1. One source image, one motion description, one output. No multi-shot editing, no transitions, no audio.
- The motion description field is larger than the standard prompt field because video prompts tend to be more narrative: describing what happens over time rather than a single moment.
- Camera motion as a separate field (not embedded in the prompt) makes it easier to validate and route to providers that have explicit camera control parameters.
- Duration as a button group (not a slider) because video models typically support discrete durations, not arbitrary lengths.
- The generate button should show estimated time prominently — video generation is significantly slower than image generation (30-120s vs 3-45s).
- Playing video inline (not in lightbox) keeps the workflow tight. The user generates, watches, decides to keep or re-generate without leaving the Studio context.
- Video files are larger than images. The UI should show file size in the video card metadata.
- The format field in the images table already exists and can store "mp4". The key backend work is in the ingester (handling non-image files) and thumbnail extraction (ffmpeg or similar).
