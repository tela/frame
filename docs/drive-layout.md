# Encrypted Drive Layout

The encrypted removable drive is a self-contained creative production environment. Frame, Fig, and Bifrost all run from it. All sensitive assets — source images, generated images, trained models — live here and never touch the host filesystem.

## Directory Structure

```
$DRIVE/
├── bin/
│   ├── frame                    # Frame binary
│   ├── fig                      # Fig binary
│   └── bifrost                  # Bifrost binary (backup)
│
├── assets/
│   ├── source/
│   │   ├── incoming/            # Drop zone for bulk imports
│   │   └── managed/
│   │       ├── characters/
│   │       │   └── <character-slug>/
│   │       │       ├── set-<name>/   # Coherent shoot sets
│   │       │       └── adhoc/        # Loose images
│   │       └── pool/            # Singletons + unassigned
│   │
│   └── generated/
│       └── characters/
│           └── <character-slug>/
│               └── <session-id>/
│
├── models/
│   ├── lora/                    # Trained LoRA weights
│   ├── ipadapter/               # IPAdapter models
│   ├── voice/                   # Voice models
│   └── llm/                     # LLM for full-portable mode
│
├── frame/
│   ├── frame.toml               # Frame config
│   ├── frame.db                 # SQLite — asset index, tags, metadata
│   └── cache/
│       └── thumbs/              # Generated previews (rebuildable)
│
├── fig/
│   ├── fig.toml                 # Fig config
│   └── fig.db                   # Fig database
│
├── bifrost/
│   └── bifrost.toml             # Bifrost config
│
└── start.sh                     # Launch script
```

## Design Principles

1. **Source and generated assets never mix.** `assets/source/` is input material. `assets/generated/` is pipeline output. Both are indexed by Frame's database.

2. **The filesystem is durable storage, not taxonomy.** Directory structure supports bulk operations and human browsability. Frame's tags and database are the real index — don't encode taxonomy into paths.

3. **`incoming/` is a drop zone.** Dump files here for Frame to ingest. Frame processes, tags, and moves them into `managed/`. Supports any asset type (images, video, audio, documents).

4. **`pool/` holds singletons.** Can start with subdirectories (e.g., by race) as initial buckets, but these are convenience — Frame's structured tagging replaces directory-based organization over time.

5. **Character directories are flat.** Each character gets a slug under `characters/`. Named sets for coherent shoots, `adhoc/` for loose images. Generated output is always character-bound and session-stamped.

6. **Models are peers to assets.** LoRA weights, IPAdapter models, voice models, and LLMs have their own lifecycle and are heavy — they don't belong in the asset tree.

7. **App runtime state is separate from assets.** Each app (Frame, Fig, Bifrost) gets its own directory for config, database, and caches. Caches are rebuildable.

8. **Binaries in `bin/`.** Clean upgrades — CI replaces a binary, everything else stays.

## Asset Flow

```
Import:  files → incoming/ → Frame ingests → managed/pool/ or managed/characters/
Curate:  Frame tags + selects → training set assembled
Train:   images → pipeline → models/lora/ or models/ipadapter/
Generate: Frame requests via Bifrost → ComfyUI → generated/characters/<slug>/<session>/
Publish:  Frame → Fig (via API, character publishing)
```
