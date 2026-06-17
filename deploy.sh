#!/bin/bash
# ─── Deploy script for cPanel (run this from /public_html/id terminal) ───────
# Usage: bash deploy.sh
set -e

echo "==> Pulling latest code from git..."
git pull origin main

echo "==> Installing dependencies..."
npm install --omit=dev

echo "==> Building (production — base path /id/)..."
NODE_ENV=production npm run build

echo "==> Restarting Passenger / Node.js app..."
mkdir -p tmp
touch tmp/restart.txt
echo "    restart.txt created at $(date)"

echo ""
echo "==> Deploy complete!"
echo ""
echo "    IMPORTANT: If the site is still not working, go to cPanel"
echo "    → Node.js App Selector → find SMKN1WONOGIRI.SCH.ID/ID"
echo "    → click RESTART button. Wait 15 seconds, then test."
echo ""
echo "    Test API:  curl https://smkn1wonogiri.sch.id/id/api/health"
echo "    Test page: open https://smkn1wonogiri.sch.id/id in browser"
