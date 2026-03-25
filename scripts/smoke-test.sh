#!/bin/bash
# Frame Manual Smoke Test Script
# Prerequisites: Frame running at http://localhost:7890

BASE=http://localhost:7890/api/v1

echo "========================================="
echo "  Frame Smoke Test"
echo "========================================="

# 1. Health
echo -e "\n--- 1. Health Check ---"
curl -sf $BASE/../health | python3 -m json.tool

# 2. Create characters
echo -e "\n--- 2. Create Characters ---"
curl -s -X POST $BASE/characters \
  -H "Content-Type: application/json" \
  -d '{"id":"char_eleanor_001","name":"Eleanor Vance","display_name":"Eleanor","status":"cast"}' | python3 -m json.tool

curl -s -X POST $BASE/characters \
  -H "Content-Type: application/json" \
  -d '{"id":"char_theo_002","name":"Theodora Crain","display_name":"Theo","status":"development"}' | python3 -m json.tool

# 3. List characters
echo -e "\n--- 3. List Characters ---"
curl -s $BASE/characters | python3 -c "import json,sys; [print(f'  {c[\"display_name\"]:15s} status={c[\"status\"]}') for c in json.load(sys.stdin)]"

# 4. Create eras for Eleanor
echo -e "\n--- 4. Create Eras ---"
curl -s -X POST $BASE/characters/char_eleanor_001/eras \
  -H "Content-Type: application/json" \
  -d '{"id":"era_young_001","label":"Young Adult","preliminary_description":"Early 20s, dark wavy hair","sort_order":1}' | python3 -m json.tool

curl -s -X POST $BASE/characters/char_eleanor_001/eras \
  -H "Content-Type: application/json" \
  -d '{"id":"era_haunt_002","label":"The Haunting","preliminary_description":"Late 20s, haunted expression","sort_order":2}' | python3 -m json.tool

# 5. Get character with eras
echo -e "\n--- 5. Character Detail ---"
curl -s $BASE/characters/char_eleanor_001 | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  {d[\"name\"]} ({d[\"status\"]})')
for e in d['eras']:
    print(f'    Era: {e[\"label\"]:20s} images={e[\"image_count\"]} refs_ready={e[\"reference_package_ready\"]}')
"

# 6. Create test images directory and import
echo -e "\n--- 6. Import Test ---"
TESTDIR=/tmp/frame-import-test
mkdir -p $TESTDIR
# Create minimal valid PNGs
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > $TESTDIR/test1.png
cp $TESTDIR/test1.png $TESTDIR/test2.png
cp $TESTDIR/test1.png $TESTDIR/test3.png

curl -s -X POST $BASE/import/directory \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"$TESTDIR\",\"character_id\":\"char_eleanor_001\",\"era_id\":\"era_young_001\",\"source\":\"manual\",\"tags\":[\"pose:test\",\"quality:high\"]}" | python3 -m json.tool

# 7. Re-import same directory (should show skipped duplicates)
echo -e "\n--- 7. Re-import (Dedup Test) ---"
curl -s -X POST $BASE/import/directory \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"$TESTDIR\",\"character_id\":\"char_eleanor_001\",\"source\":\"manual\"}" | python3 -m json.tool

# 8. Check character now has images
echo -e "\n--- 8. Character After Import ---"
curl -s $BASE/characters/char_eleanor_001 | python3 -c "
import json,sys
d=json.load(sys.stdin)
for e in d['eras']:
    print(f'  Era: {e[\"label\"]:20s} images={e[\"image_count\"]}')
"

# 9. Tag families
echo -e "\n--- 9. Tag Families ---"
curl -s $BASE/tag-families | python3 -c "import json,sys; [print(f'  {f[\"name\"]:25s} id={f[\"id\"]}') for f in json.load(sys.stdin)]"

# 10. List tags
echo -e "\n--- 10. Tags ---"
curl -s "$BASE/tags" | python3 -c "import json,sys; tags=json.load(sys.stdin); [print(f'  {t[\"tag_namespace\"]}:{t[\"tag_value\"]:20s} count={t[\"count\"]}') for t in tags]" 2>/dev/null || echo "  (no tags)"

# 11. Create a dataset
echo -e "\n--- 11. Create Dataset ---"
curl -s -X POST $BASE/datasets \
  -H "Content-Type: application/json" \
  -d '{"name":"Eleanor LoRA v1","type":"lora","description":"Training set for Eleanor","character_id":"char_eleanor_001"}' | python3 -m json.tool

# 12. List datasets
echo -e "\n--- 12. List Datasets ---"
curl -s $BASE/datasets | python3 -c "
import json,sys
for d in json.load(sys.stdin):
    print(f'  {d[\"name\"]:25s} type={d[\"type\"]:10s} images={d[\"image_count\"]}')
"

# 13. Create tag family
echo -e "\n--- 13. Create Tag Family ---"
curl -s -X POST $BASE/tag-families \
  -H "Content-Type: application/json" \
  -d '{"name":"Custom Family","description":"Test family","color":"#4488CC"}' | python3 -m json.tool

# 14. Reference package
echo -e "\n--- 14. Reference Package ---"
curl -s $BASE/characters/char_eleanor_001/eras/era_young_001/reference-package | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Character: {d[\"character_name\"]}')
print(f'  Era: {d[\"era_label\"]}')
print(f'  Face refs: {len(d[\"face_refs\"])}')
print(f'  Body refs: {len(d[\"body_refs\"])}')
"

# 15. Bifrost status
echo -e "\n--- 15. Bifrost Status ---"
curl -s $BASE/bifrost/status | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Available: {d[\"available\"]}')
if 'providers' in d and d['providers']:
    for p in d['providers']:
        mods=','.join(p.get('modalities',[]))
        print(f'    {p[\"name\"]:25s} {mods:10s} state={p.get(\"lifecycle\",{}).get(\"state\",\"?\")}')
"

# 16. Media items
echo -e "\n--- 16. Create Media Items ---"
curl -s -X POST $BASE/media/wardrobe \
  -H "Content-Type: application/json" \
  -d '{"id":"ward_dress_001","name":"Black Evening Dress"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'  Created: {d[\"name\"]}')"

curl -s -X POST $BASE/media/location \
  -H "Content-Type: application/json" \
  -d '{"id":"loc_library_001","name":"Victorian Library"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'  Created: {d[\"name\"]}')"

curl -s $BASE/media/wardrobe | python3 -c "import json,sys; [print(f'  {i[\"name\"]}') for i in json.load(sys.stdin)]"

# 17. Create prospect character (Frame-created)
echo -e "\n--- 17. Create Prospect Character ---"
curl -s -X POST $BASE/characters \
  -H "Content-Type: application/json" \
  -d '{"name":"Alistair Thorne","display_name":"Thorne","status":"prospect"}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Created: {d[\"display_name\"]} (id={d[\"id\"]}, status={d[\"status\"]})')
THORNE_ID=d['id']
"

# 18. List characters including prospect
echo -e "\n--- 18. Characters with Prospect ---"
curl -s $BASE/characters | python3 -c "
import json,sys
for c in json.load(sys.stdin):
    fig = ' [Fig]' if c.get('fig_published') else ''
    print(f'  {c[\"display_name\"]:15s} status={c[\"status\"]:12s} source={c.get(\"source\",\"?\"):6s}{fig}')
"

# 19. Create a shoot for Eleanor
echo -e "\n--- 19. Create Shoot ---"
curl -s -X POST $BASE/characters/char_eleanor_001/shoots \
  -H "Content-Type: application/json" \
  -d '{"name":"Studio Session 1"}' | python3 -m json.tool

# 20. List shoots
echo -e "\n--- 20. List Shoots ---"
curl -s $BASE/characters/char_eleanor_001/shoots | python3 -c "
import json,sys
shoots=json.load(sys.stdin)
print(f'  {len(shoots)} shoots')
for s in shoots:
    print(f'    {s[\"name\"]:25s} images={s[\"image_count\"]}')
"

# 21. Create prompt template
echo -e "\n--- 21. Create Prompt Template ---"
curl -s -X POST $BASE/templates \
  -H "Content-Type: application/json" \
  -d '{"name":"Cinematic Close-up","prompt_body":"35mm cinematic close-up of [SUBJECT], [LIGHTING] lighting, 8k resolution","negative_prompt":"blurry, low quality"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'  Created: {d[\"name\"]} (id={d[\"id\"]})')"

# 22. List templates
echo -e "\n--- 22. List Templates ---"
curl -s $BASE/templates | python3 -c "
import json,sys
for t in json.load(sys.stdin):
    print(f'  {t[\"name\"]:30s} uses={t[\"usage_count\"]}')
"

# 23. Search images
echo -e "\n--- 23. Image Search ---"
curl -s "$BASE/images/search?limit=5" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  {d[\"total\"]} total results (showing {len(d[\"images\"])})')
"

# UI smoke test checklist
echo -e "\n========================================="
echo "  UI Smoke Test Checklist"
echo "========================================="
echo "  Open http://localhost:7890 and verify:"
echo ""
echo "  Character Library:"
echo "    [ ] Shows Eleanor (cast), Theo (development), Thorne (prospect)"
echo "    [ ] 'New Entry' button opens creation dialog"
echo "    [ ] Create dialog: enter name, click Create → navigates to new character"
echo "    [ ] Search filters by name"
echo "    [ ] Click Eleanor navigates to detail"
echo ""
echo "  Character Detail (Eleanor):"
echo "    [ ] Shows name, status=cast, 2 eras"
echo "    [ ] Era cards show 'Young Adult' with image count"
echo "    [ ] Click era navigates to workspace"
echo ""
echo "  Era Workspace:"
echo "    [ ] Shows 'Eleanor — Young Adult' header"
echo "    [ ] Links to triage and studio"
echo ""
echo "  Datasets:"
echo "    [ ] Shows 'Eleanor LoRA v1' card"
echo "    [ ] 'Create Dataset' opens dialog"
echo "    [ ] Can create a new dataset with name+type"
echo "    [ ] Click dataset navigates to detail"
echo ""
echo "  Tag Manager:"
echo "    [ ] Family sidebar shows 5 families (4 default + Custom)"
echo "    [ ] Selecting a family filters tag list"
echo "    [ ] 'Create New Family' opens dialog"
echo "    [ ] Tags show pose:test and quality:high"
echo ""
echo "  Import:"
echo "    [ ] Enter path: $TESTDIR"
echo "    [ ] Select character: Eleanor"
echo "    [ ] Click 'Execute Import' — shows results"
echo ""
echo "  Media Library:"
echo "    [ ] Shows Black Evening Dress, Victorian Library"
echo "    [ ] Tab switching works"
echo ""
echo "  Prospect Profile (Thorne):"
echo "    [ ] Shows Lookbook and Scrapbook tabs"
echo "    [ ] 'Generate' and 'Develop Character' buttons visible"
echo "    [ ] Character ID shown as metadata"
echo "    [ ] Drop zone works (drag image file)"
echo "    [ ] Favorite toggle on image hover"
echo ""
echo "  Development Profile (Luke — if created with fig_published):"
echo "    [ ] Shows 'Published to Fig' indicator with green dot"
echo "    [ ] 'Open in Fig' link visible"
echo ""
echo "  Other screens:"
echo "    [ ] Image Search renders filter sidebar and returns results"
echo "    [ ] Prompt Templates: create new template, shows in list"
echo "    [ ] Studio shows config panel + ref image picker"
echo "    [ ] Triage Queue shows empty state (no pending images)"
echo ""
echo "  Cleanup: rm -rf $TESTDIR"
echo "========================================="
