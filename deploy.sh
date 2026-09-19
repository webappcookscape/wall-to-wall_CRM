#!/bin/bash

# Wall-to-Wall CRM Automated VPS Deployment Script
# Rebuilds both Frontend & Backend without touching the existing Database.

# Exit immediately if a command exits with a non-zero status
set -e

echo "====================================================="
echo "🚀 Starting Wall-to-Wall CRM Automated Deployment..."
echo "====================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 1. Pull the latest codebase
echo "⏬ Step 1: Pulling latest changes from git..."
git pull origin main

# 2. Rebuild the Frontend
echo "💻 Step 2: Rebuilding Frontend (apps/web)..."
cd "$PROJECT_ROOT/apps/web"
echo "Installing frontend dependencies..."
npm install
echo "Compiling production assets..."
npm run build

# 3. Rebuild the Backend
echo "⚙️ Step 3: Rebuilding Backend (apps/api)..."
cd "$PROJECT_ROOT/apps/api"
echo "Generating Prisma client..."
npx prisma generate
echo "Compiling backend TypeScript..."
npm run build
cd "$PROJECT_ROOT"

# 4. Restart services using PM2
echo "🔄 Step 4: Restarting PM2 processes..."
echo "Restarting wall2wall-crm-api PM2 process..."
pm2 restart wall2wall-crm-api

echo "====================================================="
echo "✅ Deployment completed successfully!"
echo "====================================================="
