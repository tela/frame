# Prompt Template Library

## Job

Create, manage, and organize reusable prompt templates for image generation. Templates decouple creative direction from character identity — the same template can be used across any character and era.

Templates are organized by facets, not by era. A template defines the kind of image to make; the era provides the visual identity of the character.

## Concepts

### Template
A reusable generation recipe with:
- **Name** (e.g., "Studio Portrait — Neutral")
- **Prompt body** — the text prompt, excluding character-specific prefix
- **Negative prompt**
- **Facet tags** — categorization for browsing and filtering
- **Generation parameters** — suggested steps, CFG, sampler, dimensions (overridable per-use)
- **Example images** — optional, showing what this template typically produces

### Facets
Templates are tagged with facets for organization and filtering:
- **pose**: portrait, full-body, seated, dynamic, etc.
- **clothing**: nude, lingerie, swimwear, casual, formal, specific-garment
- **intimacy**: standard, close-up, intimate
- **style**: photorealistic, 3d, illustration
- **setting**: studio, outdoor, interior
- **expression**: neutral, emotive, specific
- **purpose**: catalog-standard, creative, reference-building, training-data

### Standard Catalog Templates
A special subset of templates that define the "standard catalog" — the baseline set of images every character at every era should have. These ensure visual consistency across the character library:
- Standard portrait (face, neutral, studio)
- Full body neutral (standing, studio)
- Standard outfits: each era has assigned standard garments (swimsuit, dress, pants/shorts). Every character in the same era wears the same garment styles for catalog consistency.
- Expression series (neutral, smile, serious — same pose, varied expression)

The standard catalog concept connects templates to eras via standard outfit assignments: era X uses swimsuit style Y, dress style Z. When generating catalog images, the template pulls the era-appropriate garment reference from Frame's media library.

### Era-Garment Assignments
Each era has a set of standard garments assigned to it:
- Era "Young Adult" → swimsuit: black bikini, dress: red sundress, pants: blue jeans
- Era "Teen" → swimsuit: one-piece, dress: floral print, pants: shorts

These assignments live in Frame (not Fig) since they're about visual catalog consistency. When a catalog template is used, it automatically references the era's assigned garment.

## What It Shows

### Template Browser
- Grid or list of all templates
- Filter by facet tags
- Search by name or prompt text
- Show: template name, facet tags, example image (if any), usage count

### Template Detail / Editor
- Name, prompt body, negative prompt (editable)
- Facet tags (editable)
- Generation parameters (editable)
- Example images (if any)
- Usage history: which characters/eras this template has been used for

### Standard Catalog Manager
- View the standard catalog template set
- Per-era garment assignments (which garment items are assigned to each era)
- Coverage report: which characters are missing standard catalog images

## Actions

- Create, edit, duplicate, delete templates
- Tag templates with facets
- Assign standard garments to eras
- View catalog coverage per character/era
- Use a template (navigates to Studio with template pre-loaded)

## Data Requirements

- Template CRUD endpoints
- Facet tag system (could reuse image tag infrastructure or be separate)
- Era-garment assignment storage
- Template usage tracking
- Media library access for garment references

## Notes

- Templates should be easy to duplicate and modify. "Copy this template, change the clothing facet" is a common workflow.
- The standard catalog concept is powerful for maintaining consistency but shouldn't be rigid — the user should be able to add or remove catalog templates and garment assignments freely.
- Era-garment assignments create a matrix: eras × garment types. This could get large. Keep the UI focused on one era at a time.
