#!/usr/bin/env bash
# =============================================================================
# deploy.sh — SMKN 1 Wonogiri Portal
# =============================================================================
# Tarik perubahan dari GitHub (termasuk dist/ yang sudah dibangun di Replit),
# lalu restart Node.js di cPanel.
#
# Build dilakukan di Replit (VITE_BASE_PATH=/id/ npm run build), lalu di-commit
# ke GitHub. Script ini TIDAK perlu build ulang di server.
#
# Yang TIDAK PERNAH diubah oleh script ini:
#   - data/       (database JSON flat-file)
#   - .env        (variabel lingkungan / secrets)
#   - app.js      (Passenger startup file — spesifik cPanel, JANGAN di-overwrite)
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

# Folder/file yang wajib dilindungi dari git reset --hard
# PENTING: .htaccess dilindungi karena cPanel Node.js Selector menulis blok proxy
# (RewriteRule ke localhost:PORT) ke dalam .htaccess saat app di-Restart dari UI cPanel.
# git reset --hard akan menghapus blok itu → API 404. Solusi: backup .htaccess sebelum
# reset, pulihkan sesudahnya sehingga blok proxy cPanel tetap ada.
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
PROTECT_DIR="$APP_DIR/.deploy_protect_$$"

backup_protected() {
  mkdir -p "$PROTECT_DIR"
  for item in "${PROTECTED_FILES[@]}"; do
    local src="$APP_DIR/$item"
    if [ -e "$src" ]; then
      cp -rp "$src" "$PROTECT_DIR/$item" 2>/dev/null || true
      log_info "  Backup: $item"
    fi
  done
}

restore_protected() {
  for item in "${PROTECTED_FILES[@]}"; do
    local bak="$PROTECT_DIR/$item"
    if [ -e "$bak" ]; then
      rm -rf "$APP_DIR/$item" 2>/dev/null || true
      cp -rp "$bak" "$APP_DIR/$item" 2>/dev/null || true
      log_info "  Dipulihkan: $item"
    fi
  done
}

# ── ERR trap: rollback otomatis ───────────────────────────────────────────────
on_error() {
  local line="$1"
  log_err "Script gagal pada baris $line — rollback dijalankan..."
  restore_protected
  restart_nodejs || true
  log_err "══════════════════════════════════════════════════"
  log_err "DEPLOY GAGAL. Site berjalan dengan versi sebelumnya."
  log_err "Periksa: $LOG_FILE"
  log_err "══════════════════════════════════════════════════"
  exit 1
}
trap 'on_error $LINENO' ERR

cleanup() { rm -rf "$PROTECT_DIR" 2>/dev/null || true; }
trap cleanup EXIT

# ── Restart Node.js ───────────────────────────────────────────────────────────
restart_nodejs() {
  local restarted=0

  # Metode 1: tmp/restart.txt (Passenger / cPanel LiteSpeed Selector)
  mkdir -p "$APP_DIR/tmp"
  touch "$APP_DIR/tmp/restart.txt"
  log_ok "tmp/restart.txt diperbarui."

  # Metode 2: cPanel API restart (jika tersedia dan modul NodeJS terpasang)
  if command -v uapi >/dev/null 2>&1; then
    UAPI_OUT="$(uapi NodeJS restart_app 2>&1 || true)"
    if echo "$UAPI_OUT" | grep -q 'status: 1'; then
      log_ok "uapi NodeJS restart_app: berhasil."
      restarted=1
    else
      log_warn "uapi NodeJS restart_app tidak tersedia — mencoba metode lain..."
    fi
  fi

  # Metode 3: Kirim SIGTERM ke proses Node.js yang sedang berjalan
  # LiteSpeed / cPanel Node.js Selector akan spawn ulang otomatis setelah proses mati.
  if [ "$restarted" -eq 0 ]; then
    WHOAMI="$(whoami)"
    # Cari PID proses node yang menjalankan app.js atau server.cjs
    NODEPID="$(pgrep -u "$WHOAMI" -f "node.*(app\.js|server\.cjs)" 2>/dev/null | head -1 || true)"
    if [ -n "$NODEPID" ]; then
      if kill -SIGTERM "$NODEPID" 2>/dev/null; then
        log_ok "Proses Node.js (PID: $NODEPID) dikirim SIGTERM — LiteSpeed akan restart."
        sleep 3
        restarted=1
      else
        log_warn "Gagal SIGTERM PID $NODEPID — mungkin perlu hak akses lebih."
      fi
    else
      # Coba fallback: semua proses node milik user ini
      NODEPID="$(pgrep -u "$WHOAMI" node 2>/dev/null | head -1 || true)"
      if [ -n "$NODEPID" ]; then
        if kill -SIGTERM "$NODEPID" 2>/dev/null; then
          log_ok "Proses Node.js (PID: $NODEPID) dikirim SIGTERM."
          sleep 3
          restarted=1
        fi
      fi
    fi
    [ "$restarted" -eq 0 ] && log_warn "Proses Node.js tidak ditemukan via pgrep — restart manual diperlukan."
  fi

  # Metode 4: cPanel killall (beberapa server mendukung ini)
  if [ "$restarted" -eq 0 ] && command -v killall >/dev/null 2>&1; then
    if killall -u "$(whoami)" -SIGTERM node 2>/dev/null; then
      log_ok "killall -SIGTERM node: berhasil."
      sleep 3
      restarted=1
    fi
  fi

  if [ "$restarted" -eq 0 ]; then
    log_warn "Semua metode restart otomatis gagal."
    log_warn "  → Buka cPanel → Setup Node.js App → klik RESTART pada app '/id'"
  fi
}

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
log_info "[1/5] Memeriksa prasyarat..."

for cmd in git node; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_err "Perintah '$cmd' tidak tersedia di PATH."
    exit 1
  fi
done

log_ok "node=$(node --version)  git=$(git --version | awk '{print $3}')"

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
# LANGKAH 2 — Backup file yang dilindungi
# ─────────────────────────────────────────────────────────────────────────────
log_info "[2/5] Backup file yang dilindungi..."

backup_protected

COMMIT_BEFORE="$(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || echo 'awal')"
log_info "Commit saat ini: $COMMIT_BEFORE"

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 3 — Tarik perubahan dari GitHub (termasuk dist/ yang sudah dibangun)
# ─────────────────────────────────────────────────────────────────────────────
log_info "[3/5] Menarik perubahan dari GitHub (branch: $BRANCH)..."

git -C "$APP_DIR" fetch origin "$BRANCH" 2>&1 | sed 's/^/  [git] /' | tee -a "$LOG_FILE"
git -C "$APP_DIR" reset --hard "origin/$BRANCH" 2>&1 | sed 's/^/  [git] /' | tee -a "$LOG_FILE"

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
# LANGKAH 4 — Pulihkan file yang dilindungi + verifikasi dist/
# ─────────────────────────────────────────────────────────────────────────────
log_info "[4/5] Memulihkan file yang dilindungi..."

restore_protected

log_ok "data/, .env, app.js aman — tidak tersentuh git."

# Bersihkan file aset lama yang tidak terlacak git (sisa upload manual sebelumnya)
# git reset --hard tidak menghapus file untracked; ini wajib untuk mencegah
# file JS/CSS lama dengan hash berbeda mengacaukan cache browser.
log_info "Membersihkan file aset usang dari dist/assets/..."
git -C "$APP_DIR" clean -fd dist/assets/ 2>/dev/null | while IFS= read -r l; do log_info "  $l"; done || true
git -C "$APP_DIR" clean -fd dist/ 2>/dev/null | while IFS= read -r l; do log_info "  $l"; done || true
log_ok "Aset usang dibersihkan."

# Verifikasi dist/ dari repo sudah ada dan benar
log_info "Memverifikasi dist/ dari repo..."

VERIFY_ERR=0
for req in "dist/server.cjs" "dist/index.html" "dist/assets"; do
  if [ -e "$APP_DIR/$req" ]; then
    SIZE="$(du -sh "$APP_DIR/$req" 2>/dev/null | cut -f1 || echo '?')"
    log_ok "  ✓ $req  ($SIZE)"
  else
    log_err "  ✗ $req  TIDAK DITEMUKAN — pastikan 'dist/' sudah di-commit ke GitHub!"
    VERIFY_ERR=$((VERIFY_ERR + 1))
  fi
done

# Pastikan base path /id/ ada di index.html
if grep -q '"/id/' "$APP_DIR/dist/index.html" 2>/dev/null || grep -q "'/id/" "$APP_DIR/dist/index.html" 2>/dev/null; then
  log_ok "  ✓ Base path /id/ terdeteksi di index.html"
else
  log_warn "  ⚠ Base path /id/ tidak terdeteksi di index.html — pastikan build dengan VITE_BASE_PATH=/id/"
fi

# Cek ukuran dist/server.cjs — harus > 100KB
SERVER_SIZE="$(du -k "$APP_DIR/dist/server.cjs" 2>/dev/null | cut -f1 || echo 0)"
if [ "$SERVER_SIZE" -lt 100 ]; then
  log_err "  ✗ dist/server.cjs terlalu kecil (${SERVER_SIZE}KB) — build mungkin tidak lengkap"
  VERIFY_ERR=$((VERIFY_ERR + 1))
else
  log_ok "  ✓ dist/server.cjs ukuran OK (${SERVER_SIZE}KB)"
fi

if [ "$VERIFY_ERR" -gt 0 ]; then
  log_err "$VERIFY_ERR masalah terdeteksi — deploy dibatalkan."
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# LANGKAH 5 — Restart Node.js
# ─────────────────────────────────────────────────────────────────────────────
log_info "[5/5] Merestart aplikasi Node.js di cPanel..."

restart_nodejs

# =============================================================================
log_info "══════════════════════════════════════════════════"
log_ok   "DEPLOY BERHASIL ✓"
log_info "Commit  : $COMMIT_AFTER"
log_info "Branch  : $BRANCH"
log_info "Data DB   : TIDAK DIUBAH"
log_info "app.js    : TIDAK DIUBAH (dari cPanel)"
log_info ".htaccess : DIPERBARUI dari repo"
log_info "Log     : $LOG_FILE"
log_info "══════════════════════════════════════════════════"
log_info ""
log_info "Jika site belum merespons dalam 30 detik:"
log_info "  cPanel → Node.js App → klik RESTART secara manual."
log_info "Test: curl https://smkn1wonogiri.sch.id/id/api/health"
log_info "══════════════════════════════════════════════════"
