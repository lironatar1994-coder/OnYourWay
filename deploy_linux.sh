#!/bin/bash

# ==============================================================================
# On Your Way Production Deployment Script (Server-Side)
# ==============================================================================

set -euo pipefail

APP_ROOT="$(pwd)"
REMOTE_REPO="https://github.com/lironatar1994-coder/OnYourWay.git"

BACKEND_PROCESS="on-your-way-backend"
FRONTEND_PROCESS="on-your-way-frontend"
BACKEND_PORT="${BACKEND_PORT:-3004}"
FRONTEND_PORT="${FRONTEND_PORT:-3101}"
ROUTE_BASE="/OnYourWay"
ADMIN_BASE="$ROUTE_BASE/admin"

ADMIN_SITE_DIR="/var/www/on-your-way-admin"
NGINX_CONF="/etc/nginx/sites-available/vee-app.co.il.conf"
NGINX_SNIPPET="/etc/nginx/snippets/on-your-way-locations.conf"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    local message="$1"
    local level="${2:-INFO}"
    local color="$NC"
    case "$level" in
        "INFO") color="$BLUE" ;;
        "SUCCESS") color="$GREEN" ;;
        "WARN") color="$YELLOW" ;;
        "ERROR") color="$RED" ;;
    esac
    echo -e "${color}[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $message${NC}"
}

run_npm_install() {
    if [ -f package-lock.json ]; then
        npm ci --silent
    else
        npm install --silent
    fi
}

ensure_backend_env() {
    touch .env
    if ! grep -q '^PORT=' .env; then
        echo "PORT=$BACKEND_PORT" >> .env
    fi
    if ! grep -q '^DATABASE_URL=' .env; then
        echo "DATABASE_URL=file:./prisma/prod.db" >> .env
    fi
}

log "Starting On Your Way deployment..."

if [ "${SKIP_GIT_SYNC:-0}" != "1" ]; then
    log "Syncing repository from origin/main..."
    git remote set-url origin "$REMOTE_REPO"
    git fetch origin main
    git reset --hard origin/main
else
    log "Skipping git sync because SKIP_GIT_SYNC=1." "WARN"
fi

log "Installing and preparing backend..."
cd "$APP_ROOT/backend"
run_npm_install
npm rebuild better-sqlite3 --silent || true
ensure_backend_env
npm run db:generate
npm run db:setup
npm run test

log "Building Admin CRM with same-origin /api backend..."
cd "$APP_ROOT/admin"
run_npm_install
VITE_API_URL="$ROUTE_BASE/api" VITE_BASE_PATH="$ADMIN_BASE/" npm run build
mkdir -p "$ADMIN_SITE_DIR"
rm -rf "$ADMIN_SITE_DIR"/*
cp -r dist/* "$ADMIN_SITE_DIR"/
chown -R www-data:www-data "$ADMIN_SITE_DIR"

log "Building public lead-capture frontend..."
cd "$APP_ROOT/frontend"
run_npm_install
NEXT_BASE_PATH="$ROUTE_BASE" NEXT_PUBLIC_BASE_PATH="$ROUTE_BASE" BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" npm run build

log "Starting/restarting PM2 backend process..."
cd "$APP_ROOT/backend"
pm2 delete "$BACKEND_PROCESS" > /dev/null 2>&1 || true
PORT="$BACKEND_PORT" DATABASE_URL="file:./prisma/prod.db" \
    pm2 start index.js --name "$BACKEND_PROCESS" --cwd "$APP_ROOT/backend" --update-env

log "Starting/restarting PM2 public frontend process..."
cd "$APP_ROOT/frontend"
pm2 delete "$FRONTEND_PROCESS" > /dev/null 2>&1 || true
NEXT_BASE_PATH="$ROUTE_BASE" NEXT_PUBLIC_BASE_PATH="$ROUTE_BASE" BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" PORT="$FRONTEND_PORT" \
    pm2 start npm --name "$FRONTEND_PROCESS" --cwd "$APP_ROOT/frontend" -- start

pm2 save > /dev/null

log "Writing Nginx route snippet for vee-app.co.il$ROUTE_BASE..."
cat > "$NGINX_SNIPPET" <<NGINX
location = $ADMIN_BASE {
    return 301 $ADMIN_BASE/;
}

location = $ROUTE_BASE {
    proxy_pass http://127.0.0.1:$FRONTEND_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_cache_bypass \$http_upgrade;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}

location $ROUTE_BASE/api/ {
    proxy_pass http://127.0.0.1:$BACKEND_PORT/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_cache_bypass \$http_upgrade;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}

location $ADMIN_BASE/ {
    alias $ADMIN_SITE_DIR/;
    index index.html;
    try_files \$uri \$uri/ $ADMIN_BASE/index.html;
}

location $ROUTE_BASE/ {
    proxy_pass http://127.0.0.1:$FRONTEND_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_cache_bypass \$http_upgrade;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
NGINX

python3 - "$NGINX_CONF" "$NGINX_SNIPPET" <<'PY'
from pathlib import Path
import sys

conf_path = Path(sys.argv[1])
snippet_path = Path(sys.argv[2])
include_line = f"    include {snippet_path};\n"
text = conf_path.read_text()

if include_line not in text:
    marker = "    location /text-to-pdf {"
    if marker not in text:
        marker = "    location / {"
    if marker not in text:
        raise SystemExit("Could not find insertion point in vee-app.co.il.conf")
    text = text.replace(marker, include_line + "\n" + marker, 1)
    conf_path.write_text(text)
PY

rm -f /etc/nginx/sites-enabled/on-your-way.vee-app.co.il.conf

log "Testing and reloading Nginx..."
nginx -t
systemctl reload nginx

log "Running health checks..."
for attempt in {1..20}; do
    if curl -fsS "http://127.0.0.1:$BACKEND_PORT/health" > /dev/null 2>&1; then
        break
    fi
    if [ "$attempt" -eq 20 ]; then
        log "Backend health check failed after waiting." "ERROR"
        pm2 logs "$BACKEND_PROCESS" --lines 80 --nostream --no-color || true
        exit 1
    fi
    sleep 1
done
curl -kfsS --resolve vee-app.co.il:443:127.0.0.1 "https://vee-app.co.il$ROUTE_BASE" > /dev/null
curl -kfsS --resolve vee-app.co.il:443:127.0.0.1 "https://vee-app.co.il$ADMIN_BASE/" > /dev/null

log "On Your Way deployment complete." "SUCCESS"
log "Public: https://vee-app.co.il$ROUTE_BASE" "SUCCESS"
log "Admin:  https://vee-app.co.il$ADMIN_BASE" "SUCCESS"
