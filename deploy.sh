#!/usr/bin/env bash
# =============================================================================
# deploy.sh — SMKN 1 Wonogiri Portal
# =============================================================================
# Tarik perubahan dari GitHub, build ulang, restart Passenger di cPanel.
# DATABASE (data/) TIDAK PERNAH DIUBAH — dijamin oleh backup/restore.
#
# Penggunaan:
#   bash deploy.sh            → deploy branch 'main'
#   bash deploy.sh develop    → deploy branch tertentu
#
# Prasyarat di cPanel:
#   - git, node, npm tersedia di PATH
#   - Remote 'origin' sudah di-set ke repo GitHub
#   - Passenger Node.js App sudah dikonfigurasi
# =============================================================================

set -euo pipefail

# ── Konfigurasi ───────────────────────────────────────────────────────────────
BRANCH="${1:-main}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$APP_DIR/deploy.log"
MAX_LOG_LINES=2000
DIST_TMP="$APP_DIR/.dist_tmp_$$"
DATA_BACKUP="$APP_DIR/.data_bak_$$"
ENV_BACKUP="$APP_DIR/.env_bak_$$"

# ── Warna terminal (dinonaktifkan jika bukan TTY) ─────────────────────────────
if [ -t 1 ]; then
  C_RED='\033[0;31m'; C_GREEN='\033[0;32m'; C_YELLOW='\033[1;33m'
  C_CYAN='\033[0;36m'; C_BOLD='\033[1m'; C_RESET='\033[0m'
else
  C_RED=''; C_GREEN=''; C_YELLOW=''; C_CYAN=''; C_BOLD=''; C_RESET=''
fi

# ── Logging ke layar dan file ─────────────────────────────────────────────────
_log() {
  local ts level color msg
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  level="$1"; color="$2"; msg="$3"
  printf "${C_CYAN}[%s]${C_RESET} ${C_BOLD}%s${C_RESET} ${color}%s${C_RESET}\n" \
    "$ts" "[$level]" "$msg"
  printf "[%s] [%s] %s\n" "$ts" "$level" "$msg" >> "$LOG_FILE"
}
log_ok()   { _log " OK " "$C_GREEN"  "$1"; }
log_info() { _log "INFO" ""          "$1"; }
log_warn() { _log "WARN" "$C_YELLOW" "$1"; }
log_err()  { _log " ERR" "$C_RED"    "$1"; }

# ── Rotasi log otomatis ───────────────────────────────────────────────────────
rotate_log() {
  if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt "$MAX_LOG_LINES" ]; then
    tail -n "$MAX_LOG_LINES" "$LOG_FILE" > "${LOG_FILE}.tmp" \
      && mv "${LOG_FILE}.tmp" "$LOG_FILE"
  fi
}

# ── Rollback otomatis jika ada error ─────────────────────────────────────────
rollback_and_exit() {
  local line="$1"
  log_err "Script gagal pada baris $line — rollback dijalankan..."

  if [ -d "$DIST_TMP/dist_old" ]; then
    rm -rf "$APP_DIR/dist" 2>/dev/null || true
    cp -r "$DIST_TMP/dist_old" "$APP_DIR/dist"
    log_warn "Dist lama dipulihkan."
  fi

  if [ -d "$DATA_BACKUP" ]; then
    rm -rf "$APP_DIR/data"
    cp -r "$DATA_BACKUP" "$APP_DIR/data"
    log_ok "data/ dipulihkan — DATABASE AMAN."
  fi

  if [ -f "$ENV_BACKUP" ]; then
    cp "$ENV_BACKUP" "$APP_DIR/.env"
    log_ok ".env dipulihkan."
  fi

  log_err "══════════════════════════════════════════════"
  log_err "DEPLOY GAGAL. Server tetap di versi sebelumnya."
  log_err "Periksa log: $LOG_FILE"
  log_err "══════════════════════════════════════════════"
  exit 1
}
trap 'rollback_and_exit $LINENO' ERR

# ── Cleanup file sementara saat exit ─────────────────────────────────────────
cleanup() {
  rm -rf "$DIST_TMP"  2>/dev/null || true
  rm -rf "$DATA_BACKUP" 2>/dev/null || true
  rm -f  "$ENV_BACKUP"  2>/dev/null || true
}
trap cleanup EXIT

# =============================================================================
rotate_log
log_info "══════════════════════════════════════════════════════"
log_info "DEPLOY DIMULAI — $(date '+%A, %d %B %Y %H:%M:%S')"
log_info "Branch  : $BRANCH"
log_info "App dir : $APP_DIR"
log_info "══════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 1 — Periksa prasyarat
# ─────────────────────────────────────────────────────────────────────────────
log_info "[1/8] Memeriksa prasyarat..."

for cmd in git node npm md5sum; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_err "Perintah '$cmd' tidak tersedia. Pastikan PATH sudah benar di cPanel."
    exit 1
  fi
done

log_ok "node=$(node --version)  npm=$(npm --version)  git=$(git --version | awk '{print $3}')"

if ! git -C "$APP_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  log_err "Bukan repositori git: $APP_DIR"
  exit 1
fi

if ! git -C "$APP_DIR" remote get-url origin >/dev/null 2>&1; then
  log_err "Remote 'origin' belum dikonfigurasi."
  log_err "Jalankan: git remote add origin https://github.com/USER/REPO.git"
  exit 1
fi

log_ok "Prasyarat OK."

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 2 — Lindungi database & .env SEBELUM git menyentuh apapun
# ─────────────────────────────────────────────────────────────────────────────
log_info "[2/8] Melindungi database dan konfigurasi..."

if [ -d "$APP_DIR/data" ]; then
  cp -r "$APP_DIR/data" "$DATA_BACKUP"
  FILE_COUNT="$(ls "$DATA_BACKUP" | wc -l | tr -d ' ')"
  DATA_SIZE="$(du -sh "$DATA_BACKUP" | cut -f1)"
  log_ok "data/ di-backup ($FILE_COUNT file, $DATA_SIZE) — aman dari git."
else
  log_warn "Folder data/ tidak ada (akan dibuat server saat pertama kali jalan)."
fi

if [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" "$ENV_BACKUP"
  log_ok ".env di-backup."
fi

COMMIT_BEFORE="$(git -C "$APP_DIR" rev-parse HEAD 2>/dev/null || echo 'awal')"
log_info "Commit sekarang : $(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || echo '-')"

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 3 — Tarik perubahan dari GitHub
# ─────────────────────────────────────────────────────────────────────────────
log_info "[3/8] Menarik perubahan dari GitHub (branch: $BRANCH)..."

git -C "$APP_DIR" fetch origin "$BRANCH" 2>&1 | \
  sed 's/^/  [git] /' | tee -a "$LOG_FILE"

git -C "$APP_DIR" reset --hard "origin/$BRANCH" 2>&1 | \
  sed 's/^/  [git] /' | tee -a "$LOG_FILE"

COMMIT_AFTER="$(git -C "$APP_DIR" rev-parse HEAD)"
COMMIT_SHORT="$(git -C "$APP_DIR" rev-parse --short HEAD)"

if [ "$COMMIT_BEFORE" = "$COMMIT_AFTER" ]; then
  log_warn "Tidak ada commit baru (sudah up-to-date di $COMMIT_SHORT)."
  log_warn "Build tetap dilanjutkan untuk memastikan konsistensi."
else
  CHANGED="$(git -C "$APP_DIR" diff --name-only "$COMMIT_BEFORE" "$COMMIT_AFTER" 2>/dev/null | wc -l | tr -d ' ')"
  log_ok "Update: ...${COMMIT_BEFORE:0:7} → $COMMIT_SHORT ($CHANGED file berubah)"
  git -C "$APP_DIR" log --oneline "$COMMIT_BEFORE..$COMMIT_AFTER" 2>/dev/null | \
    while IFS= read -r line; do log_info "  changelog: $line"; done
fi

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 4 — Pulihkan database SEGERA setelah git reset
# ─────────────────────────────────────────────────────────────────────────────
log_info "[4/8] Memulihkan database dari backup..."

if [ -d "$DATA_BACKUP" ]; then
  rm -rf "$APP_DIR/data"
  cp -r "$DATA_BACKUP" "$APP_DIR/data"
  log_ok "data/ dipulihkan. Database tidak tersentuh git."
fi

if [ -f "$ENV_BACKUP" ]; then
  cp "$ENV_BACKUP" "$APP_DIR/.env"
  log_ok ".env dipulihkan."
fi

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 5 — Install npm (hanya jika package-lock berubah)
# ─────────────────────────────────────────────────────────────────────────────
log_info "[5/8] Memeriksa dependensi npm..."

LOCKFILE="$APP_DIR/package-lock.json"
NEEDS_INSTALL=false

if [ ! -d "$APP_DIR/node_modules" ]; then
  log_warn "node_modules tidak ada → install diperlukan."
  NEEDS_INSTALL=true
elif [ ! -f "$LOCKFILE" ]; then
  log_warn "package-lock.json tidak ditemukan → install diperlukan."
  NEEDS_INSTALL=true
else
  LOCK_MARK="$APP_DIR/node_modules/.deploy_lock_hash"
  LOCK_HASH="$(md5sum "$LOCKFILE" | cut -d' ' -f1)"
  PREV_HASH="$(cat "$LOCK_MARK" 2>/dev/null || echo '')"
  if [ "$LOCK_HASH" != "$PREV_HASH" ]; then
    log_info "package-lock.json berubah → install ulang."
    NEEDS_INSTALL=true
  else
    log_ok "Dependensi tidak berubah — skip npm install."
  fi
fi

if [ "$NEEDS_INSTALL" = true ]; then
  log_info "Menjalankan npm ci (mungkin 1–3 menit)..."
  npm --prefix "$APP_DIR" ci 2>&1 | \
    sed 's/^/  [npm] /' | tee -a "$LOG_FILE"
  md5sum "$LOCKFILE" | cut -d' ' -f1 \
    > "$APP_DIR/node_modules/.deploy_lock_hash"
  log_ok "npm ci selesai."
fi

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 6 — Build production
# ─────────────────────────────────────────────────────────────────────────────
log_info "[6/8] Membangun aplikasi (NODE_ENV=production)..."

mkdir -p "$DIST_TMP"
if [ -d "$APP_DIR/dist" ]; then
  cp -r "$APP_DIR/dist" "$DIST_TMP/dist_old"
  log_info "Dist lama di-backup untuk rollback darurat."
fi

BUILD_START="$(date +%s)"
NODE_ENV=production npm --prefix "$APP_DIR" run build 2>&1 | \
  sed 's/^/  [build] /' | tee -a "$LOG_FILE"
BUILD_SECS="$(( $(date +%s) - BUILD_START ))"

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 7 — Verifikasi hasil build
# ─────────────────────────────────────────────────────────────────────────────
log_info "[7/8] Memverifikasi hasil build..."

VERIFY_ERRORS=0

for f in "dist/server.cjs" "dist/index.html"; do
  if [ -f "$APP_DIR/$f" ]; then
    SIZE="$(du -sh "$APP_DIR/$f" | cut -f1)"
    log_ok "  ✓ $f  ($SIZE)"
  else
    log_err "  ✗ $f  TIDAK DITEMUKAN"
    VERIFY_ERRORS=$(( VERIFY_ERRORS + 1 ))
  fi
done

if [ ! -d "$APP_DIR/dist/assets" ]; then
  log_err "  ✗ dist/assets/  TIDAK DITEMUKAN"
  VERIFY_ERRORS=$(( VERIFY_ERRORS + 1 ))
else
  ASSET_COUNT="$(ls "$APP_DIR/dist/assets/" | wc -l | tr -d ' ')"
  log_ok "  ✓ dist/assets/  ($ASSET_COUNT file)"
fi

# Pastikan base path /id/ sudah benar di index.html
if grep -q '"/id/' "$APP_DIR/dist/index.html" 2>/dev/null; then
  log_ok "  ✓ Base path /id/ terdeteksi di index.html"
else
  log_err "  ✗ Base path /id/ TIDAK ditemukan di index.html — build mungkin salah konfigurasi!"
  VERIFY_ERRORS=$(( VERIFY_ERRORS + 1 ))
fi

if [ "$VERIFY_ERRORS" -gt 0 ]; then
  log_err "$VERIFY_ERRORS masalah verifikasi ditemukan. Build dibatalkan."
  exit 1
fi

DIST_SIZE="$(du -sh "$APP_DIR/dist" | cut -f1)"
log_ok "Build valid: $DIST_SIZE total, selesai dalam ${BUILD_SECS}s."

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 8 — Restart Passenger (cPanel)
# ─────────────────────────────────────────────────────────────────────────────
log_info "[8/8] Merestart aplikasi Node.js di cPanel..."

mkdir -p "$APP_DIR/tmp"
touch "$APP_DIR/tmp/restart.txt"
log_ok "tmp/restart.txt diperbarui — Passenger akan restart."

# =============================================================================
log_info "══════════════════════════════════════════════════════"
log_ok   "DEPLOY BERHASIL ✓"
log_info "Commit  : $COMMIT_AFTER"
log_info "Branch  : $BRANCH"
log_info "Build   : ${BUILD_SECS}s"
log_info "Database: TIDAK DIUBAH (data/ aman)"
log_info "Log     : $LOG_FILE"
log_info "══════════════════════════════════════════════════════"
log_info ""
log_info "Jika aplikasi belum merespons dalam 30 detik:"
log_info "  cPanel → Node.js App → klik tombol RESTART secara manual."
log_info "Test endpoint: curl https://smkn1wonogiri.sch.id/id/api/health"
log_info "══════════════════════════════════════════════════════"
