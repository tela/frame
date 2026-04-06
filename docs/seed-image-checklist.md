# Seed Image Checklist

Checklist for creating a comprehensive set of reference images across all seed characters. Work through this in Studio, curating as you go. When complete, run `frame seed-export` to snapshot the state.

## Workflow

1. `frame dev seed` — create characters, eras, wardrobe, hairstyles, LoRAs
2. `frame dev seed --file seed/characters.csv` — add CSV characters with detailed attributes
3. `frame dev ui` — start the dev server + Vite
4. Work through the checklist below in Studio (http://localhost:5173)
5. `frame dev seed-export -o seed/golden.tar.gz` — snapshot when happy
6. Restore anytime with `frame dev seed --archive seed/golden.tar.gz`

---

## Per-Character Image Plan

For each character/era combination, create the following sets. Focus on the **cast** character (Aria) first — she's the most complete and tests the full pipeline.

### Reference Package (per era)

These are the identity anchors used by generation workflows.

- [ ] **Face ref 1** — Front-facing headshot, neutral expression, studio lighting
- [ ] **Face ref 2** — 3/4 angle headshot, slight smile
- [ ] **Face ref 3** — Profile view, clean background
- [ ] **Body ref 1** — Front full body, neutral pose, standard outfit
- [ ] **Body ref 2** — 3/4 full body, natural pose

After generating, promote to reference set and assign rank (1 = primary).

### SFW Pose Set (per era)

Standard poses with **standard outfit** and **swimsuit**:

- [ ] Front Headshot — standard outfit
- [ ] 3/4 Portrait — standard outfit
- [ ] Profile — standard outfit
- [ ] Front Full Body — standard outfit
- [ ] Back Full Body — standard outfit
- [ ] 3/4 Full Body — standard outfit
- [ ] Front Headshot — swimsuit
- [ ] Front Full Body — swimsuit
- [ ] 3/4 Full Body — swimsuit

### NSFW Pose Set (per era)

Standard poses with **nude** outfit:

- [ ] Bent Over (Rear)
- [ ] Supine Spread
- [ ] Kneeling Front
- [ ] Seated Spread

### Anatomical Detail (per era)

- [ ] Breast Detail
- [ ] Vulva Detail
- [ ] Pubic Hair (Natural)
- [ ] Pubic Hair (Groomed)

### Wardrobe Try-On (cast characters only)

Pick 3-4 garments from the wardrobe catalog and generate a look for each:

- [ ] Look 1 — casual outfit
- [ ] Look 2 — formal outfit
- [ ] Look 3 — lingerie
- [ ] Look 4 — provocative

### Video (cast characters only)

Generate at least one video clip per cast character:

- [ ] Short motion clip (3-5s) from a strong reference image

---

## Character Priorities

Work through in this order. Not every character needs every image — prioritize depth on cast, breadth on the rest.

### Tier 1: Full Coverage (all sets above)

| Character | Era | Status |
|-----------|-----|--------|
| Aria Chen | Standard | cast |
| Aria Chen | College | cast |
| Aria Chen | Late Twenties | cast |

### Tier 2: Reference + SFW Poses

| Character | Era | Status |
|-----------|-----|--------|
| Sofia Reyes | Standard | development |
| Lena Volkova | Standard | development |
| Lena Volkova | Platinum Phase | development |

### Tier 3: Reference Package Only

| Character | Era | Status |
|-----------|-----|--------|
| Sofia Reyes | Teenager | development |
| Maya Okafor | Standard | prospect |
| Maya Okafor | Natural Hair Era | prospect |
| Priya Sharma | Standard | prospect |

### Built-in Seed Characters (Elara, Nyx, Celeste)

These already have synthetic placeholder images from `frame seed`. Replace them with real generated images as time allows. Same tier structure — Elara (cast) gets full coverage, others get refs.

---

## Export & Restore

Once you're satisfied with the image quality:

```bash
# Stop the dev server first
frame dev down

# Export everything (DB + all images + stylist sessions)
frame dev seed-export -o seed/golden.tar.gz

# Restore on a fresh instance or after a reset
frame dev seed --archive seed/golden.tar.gz
```

The archive includes:
- `frame.db` — full database with all records
- `assets/` — all original images, thumbnails, and videos
- `stylist-sessions/` — conversation history (if any)
- `stylist-profile.md` — taste profile (if present)
