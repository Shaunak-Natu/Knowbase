# 🧠 KnowBase

A personal knowledge base — open-source Notion alternative with rich-text editing,
Kanban boards, file uploads (no size limits), Notion import/export, full-text search,
tagging, and linked pages. Mobile-friendly, self-hosted, runs in Docker.

---

## 🚀 Quick Start (Docker)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+

### 1. Clone / extract the project
```bash
# If using git:
git clone <your-repo> knowbase && cd knowbase

# Or just unzip the archive you downloaded and cd into it
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env if you want a different port or domain
```

### 3. Build and start
```bash
./scripts.sh up
# or manually:
docker compose up --build -d
```

The app will be available at **http://localhost:3001** (or whatever `APP_PORT` is set to).

---

## 🏗 How It Works

```
┌─────────────────────────────────────────┐
│            Docker Container             │
│                                         │
│  ┌───────────────┐  ┌────────────────┐  │
│  │  React (built │  │  Node/Express  │  │
│  │  static files)│◄─│  API server    │  │
│  └───────────────┘  └───────┬────────┘  │
│                             │           │
│                    ┌────────▼────────┐  │
│                    │  SQLite (sql.js)│  │
│                    │  /app/data/     │  │
│                    └────────────────┘  │
│                                         │
│  Volumes: /app/data   /app/uploads      │
└─────────────────────────────────────────┘
```

- **Single container** — Node serves both the React SPA and the API
- **SQLite** via `sql.js` — zero native dependencies, persisted to a Docker volume
- **Uploads** stored in a separate volume — no size limits enforced at the app layer

---

## 🌐 Production Deployment (Ubuntu VPS with nginx)

### Step 1 — Install Docker on Ubuntu

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2 — Clone and configure

```bash
git clone <your-repo> /opt/knowbase
cd /opt/knowbase
cp .env.example .env
nano .env   # set CLIENT_URL=https://your-domain.com
```

### Step 3 — Enable nginx reverse proxy

Edit `docker-compose.yml`:
1. Comment out the `ports` section under the `app` service
2. Uncomment the entire `nginx` service block

Then edit `nginx/nginx.conf`:
- Replace `server_name localhost` with `server_name your-domain.com`

### Step 4 — SSL with Let's Encrypt

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
# Certs will be at /etc/letsencrypt/live/your-domain.com/
```

Update `nginx/nginx.conf`:
```nginx
ssl_certificate     /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
```

Mount them in `docker-compose.yml`:
```yaml
volumes:
  - /etc/letsencrypt/live/your-domain.com:/etc/nginx/ssl:ro
```

Uncomment the HTTPS server block and the HTTP→HTTPS redirect in `nginx.conf`.

### Step 5 — Start

```bash
./scripts.sh up
```

### Step 6 — Auto-start on reboot

```bash
sudo systemctl enable docker
# docker compose restart policy is already set to `unless-stopped`
```

---

## 🛠 Management Commands

```bash
./scripts.sh up        # Build image and start (first run or after code changes)
./scripts.sh start     # Start without rebuilding
./scripts.sh stop      # Stop containers
./scripts.sh logs      # Follow live logs
./scripts.sh backup    # Backup data & uploads to ./backups/<timestamp>/
./scripts.sh restore   # Restore from a backup
./scripts.sh update    # git pull + rebuild + restart
./scripts.sh shell     # Open shell inside container
./scripts.sh status    # Show container status
```

### Manual backup
```bash
# Copy DB out of container
docker cp knowbase:/app/data/knowbase.db ./knowbase-backup.db

# Copy all uploads
docker cp knowbase:/app/uploads ./uploads-backup
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `3001` | Host port the app listens on |
| `CLIENT_URL` | `http://localhost:3001` | Public URL (used for CORS) |
| `NODE_ENV` | `production` | Always `production` in Docker |
| `PORT` | `3001` | Internal container port (don't change) |

---

## 📦 Volumes

| Volume | Path in container | Contents |
|--------|-------------------|----------|
| `knowbase_data` | `/app/data` | SQLite database file |
| `knowbase_uploads` | `/app/uploads` | All uploaded files (images, PDFs, etc.) |

To find where Docker stores these on disk:
```bash
docker volume inspect knowbase_data
```

---

## 🔧 Development (without Docker)

```bash
# Install dependencies
npm run install:all

# Start dev servers (hot reload)
npm run dev

# App:    http://localhost:5173  (React Vite)
# API:    http://localhost:3001
```

---

## Features

- 📝 Rich-text block editor (TipTap/ProseMirror) — headings, lists, tables, code, tasks, embeds
- 📎 File attachments — images, videos, PDFs, Excel, CSVs, no size limit
- 🗂 Kanban boards per page with drag-and-drop
- 🏷 Tags & linked pages with backlink tracking
- 🔍 Full-text search across all pages
- 📤 Export: Markdown, Notion-compatible ZIP, JSON
- 📥 Import: Notion ZIP exports, Markdown files, KnowBase JSON
- ⭐ Favorites, trash/restore, duplicate pages
- 📱 Mobile-responsive with slide-over sidebar and bottom nav
