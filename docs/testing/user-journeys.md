# User Journeys and Test Scenarios

Each journey represents a job-to-be-done with the specific steps a user takes to complete it. These map directly to integration test scenarios.

---

## Journey 1: Scout a New Character from Images

**Job:** I found some images that could be a great character. I want to bring them into Frame and start exploring the look.

**Steps:**
1. Open Character Library
2. Click "New Entry"
3. Enter name "Celeste Noir", display name "Celeste"
4. Optionally drop initial images into the dialog
5. Click Create → lands on Celeste's prospect profile
6. Upload 5 images via drag-and-drop onto the profile
7. View images in the Scrapbook tab
8. Favorite 3 images → they appear in the Lookbook tab
9. The best favorited image becomes the character avatar

**Verifications:**
- Character exists with status `prospect`, source `frame`
- Folder created: `assets/characters/celeste-{hash}/images/`
- 5 images ingested, thumbnails generated
- 3 images have `is_favorited=true`
- Avatar endpoint serves the first favorited image
- Character appears in Character Library with Prospect badge

---

## Journey 2: Develop a Prospect into a Full Character

**Job:** Celeste has a strong look. I want to commit to developing her and publish her to Fig.

**Steps:**
1. Open Celeste's prospect profile
2. Click "Develop Character"
3. Confirm the transition
4. Status changes to `development`
5. Character published to Fig (when Fig is available)
6. "Published to Fig" indicator appears
7. "Open in Fig" link appears with character ID

**Verifications:**
- Status changed from `prospect` to `development`
- `fig_published` set to true (when Fig integration is active)
- Character ID visible in the UI
- Standard image generation pipeline triggered (when Bifrost available)

---

## Journey 3: Import Existing Images for a Character

**Job:** I have a folder of 20 images from a ComfyUI session. I need to bring them into Frame for Eleanor's Young Adult era.

**Steps:**
1. Open Import screen
2. Enter directory path OR browse and select files
3. Select character: Eleanor
4. Select era: Young Adult (if available)
5. Set source: ComfyUI
6. Add initial tags: `pose:portrait`, `quality:high`
7. Click Execute Import
8. See progress: 20 imported, 0 skipped, 0 failed
9. Navigate to Eleanor → Young Adult era workspace
10. See 20 new images in the grid

**Verifications:**
- 20 images in the database linked to Eleanor
- All tagged with `pose:portrait` and `quality:high`
- Thumbnails generated for all
- Dedup: re-importing same folder shows 20 skipped
- Images appear in the era workspace grid

---

## Journey 4: Import Reference Images (No Character)

**Job:** I downloaded 30 body reference images for training data. They're not tied to any character.

**Steps:**
1. Open Import screen
2. Browse and select 30 files
3. Leave character empty (standalone)
4. Set source: Manual
5. Add tags: `body-area:torso`, `quality:high`
6. Click Execute Import
7. See 30 imported in results

**Verifications:**
- 30 images in database with no `character_images` record
- Stored in `assets/references/images/`
- All tagged
- Searchable via Image Search with `has_character=false`

---

## Journey 5: Triage Incoming Images

**Job:** 15 new images landed for Eleanor's Haunting era. I need to quickly decide which are worth keeping.

**Steps:**
1. Navigate to Eleanor → The Haunting era workspace
2. See "15 Unsorted Assets" triage banner
3. Click "Begin Triage" → enters triage queue
4. For each image:
   - Press A to accept (good image)
   - Press R to reject (bad quality)
   - Press X to archive (keep but not active)
   - Press 1-5 to rate
   - Press T to open tag picker → apply tags → close
5. See progress counter: "8 accepted, 5 rejected, 2 archived"
6. Queue exhausted → "Triage Complete" summary
7. Return to era workspace → only accepted images in the grid

**Verifications:**
- 15 images start with `triage_status=pending`
- After triage: 8 approved, 5 rejected, 2 archived
- Ratings persisted
- Tags applied via picker persisted
- Audit log has events for each triage decision and rating
- Era workspace shows only non-rejected images

---

## Journey 6: Curate Images in an Era Workspace

**Job:** I need to organize Eleanor's Young Adult images — rate them, tag them, promote the best ones to face references.

**Steps:**
1. Open Eleanor → Young Adult era workspace
2. See grid of images
3. Click star rating on individual images (1-5)
4. Select 3 images → click "Tag" → tag picker opens
5. Select family: Character Identity → namespace: Pose → value: Front-facing
6. Apply → all 3 images tagged
7. Select the best front-facing image → click "Face" toggle → promoted to face ref
8. Select a full-body image → click "Body" toggle → promoted to body ref
9. Select 5 images → bulk action "Reference" → set type changed
10. Verify reference package has face and body refs

**Verifications:**
- Ratings persisted on individual images
- Tags applied via picker (tag in `image_tags` table with family/namespace/value)
- Face ref: `is_face_ref=true` on the image
- Body ref: `is_body_ref=true` on the image
- Set type changes persisted
- Reference package API returns the promoted refs
- Audit log has events for all changes

---

## Journey 7: Search and Build a Dataset

**Job:** I need to assemble a LoRA training dataset from Eleanor's best front-facing portraits.

**Steps:**
1. Open Image Search
2. Filter: Character = Eleanor
3. Filter: Tag = `pose:front-facing`
4. Filter: Rating >= 4
5. See filtered results
6. Select 10 images
7. Click "Add to Dataset" → choose "Create New Dataset"
8. Enter name: "Eleanor Face LoRA v1", type: LoRA, character: Eleanor
9. Dataset created with 10 images
10. Navigate to Dataset Detail
11. Review images, toggle 2 to excluded
12. Write captions on each image
13. Fork dataset → "Eleanor Face LoRA v2"
14. Modify the fork (add 3 more images, remove 1)

**Verifications:**
- Search returns correct filtered results
- Dataset created with 10 images
- 2 images have `included=false`
- Captions persisted per dataset image
- Fork creates new dataset with same images
- Fork is independently modifiable
- Audit log tracks dataset creation and image additions

---

## Journey 8: Tag Management and Taxonomy

**Job:** I need to set up the NSFW tag taxonomy and then use it to tag images.

**Steps:**
1. Open Tag Manager
2. Select NSFW family
3. Switch to Taxonomy tab
4. See existing namespaces: body-area, clothing-state, intimacy-level
5. Click "Add Namespace" → create "content-type"
6. Open body-area namespace → see existing values
7. Add new value: "intimate-close-up"
8. Switch to Usage tab → see tags in use across images
9. Select a tag → rename it
10. Select another tag → merge it into a different tag
11. Delete an unused tag

**Verifications:**
- New namespace created under NSFW family
- New value created under body-area namespace
- Tag rename updates all image references
- Tag merge reassigns all usages
- Tag delete removes from all images
- Taxonomy validation: new tags must use defined namespaces/values

---

## Journey 9: Generate Images in Studio

**Job:** I need more portrait images of Eleanor in her Young Adult era.

**Steps:**
1. Navigate to Eleanor → Young Adult → Studio
2. Select template: "Cinematic Close-up (35mm)"
3. See prompt pre-populated from template
4. Check "Include era reference package"
5. Click "Select custom references" → pick 3 additional images
6. Edit prompt: add lighting details
7. Click Generate
8. See processing indicator
9. Result appears → Accept (keep) or Reject (discard)
10. Accepted image appears in the era's staging set

**Verifications:**
- Generation request sent with prompt + reference images
- Bifrost status checked before enabling generate button
- Generated image ingested with source: comfyui
- Image linked to character + era
- Generation metadata (prompt, seed) stored
- Audit log tracks generation

---

## Journey 10: Create and Manage Prompt Templates

**Job:** I want to save my best prompts as reusable templates.

**Steps:**
1. Open Prompt Template Library
2. Click "New Template"
3. Enter name: "Dramatic Noir Portrait"
4. Write prompt body with [SUBJECT] and [LIGHTING] variables
5. Set negative prompt
6. Create → appears in the grid
7. Click a template → "Use in Studio" → opens Studio with template loaded
8. Duplicate a template → modify the copy
9. Delete an old template

**Verifications:**
- Template persisted in database
- Template appears in library grid
- Usage count increments when used in Studio
- Duplicate creates independent copy
- Delete removes template

---

## Journey 11: View Audit Trail

**Job:** A LoRA trained well. I need to see exactly what happened to the images in the dataset.

**Steps:**
1. Open a dataset detail
2. Click on an image → navigate to image detail
3. Switch to "Audit History" tab
4. See chronological events: ingested, rated, tagged, promoted to ref, added to dataset
5. Each event shows timestamp, action, old/new values, context

**Verifications:**
- Audit events exist for: character creation, image ingestion, triage decisions, rating changes, tag additions, set type changes, ref promotions, dataset additions
- Events are queryable by entity type and ID
- Events are ordered chronologically (newest first)
- Context includes character_id, dataset_name where applicable

---

## Journey 12: Deploy and Update

**Job:** I have new code and need to update Frame on the secured drive.

**Steps:**
1. `git pull origin main`
2. `make deploy DRIVE=/Volumes/SECURED`
3. See "Deploy complete" with binary path and instructions
4. Stop old Frame: `pkill frame`
5. Start new Frame: `cd /Volumes/SECURED && ./frame`
6. Frame starts, runs migrations automatically
7. All existing data intact, new features available

**Verifications:**
- Binary copied to drive
- frame.toml preserved (not overwritten)
- assets/ directory intact
- New migrations applied on startup
- All existing characters, images, datasets accessible
- New features available in the UI

---

## Journey 13: Encrypted Drive Lifecycle

**Job:** I'm done working. I want to eject the drive and ensure no character data remains on the host.

**Steps:**
1. Stop Frame: Ctrl+C or `pkill frame`
2. Frame shuts down gracefully (SQLite safe)
3. Eject drive
4. No frame.db, no images, no thumbnails on host
5. Re-mount drive, restart Frame → everything is back

**Verifications:**
- Graceful shutdown on SIGINT/SIGTERM
- No files written outside the drive root
- All data accessible after re-mount
- Fig health check fails within 5 seconds of Frame stopping (when Fig integration is active)

---

## Coverage Matrix

| Journey | API Test | UI Test | Smoke Test |
|---------|----------|---------|------------|
| 1. Scout character | ✓ | Future | Partial (section 17) |
| 2. Develop prospect | ✓ | Future | — |
| 3. Import for character | ✓ | Future | Partial (section 6) |
| 4. Import references | ✓ | Future | — |
| 5. Triage | ✓ | Future | Partial (section 24) |
| 6. Curate era | ✓ | Future | Partial (section 24) |
| 7. Search + dataset | ✓ | Future | Partial (sections 11, 23) |
| 8. Tag taxonomy | ✓ | Future | Partial (sections 9-10, 13) |
| 9. Generate | Blocked on Bifrost | Future | — |
| 10. Templates | ✓ | Future | Partial (sections 21-22) |
| 11. Audit trail | ✓ | Future | Partial (sections 25-26) |
| 12. Deploy | Manual | — | — |
| 13. Drive lifecycle | Manual | — | — |
