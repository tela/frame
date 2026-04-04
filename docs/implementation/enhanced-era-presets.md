# Enhanced Era Presets - Implementation Plan

## Overview
Expand the era preset system from 7 options to 12, with finer granularity for developmental years (8-20) where physical appearance changes most dramatically.

## Branch
`feat/enhanced-era-presets`

## Goals
1. Update frontend ERA_PRESETS constant with new 12-preset system
2. Update backend default era creation to align with new system
3. Maintain backward compatibility with existing character eras
4. No database schema changes required (eras use freeform strings)
5. Documentation updates

## New Era Presets

```typescript
const ERA_PRESETS = [
  { label: 'Young Child', ageRange: '8-9' },
  { label: 'Older Child', ageRange: '10-11' },
  { label: 'Early Teen', ageRange: '12-13' },
  { label: 'Mid Teen', ageRange: '14-15' },
  { label: 'Teen', ageRange: '16-17' },
  { label: 'Late Teen', ageRange: '18-20' },
  { label: 'Young Adult', ageRange: '21-25' },
  { label: 'Early Prime', ageRange: '26-32' },
  { label: 'Late Prime', ageRange: '33-40' },
  { label: 'Midlife', ageRange: '41-50' },
  { label: 'Senior', ageRange: '51-65' },
  { label: 'Elder', ageRange: '66+' },
] as const
```

## Changes Required

### 1. Frontend Changes

#### File: `ui/src/components/new-character-dialog.tsx`
- **Line 83-91**: Update ERA_PRESETS constant
- **Default selection**: Keep index 0 (was "Late Teen", now "Young Child") OR change to index 5 ("Late Teen") to maintain current default behavior
- **UI consideration**: 12 options instead of 7 may require layout adjustment if design mockups show different presentation

**Decision needed**: Should default era selection be:
- Option A: Index 5 (Late Teen 18-20) - matches current default
- Option B: Index 0 (Young Child 8-9) - new first option
- Option C: Add logic to default based on context/user preference

### 2. Backend Changes

#### File: `pkg/api/characters.go`
- **Lines 76-84**: Update default era label and age range
- Current: `"Late Teen"` / `"18-20"`
- New: Keep same (still valid in new preset list) OR change to match frontend default

```go
// Current defaults (lines 76-84)
eraLabel := req.EraLabel
if eraLabel == "" {
    eraLabel = "Late Teen"  // Still valid in new system
}
eraAgeRange := req.EraAgeRange
if eraAgeRange == "" {
    eraAgeRange = "18-20"   // Still valid in new system
}
```

**Recommendation**: Keep current backend defaults unchanged since "Late Teen" (18-20) remains in the new preset list.

### 3. Seed Data Changes

#### File: `cmd/frame/cmd_seed.go`
- **Lines 92-94, 100-101, 107**: Currently creates "Standard", "Young Adult", "Mature", "Gothic Phase" eras
- These labels are **not** in the new preset list
- **Decision**: Keep seed data unchanged (demonstrates that non-preset era labels are still valid) OR update to use new preset labels

**Recommendation**: Update seed data to use new preset labels for consistency:
```go
// Elara Voss
{label: "Late Teen", ageRange: "18-20", timePeriod: "Present day"},
{label: "Young Adult", ageRange: "21-25", timePeriod: "Present day"},
{label: "Late Prime", ageRange: "33-40", timePeriod: "Present day"},

// Nyx Ashford
{label: "Late Teen", ageRange: "18-20", timePeriod: "Present day"},
{label: "Teen", ageRange: "16-17", timePeriod: "Present day"},

// Celeste Moreau
{label: "Late Teen", ageRange: "18-20", timePeriod: "Present day"},
```

### 4. Documentation Updates

#### File: `docs/generation-pipeline.md`
- Update example era JSON (lines 9-19) to reflect new preset labels

#### New File: `docs/era-presets.md`
Create comprehensive documentation explaining:
- Era preset system
- Rationale for granularity distribution (narrow for 8-20, wider for 21+)
- Visual development use case
- Freeform era labels still supported
- Migration notes for existing characters

### 5. Test Updates

#### Files to check:
- `tests/integration/character_api_test.go` (line 141: "Young Adult")
- `tests/integration/curation_test.go` (uses "Standard" era)
- `tests/integration/compose_test.go` (uses "Standard" era)
- `tests/integration/generation_pipeline_test.go` (references "Standard" era)
- `tests/integration/journeys_test.go` (uses "Young Adult")
- `tests/integration/fig_integration_test.go` (uses "Young Adult")

**Recommendation**: Keep test eras unchanged to verify backward compatibility with non-preset labels.

## Implementation Sequence (Atomic Commits)

### Commit 1: Frontend - Update ERA_PRESETS constant
- File: `ui/src/components/new-character-dialog.tsx`
- Change: Update ERA_PRESETS array (lines 83-91)
- Decide and implement default selection index
- Test: New character dialog displays 12 options

### Commit 2: Documentation - Add era presets reference
- New file: `docs/era-presets.md`
- Document new preset system
- Explain rationale and use cases
- Migration guidance

### Commit 3: Seed data - Update to new preset labels (optional)
- File: `cmd/frame/cmd_seed.go`
- Update seed character eras to use new preset labels
- Maintain semantic equivalence (e.g., "Standard" 20 → "Late Teen" 18-20)

### Commit 4: Documentation - Update generation pipeline example
- File: `docs/generation-pipeline.md`
- Update example era JSON to use new preset label

## Backward Compatibility

### Existing Characters
- ✅ No breaking changes - era labels are freeform strings
- ✅ Existing eras with labels like "Standard", "Gothic Phase" remain valid
- ✅ UI will continue to display any era label
- ✅ Only new character creation uses presets

### API Compatibility
- ✅ POST `/api/v1/characters` accepts any era_label/era_age_range
- ✅ PATCH `/api/v1/eras/:id` accepts any label/age_range
- ✅ No validation against preset list

## Design Deliverables Needed

### You mentioned working on new character designs
These implementation questions depend on your designs:

1. **Era selection UI**: 
   - Grid layout (3×4, 4×3, 2×6)?
   - Visual grouping (Childhood | Teens | Adult | Later Life)?
   - Age range visibility (equal prominence or secondary)?

2. **Default selection**:
   - Should it default to "Late Teen" (most common casting age)?
   - Or "Young Child" (first in list)?
   - Or none selected (force explicit choice)?

3. **Custom era option**:
   - Should there be a "Custom" option to enter arbitrary label/range?
   - Or is preset selection required?

4. **Multi-era creation**:
   - Currently creates one era per character
   - Should new character dialog support creating multiple eras at once?

## Open Questions

1. **Default era selection**: Which preset should be default (index 0 or 5)?
2. **Seed data alignment**: Update seed data to new labels or leave as-is?
3. **UI layout**: Does 12 options require design adjustment vs current 7?
4. **Custom era entry**: Should new character dialog allow freeform era labels?

## Testing Strategy

### Manual Testing
1. Create new character → verify 12 preset options display correctly
2. Select each preset → verify label and age range populate correctly
3. Create character → verify era created in database with correct values
4. Verify existing characters with old era labels display correctly

### Automated Testing
- No new test files needed (backward compatible)
- Existing tests verify freeform era labels still work
- Consider adding test case for each new preset label (optional)

## Migration Notes

### For Existing Users
- No action required
- Existing character eras remain unchanged
- New preset options available when creating new characters
- Old era labels ("Standard", etc.) remain valid and functional

### For Developers
- ERA_PRESETS is frontend-only (not enforced by backend)
- Backend still accepts any string for era label/age_range
- Tests using hardcoded era labels don't need updates

## Rollout Plan

1. Merge design mockups → review era selection UI layout
2. Implement frontend changes (commit 1)
3. Add documentation (commit 2)
4. Optional: Update seed data (commit 3)
5. Optional: Update docs examples (commit 4)
6. Test end-to-end
7. Merge to main

## Estimated Effort
- Frontend changes: 30 minutes
- Documentation: 1 hour
- Seed data updates: 15 minutes (optional)
- Testing: 30 minutes
- **Total: ~2.5 hours**

## Success Criteria
- ✅ New character dialog displays 12 era presets
- ✅ Default selection matches intended behavior
- ✅ Character creation succeeds with any preset
- ✅ Existing characters/eras unaffected
- ✅ Documentation updated
- ✅ No breaking changes
