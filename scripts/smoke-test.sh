#!/bin/bash
# Frame Manual Smoke Test Script
# Prerequisites: Frame running at http://localhost:7890

BASE=http://localhost:7890/api/v1

echo "========================================="
echo "  Frame Smoke Test"
echo "========================================="

# 1. Health
echo -e "\n--- 1. Health Check ---"
curl -sf http://localhost:7890/health | python3 -m json.tool

# 2. Create characters
echo -e "\n--- 2. Create Characters ---"
curl -s -X POST $BASE/characters \
  -H "Content-Type: application/json" \
  -d '{"id":"char_eleanor_001","name":"Eleanor Vance","display_name":"Eleanor","status":"cast"}' | python3 -m json.tool

curl -s -X POST $BASE/characters \
  -H "Content-Type: application/json" \
  -d '{"id":"char_theo_002","name":"Theodora Crain","display_name":"Theo","status":"development"}' | python3 -m json.tool

curl -s -X POST $BASE/characters \
  -H "Content-Type: application/json" \
  -d '{"id":"char_luke_003","name":"Luke Sanderson","display_name":"Luke","status":"development"}' | python3 -m json.tool

# Mark Luke as published to Fig
curl -s -X PATCH $BASE/characters/char_luke_003 \
  -H "Content-Type: application/json" \
  -d '{"fig_published":true,"fig_character_url":"http://localhost:7700/casting/cast/char_luke_003"}' > /dev/null

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
# Create valid 2x2 RGBA PNGs using Python
python3 -c "
import struct, zlib
def make_png(path, r, g, b):
    raw = b'\x00' + bytes([r,g,b,r,g,b]) + b'\x00' + bytes([r,g,b,r,g,b])
    compressed = zlib.compress(raw)
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', 2, 2, 8, 2, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', compressed))
        f.write(chunk(b'IEND', b''))
make_png('$TESTDIR/test1.png', 255, 0, 0)
make_png('$TESTDIR/test2.png', 0, 255, 0)
make_png('$TESTDIR/test3.png', 0, 0, 255)
"

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

# 24. Rate an image (triggers audit log)
echo -e "\n--- 24. Rate Image (Audit Test) ---"
FIRST_IMAGE=$(curl -s "$BASE/characters/char_eleanor_001/images" | python3 -c "import json,sys; imgs=json.load(sys.stdin); print(imgs[0]['image_id'] if imgs else '')" 2>/dev/null)
if [ -n "$FIRST_IMAGE" ]; then
  curl -s -X PATCH "$BASE/characters/char_eleanor_001/images/$FIRST_IMAGE" \
    -H "Content-Type: application/json" \
    -d '{"rating":4}' | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'  Rated image {d.get(\"image_id\",\"?\")}: {d.get(\"rating\",\"?\")}')"

  # Change set type (another audit event)
  curl -s -X PATCH "$BASE/characters/char_eleanor_001/images/$FIRST_IMAGE" \
    -H "Content-Type: application/json" \
    -d '{"set_type":"curated"}' > /dev/null
  echo "  Set type changed to curated"
else
  echo "  (no images to rate)"
fi

# 25. Query audit log
echo -e "\n--- 25. Audit Log ---"
curl -s "$BASE/audit?limit=10" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  {d[\"total\"]} total events')
for e in d['events'][:5]:
    desc = e['action']
    if e.get('field'):
        desc += f' ({e[\"field\"]}: {e.get(\"old_value\",\"?\")} → {e.get(\"new_value\",\"?\")})'
    print(f'    {e[\"entity_type\"]:10s} {e[\"entity_id\"][:12]:14s} {desc}')
"

# 26. Query audit for specific image
echo -e "\n--- 26. Image Audit History ---"
if [ -n "$FIRST_IMAGE" ]; then
  curl -s "$BASE/audit?entity_type=image&entity_id=$FIRST_IMAGE" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  {d[\"total\"]} events for image {sys.argv[1][:12]}')
for e in d['events']:
    print(f'    {e[\"action\"]}')
" "$FIRST_IMAGE"
fi

# 27. Verify auto-created Standard era
echo -e "\n--- 27. Auto Standard Era ---"
curl -s -X POST $BASE/characters \
  -H "Content-Type: application/json" \
  -d '{"id":"char_test_auto","name":"Auto Era Test","display_name":"AutoTest","status":"prospect"}' > /dev/null
curl -s $BASE/characters/char_test_auto | python3 -c "
import json,sys
d=json.load(sys.stdin)
eras = d.get('eras', [])
print(f'  Character has {len(eras)} era(s)')
for e in eras:
    print(f'    {e[\"label\"]:20s} age={e.get(\"age_range\",\"?\")} sort={e[\"sort_order\"]}')
if not eras or eras[0]['label'] != 'Standard':
    print('  ERROR: Expected auto-created Standard era')
else:
    print('  OK: Standard era auto-created')
"

# 28. Standard poses and outfits catalog
echo -e "\n--- 28. Standard Poses & Outfits ---"
curl -s $BASE/standard-poses | python3 -c "
import json,sys
poses=json.load(sys.stdin)
by_cat={}
for p in poses:
    by_cat.setdefault(p['category'],[]).append(p)
for cat,ps in by_cat.items():
    print(f'  {cat}: {len(ps)} poses')
"
curl -s $BASE/standard-outfits | python3 -c "
import json,sys
outfits=json.load(sys.stdin)
print(f'  {len(outfits)} outfits: {[o[\"name\"] for o in outfits]}')
"

# 29. Pose set status
echo -e "\n--- 29. Pose Set Status ---"
AUTO_ERA_ID=$(curl -s $BASE/characters/char_test_auto | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['eras'][0]['id'] if d.get('eras') else '')")
if [ -n "$AUTO_ERA_ID" ]; then
  curl -s "$BASE/characters/char_test_auto/pose-set?era_id=$AUTO_ERA_ID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Total: {d[\"total\"]} | Generated: {d[\"generated\"]} | Accepted: {d[\"accepted\"]}')
cats={}
for p in d['poses']:
    cats.setdefault(p['category'],[]).append(p)
for cat,entries in cats.items():
    missing=sum(1 for e in entries if e['status']=='missing')
    print(f'    {cat}: {len(entries)} slots ({missing} missing)')
"
fi

# 30. LoRA registry
echo -e "\n--- 30. LoRA Registry ---"
curl -s -X POST $BASE/loras \
  -H "Content-Type: application/json" \
  -d '{"name":"Detail Enhance V2","filename":"detail_enhance_v2.safetensors","category":"detail","recommended_strength":0.6,"content_rating":"sfw","source_url":"https://civitai.com/example"}' | python3 -m json.tool

curl -s $BASE/loras | python3 -c "
import json,sys
loras=json.load(sys.stdin)
print(f'  {len(loras)} LoRA(s) registered')
for l in loras:
    print(f'    {l[\"name\"]:30s} cat={l[\"category\"]:10s} strength={l[\"recommended_strength\"]} rating={l[\"content_rating\"]}')
"

# 31. Fig integration status
echo -e "\n--- 31. Fig Status ---"
curl -s $BASE/fig/status | python3 -m json.tool

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
echo "    [ ] Shows name, status=cast, Standard era + 2 manual eras"
echo "    [ ] Era cards show 'Young Adult' with image count"
echo "    [ ] Pose Set Dashboard visible (26-image grid)"
echo "    [ ] SFW Standard section expanded, NSFW/Anatomical collapsed"
echo "    [ ] Empty cells show '+' icon, link to Studio"
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
echo "  Image Detail + Audit Trail:"
echo "    [ ] Navigate to /images/{imageId} — shows image with Audit History tab"
echo "    [ ] Audit events appear (rating_changed, set_type_changed, created)"
echo "    [ ] Events grouped by date with icons and descriptions"
echo ""
echo "  Tag Picker:"
echo "    [ ] In Era Workspace: select images, click 'Tag' → picker opens"
echo "    [ ] Family tabs (Character Identity, NSFW, Technical, Training)"
echo "    [ ] Click namespace → values appear as toggleable pills"
echo "    [ ] Search filters across values"
echo "    [ ] Apply Selection applies tags to selected images"
echo ""
echo "  Other screens:"
echo "    [ ] Image Search renders filter sidebar and returns results"
echo "    [ ] Prompt Templates: create new template, shows in list"
echo "    [ ] Studio: workflow selector (txt2img, multi_ref, img2img, etc.)"
echo "    [ ] Studio: SFW/NSFW toggle, Quality tier (Quick/Standard/Premium)"
echo "    [ ] Studio: LoRA picker dropdown with strength slider"
echo "    [ ] Studio: Batch size (1/2/4/8), Dimensions (Portrait/Square/Landscape)"
echo "    [ ] Studio: Negative prompt field, Steps slider in Parameters"
echo "    [ ] Triage Queue: press T opens real tag picker"
echo ""
echo "  Cleanup: rm -rf $TESTDIR"
echo "========================================="
