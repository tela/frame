# Frame UI — Screen Overview

Frame is a photo studio and archive for cast character visual identity. It serves three roles:

1. **Archive** — stores all character images from any source (Fig, ComfyUI, Frame studio, manual import)
2. **Photo studio** — drives image generation and refinement for cast characters via Bifrost/ComfyUI
3. **Curation tool** — triage, tagging, reference package assembly, training dataset assembly

## Screen Map

| Screen | Primary Job |
|--------|-------------|
| Character Library | Browse and find characters across all statuses |
| Character Detail | View a character's eras, images, and visual identity status |
| Era Workspace | Manage all images and visual identity for a specific era |
| Triage Queue | Classify incoming images: delete, archive, or tag for use |
| Studio | Generate and refine images for a cast character |
| Tag Manager | Browse, search, and bulk-edit tags across images |
| Image Search | Cross-character, multi-filter search for dataset assembly |
| Prompt Template Library | Create and manage reusable generation templates |
| Media Library | Browse wardrobe, props, and locations |
| Media Item Detail | View a media item and its images |

## Navigation Model

- **Top-level**: Character Library, Media Library, Prompt Templates, Image Search
- **Character drill-down**: Character Detail → Era Workspace → Triage / Studio
- **Global**: Tag Manager is accessible from any context where tagging is relevant

## Keyboard-Driven Workflows

The triage and tagging workflows must be keyboard-driven. When reviewing dozens of images, mouse-clicking through each one is too slow. Key bindings for:
- Next/previous image
- Accept/reject/archive
- Quick-tag application (bound to number keys or letter keys)
- Rating (1-5)
