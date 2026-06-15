#!/bin/bash
# ─── Deploy script for cPanel / VPS ──────────────────────────────────────────
# Run this once after uploading the project files to the server:
#   chmod +x deploy.sh && bash deploy.sh

set -e

echo "==> Installing dependencies..."
npm install --omit=dev

echo "==> Building frontend + server bundle..."
NODE_ENV=production npm run build

echo "==> Done! dist/ is ready."
echo ""
echo "Next steps in cPanel → Node.js Selector:"
echo "  1. Application root  : <path to this project folder>"
echo "  2. Application URL   : smkn1wonogiri.sch.id/id"
echo "  3. Startup file      : dist/server.cjs"
echo "  4. Node.js version   : 20.x (or higher)"
echo "  5. Environment vars  :"
echo "       NODE_ENV  = production"
echo "       BASE_PATH = /id"
echo "       ADMIN_USERNAME = (your admin username)"
echo "       ADMIN_PASSWORD = (your strong password)"
echo "  6. Click 'Run NPM Install' then 'Restart'"
