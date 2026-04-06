# Frame — Development Notes

## Project
Frame is a portable digital asset manager for AI-generated character images. Go backend, React+TanStack frontend embedded in binary, pure-Go SQLite (`modernc.org/sqlite`), runs fully offline from an encrypted removable drive.

## CLI — Use these commands
Frame has a CLI toolset. **Always use these instead of manual commands.**

```
# Production (encrypted drive)
frame up          # Start Frame from the drive (port 7891)
frame down        # Stop Frame production server
frame status      # Show production and dev status
frame deploy      # Build and deploy to /Volumes/FRAME

# Development (local .dev/ root)
frame dev up      # Start dev server (port 7890)
frame dev down    # Stop dev server
frame dev seed    # Seed the dev database
frame dev seed --file <csv>       # Seed from CSV character data
frame dev seed --archive <tar.gz> # Restore from a seed archive
frame dev seed-export [-o <path>] # Export dev DB + assets as archive
frame dev vite    # Start Vite dev server
frame dev ui      # Start dev server + Vite together
```

- Before testing the app manually, run `frame dev seed` to populate test data
- Use `frame dev ui` for development (starts Go server + Vite together)
- Use `frame status` to check if services are running, not manual curl/pgrep
- Use `frame dev down` to stop the dev server

## Conventions
- **Atomic commits always** — one logical change per commit
- **Branch for feature work** — main stays clean
- **User merges** — never merge PRs or merge main into branches; the user always handles merges unless explicitly instructed otherwise
- **pnpm** — not npm
- **TanStack** — Router + Query for React frontend
- **shadcn/ui** — for UI components, don't hand-roll
- **No Claude credit** — never add Co-Authored-By or Claude attribution to commits/PRs
- **Test behavior** — test public interfaces with real SQLite, not mocks
