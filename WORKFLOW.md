# Frame — Workflow Guide

## Quick Reference

```bash
# Development
make dev                              # build + run locally (test data at /tmp/frame-dev)
make dev-ui                           # frontend hot reload only (Vite dev server)
make test                             # run all Go tests
make smoke                            # run smoke test against running Frame

# Deploy to secured drive
make deploy DRIVE=/Volumes/SECURED    # build + copy binary + set up drive

# Run from drive
cd /Volumes/SECURED && ./frame        # starts on configured port (default 7890)

# Update after pulling new code
cd ~/dev/frame && git pull && make deploy DRIVE=/Volumes/SECURED
```

---

## Development

### First-Time Setup

```bash
cd ~/dev/frame
go mod download                       # fetch Go dependencies
cd ui && pnpm install && cd ..        # fetch frontend dependencies
make test                             # verify everything passes
```

### Running Locally

```bash
make dev
```

This builds the full binary (frontend + backend) and runs it with:
- Root directory: `/tmp/frame-dev` (ephemeral, safe to delete)
- Port: 7890
- Database: `/tmp/frame-dev/frame.db` (auto-created with migrations)

Open http://localhost:7890 in your browser.

To start fresh (reset all local data):
```bash
rm -rf /tmp/frame-dev && make dev
```

### Frontend Development (Hot Reload)

For fast frontend iteration without rebuilding the Go binary:

**Terminal 1:** Run the Go backend
```bash
make dev
```

**Terminal 2:** Run the Vite dev server
```bash
make dev-ui
```

The Vite dev server proxies API calls to the Go backend on port 7890.
Frontend changes reload instantly without restarting the backend.

### Running Tests

```bash
make test                             # all Go tests (8 packages, 60+ tests)
make smoke                            # API + UI smoke test (requires Frame running)
```

The smoke test seeds characters, eras, images, datasets, tags, templates, and shoots,
then prints a UI checklist for manual browser verification.

---

## Deploying to the Secured Drive

### First Deploy

```bash
make deploy DRIVE=/Volumes/SECURED
```

This:
1. Builds the frontend (pnpm install + vite build)
2. Builds the Go binary with the frontend embedded
3. Copies the binary to the drive as `frame`
4. Creates `frame.toml` with default config (if it doesn't exist)
5. Creates the `assets/` directory tree (if it doesn't exist)

The drive will contain:
```
/Volumes/SECURED/
  frame               # the binary
  frame.toml          # config (edit this)
  frame.db            # database (auto-created on first run)
  assets/
    characters/       # character images
    references/       # non-character reference images
    exports/          # dataset exports
```

### Starting Frame from the Drive

```bash
cd /Volumes/SECURED && ./frame
```

Frame finds `frame.toml` next to itself, opens (or creates) `frame.db`,
runs any pending schema migrations, and starts serving.

Open http://localhost:7890 (or whatever port you configured).

### Stopping Frame

```bash
pkill frame
```

Or press Ctrl+C in the terminal. Frame handles SIGINT/SIGTERM gracefully
to protect the SQLite database.

---

## Updating

When you have new code (from a merged PR or direct push):

```bash
cd ~/dev/frame
git pull origin main
make deploy DRIVE=/Volumes/SECURED
```

Then restart Frame on the drive:
```bash
pkill frame
cd /Volumes/SECURED && ./frame
```

### What Happens Automatically on Update

- **Schema migrations**: New SQL migration files embedded in the binary run
  automatically on startup. The `schema_migrations` table tracks which have
  been applied. You never run migrations manually.

- **Frontend updates**: The React app is built into the binary. A new binary
  means a new frontend. No separate deploy step.

- **Config preserved**: `frame.toml` is only created on first deploy. Updates
  never overwrite your config.

- **Data preserved**: `frame.db` and `assets/` are never modified by deploy.
  Only the binary is replaced.

---

## Configuration

Edit `frame.toml` on the drive:

```toml
# Frame configuration
port = 7890

# Bifrost integration (image generation)
# Bifrost must be running for Studio generation features
bifrost_url = "http://localhost:9090"

# Fig integration (character publishing)
# Fig must be running for character publishing features
fig_url = "http://localhost:7700"
```

Changes take effect on next restart.

### Environment Variable Overrides

```bash
BIFROST_URL=http://192.168.1.10:9090 ./frame    # override Bifrost URL
```

### CLI Flag Overrides

```bash
./frame --port 8080 --root /other/path --bifrost http://other:9090
```

Priority: CLI flags > environment variables > frame.toml > defaults.

---

## Running Development and Production Simultaneously

Use different ports:

**Development** (in ~/dev/frame):
```bash
make dev                              # runs on port 7890 with /tmp/frame-dev
```

**Production** (on secured drive):
Edit `frame.toml` to use a different port:
```toml
port = 7891
```
```bash
cd /Volumes/SECURED && ./frame        # runs on port 7891 with drive data
```

---

## Backup

The entire state is on the drive. Backup = copy the drive.

For a consistent backup while Frame is running:
```bash
sqlite3 /Volumes/SECURED/frame.db ".backup /path/to/backup.db"
cp -r /Volumes/SECURED/assets /path/to/backup-assets/
```

Or stop Frame and copy everything:
```bash
pkill frame
rsync -av /Volumes/SECURED/ /path/to/backup/
```

---

## Troubleshooting

**Frame won't start**
- Is the drive mounted? `ls /Volumes/SECURED/frame`
- Is the port in use? `lsof -i :7890`
- Is `frame.toml` valid? Frame logs parse errors on startup.

**"database is locked" errors**
- Ensure only one Frame instance is running: `pgrep frame`
- Frame uses WAL mode and 5-second busy timeout, so brief locks are normal.

**Images not showing in the browser**
- Check `assets/characters/` has image files
- Check the image record exists: `sqlite3 frame.db "SELECT id, format FROM images LIMIT 5"`
- Check the character's folder matches: `sqlite3 frame.db "SELECT folder_name FROM characters"`

**Migration failed on startup**
- Check stderr for the failing SQL statement
- See which migrations have been applied: `sqlite3 frame.db "SELECT * FROM schema_migrations"`
- Fix the issue, then restart. Frame will retry unapplied migrations.

**Bifrost not connected**
- Check Bifrost is running: `curl http://localhost:9090/v1/health`
- Check `bifrost_url` in `frame.toml` matches where Bifrost is listening
- Frame works without Bifrost — generation features are just disabled.

---

## Architecture Summary

```
You (browser) → Frame (localhost:7890) → SQLite (frame.db)
                  ↕                         ↕
              Bifrost (9090)           Drive filesystem
              (image generation)       (assets/)
                  ↕
              ComfyUI / RunPod
              (actual GPU work)
```

Frame is a single Go binary. It embeds the React frontend. It reads/writes
SQLite for metadata and the filesystem for images. Bifrost is optional
(needed for generation). Fig is optional (needed for publishing characters).
