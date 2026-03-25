# Deployment and Development Workflow

## Goals

1. Deploy Frame to the secured drive with a single command
2. Update the app without Claude Code involvement
3. Schema migrations happen automatically on startup
4. Development and production data are completely separate
5. Clear, documented workflow for the iteration cycle

---

## Directory Layout on the Secured Drive

```
/Volumes/SECURED/
  frame                     # The binary
  frame.toml                # Config (created on first deploy, edited by user)
  frame.db                  # SQLite database (created on first startup)
  assets/
    characters/             # Character images (managed by Frame)
    references/             # Non-character reference images
    exports/                # Dataset exports
```

The binary, config, database, and all assets live together on the drive. Nothing is stored on the host machine.

---

## frame.toml (Default Config)

```toml
# Frame configuration
port = 7890

# Bifrost integration (for image generation)
bifrost_url = "http://localhost:9090"

# Fig integration (for character publishing)
fig_url = "http://localhost:7700"
```

Created on first deploy if it doesn't exist. User edits this directly for port changes, Bifrost/Fig URLs, etc.

---

## Makefile Targets

### Development

```bash
make dev                    # Build and run locally with test data (/tmp/frame-test)
make dev-ui                 # Run Vite dev server with hot reload (frontend only)
make test                   # Run all Go tests
make build                  # Build binary for current platform
make ui                     # Build frontend only (outputs to internal/frontend/dist/)
make clean                  # Remove build artifacts
```

### Deployment

```bash
make deploy DRIVE=/Volumes/SECURED
```

Steps:
1. Runs `make ui` to build frontend
2. Runs `go build` to create the binary with embedded frontend
3. Copies binary to `$DRIVE/frame`
4. Creates `$DRIVE/frame.toml` from template if it doesn't exist
5. Creates `$DRIVE/assets/` directory tree if it doesn't exist
6. Prints startup instructions

```bash
make deploy-mac-arm DRIVE=/Volumes/SECURED    # Cross-compile for Apple Silicon
make deploy-linux DRIVE=/Volumes/SECURED      # Cross-compile for Linux
```

### Smoke Test (against running instance)

```bash
make smoke                  # Run scripts/smoke-test.sh
```

---

## Iteration Workflow (Without Claude Code)

### You have new code (from a PR merge or direct push):

```bash
cd ~/dev/frame
git pull origin main
make deploy DRIVE=/Volumes/SECURED
```

Then on the drive:
```bash
cd /Volumes/SECURED
./frame                     # starts with auto-migration
```

If Frame was already running, kill it first:
```bash
pkill frame
cd /Volumes/SECURED && ./frame
```

### Schema changes are automatic:

Frame embeds SQL migration files in the binary. On startup, it checks which migrations have been applied (via `schema_migrations` table) and runs any new ones. You never need to manually run migrations.

If a migration fails, Frame logs the error and exits. You'd need to investigate the migration or restore from a backup.

### Frontend changes are automatic:

The frontend is built into `internal/frontend/dist/` and embedded in the binary via `//go:embed`. When you build a new binary, it includes the latest frontend. No separate frontend deployment step.

---

## Development vs Production

| Aspect | Development | Production (Drive) |
|--------|------------|-------------------|
| Data location | `/tmp/frame-test/` | `/Volumes/SECURED/` |
| Database | Ephemeral (deleted between runs) | Persistent |
| Images | Test images only | Real character images |
| Config | CLI flags (`--root`, `--port`) | `frame.toml` on drive |
| Frontend | Vite dev server (hot reload) | Embedded in binary |
| Bifrost | Optional (may not be running) | Should be running for generation |

### Running development and production simultaneously:

Development runs on port 7890 (or whatever `--port` you pass).
Production runs on whatever port is in `frame.toml`.

If both use the same port, only one can run at a time. Use different ports:
- Dev: `make dev` (defaults to 7890)
- Prod: set `port = 7891` in `frame.toml` on the drive

---

## Backup

The entire state is on the drive:
- `frame.db` — all metadata, tags, datasets, character records
- `assets/` — all image files

Backup = copy the drive (or rsync the drive to another location).

Frame's DB uses WAL mode. For a consistent backup while Frame is running:
```bash
sqlite3 /Volumes/SECURED/frame.db ".backup /path/to/backup.db"
```

Or stop Frame first and copy `frame.db` directly.

---

## Troubleshooting

### Frame won't start
- Check `frame.toml` exists and is valid TOML
- Check the port isn't in use: `lsof -i :7890`
- Check the drive is mounted and writable

### Migrations fail
- Check Frame's stderr output for the failing SQL
- The `schema_migrations` table shows which migrations have been applied
- You can manually mark a migration as applied if you've fixed the underlying issue:
  ```sql
  INSERT INTO schema_migrations (filename) VALUES ('007_whatever.sql');
  ```

### Database is locked
- Frame uses WAL mode and `busy_timeout=5000` to handle this
- If persistently locked, ensure only one Frame instance is running against the DB

### Images not showing
- Check `assets/characters/` directory exists and has files
- Check the character's `folder_name` matches the directory name on disk
- Check the image record exists in the DB: `SELECT * FROM images WHERE id = '...'`
