#!/bin/bash

# ==============================================================================
# On Your Way Production Deployment Script (Server-Side)
# ==============================================================================

set -euo pipefail

APP_ROOT="$(pwd)"
REMOTE_REPO="https://github.com/lironatar1994-coder/On-Your-Way.git"

BACKEND_PROCESS="on-your-way-backend"
FRONTEND_PROCESS="on-your-way-frontend"
BACKEND_PORT="${BACKEND_PORT:-3004}"
FRONTEND_PORT="${FRONTEND_PORT:-3101}"

ADMIN_SITE_DIR="/var/www/on-your-way-admin"
NGINX_CONF="/etc/nginx/sites-available/on-your-way.vee-app.co.il.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/on-your-way.vee-app.co.il.conf"

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
npm run db:setup
npm run test

log "Building Admin CRM with same-origin /api backend..."
cd "$APP_ROOT/admin"
run_npm_install
VITE_API_URL="/api" npm run build
mkdir -p "$ADMIN_SITE_DIR"
rm -rf "$ADMIN_SITE_DIR"/*
cp -r dist/* "$ADMIN_SITE_DIR"/
chown -R www-data:www-data "$ADMIN_SITE_DIR"

log "Building public lead-capture frontend..."
cd "$APP_ROOT/frontend"
run_npm_install
BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" npm run build

log "Starting/restarting PM2 backend process..."
cd "$APP_ROOT/backend"
PORT="$BACKEND_PORT" DATABASE_URL="file:./prisma/prod.db" \
    pm2 start index.js --name "$BACKEND_PROCESS" --cwd "$APP_ROOT/backend" --update-env \
    || PORT="$BACKEND_PORT" DATABASE_URL="file:./prisma/prod.db" pm2 restart "$BACKEND_PROCESS" --update-env

log "Starting/restarting PM2 public frontend process..."
cd "$APP_ROOT/frontend"
BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" PORT="$FRONTEND_PORT" \
    pm2 start npm --name "$FRONTEND_PROCESS" --cwd "$APP_ROOT/frontend" -- start \
    || BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" PORT="$FRONTEND_PORT" pm2 restart "$FRONTEND_PROCESS" --update-env

pm2 save > /dev/null

log "Writing Nginx config for public and admin hosts..."
cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    server_name on-your-way.vee-app.co.il;

    location /api/ {
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

    location / {
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
}

server {
    listen 80;
    server_name admin.on-your-way.vee-app.co.il;

    root $ADMIN_SITE_DIR;
    index index.html;

    location /api/ {
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

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf "$NGINX_CONF" "$NGINX_ENABLED"

log "Testing and reloading Nginx..."
nginx -t
systemctl reload nginx

log "Running health checks..."
curl -fsS "http://127.0.0.1:$BACKEND_PORT/health" > /dev/null
curl -fsS "http://127.0.0.1:$FRONTEND_PORT/" > /dev/null
curl -fsS -H "Host: admin.on-your-way.vee-app.co.il" "http://127.0.0.1/" > /dev/null

log "On Your Way deployment complete." "SUCCESS"
log "Public: http://on-your-way.vee-app.co.il" "SUCCESS"
log "Admin:  http://admin.on-your-way.vee-app.co.il" "SUCCESS"
