#!/bin/bash

# Cookscape CRM Automated VPS Deployment Script
# Rebuilds both Frontend & Backend without touching the existing Database.

# Exit immediately if a command exits with a non-zero status
set -e

echo "====================================================="
echo "🚀 Starting Cookscape CRM Automated Deployment..."
echo "====================================================="

# 1. Pull the latest codebase
echo "⏬ Step 1: Pulling latest changes from git..."
git pull origin main

# 2. Rebuild the Frontend
echo "💻 Step 2: Rebuilding Frontend (apps/web)..."
cd apps/web
echo "Installing frontend dependencies..."
npm install
echo "Compiling production assets..."
npm run build
cd ../..

# 3. Rebuild the Backend
echo "⚙️ Step 3: Rebuilding Backend (apps/api)..."
cd apps/api
echo "Applying database migrations..."
npx prisma migrate deploy
npx prisma generate
echo "Compiling backend TypeScript..."
npm run build
cd ../..

# 4. Restart services using PM2
echo "🔄 Step 4: Restarting PM2 processes..."
# Restart cookscape-api (ID 7) on the VPS
if pm2 list | grep -q "cookscape-api"; then
    echo "Restarting cookscape-api PM2 process..."
    pm2 restart cookscape-api
else
    echo "⚠️  PM2 process 'cookscape-api' not found. Please restart ID 7 manually."
fi

echo "====================================================="
echo "✅ Deployment completed successfully!"
echo "====================================================="
