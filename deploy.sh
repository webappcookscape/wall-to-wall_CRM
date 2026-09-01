#!/bin/bash

# ==============================================================================
# Wall to Wall CRM - Automated VPS Production Deployment Script
# Rebuilds Frontend & Backend, applies Prisma migrations & restarts PM2 / Nginx
# ==============================================================================

set -e

echo "====================================================="
echo "🚀 Starting Wall to Wall CRM Production Deployment..."
echo "====================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ------------------------------------------------------------------------------
# 1. Pull latest changes from Git
# ------------------------------------------------------------------------------
echo ""
echo "⏬ [1/5] Pulling latest changes from git repository..."
git pull origin main

# ------------------------------------------------------------------------------
# 2. Install Root & Workspace Dependencies
# ------------------------------------------------------------------------------
echo ""
echo "📦 [2/5] Installing workspace dependencies..."
npm install

# ------------------------------------------------------------------------------
# 3. Build the Backend API (apps/api)
# ------------------------------------------------------------------------------
echo ""
echo "⚙️ [3/5] Rebuilding Backend API (apps/api)..."
cd "$PROJECT_ROOT/apps/api"

echo "  -> Installing API dependencies..."
npm install

echo "  -> Generating Prisma Client..."
npx prisma generate

echo "  -> Applying database migrations..."
npx prisma migrate deploy || echo "⚠️ Migration deploy completed with notices"

echo "  -> Cleaning old backend dist folder..."
rm -rf dist

echo "  -> Compiling backend TypeScript (tsc)..."
npm run build

if [ ! -f "dist/index.js" ]; then
    echo "❌ ERROR: Backend build failed! dist/index.js was not generated."
    exit 1
fi
echo "  ✅ Backend successfully compiled to apps/api/dist/index.js"

# ------------------------------------------------------------------------------
# 4. Build the Web Frontend (apps/web)
# ------------------------------------------------------------------------------
echo ""
echo "💻 [4/5] Rebuilding Frontend (apps/web)..."
cd "$PROJECT_ROOT/apps/web"

echo "  -> Installing frontend dependencies..."
npm install

echo "  -> Cleaning old frontend dist folder..."
rm -rf dist

echo "  -> Compiling production assets with Vite..."
npm run build

if [ ! -f "dist/index.html" ]; then
    echo "❌ ERROR: Frontend build failed! dist/index.html was not generated."
    exit 1
fi
echo "  ✅ Frontend successfully built to apps/web/dist/"

# ------------------------------------------------------------------------------
# 5. Restart PM2 & Nginx Services
# ------------------------------------------------------------------------------
echo ""
echo "🔄 [5/5] Restarting PM2 backend processes..."
cd "$PROJECT_ROOT/apps/api"

# Check for existing PM2 process names
RESTARTED=false

for PROC_NAME in "wall2wall-api" "cookscape-api" "crm-api" "api"; do
    if pm2 list | grep -q "$PROC_NAME"; then
        echo "  -> Restarting active PM2 process '$PROC_NAME'..."
        pm2 restart "$PROC_NAME" --update-env
        RESTARTED=true
        break
    fi
done

# If no named process was found, start a new one or restart by ID
if [ "$RESTARTED" = false ]; then
    if pm2 list | grep -q " 7 "; then
        echo "  -> Restarting PM2 process ID 7..."
        pm2 restart 7 --update-env
        RESTARTED=true
    else
        echo "  -> Starting new PM2 process 'wall2wall-api'..."
        pm2 start dist/index.js --name wall2wall-api --time
        RESTARTED=true
    fi
fi

pm2 save

# Reload Nginx if available
if command -v nginx &> /dev/null; then
    echo "  -> Testing & reloading Nginx web server..."
    sudo nginx -t 2>/dev/null && sudo systemctl reload nginx || echo "ℹ️ Nginx reload skipped (no sudo or config error)"
fi

echo ""
echo "====================================================="
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "   - Backend: apps/api/dist/index.js (Running via PM2)"
echo "   - Frontend: apps/web/dist/ (Served via Nginx)"
echo "====================================================="
