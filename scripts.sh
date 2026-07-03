#!/usr/bin/env bash
# KnowBase Docker helper scripts
# Usage: ./scripts.sh <command>

set -euo pipefail

CMD="${1:-help}"

case "$CMD" in

  # ── Build & start ──────────────────────────────────────────────────────────
  up)
    echo "🔨 Building and starting KnowBase..."
    docker compose up --build -d
    echo "✅ KnowBase is running at http://localhost:${APP_PORT:-3001}"
    ;;

  # ── Start (no rebuild) ────────────────────────────────────────────────────
  start)
    docker compose up -d
    echo "✅ KnowBase started"
    ;;

  # ── Stop ──────────────────────────────────────────────────────────────────
  stop)
    docker compose down
    echo "🛑 KnowBase stopped"
    ;;

  # ── View logs ─────────────────────────────────────────────────────────────
  logs)
    docker compose logs -f app
    ;;

  # ── Rebuild image only ────────────────────────────────────────────────────
  build)
    docker compose build --no-cache
    echo "✅ Image built"
    ;;

  # ── Backup data & uploads ─────────────────────────────────────────────────
  backup)
    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    echo "📦 Backing up to $BACKUP_DIR ..."
    docker run --rm \
      -v knowbase_data:/data \
      -v knowbase_uploads:/uploads \
      -v "$(pwd)/$BACKUP_DIR":/backup \
      alpine sh -c "cp -r /data /backup/ && cp -r /uploads /backup/"
    echo "✅ Backup saved to $BACKUP_DIR"
    ;;

  # ── Restore from backup ───────────────────────────────────────────────────
  restore)
    BACKUP_PATH="${2:-}"
    if [ -z "$BACKUP_PATH" ]; then
      echo "Usage: ./scripts.sh restore <path-to-backup-dir>"
      exit 1
    fi
    echo "⚠️  This will overwrite current data. Press Ctrl+C to cancel, Enter to continue."
    read -r
    docker compose down
    docker run --rm \
      -v knowbase_data:/data \
      -v knowbase_uploads:/uploads \
      -v "$(pwd)/$BACKUP_PATH":/backup \
      alpine sh -c "cp -r /backup/data/. /data/ && cp -r /backup/uploads/. /uploads/"
    docker compose up -d
    echo "✅ Restored from $BACKUP_PATH"
    ;;

  # ── Update to latest build ────────────────────────────────────────────────
  update)
    echo "🔄 Pulling latest code and rebuilding..."
    git pull
    docker compose up --build -d
    echo "✅ Updated and restarted"
    ;;

  # ── Open shell inside container ───────────────────────────────────────────
  shell)
    docker compose exec app sh
    ;;

  # ── Status ────────────────────────────────────────────────────────────────
  status)
    docker compose ps
    ;;

  # ── Help ──────────────────────────────────────────────────────────────────
  *)
    echo ""
    echo "KnowBase Docker Helper"
    echo "────────────────────────────────────"
    echo "  ./scripts.sh up        Build image and start"
    echo "  ./scripts.sh start     Start existing image"
    echo "  ./scripts.sh stop      Stop containers"
    echo "  ./scripts.sh logs      Follow app logs"
    echo "  ./scripts.sh build     Rebuild image (no cache)"
    echo "  ./scripts.sh backup    Backup data & uploads"
    echo "  ./scripts.sh restore   Restore from backup"
    echo "  ./scripts.sh update    git pull + rebuild + restart"
    echo "  ./scripts.sh shell     Open shell in container"
    echo "  ./scripts.sh status    Show container status"
    echo ""
    ;;
esac
