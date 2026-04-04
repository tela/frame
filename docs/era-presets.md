# Era Presets

## Overview

Eras represent distinct phases of a character's visual development in Frame. Each era captures a specific age range with associated physical attributes, allowing for consistent portrayal across different life stages.

## Purpose

The era system serves three primary functions:

1. **Visual Consistency**: Provides targeted generation parameters for age-appropriate character portrayal
2. **Lifecycle Documentation**: Tracks character evolution across time periods and age ranges
3. **Reference Organization**: Groups images and assets by developmental phase

## Preset System

Frame provides 12 standard era presets organized by developmental stage. These are **suggestions** for new character creation—users can create custom eras with any label and age range.

### Childhood Eras (Ages 8-17)

| Preset | Age Range | Description |
|--------|-----------|-------------|
| Young Child | 8-9 | Late childhood, pre-pubescent |
| Older Child | 10-11 | Pre-adolescent, final childhood years |
| Early Teen | 12-13 | Puberty onset, early adolescence |
| Mid Teen | 14-15 | Growth spurt phase, mid-puberty |
| Teen | 16-17 | Physical near-maturity, high school years |

**Rationale**: Narrow 2-year spans capture rapid physical changes during developmental years. Visual appearance varies significantly year-over-year during puberty and growth phases.

### Early Adulthood (Ages 18-40)

| Preset | Age Range | Description |
|--------|-----------|-------------|
| Late Teen | 18-20 | Adult features finalized, young adult |
| Young Adult | 21-25 | Early career phase, peak physicality |
| Early Prime | 26-32 | Professional establishment, maintained physique |
| Late Prime | 33-40 | Experience and maturity, stable appearance |

**Rationale**: Medium granularity (4-7 years) as physical changes slow after adolescence. A 26-year-old and 30-year-old are visually similar compared to a 13-year-old vs 15-year-old.

### Later Years (Ages 41+)

| Preset | Age Range | Description |
|--------|-----------|-------------|
| Midlife | 41-50 | Middle career, gradual aging |
| Senior | 51-65 | Later career, visible aging signs |
| Elder | 66+ | Retirement age, advanced aging |

**Rationale**: Coarse granularity (10-15+ years) as aging becomes gradual and predictable. Visual differences are less pronounced decade-over-decade.

## Granularity Distribution

```
Ages 8-20  (12 years): 6 presets = 2.0 year average span
Ages 21-40 (19 years): 4 presets = 4.75 year average span
Ages 41+   (25+ years): 3 presets = 8.3+ year average span
```

This distribution prioritizes precision where visual changes are most dramatic (developmental years) and efficiency where appearance stabilizes (adulthood).

## Usage in Frame

### New Character Creation

When creating a character, the new character dialog presents all 12 presets grouped by stage:
- **Childhood Eras** (5-column grid)
- **Early Adulthood** (4-column grid)
- **Later Years** (3-column grid)

The default selection is **"Late Teen" (18-20)**, the most common casting age for new characters.

### Backend Behavior

The backend accepts any era label and age range—presets are frontend suggestions only. When a character is created:

1. The selected preset's label and age range are sent to the API
2. The backend creates an era record with those values
3. No validation against preset list occurs

### Custom Eras

Users can add additional eras to characters at any time with arbitrary labels:
- Time-specific: "1950s", "Victorian Era", "Post-War"
- Style-specific: "Gothic Phase", "Athletic Period", "Corporate Years"
- Project-specific: "Season 1", "Flashback Sequence", "Alternate Timeline"

The preset system provides starting points—it doesn't constrain creativity.

## Era Data Structure

Each era contains:

### Core Fields
- **Label**: Human-readable name (e.g., "Late Teen", "Mature")
- **Age Range**: Numeric or descriptive (e.g., "18-20", "Late 30s")
- **Time Period**: Historical/temporal context (e.g., "Present day", "1950s")
- **Description**: Narrative context for the era
- **Visual Description**: Appearance notes for generation
- **Prompt Prefix**: Text prepended to generation prompts

### Physical Attributes (Era-Varying)
Eras can store age-specific physical attributes:
- Body measurements (height, weight, build, ratios)
- Sexual characteristics (breast size, hip shape, developmental stages)
- Hair (color, length, style)
- Facial features (face shape, buccal fat, jaw definition, skin texture)
- Developmental attributes (areola, labia, other NSFW characteristics)

See `/pkg/character/types.go` for complete schema.

### Character-Level Immutable Attributes
These remain constant across all eras (stored on character record):
- Gender
- Ethnicity
- Skin tone
- Eye color and shape
- Natural hair color and texture
- Distinguishing features (scars, birthmarks, etc.)

## Use Cases

### 1. Age Progression Tracking
Document a character's appearance across their lifetime:
```
Character: "Maya Chen"
  - Early Teen (12-13): Initial reference set
  - Late Teen (18-20): Professional portfolio
  - Young Adult (21-25): Peak performance years
  - Late Prime (33-40): Mature character roles
```

### 2. Period-Specific Portrayal
Same character in different time periods:
```
Character: "Eleanor Voss"
  - 1920s Era (Age: 25): Flapper aesthetic
  - 1940s Era (Age: 45): War-era maturity
  - 1960s Era (Age: 65): Elder statesperson
```

### 3. Style Evolution
Track character through aesthetic phases:
```
Character: "Nyx Ashford"
  - Teen (16-17): School years baseline
  - Gothic Phase (19-22): Alternative style period
  - Young Adult (23-25): Professional transition
```

## Migration from Old System

The previous era preset system (7 options) has been expanded to 12. Existing characters are unaffected:

### Old Presets (Deprecated)
- Late Teen → Still valid (18-20)
- Young Adult → Still valid (21-25)
- Prime → Replaced by "Early Prime" (26-32)
- Mature → Replaced by "Late Prime" (33-40)
- Mid-Life → Now "Midlife" (41-50, single word)
- Silver → Replaced by "Senior" (51-65)
- Elder → Still valid (66+)

### Migration Strategy

**For new characters**: Use new 12-preset system.

**For existing characters**: No action required. Old era labels remain valid and functional. Optionally:
1. Keep existing eras as-is (recommended)
2. Add new eras using new preset labels alongside old ones
3. Rename old eras to new preset labels if desired

The system is fully backward compatible—no breaking changes.

## Design Rationale

### Why These Age Ranges?

**Developmental Biology**: Physical appearance changes most rapidly during:
- Pre-puberty (8-11): Childhood proportions
- Puberty onset (12-13): Early changes
- Growth spurt (14-15): Maximum annual height gain
- Late puberty (16-17): Sexual characteristic development
- Maturation (18-20): Adult features finalize

After age 20, aging is gradual and predictable, requiring less granularity.

**Casting Industry Alignment**: Standard casting brackets are:
- "18-21", "22-26", "27-35", "35-45", "45-55", "55+"
- Our presets align with industry expectations

**Visual Generation Constraints**: AI models struggle with subtle age differences in adults but can portray distinct developmental stages accurately. Narrow childhood ranges maximize model effectiveness.

### Why Not More Granularity?

**Diminishing Returns**: Beyond 12 presets, the UI becomes cluttered and choice paralysis increases. Most characters need 2-4 eras maximum—12 presets provide sufficient coverage.

**User Flexibility**: Custom eras allow infinite granularity where needed. Presets are starting points, not constraints.

## Technical Implementation

### Frontend
- Presets defined in `ui/src/components/new-character-dialog.tsx`
- TypeScript constant: `ERA_PRESETS`
- Grouped rendering with visual hierarchy

### Backend
- No preset validation—accepts any string
- Default era creation: "Late Teen" (18-20) if not specified
- Stored in `eras` table with foreign key to `characters`

### Database Schema
```sql
CREATE TABLE eras (
    id              TEXT PRIMARY KEY,
    character_id    TEXT NOT NULL REFERENCES characters(id),
    label           TEXT NOT NULL,
    age_range       TEXT NOT NULL DEFAULT '',
    time_period     TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    visual_description TEXT NOT NULL DEFAULT '',
    prompt_prefix   TEXT NOT NULL DEFAULT '',
    -- ... physical attributes ...
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
```

No `era_templates` or `standard_eras` table exists—eras are purely character-owned data.

## Best Practices

### 1. Start with Preset, Customize Later
- Use preset for initial era creation
- Add custom eras for specific needs (time periods, styles, projects)
- Don't feel constrained by preset labels

### 2. Match Era to Use Case
- **Age progression**: Use age-based presets (Early Teen → Late Prime)
- **Period pieces**: Use time-based custom eras (1920s, Victorian)
- **Style evolution**: Use descriptive custom eras (Gothic Phase, Athletic)

### 3. Physical Attributes are Optional
- Presets provide label/age only
- Fill physical attributes as needed for generation consistency
- Leave empty for freeform reference-based generation

### 4. Minimize Era Proliferation
- Most characters need 2-4 eras
- Don't create an era for every photoshoot—use shoots/sessions for that
- Eras are for significant visual phases, not minor variations

## Future Considerations

### Potential Enhancements
- Visual era timeline UI showing character lifecycle
- Era templates with pre-filled physical attributes
- Era-to-era transition generation (morphing/interpolation)
- Era inheritance (copy attributes from parent era)

### Not Planned
- Preset validation enforcement (would break creative flexibility)
- Automated era creation from age metadata
- Era recommendation engine (too opinionated)

## See Also

- [Generation Pipeline](./generation-pipeline.md) - Using eras in image generation
- [Character API](./api-character.md) - Era CRUD operations
- [Physical Attributes](./physical-attributes.md) - Era-level attribute schema
