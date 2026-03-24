# Gap Analysis and Implementation Priorities

## Date: 2026-03-24

### Priority 1: Complete the Core Loop (import → triage → curate → use)

These are blocking the app from being usable for its primary job.

#### 1.1 Image curation actions in Era Workspace
- Rate images from the grid (1-5 stars)
- Apply tags to images (family-aware tag picker)
- Change set type (staging → reference, curated, training, archive)
- Promote images to face ref / body ref with scoring
- Bulk select and act on multiple images
- **Status: Gap** — images render but no actions are wired

#### 1.2 Triage queue connected to real data
- Query pending images by character/era from the API
- Accept/reject/archive actions call the API to update triage_status
- Triage decisions persist across sessions
- Queue auto-advances after each decision
- **Status: Gap** — UI exists with keyboard bindings but no data flows through

#### 1.3 Image search backend
- API endpoint supporting multi-faceted filtering: character, era, tags (with AND/OR), rating, source, set type, date range
- Pagination for large result sets
- Frontend search screen connected to this API
- "Add to dataset" action from search results
- **Status: Gap** — filter UI exists but no backend query

#### 1.4 Captioning
- Caption field on images (text column in DB)
- Caption editing UI in era workspace and dataset detail
- Caption templates with variables: [character], [era], [pose], [expression], etc.
- Auto-generate caption from tags + character prompt prefix
- Bulk captioning (apply template to selection)
- Export captions in Kohya format alongside images
- **Status: Not built at all**

#### 1.5 Prompt template persistence
- Database table for templates (name, prompt body, negative prompt, facet tags, parameters)
- CRUD API endpoints
- Frontend creates/edits/deletes real templates (currently hardcoded mock data)
- Templates available in Studio dropdown
- **Status: Gap** — UI shows mocks, no persistence

### Priority 2: Unconsidered Jobs

#### 2.1 Version history / audit trail
- Track when images are promoted to ref, when tags change, when datasets are modified
- Queryable history per character, era, or image
- Important for reproducibility: if a LoRA trains well, need to know exactly what the dataset looked like
- **Status: Not considered until now**

#### 2.2 Prompt template persistence (same as 1.5)
- Already listed above — critical for Studio to be functional

#### 2.3 Standard catalog management
- Era-specific standard outfits (swimsuit, dress, shorts per era)
- Assignment UI: which garment items belong to which era as catalog standards
- Coverage report: which characters are missing catalog images
- Ties into prompt templates (catalog template + era garment = generation request)
- **Status: Discussed in architecture but not built**

### Implementation Order

```
1.1 Era workspace curation actions  ←── most impactful, unblocks daily use
1.2 Triage queue data connection    ←── completes the intake workflow
1.3 Image search backend            ←── unlocks dataset building
1.4 Captioning                      ←── required for training export
1.5 Prompt template persistence     ←── required for Studio
2.1 Audit trail                     ←── reproducibility for training
2.3 Standard catalog management     ←── visual consistency across characters
```

### What's Working and Doesn't Need Attention Now

- Character/era CRUD
- Image ingestion pipeline (hash, dedup, thumbnails)
- Directory and file import
- Dataset CRUD with fork
- Tag taxonomy (families, namespaces, values)
- Media items (wardrobe, props, locations)
- Reference package API
- Bifrost client (waiting on providers)
- Backend test suite
- Folder organization (character slugs, feature folders)
