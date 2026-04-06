# Frame — Development Notes

## Project
Frame is a portable digital asset manager for AI-generated character images. Go backend, React+TanStack frontend embedded in binary, pure-Go SQLite (`modernc.org/sqlite`), runs fully offline from an encrypted removable drive.

## CLI — Use these commands
Frame has a CLI toolset. **Always use these instead of manual commands.**

```
frame serve      # Start HTTP server (default if no subcommand)
frame dev        # Start Go server + Vite dev server, ctrl-c kills both
frame seed       # Create test characters, eras, wardrobe, LoRAs, looks
frame seed-export # Export DB + assets as a seed archive (tar.gz)
frame seed --archive <path>  # Restore from a seed archive
frame stop       # Kill any running frame/vite processes
frame status     # Show server, port, Vite, Fig, Bifrost connection state
frame smoke      # Run smoke tests against running server (automated pass/fail)
frame build      # Rebuild frontend dist to internal/frontend/dist/
frame version    # Print version
```

- Before testing the app manually, run `frame seed` to populate test data
- Use `frame smoke` to verify the server is working (requires server + seed data)
- Use `frame dev` for development (not separate `make dev` + `make dev-ui`)
- Use `frame build` before `go build` to update the embedded frontend
- Use `frame status` to check if services are running, not manual curl/pgrep
- Use `frame stop` to kill processes, not manual pkill

## Conventions
- **Atomic commits always** — one logical change per commit
- **Branch for feature work** — main stays clean
- **User merges** — never merge PRs or merge main into branches; the user always handles merges unless explicitly instructed otherwise
- **pnpm** — not npm
- **TanStack** — Router + Query for React frontend
- **shadcn/ui** — for UI components, don't hand-roll
- **No Claude credit** — never add Co-Authored-By or Claude attribution to commits/PRs
- **Test behavior** — test public interfaces with real SQLite, not mocks
