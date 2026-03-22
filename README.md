# Frame

A single-user, portable digital asset management and tagging tool for managing AI-generated character visual assets. Supports the full lifecycle of character images — from ingestion and triage through tagging, curation, and dataset assembly for LoRA training and IPAdapter pipelines.

Frame is the secure media backbone for a creative production ecosystem, serving images and visual identity data to Fig, ComfyUI workflows, and other consumers.

## Key Design Principles

- **Fully portable** — binary, SQLite database, and all assets live on an encrypted removable drive
- **All paths relative** — no absolute paths stored; drive may mount at arbitrary paths across machines
- **Single binary** — Go binary with embedded web UI via `embed`, serves on localhost
- **Fully offline** — no internet connection required at runtime
- **Images are never deleted** — rejected images remain on disk; only status changes in the database

## Tech Stack

- **Backend**: Go with pure-Go SQLite (`modernc.org/sqlite`)
- **Frontend**: React + TanStack (Router, Query), embedded in binary
- **Database**: SQLite
- **Platforms**: macOS (arm64/amd64), Linux (amd64/arm64)

## Drive Layout

```
/drive-root/
  frame.toml            # App config
  frame.db              # SQLite database
  frame                 # The Go binary
  assets/
    characters/
      {character_id}/
        eras/
          {era_id}/
            original/   # Original ingested images
            thumb/      # Generated thumbnails
```

## Development

```bash
make build-mac-arm    # GOOS=darwin GOARCH=arm64
make build-mac-amd    # GOOS=darwin GOARCH=amd64
make build-linux      # GOOS=linux GOARCH=amd64
make ui               # Build frontend
```

## License

TBD
