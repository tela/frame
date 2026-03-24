# Frame UI — Screen Overview

Frame is a photo studio and archive for cast character visual identity. It serves four roles:

1. **Archive** — stores all character images from any source (Fig, ComfyUI, Frame studio, manual import)
2. **Photo studio** — drives image generation and refinement for cast characters via Bifrost/ComfyUI
3. **Curation tool** — triage, tagging, reference package assembly, training dataset assembly
4. **Training pipeline** — dataset assembly, image preprocessing, and export for LoRA/IPAdapter training

## Screen Map

| Screen | Primary Job | Spec |
|--------|-------------|------|
| Character Library | Browse and find characters across all statuses | 01 |
| Character Detail | View a character's eras, images, and visual identity status | 02 |
| Era Workspace | Manage all images and visual identity for a specific era | 03 |
| Triage Queue | Classify incoming images: delete, archive, or tag for use | 04 |
| Studio | Generate and refine images for a cast character | 05 |
| Tag Manager | Browse, search, and bulk-edit tags organized by families | 06, 10 |
| Image Search | Cross-character, multi-filter search for dataset assembly | 07 |
| Prompt Template Library | Create and manage reusable generation templates | 08 |
| Media Library | Browse wardrobe, props, and locations | 09 |
| Dataset Manager | Build, manage, and export image collections for training | 11 |
| Dataset Detail | Curate a specific dataset: reorder, caption, toggle images | 12 |
| Import | Bulk import existing images with character/tag assignment | 13 |
| Image Preprocessor | Non-destructive crop, resize, upscale with full history | 14 |

## Navigation Model

- **Top-level**: Character Library, Media Library, Datasets, Prompt Templates, Image Search
- **Character drill-down**: Character Detail → Era Workspace → Triage / Studio
- **Dataset flow**: Image Search → select → Add to Dataset → Dataset Detail → Preprocessor → Export
- **Import**: accessible from top-level, deposits images into characters or standalone pool
- **Global**: Tag Manager and Preprocessor are accessible from any context with images

## Keyboard-Driven Workflows

The triage and tagging workflows must be keyboard-driven. When reviewing dozens of images, mouse-clicking through each one is too slow. Key bindings for:
- Next/previous image
- Accept/reject/archive
- Quick-tag application (bound to number keys or letter keys, grouped by tag family)
- Rating (1-5)
- Family cycling (switch between tag family contexts)
