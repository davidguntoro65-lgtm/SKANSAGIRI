#!/usr/bin/env bash
# =============================================================================
# deploy.sh — SMKN 1 Wonogiri Portal
# =============================================================================
# Tarik perubahan dari GitHub, build ulang, restart Passenger di cPanel.
#
# Yang TIDAK PERNAH diubah oleh script ini:
#   - data/       (database JSON flat-file)
#   - .env        (variabel lingkungan / secrets)
#   - app.js      (Passenger startup file — spesifik cPanel, JANGAN di-overwrite)
#   - .htaccess   (Apache routing — spesifik cPanel, JANGAN di-overwrite)
#
# Penggunaan:
#   bash deploy.sh            → deploy branch 'main'
#   bash deploy.sh develop    → deploy branch lain
# =============================================================================

set -euo pipefail

# ── Konfigurasi ───────────────────────────────────────────────────────────────
BRANCH="${1:-main}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$APP_DIR/deploy.log"
MAX_LOG_LINES=2000

# Folder/file yang wajib dilindungi dari git (backup sebelum pull, restore sesudah)
PROTECTED_FILES=("data" ".env" "app.js" ".htaccess")

# ── Warna terminal ────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  CR='\033[0;31m' CG='\033[0;32m' CY='\033[1;33m'
  CC='\033[0;36m' CB='\033[1m' CX='\033[0m'
else
  CR='' CG='' CY='' CC='' CB='' CX=''
fi

# ── Logging ───────────────────────────────────────────────────────────────────
_log() {
  local ts="$(date '+%Y-%m-%d %H:%M:%S')" lv="$1" col="$2" msg="$3"
  printf "${CC}[%s]${CX} ${CB}%s${CX} ${col}%s${CX}\n" "$ts" "[$lv]" "$msg"
  printf "[%s] [%s] %s\n" "$ts" "$lv" "$msg" >> "$LOG_FILE"
}
log_ok()   { _log " OK " "$CG" "$1"; }
log_info() { _log "INFO" ""   "$1"; }
log_warn() { _log "WARN" "$CY" "$1"; }
log_err()  { _log " ERR" "$CR" "$1"; }

rotate_log() {
  [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt "$MAX_LOG_LINES" ] && \
    tail -n "$MAX_LOG_LINES" "$LOG_FILE" > "${LOG_FILE}.tmp" && \
    mv "${LOG_FILE}.tmp" "$LOG_FILE" || true
}

# ── Backup / Restore helpers ──────────────────────────────────────────────────
# Simpan semua file/folder yang dilindungi ke .deploy_protect_<pid>/
PROTECT_DIR="$APP_DIR/.deploy_protect_$$"

backup_protected() {
  mkdir -p "$PROTECT_DIR"
  for item in "${PROTECTED_FILES[@]}"; do
    local src="$APP_DIR/$item"
    if [ -e "$src" ]; then
      cp -r "$src" "$PROTECT_DIR/$item"
      log_info "  Dibackup: $item"
    fi
  done
}

restore_protected() {
  for item in "${PROTECTED_FILES[@]}"; do
    local bak="$PROTECT_DIR/$item"
    if [ -e "$bak" ]; then
      rm -rf "$APP_DIR/$item"
      cp -r "$bak" "$APP_DIR/$item"
      log_info "  Dipulihkan: $item"
    fi
  done
}

# ── Rollback dist jika build gagal ────────────────────────────────────────────
DIST_BAK="$APP_DIR/.deploy_dist_$$"

backup_dist() {
  [ -d "$APP_DIR/dist" ] && cp -r "$APP_DIR/dist" "$DIST_BAK" && \
    log_info "  dist/ di-backup untuk rollback darurat."
}

rollback_dist() {
  if [ -d "$DIST_BAK" ]; then
    rm -rf "$APP_DIR/dist" 2>/dev/null || true
    cp -r "$DIST_BAK" "$APP_DIR/dist"
    log_warn "dist/ dipulihkan dari backup."
  fi
}

# ── Cleanup sementara saat script keluar ─────────────────────────────────────
cleanup() {
  rm -rf "$PROTECT_DIR" "$DIST_BAK" 2>/dev/null || true
}
trap cleanup EXIT

# ── ERR trap: rollback otomatis ───────────────────────────────────────────────
on_error() {
  local line="$1"
  log_err "Script gagal pada baris $line — rollback dijalankan..."

  # Pulihkan dist lama
  rollback_dist

  # Pulihkan semua file yang dilindungi
  restore_protected

  # Coba restart Passenger dengan versi lama agar site tidak mati
  if [ -d "$APP_DIR/tmp" ] || mkdir -p "$APP_DIR/tmp" 2>/dev/null; then
    touch "$APP_DIR/tmp/restart.txt" 2>/dev/null || true
    log_warn "Passenger di-restart dengan versi LAMA."
  fi

  log_err "══════════════════════════════════════════════════"
  log_err "DEPLOY GAGAL. Site berjalan dengan versi sebelumnya."
  log_err "Periksa: $LOG_FILE"
  log_err "══════════════════════════════════════════════════"
  exit 1
}
trap 'on_error $LINENO' ERR

# =============================================================================
rotate_log
log_info "══════════════════════════════════════════════════"
log_info "DEPLOY DIMULAI — $(date '+%d %B %Y %H:%M:%S')"
log_info "Branch  : $BRANCH"
log_info "App dir : $APP_DIR"
log_info "══════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 1 — Periksa prasyarat
# ─────────────────────────────────────────────────────────────────────────────
log_info "[1/8] Memeriksa prasyarat..."

for cmd in git node npm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_err "Perintah '$cmd' tidak tersedia di PATH."
    exit 1
  fi
done

log_ok "node=$(node --version)  npm=$(npm --version)  git=$(git --version | awk '{print $3}')"

if ! git -C "$APP_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  log_err "$APP_DIR bukan repositori git."
  exit 1
fi

if ! git -C "$APP_DIR" remote get-url origin >/dev/null 2>&1; then
  log_err "Remote 'origin' belum dikonfigurasi."
  log_err "Jalankan: git remote add origin https://github.com/USER/REPO.git"
  exit 1
fi

log_ok "Prasyarat OK."

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 2 — Backup semua file yang dilindungi SEBELUM git
# ─────────────────────────────────────────────────────────────────────────────
log_info "[2/8] Backup file yang dilindungi..."

backup_protected

COMMIT_BEFORE="$(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || echo 'awal')"
log_info "Commit saat ini: $COMMIT_BEFORE"

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 3 — Tarik perubahan dari GitHub
# ─────────────────────────────────────────────────────────────────────────────
log_info "[3/8] Menarik perubahan dari GitHub (branch: $BRANCH)..."

# Fetch dulu
git -C "$APP_DIR" fetch origin "$BRANCH" 2>&1 | \
  sed 's/^/  [git] /' | tee -a "$LOG_FILE"

# Reset hard ke remote state (bersih tanpa konflik merge)
git -C "$APP_DIR" reset --hard "origin/$BRANCH" 2>&1 | \
  sed 's/^/  [git] /' | tee -a "$LOG_FILE"

COMMIT_AFTER="$(git -C "$APP_DIR" rev-parse HEAD)"
COMMIT_SHORT="$(git -C "$APP_DIR" rev-parse --short HEAD)"

if [ "$COMMIT_BEFORE" = "$COMMIT_SHORT" ]; then
  log_warn "Tidak ada commit baru (sudah up-to-date di $COMMIT_SHORT)."
else
  CHANGED="$(git -C "$APP_DIR" diff --name-only "${COMMIT_BEFORE}" "$COMMIT_AFTER" 2>/dev/null | wc -l | tr -d ' ')"
  log_ok "$COMMIT_BEFORE → $COMMIT_SHORT ($CHANGED file berubah)"
  git -C "$APP_DIR" log --oneline "${COMMIT_BEFORE}..$COMMIT_AFTER" 2>/dev/null | \
    while IFS= read -r line; do log_info "  changelog: $line"; done
fi

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 4 — Pulihkan file yang dilindungi SEGERA setelah git reset
#
# PENTING: app.js dan .htaccess dipulihkan dari backup cPanel, BUKAN dari git.
# app.js adalah Passenger startup file yang dikonfigurasi cPanel.
# .htaccess mungkin memiliki konfigurasi host-specific yang tidak ada di git.
# ─────────────────────────────────────────────────────────────────────────────
log_info "[4/8] Memulihkan file yang dilindungi..."

restore_protected

log_ok "data/, .env, app.js, .htaccess aman — tidak tersentuh git."

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 5 — Install npm (hanya jika diperlukan)
#
# Gunakan 'npm install' bukan 'npm ci' untuk:
#   - Tidak menghapus node_modules yang sudah ada (lebih aman di cPanel)
#   - Hanya menginstall paket yang belum ada atau berubah
# ─────────────────────────────────────────────────────────────────────────────
log_info "[5/8] Memeriksa dependensi npm..."

LOCKFILE="$APP_DIR/package-lock.json"
NEEDS_INSTALL=false

if [ ! -d "$APP_DIR/node_modules" ]; then
  log_warn "node_modules tidak ada → install diperlukan."
  NEEDS_INSTALL=true
elif [ ! -f "$LOCKFILE" ]; then
  log_warn "package-lock.json tidak ada → install diperlukan."
  NEEDS_INSTALL=true
else
  # Bandingkan hash package-lock dengan yang terakhir di-install
  LOCK_MARK="$APP_DIR/node_modules/.deploy_lock_hash"
  LOCK_HASH="$(md5sum "$LOCKFILE" 2>/dev/null | cut -d' ' -f1 || echo '')"
  PREV_HASH="$(cat "$LOCK_MARK" 2>/dev/null || echo '')"
  if [ "$LOCK_HASH" != "$PREV_HASH" ]; then
    log_info "package-lock.json berubah → update dependensi."
    NEEDS_INSTALL=true
  else
    log_ok "Dependensi tidak berubah — skip install."
  fi
fi

if [ "$NEEDS_INSTALL" = true ]; then
  log_info "Menjalankan npm install (ini mungkin 1–3 menit)..."
  # Gunakan --include=dev agar vite, esbuild, typescript tersedia untuk build
  npm --prefix "$APP_DIR" install --include=dev --no-audit --no-fund 2>&1 | \
    sed 's/^/  [npm] /' | tee -a "$LOG_FILE"
  # Simpan hash yang berhasil diinstall
  [ -f "$LOCKFILE" ] && md5sum "$LOCKFILE" | cut -d' ' -f1 \
    > "$APP_DIR/node_modules/.deploy_lock_hash" || true
  log_ok "npm install selesai."
fi

# Pastikan vite dan esbuild tersedia (build tool wajib)
for build_tool in vite esbuild; do
  if ! "$APP_DIR/node_modules/.bin/$build_tool" --version >/dev/null 2>&1; then
    log_err "Build tool '$build_tool' tidak tersedia di node_modules/.bin/."
    log_err "Coba hapus node_modules/ lalu jalankan deploy.sh lagi."
    exit 1
  fi
done
log_ok "Build tools tersedia: vite=$(./node_modules/.bin/vite --version 2>/dev/null | head -1) esbuild=$(./node_modules/.bin/esbuild --version 2>/dev/null)"

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 6 — Build production
# ─────────────────────────────────────────────────────────────────────────────
log_info "[6/8] Membangun aplikasi (NODE_ENV=production)..."

# Backup dist lama untuk rollback jika build gagal
backup_dist

BUILD_START="$(date +%s)"
NODE_ENV=production npm --prefix "$APP_DIR" run build 2>&1 | \
  sed 's/^/  [build] /' | tee -a "$LOG_FILE"
BUILD_SECS="$(( $(date +%s) - BUILD_START ))"
log_ok "Build selesai dalam ${BUILD_SECS}s."

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 7 — Verifikasi hasil build
# ─────────────────────────────────────────────────────────────────────────────
log_info "[7/8] Memverifikasi hasil build..."

VERIFY_ERR=0

# Cek file wajib ada dan tidak kosong
for req in "dist/server.cjs" "dist/index.html" "dist/assets"; do
  if [ -e "$APP_DIR/$req" ]; then
    SIZE="$(du -sh "$APP_DIR/$req" 2>/dev/null | cut -f1 || echo '?')"
    log_ok "  ✓ $req  ($SIZE)"
  else
    log_err "  ✗ $req  TIDAK DITEMUKAN"
    VERIFY_ERR=$((VERIFY_ERR + 1))
  fi
done

# Cek ukuran dist/server.cjs — harus > 100KB (bundle lengkap)
SERVER_SIZE="$(du -k "$APP_DIR/dist/server.cjs" 2>/dev/null | cut -f1 || echo 0)"
if [ "$SERVER_SIZE" -lt 100 ]; then
  log_err "  ✗ dist/server.cjs terlalu kecil ($SERVER_SIZE KB) — kemungkinan build tidak lengkap"
  VERIFY_ERR=$((VERIFY_ERR + 1))
else
  log_ok "  ✓ dist/server.cjs ukuran OK (${SERVER_SIZE} KB)"
fi

# Validasi sintaks CJS bundle dengan Node.js
if node --check "$APP_DIR/dist/server.cjs" 2>/dev/null; then
  log_ok "  ✓ dist/server.cjs sintaks valid (node --check OK)"
else
  log_err "  ✗ dist/server.cjs gagal validasi sintaks Node.js!"
  VERIFY_ERR=$((VERIFY_ERR + 1))
fi

# Cek base path /id/ di index.html (pastikan Vite build dengan config benar)
if grep -q '"/id/' "$APP_DIR/dist/index.html" 2>/dev/null; then
  log_ok "  ✓ Base path /id/ terdeteksi di index.html"
else
  log_err "  ✗ Base path /id/ TIDAK ditemukan di index.html — periksa vite.config.ts!"
  VERIFY_ERR=$((VERIFY_ERR + 1))
fi

if [ "$VERIFY_ERR" -gt 0 ]; then
  log_err "$VERIFY_ERR masalah terdeteksi. Build dibatalkan, rollback..."
  rollback_dist
  exit 1
fi

DIST_SIZE="$(du -sh "$APP_DIR/dist" | cut -f1)"
log_ok "Build valid: $DIST_SIZE total, ${BUILD_SECS}s."

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 8 — Restart Passenger (cPanel)
# ─────────────────────────────────────────────────────────────────────────────
log_info "[8/8] Merestart aplikasi Node.js di cPanel..."

mkdir -p "$APP_DIR/tmp"
touch "$APP_DIR/tmp/restart.txt"
log_ok "tmp/restart.txt diperbarui — Passenger akan restart."

# =============================================================================
log_info "══════════════════════════════════════════════════"
log_ok   "DEPLOY BERHASIL ✓"
log_info "Commit  : $COMMIT_AFTER"
log_info "Branch  : $BRANCH"
log_info "Build   : ${BUILD_SECS}s"
log_info "Data DB : TIDAK DIUBAH"
log_info "app.js  : TIDAK DIUBAH (dari cPanel)"
log_info ".htaccess : TIDAK DIUBAH (dari cPanel)"
log_info "Log     : $LOG_FILE"
log_info "══════════════════════════════════════════════════"
log_info ""
log_info "Jika site belum merespons dalam 30 detik:"
log_info "  cPanel → Node.js App → klik RESTART secara manual."
log_info "Test: curl https://smkn1wonogiri.sch.id/id/api/health"
log_info "══════════════════════════════════════════════════"
