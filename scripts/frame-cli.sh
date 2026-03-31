#!/bin/bash
set -euo pipefail

FRAME_REPO="$HOME/dev/frame"
FIG_REPO="$HOME/dev/fig"
BIFROST_REPO="$HOME/dev/bifrost"
DRIVE="/Volumes/FRAME"

# Fixed ports — production and dev never conflict
PROD_PORT=7891
DEV_PORT=7890

_check_drive() {
  if [ ! -d "$DRIVE" ]; then
    echo "Error: $DRIVE is not mounted"
    exit 1
  fi
}

# --- Production commands ---

_prod_up() {
  _check_drive
  if pgrep -f "$DRIVE/bin/frame" > /dev/null 2>&1; then
    echo "Frame production is already running (pid $(pgrep -f "$DRIVE/bin/frame" | head -1)) on port $PROD_PORT"
    return
  fi
  echo "Starting Frame production on port $PROD_PORT..."
  nohup "$DRIVE/bin/frame" serve --port "$PROD_PORT" > /tmp/frame-prod.log 2>&1 &
  disown
  sleep 1
  if pgrep -f "$DRIVE/bin/frame" > /dev/null 2>&1; then
    echo "Frame production running (pid $(pgrep -f "$DRIVE/bin/frame" | head -1))"
    echo "  http://localhost:$PROD_PORT"
  else
    echo "Error: server failed to start — check /tmp/frame-prod.log"
    exit 1
  fi
}

_prod_down() {
  if pgrep -f "$DRIVE/bin/frame" > /dev/null 2>&1; then
    pkill -f "$DRIVE/bin/frame"
    echo "Frame production stopped"
  else
    echo "Frame production is not running"
  fi
}

# --- Dev commands ---

_dev_up() {
  cd "$FRAME_REPO"
  if pgrep -f "./frame serve.*--root .dev" > /dev/null 2>&1; then
    echo "Frame dev is already running (pid $(pgrep -f './frame serve.*--root .dev' | head -1)) on port $DEV_PORT"
    return
  fi
  mkdir -p .dev
  echo "Building and starting Frame dev on port $DEV_PORT..."
  go build -o frame ./cmd/frame/
  nohup ./frame serve --port "$DEV_PORT" --root .dev > /tmp/frame-dev.log 2>&1 &
  disown
  sleep 1
  if pgrep -f "./frame serve.*--root .dev" > /dev/null 2>&1; then
    echo "Frame dev running (pid $(pgrep -f './frame serve.*--root .dev' | head -1))"
    echo "  http://localhost:$DEV_PORT"
  else
    echo "Error: dev server failed to start — check /tmp/frame-dev.log"
    exit 1
  fi
}

_dev_down() {
  if pgrep -f "./frame serve.*--root .dev" > /dev/null 2>&1; then
    pkill -f "./frame serve.*--root .dev"
    echo "Frame dev stopped"
  else
    echo "Frame dev is not running"
  fi
}

_dev_seed() {
  cd "$FRAME_REPO"
  mkdir -p .dev
  echo "Seeding dev database (.dev/frame.db)..."
  go run ./cmd/frame seed --root .dev "$@"
}

_dev_vite() {
  cd "$FRAME_REPO/ui"
  echo "Starting Vite dev server (proxies API to localhost:$DEV_PORT)..."
  pnpm run dev
}

_dev_ui() {
  _dev_up
  _dev_vite
}

# --- Deploy commands ---

_deploy_frame() {
  echo "=== Deploying Frame ==="
  cd "$FRAME_REPO"
  make deploy DRIVE="$DRIVE"
}

_deploy_fig() {
  echo "=== Deploying Fig ==="
  cd "$FIG_REPO"
  mkdir -p "$DRIVE/bin" "$DRIVE/fig"
  echo "Building fig binaries..."
  make build-go 2>/dev/null || go build -o bin/ ./cmd/...
  for bin in bin/studio bin/forge bin/stage; do
    if [ -f "$bin" ]; then
      cp "$bin" "$DRIVE/bin/"
      chmod +x "$DRIVE/bin/$(basename "$bin")"
      echo "  deployed $(basename "$bin")"
    fi
  done
}

_deploy_bifrost() {
  echo "=== Deploying Bifrost (backup) ==="
  cd "$BIFROST_REPO"
  mkdir -p "$DRIVE/bin" "$DRIVE/bifrost"
  echo "Building bifrost..."
  go build -o bifrost ./cmd/bifrost/
  cp bifrost "$DRIVE/bin/bifrost"
  chmod +x "$DRIVE/bin/bifrost"
  echo "  deployed bifrost"
}

# --- Status ---

_status() {
  echo "=== Production (port $PROD_PORT) ==="
  if [ -d "$DRIVE" ]; then
    echo "  Drive:  $DRIVE (mounted)"
    if [ -f "$DRIVE/bin/frame" ]; then
      ver=$("$DRIVE/bin/frame" version 2>/dev/null || echo "installed")
      echo "  Binary: $ver"
    fi
  else
    echo "  Drive:  not mounted"
  fi
  if pgrep -f "$DRIVE/bin/frame" > /dev/null 2>&1; then
    echo "  Server: running (pid $(pgrep -f "$DRIVE/bin/frame" | head -1))"
  else
    echo "  Server: stopped"
  fi

  echo ""
  echo "=== Development (port $DEV_PORT) ==="
  echo "  Root:   $FRAME_REPO/.dev"
  if pgrep -f "./frame serve.*--root .dev" > /dev/null 2>&1; then
    echo "  Server: running (pid $(pgrep -f './frame serve.*--root .dev' | head -1))"
  else
    echo "  Server: stopped"
  fi
  if pgrep -f "node.*vite" > /dev/null 2>&1; then
    echo "  Vite:   running"
  else
    echo "  Vite:   stopped"
  fi
}

# --- Main dispatch ---

case "${1:-}" in
  # Production
  up|start)
    _prod_up
    ;;
  down|stop)
    _prod_down
    ;;
  status)
    _status
    ;;

  # Deploy
  deploy)
    _check_drive
    case "${2:-frame}" in
      frame)   _deploy_frame ;;
      fig)     _deploy_fig ;;
      bifrost) _deploy_bifrost ;;
      all)     _deploy_frame; echo ""; _deploy_fig; echo ""; _deploy_bifrost ;;
      *)       echo "Usage: frame deploy [frame|fig|bifrost|all]"; exit 1 ;;
    esac
    ;;

  # Development
  dev)
    case "${2:-}" in
      up)    _dev_up ;;
      down)  _dev_down ;;
      seed)  shift 2; _dev_seed "$@" ;;
      vite)  _dev_vite ;;
      ui)    _dev_ui ;;
      *)
        echo "Usage: frame dev <command>"
        echo ""
        echo "Commands:"
        echo "  up     Start dev server (port $DEV_PORT, root .dev/)"
        echo "  down   Stop dev server"
        echo "  seed   Seed the dev database"
        echo "  vite   Start Vite dev server"
        echo "  ui     Start dev server + Vite together"
        exit 1
        ;;
    esac
    ;;

  *)
    echo "Usage: frame <command>"
    echo ""
    echo "Production:"
    echo "  up                             Start Frame from the drive (port $PROD_PORT)"
    echo "  down                           Stop Frame production server"
    echo "  status                         Show production and dev status"
    echo "  deploy [frame|fig|bifrost|all] Build and deploy to $DRIVE"
    echo ""
    echo "Development:"
    echo "  dev up                         Start dev server (port $DEV_PORT)"
    echo "  dev down                       Stop dev server"
    echo "  dev seed                       Seed the dev database"
    echo "  dev vite                       Start Vite dev server"
    echo "  dev ui                         Start dev server + Vite together"
    ;;
esac
