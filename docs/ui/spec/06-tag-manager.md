# Tag Manager

## Job

Understand and manage the tag taxonomy across all images. Tags are the query language for finding images — for IPAdapter reference selection, LoRA training dataset assembly, and general organization. The tag manager lets the user see what tags exist, how they're distributed, and apply them in bulk.

## Who Uses This

The user, when:
- Setting up or refining the tag taxonomy (what namespaces and values should exist)
- Finding and fixing tagging gaps (images missing important tags)
- Bulk-applying tags to groups of images
- Understanding tag distribution (how many images have each tag)

## What It Shows

### Tag Taxonomy Overview
Organized by namespace:
- **pose**: front-facing, three-quarter, profile, full-body, upper-body, close-up, seated, standing, lying, dynamic
- **expression**: neutral, smile, serious, playful, seductive, surprised, contemplative
- **angle**: eye-level, high-angle, low-angle, overhead, dutch
- **lighting**: studio, natural, dramatic, soft, rim, backlighting
- **clothing**: nude, lingerie, casual, formal, swimwear, specific-outfit (linked to wardrobe item)
- **quality**: high, medium, low, artifact, needs-detailing
- **style**: photorealistic, 3d-render, illustration, painterly
- **purpose**: reference, training, gallery, catalog
- **body-part**: face, hands, full-body, torso, legs (for detail/crop focus)

Each tag shows:
- Tag value
- Image count using this tag
- Last used date

### Tag Distribution View
Visual summary of tag coverage:
- How many images are untagged (across all or per character/era)
- Which tag namespaces have sparse coverage
- Heatmap or bar chart of tag frequency

### Bulk Tagging
- Select images via search/filter (uses the same filtering as Image Search)
- Apply one or more tags to the entire selection
- Remove tags from a selection

### Tag Editing
- Rename a tag value (updates all images using it)
- Merge two tag values (e.g., merge "smiling" into "smile")
- Delete a tag value (removes from all images)
- Create new namespaces

## Actions

- Browse tag taxonomy by namespace
- View images with a specific tag
- Bulk apply/remove tags
- Rename, merge, delete tags
- Create namespaces and tag values

## Data Requirements

- Tag listing endpoint: all tags with counts, filterable by namespace
- Image query endpoint: filter images by tag combination
- Bulk tag operations: apply/remove tags to a set of image IDs
- Tag mutation: rename, merge, delete

## Notes

- The tag taxonomy should be seeded with sensible defaults on first use, but fully customizable.
- Tag suggestions during triage and curation should be informed by what tags exist and are commonly used.
- Consider auto-tagging as a future feature: running a local tagger (WD tagger) to suggest tags for untagged images. The `source` field on image_tags distinguishes manual from auto tags.
