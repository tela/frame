# CharDAM — Character Asset Digital Asset Manager

A single-user, portable digital asset management and tagging tool for managing AI-generated character visual assets. Supports the full lifecycle of character images — from ingestion and triage through tagging, curation, and dataset assembly for LoRA training and IPAdapter pipelines.

## Key Design Principles

- **Fully portable** — binary, SQLite database, and all assets live on a single removable drive
- **All paths relative** — no absolute paths stored; drive may mount at arbitrary paths across machines
- **Single binary** — Go binary with embedded web UI via `embed`, serves on localhost
- **Fully offline** — no internet connection required at runtime
- **Images are never deleted** — rejected images remain on disk; only status changes in the database

## Tech Stack

- **Backend**: Go with CGO SQLite (`github.com/mattn/go-sqlite3`)
- **Frontend**: Embedded web UI (served from the binary)
- **Database**: SQLite
- **Platforms**: macOS (arm64/amd64), Linux (amd64/arm64)

## Drive Layout

```
/drive-root/
  chardam.toml          # App config
  chardam.db            # SQLite database
  chardam               # The Go binary
  assets/
    characters/
      {character_id}/
        avatar.{ext}
        sets/
          {set_id}/
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
