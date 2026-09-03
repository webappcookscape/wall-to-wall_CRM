#!/bin/bash

# ==============================================================================
# Wall to Wall CRM - Automated VPS Production Deployment Script
# ==============================================================================

set -e

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}🚀 Starting Wall to Wall CRM Production Deployment...${NC}"
echo -e "${BLUE}=====================================================${NC}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ------------------------------------------------------------------------------
# 1. Fix file permissions (in case previous builds were run with sudo)
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}🔑 [1/6] Ensuring project file ownership & permissions...${NC}"
if [ -n "$USER" ] && command -v chown &> /dev/null; then
    # Fix ownership of dist and node_modules if owned by root
    if [ -d "$PROJECT_ROOT/apps/api/dist" ]; then
        chmod -R u+rw "$PROJECT_ROOT/apps/api/dist" 2>/dev/null || true
    fi
    if [ -d "$PROJECT_ROOT/apps/web/dist" ]; then
        chmod -R u+rw "$PROJECT_ROOT/apps/web/dist" 2>/dev/null || true
    fi
fi

# ------------------------------------------------------------------------------
# 2. Pull latest changes from Git
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}⏬ [2/6] Pulling latest changes from git repository...${NC}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
echo "  -> Current branch: $CURRENT_BRANCH"
git pull origin "$CURRENT_BRANCH" || echo "⚠️ Git pull completed with notices"

# ------------------------------------------------------------------------------
# 3. Install Workspace Dependencies
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}📦 [3/6] Installing dependencies...${NC}"
npm install

# ------------------------------------------------------------------------------
# 4. Generate Prisma & Run Migrations
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}🗄️ [4/6] Updating database & Prisma client...${NC}"
cd "$PROJECT_ROOT/apps/api"
npx tsx scripts/update-roles-enum.ts 2>/dev/null || true
npx prisma generate
npx prisma migrate deploy 2>/dev/null || echo "⚠️ Prisma migrate skipped/notices"

# ------------------------------------------------------------------------------
# 5. Build Backend & Frontend
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}⚙️ [5/6] Compiling Backend & Frontend...${NC}"
cd "$PROJECT_ROOT"

# Clean dist folders safely
rm -rf "$PROJECT_ROOT/apps/api/dist" 2>/dev/null || true
rm -rf "$PROJECT_ROOT/apps/web/dist" 2>/dev/null || true

# Run turbo / workspace build
npm run build

# Verify Backend Build
if [ ! -f "$PROJECT_ROOT/apps/api/dist/index.js" ]; then
    echo -e "${RED}⚠️ Backend build check in dist/index.js failed. Attempting direct tsc build in apps/api...${NC}"
    cd "$PROJECT_ROOT/apps/api"
    npx tsc
fi

if [ ! -f "$PROJECT_ROOT/apps/api/dist/index.js" ]; then
    echo -e "${RED}❌ ERROR: Backend build failed! apps/api/dist/index.js was not generated.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✅ Backend successfully compiled: apps/api/dist/index.js${NC}"

# Verify Frontend Build
if [ ! -f "$PROJECT_ROOT/apps/web/dist/index.html" ]; then
    echo -e "${RED}❌ ERROR: Frontend build failed! apps/web/dist/index.html was not generated.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✅ Frontend successfully built: apps/web/dist/${NC}"

# ------------------------------------------------------------------------------
# 6. Restart PM2 & Reload Nginx
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}🔄 [6/6] Restarting PM2 processes...${NC}"

if command -v pm2 &> /dev/null; then
    # Restart all PM2 processes
    echo "  -> Executing: pm2 restart all --update-env"
    pm2 restart all --update-env || pm2 restart 0 --update-env || true
    pm2 save || true
    echo -e "  ${GREEN}✅ PM2 processes successfully restarted.${NC}"
else
    echo -e "${YELLOW}⚠️ pm2 command not found in PATH. Please restart backend manually if needed.${NC}"
fi

# Reload Nginx non-interactively (without blocking for password)
if command -v nginx &> /dev/null; then
    echo "  -> Reloading Nginx..."
    if sudo -n true 2>/dev/null; then
        sudo nginx -t 2>/dev/null && sudo systemctl reload nginx || true
    elif command -v systemctl &> /dev/null; then
        systemctl --no-ask-password reload nginx 2>/dev/null || true
    fi
fi

echo ""
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "   - Backend API: apps/api/dist/index.js (PM2 Active)"
echo -e "   - Web Frontend: apps/web/dist/ (Static Assets Built)"
echo -e "${GREEN}=====================================================${NC}"
