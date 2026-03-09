# GoClaw Upgrade Guide (systemd + Docker selfservice)

This guide covers upgrading GoClaw when the backend runs as a **systemd user service** and the frontend runs as a **Docker container**.

## Setup

| Component | Runtime |
|-----------|---------|
| Backend (`goclaw`) | systemd user service |
| Frontend (`goclaw-ui`) | Docker (`docker-compose.selfservice.yml`) |
| Database (`postgres`) | Docker (`docker-compose.postgres.yml`) |

---

## Upgrade Steps

### 1. Pull latest code & update dependencies

```bash
cd ~/projects/goclaw
git pull origin main
go mod tidy
```

### 2. Build the new binary

```bash
go build -o goclaw .
```

### 3. Run database migrations

```bash
source .env.local && ./goclaw migrate up
```

### 4. Restart the backend service

```bash
systemctl --user restart goclaw.service
systemctl --user status goclaw.service
```

### 5. Rebuild and restart the frontend container

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml -f docker-compose.selfservice.yml build goclaw-ui
docker rm -f goclaw-goclaw-ui-1 2>/dev/null || true
docker run -d \
  --name goclaw-goclaw-ui-1 \
  --add-host=goclaw:host-gateway \
  -p 3001:80 \
  --restart unless-stopped \
  goclaw-goclaw-ui
```

> **Why `docker run` instead of `docker compose up`?** The nginx config proxies to the hostname `goclaw`, which must resolve to the Docker host (where the systemd backend runs). `docker compose up` doesn't add this mapping automatically, causing nginx to fail with `host not found in upstream "goclaw"`. The `--add-host=goclaw:host-gateway` flag fixes this.

### 6. (Optional) Clean up old Docker images

```bash
docker image rm goclaw-goclaw 2>/dev/null || true
docker image prune -f
```

---

## One-liner

```bash
cd ~/projects/goclaw && \
git pull origin main && \
go mod tidy && \
go build -o goclaw . && \
source .env.local && ./goclaw migrate up && \
systemctl --user restart goclaw.service && \
docker compose -f docker-compose.yml -f docker-compose.postgres.yml -f docker-compose.selfservice.yml build goclaw-ui && \
docker rm -f goclaw-goclaw-ui-1 2>/dev/null || true && \
docker run -d \
  --name goclaw-goclaw-ui-1 \
  --add-host=goclaw:host-gateway \
  -p 3001:80 \
  --restart unless-stopped \
  goclaw-goclaw-ui && \
docker image prune -f
```

---

## Verify

```bash
# Backend
systemctl --user status goclaw.service

# Frontend + Database
docker ps --filter "name=goclaw" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected output:

```
NAMES                STATUS          PORTS
goclaw-goclaw-ui-1   Up X seconds    0.0.0.0:3001->80/tcp
goclaw-postgres-1    Up X hours      0.0.0.0:5432->5432/tcp
```

---

## Notes

- The UI container proxies `/ws`, `/v1/`, and `/health` to the backend via `host-gateway` (hostname `goclaw` resolves to the Docker host). This is set with `--add-host=goclaw:host-gateway` when the container is started.
- If the UI container was previously started with the old compose stack (using `docker-compose.managed.yml`), it needs to be removed and recreated: `docker rm goclaw-goclaw-ui-1` before running step 5.
- Secrets live in `.env.local` (gitignored). Always `source .env.local` before running migrations or the binary directly.
