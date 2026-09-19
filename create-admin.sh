#!/bin/bash
# Wall-to-Wall CRM - Create or Update Admin User Script
# Usage:
#   bash create-admin.sh
#   bash create-admin.sh <email> <password>
#   bash create-admin.sh <email> <password> "<full_name>" <username>
#   bash create-admin.sh --email=user@domain.com --password=secret

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT/apps/api"

npx tsx scripts/create-admin.ts "$@"
