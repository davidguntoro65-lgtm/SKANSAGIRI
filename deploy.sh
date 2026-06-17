#!/bin/bash
# ─── Deploy script for cPanel / VPS ──────────────────────────────────────────
# Run this EVERY TIME you update the code on the cPanel server:
#   chmod +x deploy.sh && bash deploy.sh

set -e

echo "==> Installing dependencies..."
npm install --omit=dev

echo "==> Building frontend + server bundle (production base: /id/)..."
NODE_ENV=production npm run build

echo ""
echo "==> Build complete! dist/ is ready."
echo ""
echo "==> Restarting Node.js app..."
# cPanel Passenger picks up changes automatically on file touch:
touch tmp/restart.txt 2>/dev/null || true

echo ""
echo "==> Done. Your site at smkn1wonogiri.sch.id/id should now work."
echo ""
echo "First-time cPanel setup (Node.js Selector):"
echo "  Application root  : public_html/id"
echo "  Application URL   : smkn1wonogiri.sch.id/id"
echo "  Startup file      : app.js"
echo "  Node.js version   : 20.x"
echo "  Application mode  : Production  (sets NODE_ENV=production automatically)"
echo "  Environment vars  :"
echo "       ADMIN_USERNAME = (your admin username)"
echo "       ADMIN_PASSWORD = (your strong password)"
echo "  After setting env vars: click 'Run NPM Install' then 'Restart'"
