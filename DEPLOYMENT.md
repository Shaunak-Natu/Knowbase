# KnowBase — Deployment Guide
## Uploading to GitHub (Windows) & Running with Docker

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Upload to GitHub from Windows](#2-upload-to-github-from-windows)
   - 2.1 [Install Git for Windows](#21-install-git-for-windows)
   - 2.2 [Create a GitHub repository](#22-create-a-github-repository)
   - 2.3 [Configure Git](#23-configure-git)
   - 2.4 [Prepare the project folder](#24-prepare-the-project-folder)
   - 2.5 [Push to GitHub](#25-push-to-github)
   - 2.6 [Verify on GitHub](#26-verify-on-github)
3. [Run with Docker](#3-run-with-docker)
   - 3.1 [Install Docker Desktop (Windows)](#31-install-docker-desktop-windows)
   - 3.2 [First-time setup](#32-first-time-setup)
   - 3.3 [Build and start](#33-build-and-start)
   - 3.4 [Open KnowBase](#34-open-knowbase)
4. [Run on a Ubuntu Server](#4-run-on-a-ubuntu-server)
   - 4.1 [Install Docker on Ubuntu](#41-install-docker-on-ubuntu)
   - 4.2 [Clone from GitHub](#42-clone-from-github)
   - 4.3 [Configure and start](#43-configure-and-start)
   - 4.4 [Open firewall port](#44-open-firewall-port)
5. [Managing the Container](#5-managing-the-container)
6. [Updating the App](#6-updating-the-app)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

### On your Windows PC
| Tool | Required for | Download |
|------|-------------|----------|
| Git for Windows | Pushing code to GitHub | https://git-scm.com/download/win |
| Docker Desktop | Running locally on Windows | https://www.docker.com/products/docker-desktop |
| A GitHub account | Hosting the code | https://github.com |

### On your Ubuntu server (optional, for hosting)
- Ubuntu 20.04 or newer
- SSH access
- At least 512 MB RAM, 2 GB free disk

---

## 2. Upload to GitHub from Windows

### 2.1 Install Git for Windows

1. Download from https://git-scm.com/download/win
2. Run the installer — accept all defaults
3. Open **Command Prompt** (`Win + R` → type `cmd` → Enter) and verify:

```cmd
git --version
```

You should see something like `git version 2.45.0.windows.1`.

---

### 2.2 Create a GitHub repository

1. Go to https://github.com and sign in
2. Click the **+** icon (top-right) → **New repository**
3. Fill in:
   - **Repository name:** `knowbase`
   - **Visibility:** Private (recommended) or Public
   - **Do NOT** tick "Add a README file" — the project already has one
4. Click **Create repository**
5. GitHub will show you a page with a URL. Copy the HTTPS URL — it looks like:
   ```
   https://github.com/YOUR-USERNAME/knowbase.git
   ```
   Keep this tab open, you'll need the URL in a moment.

---

### 2.3 Configure Git

Open **Command Prompt** and run these two commands, replacing the values with your own name and GitHub email:

```cmd
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

### 2.4 Prepare the project folder

1. Extract the `knowbase-docker.zip` file you downloaded.
   Right-click it → **Extract All** → choose a location, e.g. `C:\Projects\knowbase`

2. In Command Prompt, navigate into the folder:

```cmd
cd C:\Projects\knowbase
```

3. Initialise a Git repository and stage all files:

```cmd
git init
git add .
git commit -m "Initial commit"
```

You'll see a list of files being staged, then a message like:
```
[main (root-commit) a1b2c3d] Initial commit
 42 files changed, 3200 insertions(+)
```

---

### 2.5 Push to GitHub

Replace `YOUR-USERNAME` below with your actual GitHub username:

```cmd
git remote add origin https://github.com/YOUR-USERNAME/knowbase.git
git branch -M main
git push -u origin main
```

Git will prompt you for your GitHub credentials:

- **Username:** your GitHub username
- **Password:** your GitHub **Personal Access Token** (not your account password)

> **How to create a Personal Access Token:**
> 1. GitHub → click your profile photo → **Settings**
> 2. Scroll down → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
> 3. Click **Generate new token (classic)**
> 4. Give it a name like `knowbase-push`
> 5. Set **Expiration** to whatever you prefer
> 6. Tick the **repo** checkbox
> 7. Click **Generate token**
> 8. Copy the token — you only see it once. Paste it as the password when Git asks.

After a successful push you'll see:

```
Enumerating objects: 42, done.
Counting objects: 100% (42/42), done.
Writing objects: 100% (42/42), 85.23 KiB | 2.84 MiB/s, done.
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

### 2.6 Verify on GitHub

Go to `https://github.com/YOUR-USERNAME/knowbase` in your browser.
You should see all the project files listed, including `Dockerfile`, `docker-compose.yml`, and `README.md`.

---

## 3. Run with Docker

### 3.1 Install Docker Desktop (Windows)

1. Download from https://www.docker.com/products/docker-desktop
2. Run the installer — accept defaults
3. Restart your PC when prompted
4. After restart, Docker Desktop will launch automatically. Wait until the whale icon in the taskbar is **steady** (not animated) — that means Docker is ready
5. Open **Command Prompt** and verify:

```cmd
docker --version
docker compose version
```

Expected output:
```
Docker version 27.0.3, build ...
Docker Compose version v2.28.1
```

---

### 3.2 First-time setup

In Command Prompt, navigate to the project folder:

```cmd
cd C:\Projects\knowbase
```

Copy the environment file:

```cmd
copy .env.example .env
```

Open `.env` in Notepad to review it:

```cmd
notepad .env
```

The defaults work fine for local use. The file looks like:

```
APP_PORT=3001
CLIENT_URL=http://localhost:3001
NODE_ENV=production
```

Save and close Notepad.

---

### 3.3 Build and start

This single command builds the Docker image and starts the container:

```cmd
docker compose up --build -d
```

What happens:
- Docker downloads Node 20 Alpine base image (~50 MB, first time only)
- Installs client (React) dependencies
- Builds the React app
- Installs server dependencies
- Starts the container in the background (`-d` = detached)

First build takes **3–5 minutes**. You'll see output like:

```
[+] Building 142.3s (14/14) FINISHED
[+] Running 1/1
 ✔ Container knowbase  Started
```

To watch the live logs:

```cmd
docker compose logs -f app
```

You should see:
```
✅ Database initialized
🚀 KnowBase server running on port 3001
   Mode: production
```

Press `Ctrl + C` to stop following logs (the container keeps running).

---

### 3.4 Open KnowBase

Open your browser and go to:

```
http://localhost:3001
```

KnowBase is running. Your data is stored in Docker volumes — it persists even if you restart Docker or your PC.

---

## 4. Run on a Ubuntu Server

### 4.1 Install Docker on Ubuntu

SSH into your server, then run:

```bash
curl -fsSL https://get.docker.com | sudo sh
```

Add your user to the docker group so you don't need `sudo` every time:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Verify:

```bash
docker --version
docker compose version
```

---

### 4.2 Clone from GitHub

```bash
git clone https://github.com/YOUR-USERNAME/knowbase.git /opt/knowbase
cd /opt/knowbase
```

---

### 4.3 Configure and start

```bash
cp .env.example .env
nano .env
```

Change `CLIENT_URL` to your server's public IP or domain:

```
APP_PORT=3001
CLIENT_URL=http://YOUR-SERVER-IP:3001
NODE_ENV=production
```

Save with `Ctrl + O`, Enter, then `Ctrl + X`.

Make the helper script executable and start:

```bash
chmod +x scripts.sh
./scripts.sh up
```

Or manually:

```bash
docker compose up --build -d
```

Check it's running:

```bash
docker compose ps
```

Output:

```
NAME        IMAGE       COMMAND              STATUS         PORTS
knowbase    knowbase    "dumb-init -- node…" Up 2 minutes   0.0.0.0:3001->3001/tcp
```

---

### 4.4 Open firewall port

If using UFW (Ubuntu's default firewall):

```bash
sudo ufw allow 3001/tcp
sudo ufw reload
```

If using a cloud provider (AWS, GCP, DigitalOcean, etc.), also open port **3001** in your security group / firewall rules in their web console.

KnowBase is now accessible at:

```
http://YOUR-SERVER-IP:3001
```

---

## 5. Managing the Container

All commands are run from inside the `knowbase` project folder.

### View live logs
```bash
docker compose logs -f app
```
Press `Ctrl + C` to stop.

### Stop the container
```bash
docker compose down
```

### Start again (no rebuild)
```bash
docker compose up -d
```

### Rebuild after code changes
```bash
docker compose up --build -d
```

### Check container status
```bash
docker compose ps
```

### Open a shell inside the container
```bash
docker compose exec app sh
```

### Backup your data and uploads
```bash
./scripts.sh backup
```
Creates a timestamped folder under `./backups/` with a copy of the database and all uploaded files.

Manual alternative:

```bash
# Copy database
docker cp knowbase:/app/data/knowbase.db ./knowbase-backup.db

# Copy uploads folder
docker cp knowbase:/app/uploads ./uploads-backup
```

### Restore from a backup
```bash
./scripts.sh restore ./backups/20240625_143000
```

---

## 6. Updating the App

After making changes to the code and pushing to GitHub:

**On your server:**

```bash
cd /opt/knowbase
git pull
docker compose up --build -d
```

Or with the helper script:

```bash
./scripts.sh update
```

Your data (database + uploads) is stored in Docker volumes and is **never touched** during an update.

---

## 7. Troubleshooting

### Container won't start

Check the logs for errors:

```bash
docker compose logs app
```

### Port 3001 already in use

Either stop the process using that port, or change `APP_PORT` in `.env` to something else (e.g. `3002`) and restart:

```bash
docker compose down
docker compose up -d
```

### "Permission denied" on scripts.sh (Ubuntu)

```bash
chmod +x scripts.sh
```

### Docker Desktop not starting (Windows)

Make sure **WSL 2** is enabled. In Command Prompt (as Administrator):

```cmd
wsl --install
wsl --update
```

Then restart Docker Desktop.

### "Cannot connect to the Docker daemon"

On Windows: make sure Docker Desktop is running (whale icon in taskbar).
On Ubuntu: start the Docker service:

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### See what Docker volumes contain

```bash
docker volume inspect knowbase_data
docker volume inspect knowbase_uploads
```

### Completely reset (delete all data)

> ⚠️ This deletes your database and all uploaded files.

```bash
docker compose down -v
```

The `-v` flag removes the volumes. Next `docker compose up --build -d` starts fresh.
