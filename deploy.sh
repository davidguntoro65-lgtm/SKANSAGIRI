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
#   - data/       (database JSON flat-file — logo, berita, galeri, kepala sekolah, dll.)
#   - logs/       (server log files)
#   - .env        (variabel lingkungan / secrets)
#   - app.js      (Passenger startup file — spesifik cPanel, JANGAN di-overwrite)
#   - .htaccess   (konfigurasi Apache spesifik server)
#
# Penggunaan:
#   bash deploy.sh            → deploy branch 'main'
#   bash deploy.sh develop    → deploy branch lain
#
# ARSITEKTUR DUA-FASE (penting):
#   git reset --hard mengganti file deploy.sh di disk dengan inode baru.
#   Bash tetap membaca dari inode LAMA sepanjang sesi. Solusinya: setelah
#   git reset, script re-exec dirinya sendiri via exec bash "$0" --post-reset
#   agar fase 2 (restore + clean + restart) berjalan dari inode BARU.
#
# KEAMANAN DATA:
#   data/ kini ada di .gitignore — git reset --hard TIDAK menyentuhnya.
#   Backup/restore berfungsi sebagai lapisan perlindungan kedua.
#   EXIT trap di Fase 1 dibersihkan sebelum exec agar backup tidak terhapus
#   sebelum Fase 2 sempat melakukan restore.
# =============================================================================

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$APP_DIR/deploy.log"
MAX_LOG_LINES=2000

# Folder/file yang wajib dilindungi dari git reset --hard (lapisan kedua)
# Catatan: data/ juga ada di .gitignore (lapisan pertama — git tidak menyentuhnya)
PROTECTED_FILES=("logs" ".env" "app.js" ".htaccess")

# ── Warna terminal ────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  CR='\033[0;31m' CG='\033[0;32m' CY='\033[1;33m'
  CC='\033[0;36m' CB='\033[1m' CX='\033[0m'
else
  CR='' CG='' CY='' CC='' CB='' CX=''
fi

# ── Logging ───────────────────────────────────────────────────────────────────
_log() {
  local ts lv col msg
  ts="$(date '+%Y-%m-%d %H:%M:%S')" lv="$1" col="$2" msg="$3"
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
backup_protected() {
  local protect_dir="$1"
  mkdir -p "$protect_dir" || { log_err "Tidak bisa membuat direktori backup: $protect_dir"; return 1; }
  local backup_ok=1
  for item in "${PROTECTED_FILES[@]}"; do
    local src="$APP_DIR/$item"
    if [ -e "$src" ]; then
      # Verifikasi: cp harus benar-benar berhasil (tidak disembunyikan dengan || true)
      if cp -rp "$src" "$protect_dir/$item" 2>/dev/null; then
        local sz
        sz="$(du -sh "$protect_dir/$item" 2>/dev/null | cut -f1 || echo '?')"
        log_ok "  Backup OK: $item ($sz)"
      else
        log_err "  GAGAL backup: $item — DEPLOY DIBATALKAN untuk keamanan data"
        backup_ok=0
      fi
    else
      log_info "  Lewati (tidak ada): $item"
    fi
  done
  [ "$backup_ok" -eq 0 ] && return 1
  return 0
}

restore_protected() {
  local protect_dir="$1"
  local restore_ok=1
  for item in "${PROTECTED_FILES[@]}"; do
    local bak="$protect_dir/$item"
    if [ -e "$bak" ]; then
      rm -rf "$APP_DIR/$item" 2>/dev/null || true
      if cp -rp "$bak" "$APP_DIR/$item" 2>/dev/null; then
        local sz
        sz="$(du -sh "$APP_DIR/$item" 2>/dev/null | cut -f1 || echo '?')"
        log_ok "  Dipulihkan: $item ($sz)"
      else
        log_err "  GAGAL restore: $item — BACKUP MASIH ADA DI: $protect_dir"
        restore_ok=0
      fi
    else
      log_info "  Tidak ada backup untuk: $item (dilewati)"
    fi
  done
  [ "$restore_ok" -eq 0 ] && return 1
  return 0
}

# Verifikasi backup: pastikan file-file yang di-backup ada di PROTECT_DIR
# Catatan: data/ TIDAK dicek di sini — data kini di PostgreSQL (bukan JSON),
# dan data/ dilindungi oleh .gitignore (git reset --hard tidak menyentuhnya).
verify_backup() {
  local protect_dir="$1"
  local ok=1
  for item in "${PROTECTED_FILES[@]}"; do
    if [ -e "$protect_dir/$item" ]; then
      log_ok "  Verifikasi backup OK: $item"
    else
      log_warn "  Verifikasi backup: $item tidak ada di backup (mungkin memang tidak ada di server)"
    fi
  done
  # Cek apakah ada setidaknya .env (wajib ada)
  if [ ! -f "$protect_dir/.env" ]; then
    log_err "KRITIS: .env tidak berhasil di-backup — deploy dibatalkan"
    ok=0
  fi
  [ "$ok" -eq 0 ] && return 1
  log_ok "  Verifikasi backup selesai."
  return 0
}

# Verifikasi restore: pastikan .env dan app.js ada setelah restore
verify_restore() {
  local ok=1
  for item in ".env" "app.js"; do
    if [ ! -e "$APP_DIR/$item" ]; then
      log_err "KRITIS: $item tidak ada setelah restore!"
      ok=0
    fi
  done
  [ "$ok" -eq 0 ] && return 1
  # Info: data/ dilindungi .gitignore, bukan backup — tampilkan statusnya
  if [ -d "$APP_DIR/data" ]; then
    local fc
    fc="$(find "$APP_DIR/data" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')"
    log_ok "  data/ tetap utuh ($fc file JSON) — dilindungi .gitignore"
  else
    log_info "  data/ tidak ada (data tersimpan di PostgreSQL — normal)"
  fi
  log_ok "  Verifikasi restore selesai."
  return 0
}

# =============================================================================
# FASE 2 — dijalankan setelah git reset --hard dari inode BARU
# Dipanggil via: exec bash "$0" --post-reset PROTECT_DIR BRANCH COMMIT_BEFORE
# =============================================================================
if [ "${1:-}" = "--post-reset" ]; then
  PROTECT_DIR="${2}"
  BRANCH="${3}"
  COMMIT_BEFORE="${4}"

  # PENTING: Backup dipertahankan sampai restore dikonfirmasi berhasil.
  # Jika restore GAGAL, PROTECT_DIR TIDAK dihapus agar data bisa dipulihkan manual.
  RESTORE_DONE=0
  cleanup_phase2() {
    if [ "$RESTORE_DONE" -eq 1 ]; then
      rm -rf "$PROTECT_DIR" 2>/dev/null || true
      log_info "Backup sementara dibersihkan."
    else
      log_warn "══════════════════════════════════════════════════"
      log_warn "PERHATIAN: Restore belum dikonfirmasi selesai."
      log_warn "Backup data MASIH ADA di: $PROTECT_DIR"
      log_warn "Pulihkan manual dengan: cp -rp '$PROTECT_DIR/data' '$APP_DIR/data'"
      log_warn "══════════════════════════════════════════════════"
    fi
  }
  trap cleanup_phase2 EXIT

  # ── Pulihkan file yang dilindungi ─────────────────────────────────────────
  log_info "[4/6] Memulihkan file yang dilindungi..."
  if ! restore_protected "$PROTECT_DIR"; then
    log_err "Restore gagal. Backup ada di: $PROTECT_DIR"
    log_err "Pulihkan manual: cp -rp '$PROTECT_DIR/data' '$APP_DIR/data'"
    exit 1
  fi

  # ── Verifikasi hasil restore ───────────────────────────────────────────────
  log_info "[5/6] Memverifikasi data setelah restore..."
  if ! verify_restore; then
    log_err "Verifikasi restore GAGAL. Backup ada di: $PROTECT_DIR"
    exit 1
  fi
  log_ok "logs/, .env, app.js, .htaccess aman — tidak tersentuh git."

  # Tandai restore berhasil — backup boleh dihapus saat cleanup
  RESTORE_DONE=1

  # ── npm install DIHAPUS ───────────────────────────────────────────────────
  # dist/server.cjs sudah di-bundle lengkap di Replit (termasuk @prisma/client,
  # @prisma/adapter-pg, pg). cPanel tidak perlu npm install sama sekali.
  # Ini menghindari masalah CloudLinux nproc limit dan symlink node_modules.
  log_info "[3.5a/6] Melewati npm install — semua deps sudah ter-bundle di dist/server.cjs"
  log_ok "npm install tidak diperlukan (zero-dependency deployment)."

  # ── Prisma migrate deploy (opsional) ─────────────────────────────────────
  # node_modules tidak ada di cPanel (deps sudah ter-bundle di dist/server.cjs).
  # Migrations cukup dijalankan SEKALI saat pertama deploy atau saat schema berubah.
  # Cara manual: jalankan SQL di prisma/migrations/*/migration.sql via phpMyAdmin/psql.
  log_info "[3.5b/6] Skip prisma migrate — schema sudah di-apply via setup awal."
  log_info "  Jika schema baru belum di-apply, jalankan manual:"
  log_info "  psql \$DATABASE_URL -f prisma/migrations/20260721114333_init/migration.sql"

  # ── Bersihkan file aset usang yang tidak terlacak git ────────────────────
  # git reset --hard tidak menghapus file untracked; ini wajib untuk mencegah
  # file JS/CSS lama dengan hash berbeda mengacaukan cache browser.
  log_info "Membersihkan aset usang dari dist/..."
  git -C "$APP_DIR" clean -fd dist/assets/ 2>/dev/null | while IFS= read -r l; do log_info "  $l"; done || true
  git -C "$APP_DIR" clean -fd dist/ 2>/dev/null | while IFS= read -r l; do log_info "  $l"; done || true
  log_ok "Aset usang dibersihkan."

  # ── Verifikasi dist/ ──────────────────────────────────────────────────────
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

  if grep -q '"/id/' "$APP_DIR/dist/index.html" 2>/dev/null || grep -q "'/id/" "$APP_DIR/dist/index.html" 2>/dev/null; then
    log_ok "  ✓ Base path /id/ terdeteksi di index.html"
  else
    log_warn "  ⚠ Base path /id/ tidak terdeteksi di index.html — pastikan build dengan VITE_BASE_PATH=/id/"
  fi

  SERVER_SIZE="$(du -k "$APP_DIR/dist/server.cjs" 2>/dev/null | cut -f1 || echo 0)"
  if [ "$SERVER_SIZE" -lt 100 ]; then
    log_err "  ✗ dist/server.cjs terlalu kecil (${SERVER_SIZE}KB)"
    VERIFY_ERR=$((VERIFY_ERR + 1))
  else
    log_ok "  ✓ dist/server.cjs ukuran OK (${SERVER_SIZE}KB)"
  fi

  [ "$VERIFY_ERR" -gt 0 ] && { log_err "$VERIFY_ERR masalah verifikasi dist/ — deploy dibatalkan."; exit 1; }

  # ── Restart Node.js — semua metode dicoba ────────────────────────────────
  log_info "[6/6] Merestart aplikasi Node.js..."
  RESTARTED=0

  # Metode 1: tmp/restart.txt (Passenger / beberapa LiteSpeed)
  mkdir -p "$APP_DIR/tmp"
  touch "$APP_DIR/tmp/restart.txt"
  log_ok "tmp/restart.txt diperbarui."

  # Metode 2: uapi NodeJS restart_app
  if command -v uapi >/dev/null 2>&1; then
    UAPI_OUT="$(uapi NodeJS restart_app 2>&1 || true)"
    if echo "$UAPI_OUT" | grep -q 'status: 1'; then
      log_ok "uapi NodeJS restart_app: berhasil."
      RESTARTED=1
    else
      log_warn "uapi NodeJS restart_app tidak tersedia — mencoba metode lain..."
    fi
  fi

  # Metode 3: SIGTERM ke proses node yang menjalankan app.js / server.cjs
  if [ "$RESTARTED" -eq 0 ]; then
    WHOAMI="$(whoami)"
    NODEPID="$(pgrep -u "$WHOAMI" -f "node.*(app\.js|server\.cjs)" 2>/dev/null | head -1 || true)"
    if [ -n "$NODEPID" ]; then
      if kill -SIGTERM "$NODEPID" 2>/dev/null; then
        log_ok "Proses Node.js (PID: $NODEPID) dikirim SIGTERM — Passenger akan restart."
        sleep 3
        RESTARTED=1
      else
        log_warn "Gagal SIGTERM PID $NODEPID."
      fi
    else
      NODEPID="$(pgrep -u "$WHOAMI" node 2>/dev/null | head -1 || true)"
      if [ -n "$NODEPID" ]; then
        if kill -SIGTERM "$NODEPID" 2>/dev/null; then
          log_ok "Proses node (PID: $NODEPID) dikirim SIGTERM."
          sleep 3
          RESTARTED=1
        fi
      fi
    fi
    [ "$RESTARTED" -eq 0 ] && log_warn "Proses Node.js tidak ditemukan via pgrep."
  fi

  # Metode 4: killall
  if [ "$RESTARTED" -eq 0 ] && command -v killall >/dev/null 2>&1; then
    if killall -u "$(whoami)" -SIGTERM node 2>/dev/null; then
      log_ok "killall -SIGTERM node berhasil."
      sleep 3
      RESTARTED=1
    fi
  fi

  # Ringkasan
  COMMIT_AFTER="$(git -C "$APP_DIR" rev-parse HEAD 2>/dev/null || echo '?')"
  log_info "══════════════════════════════════════════════════"
  log_ok   "DEPLOY BERHASIL ✓"
  log_info "Commit  : $COMMIT_AFTER"
  log_info "Branch  : $BRANCH"
  log_info "Database  : data disimpan di PostgreSQL (DATABASE_URL di .env)"
  log_info "logs/     : AMAN"
  log_info ".env      : AMAN"
  log_info "app.js    : AMAN"
  log_info ".htaccess : AMAN"
  log_info "Log     : $LOG_FILE"
  log_info "══════════════════════════════════════════════════"
  if [ "$RESTARTED" -eq 0 ]; then
    log_warn "Restart otomatis gagal. Lakukan MANUAL:"
    log_warn "  → cPanel → Setup Node.js App → app '/id' → klik RESTART"
  else
    log_info "Test: curl https://smkn1wonogiri.sch.id/id/api/health"
  fi
  log_info "══════════════════════════════════════════════════"
  exit 0
fi

# =============================================================================
# FASE 1 — Jalankan git ops, lalu handoff ke fase 2
# =============================================================================
BRANCH="${1:-main}"
PROTECT_DIR="$APP_DIR/.deploy_protect_$$"

on_error() {
  local line="$1"
  log_err "Script gagal pada baris $line."
  log_err "DEPLOY GAGAL. Periksa: $LOG_FILE"
  rm -rf "$PROTECT_DIR" 2>/dev/null || true
  exit 1
}
trap 'on_error $LINENO' ERR

rotate_log
log_info "══════════════════════════════════════════════════"
log_info "DEPLOY DIMULAI — $(date '+%d %B %Y %H:%M:%S')"
log_info "Branch  : $BRANCH"
log_info "App dir : $APP_DIR"
log_info "══════════════════════════════════════════════════"

# ── Langkah 1: Prasyarat ──────────────────────────────────────────────────────
log_info "[1/6] Memeriksa prasyarat..."
for cmd in git node; do
  command -v "$cmd" >/dev/null 2>&1 || { log_err "'$cmd' tidak ada di PATH."; exit 1; }
done
git -C "$APP_DIR" rev-parse --git-dir >/dev/null 2>&1 || { log_err "$APP_DIR bukan repo git."; exit 1; }
git -C "$APP_DIR" remote get-url origin >/dev/null 2>&1 || { log_err "Remote 'origin' belum dikonfigurasi."; exit 1; }
log_ok "node=$(node --version)  git=$(git --version | awk '{print $3}')"
log_ok "Prasyarat OK."

# ── Langkah 2: Backup ─────────────────────────────────────────────────────────
log_info "[2/6] Backup file yang dilindungi..."
if ! backup_protected "$PROTECT_DIR"; then
  log_err "Backup gagal — deploy dibatalkan untuk melindungi data."
  rm -rf "$PROTECT_DIR" 2>/dev/null || true
  exit 1
fi

# Verifikasi backup sebelum melanjutkan ke git reset
if ! verify_backup "$PROTECT_DIR"; then
  rm -rf "$PROTECT_DIR" 2>/dev/null || true
  exit 1
fi

COMMIT_BEFORE="$(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || echo 'awal')"
log_info "Commit saat ini: $COMMIT_BEFORE"

# ── Langkah 3: Tarik dari GitHub ──────────────────────────────────────────────
log_info "[3/6] Menarik perubahan dari GitHub (branch: $BRANCH)..."
git -C "$APP_DIR" fetch origin "$BRANCH" 2>&1 | sed 's/^/  [git] /' | tee -a "$LOG_FILE"
git -C "$APP_DIR" reset --hard "origin/$BRANCH" 2>&1 | sed 's/^/  [git] /' | tee -a "$LOG_FILE"

COMMIT_SHORT="$(git -C "$APP_DIR" rev-parse --short HEAD)"
COMMIT_AFTER_FULL="$(git -C "$APP_DIR" rev-parse HEAD)"
if [ "$COMMIT_BEFORE" = "$COMMIT_SHORT" ]; then
  log_warn "Tidak ada commit baru (sudah up-to-date di $COMMIT_SHORT)."
else
  CHANGED="$(git -C "$APP_DIR" diff --name-only "${COMMIT_BEFORE}" "$COMMIT_AFTER_FULL" 2>/dev/null | wc -l | tr -d ' ')"
  log_ok "$COMMIT_BEFORE → $COMMIT_SHORT ($CHANGED file berubah)"
  git -C "$APP_DIR" log --oneline "${COMMIT_BEFORE}..$COMMIT_AFTER_FULL" 2>/dev/null | \
    while IFS= read -r line; do log_info "  changelog: $line"; done
fi

# ── Handoff ke Fase 2 (inode baru) ────────────────────────────────────────────
# KRITIS: Bash saat ini membaca dari inode LAMA deploy.sh.
# exec bash "$0" membuka inode BARU — seluruh logika pasca-git berjalan dari sana.
#
# KRITIS: Bersihkan EXIT trap Fase 1 SEBELUM exec.
# Jika tidak, ketika exec mengganti proses ini, EXIT trap akan terpicu dan
# menghapus $PROTECT_DIR (backup data) sebelum Fase 2 sempat melakukan restore.
log_info "Handoff ke fase 2 (inode baru)..."
trap - EXIT ERR
exec bash "$APP_DIR/deploy.sh" --post-reset "$PROTECT_DIR" "$BRANCH" "$COMMIT_BEFORE"
