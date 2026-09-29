#!/usr/bin/env bash
# =============================================================================
# deploy.sh — SMKN 1 Wonogiri Portal
# =============================================================================
# Tarik perubahan dari GitHub (termasuk dist/ yang sudah dibangun di Replit),
# apply migration PostgreSQL yang aman, lalu restart Node.js di cPanel.
#
# Build dilakukan di Replit (VITE_BASE_PATH=/id/ npm run build), lalu di-commit
# ke GitHub. Script ini TIDAK perlu build ulang di server.
#
# Yang TIDAK PERNAH diubah oleh script ini:
#   - database    (isi PostgreSQL tidak pernah di-reset atau di-seed ulang)
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
#   Database PostgreSQL berada di luar repo dan tidak disentuh git.
#   Backup/restore berfungsi sebagai lapisan perlindungan konfigurasi kedua.
#   EXIT trap di Fase 1 dibersihkan sebelum exec agar backup tidak terhapus
#   sebelum Fase 2 sempat melakukan restore.
# =============================================================================

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$APP_DIR/deploy.log"
MAX_LOG_LINES=2000

# cPanel Node.js App Manager menyimpan runtime dan dependency di luar
# public_html, biasanya:
#   /home/USER/nodevenv/<jalur-app>/<versi>/lib/node_modules
# Nilai VIRTUAL_ENV tersedia bila deploy dijalankan setelah `source .../activate`.
# Dua override ini disediakan untuk hosting yang memakai layout berbeda.
CPANEL_NODEENV_DIR="${CPANEL_NODEENV_DIR:-${VIRTUAL_ENV:-}}"
CPANEL_NODE_MODULES_DIR="${CPANEL_NODE_MODULES_DIR:-}"
if [ -z "$CPANEL_NODEENV_DIR" ]; then
  HOST_HOME="$(cd "$APP_DIR/../.." && pwd -P)"
  APP_RELATIVE_PATH="${APP_DIR#"$HOST_HOME"/}"
  NODEENV_APP_DIR="$HOST_HOME/nodevenv/$APP_RELATIVE_PATH"
  if [ -d "$NODEENV_APP_DIR" ]; then
    CPANEL_NODEENV_DIR="$(
      find "$NODEENV_APP_DIR" -mindepth 1 -maxdepth 1 -type d -print 2>/dev/null |
        sort -V | tail -n 1
    )"
  fi
fi
if [ -z "$CPANEL_NODE_MODULES_DIR" ] && [ -n "$CPANEL_NODEENV_DIR" ]; then
  if [ -d "$CPANEL_NODEENV_DIR/lib/node_modules" ]; then
    CPANEL_NODE_MODULES_DIR="$CPANEL_NODEENV_DIR/lib/node_modules"
  fi
fi
CPANEL_NODE_BIN="${CPANEL_NODE_BIN:-}"
CPANEL_NPX_BIN="${CPANEL_NPX_BIN:-}"

# cPanel Node.js App Manager menyimpan binary runtime di nodevenv/<app>/<version>.
# Jangan bergantung pada PATH shell SSH karena bisa menunjuk ke Node sistem lain.
if [ -z "$CPANEL_NODE_BIN" ] && [ -n "$CPANEL_NODEENV_DIR" ] && [ -x "$CPANEL_NODEENV_DIR/bin/node" ]; then
  CPANEL_NODE_BIN="$CPANEL_NODEENV_DIR/bin/node"
fi
if [ -z "$CPANEL_NPX_BIN" ] && [ -n "$CPANEL_NODEENV_DIR" ] && [ -x "$CPANEL_NODEENV_DIR/bin/npx" ]; then
  CPANEL_NPX_BIN="$CPANEL_NODEENV_DIR/bin/npx"
fi

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
      log_warn "PERHATIAN: Seluruh proses deploy belum dikonfirmasi selesai."
      log_warn "Backup konfigurasi MASIH ADA di: $PROTECT_DIR"
      log_warn "File yang dapat dipulihkan: .env, app.js, .htaccess, dan logs/"
      log_warn "══════════════════════════════════════════════════"
    fi
  }
  trap cleanup_phase2 EXIT

  # ── Pulihkan file yang dilindungi ─────────────────────────────────────────
  log_info "[4/6] Memulihkan file yang dilindungi..."
  if ! restore_protected "$PROTECT_DIR"; then
    log_err "Restore gagal. Backup ada di: $PROTECT_DIR"
    log_err "Backup konfigurasi tetap tersedia di: $PROTECT_DIR"
    exit 1
  fi

  # ── Verifikasi hasil restore ───────────────────────────────────────────────
  log_info "[5/6] Memverifikasi data setelah restore..."
  if ! verify_restore; then
    log_err "Verifikasi restore GAGAL. Backup ada di: $PROTECT_DIR"
    exit 1
  fi
  log_ok "logs/, .env, app.js, .htaccess aman — tidak tersentuh git."

  # ── Database migration ──────────────────────────────────────────────────────
  # dist/server.cjs self-contained untuk runtime aplikasi, tetapi prisma migrate
  # deploy membutuhkan Prisma CLI. Jangan jalankan npm ci di APP_DIR: pada cPanel
  # node_modules dapat berupa symlink/layout yang dikelola Node.js App Manager,
  # dan npm ci akan menghapusnya lalu sering gagal dengan "Exit handler never
  # called". Cari binary pada nodevenv cPanel terlebih dahulu, lalu binary lokal,
  # dan terakhir gunakan npx cache terisolasi.
  PRISMA_RUNNER=()
  PRISMA_RUNNER_LABEL=""

  prepare_prisma_cli() {
    local node_bin="${CPANEL_NODE_BIN:-$(command -v node 2>/dev/null || true)}"
    local npx_bin="${CPANEL_NPX_BIN:-$(command -v npx 2>/dev/null || true)}"
    local search_dir

    for search_dir in "$CPANEL_NODE_MODULES_DIR" "$APP_DIR/node_modules"; do
      [ -n "$search_dir" ] || continue
      if [ -x "$search_dir/.bin/prisma" ]; then
        PRISMA_RUNNER=("$search_dir/.bin/prisma")
        if [ "$search_dir" = "$CPANEL_NODE_MODULES_DIR" ]; then
          PRISMA_RUNNER_LABEL="cPanel nodevenv ($search_dir)"
        else
          PRISMA_RUNNER_LABEL="local"
        fi
        return 0
      fi
      # Fallback untuk instalasi global yang tidak membuat .bin symlink.
      if [ -n "$node_bin" ] && [ -f "$search_dir/prisma/build/index.js" ]; then
        PRISMA_RUNNER=("$node_bin" "$search_dir/prisma/build/index.js")
        PRISMA_RUNNER_LABEL="cPanel nodevenv package ($search_dir)"
        return 0
      fi
    done

    [ -n "$npx_bin" ] || {
      log_err "'npx' tidak ada di PATH; Prisma CLI tidak bisa dijalankan."
      return 1
    }
    [ -n "$node_bin" ] || {
      log_err "'node' tidak ada di PATH; versi Prisma tidak bisa dibaca."
      return 1
    }

    local prisma_version
    prisma_version="$(
      APP_DIR_FOR_NODE="$APP_DIR" "$node_bin" -e '
        const path = require("path");
        const p = require(path.join(process.env.APP_DIR_FOR_NODE, "package.json"));
        const version = (p.dependencies && p.dependencies.prisma) ||
          (p.devDependencies && p.devDependencies.prisma);
        if (!version) process.exit(1);
        process.stdout.write(version);
      ' 2>/dev/null
    )" || {
      log_err "Versi Prisma tidak ditemukan di package.json — deploy dibatalkan."
      return 1
    }

    # --package memasang Prisma ke cache npx, bukan ke APP_DIR/node_modules.
    # Ini sengaja menghindari npm ci yang merusak symlink node_modules cPanel.
    PRISMA_RUNNER=("$npx_bin" --yes --package "prisma@$prisma_version" prisma)
    PRISMA_RUNNER_LABEL="npx cache ($prisma_version)"
    log_info "Prisma CLI lokal tidak tersedia; memakai $PRISMA_RUNNER_LABEL tanpa mengubah node_modules."
  }

  load_database_url() {
    if [ -n "${DATABASE_URL:-}" ]; then
      export DATABASE_URL
      return 0
    fi

    # cPanel dapat menyimpan DATABASE_URL di .env tanpa mewariskannya ke shell
    # SSH. Ambil hanya nilai pasangan DATABASE_URL, jangan source .env sebagai
    # shell script dan jangan pernah mencetak nilainya.
    if [ -f "$APP_DIR/.env" ]; then
      local value
      value="$(awk -F= '
        /^[[:space:]]*DATABASE_URL[[:space:]]*=/ {
          sub(/^[^=]*=[[:space:]]*/, "", $0);
          print $0;
          exit;
        }
      ' "$APP_DIR/.env")"
      value="${value#\"}"
      value="${value%\"}"
      value="${value#\'}"
      value="${value%\'}"
      if [ -n "$value" ]; then
        export DATABASE_URL="$value"
        return 0
      fi
    fi
    return 1
  }

  assert_migrations_non_destructive() {
    local destructive
    destructive="$(
      grep -RIniE \
        '(^|[[:space:];])(DROP[[:space:]]+TABLE|TRUNCATE([[:space:]]|$)|DELETE[[:space:]]+FROM|ALTER[[:space:]]+TABLE[^;]*DROP[[:space:]]+COLUMN)' \
        "$APP_DIR/prisma/migrations" \
        --include='migration.sql' 2>/dev/null || true
    )"
    if [ -n "$destructive" ] && [ "${ALLOW_DESTRUCTIVE_MIGRATIONS:-0}" != "1" ]; then
      log_err "Migration berisi operasi yang berpotensi menghapus data."
      log_err "Deploy dibatalkan. Tinjau SQL migration secara manual; gunakan"
      log_err "ALLOW_DESTRUCTIVE_MIGRATIONS=1 hanya setelah backup database diverifikasi."
      printf '%s\n' "$destructive" | sed 's/^/  [migration] /' >> "$LOG_FILE"
      return 1
    fi
    if [ -n "$destructive" ]; then
      log_warn "ALLOW_DESTRUCTIVE_MIGRATIONS=1 aktif; migration destruktif diizinkan."
    else
      log_ok "Migration lolos pemeriksaan non-destruktif."
    fi
  }

  apply_database_migrations() {
    load_database_url || {
      log_err "DATABASE_URL tidak ditemukan di environment atau .env — deploy dibatalkan."
      return 1
    }

    assert_migrations_non_destructive || return 1

    prepare_prisma_cli || return 1

    log_info "Menerapkan migration PostgreSQL yang belum pernah dijalankan ($PRISMA_RUNNER_LABEL)..."
    # When Prisma is supplied through an isolated npx cache, a config file
    # inside APP_DIR cannot resolve `prisma/config` from its own node_modules.
    # Use a plain temporary config instead; it is still Prisma 7-compatible
    # and keeps the app's cPanel-managed node_modules untouched.
    local config_file
    config_file="$(mktemp "${TMPDIR:-/tmp}/smkn-prisma-config.XXXXXX.ts")" || {
      log_err "Tidak bisa membuat config Prisma sementara — deploy dibatalkan."
      return 1
    }
    cat > "$config_file" <<'PRISMA_CONFIG'
const appDir = process.env.PRISMA_APP_DIR;
export default {
  schema: `${appDir}/prisma/schema.prisma`,
  migrations: { path: `${appDir}/prisma/migrations` },
  datasource: { url: process.env.DATABASE_URL },
};
PRISMA_CONFIG

    run_migrate_deploy() {
      local output status
      if output="$(
        PRISMA_APP_DIR="$APP_DIR" \
        "${PRISMA_RUNNER[@]}" migrate deploy --config "$config_file" 2>&1
      )"; then
        status=0
      else
        status=$?
      fi
      printf '%s\n' "$output" |
        sed 's/^/  [prisma] /' | tee -a "$LOG_FILE"
      MIGRATION_OUTPUT="$output"
      MIGRATION_STATUS="$status"
    }

    local migration_output migration_status
    run_migrate_deploy
    migration_output="$MIGRATION_OUTPUT"
    migration_status="$MIGRATION_STATUS"

    # A database created before Prisma Migrate was introduced has no
    # _prisma_migrations table, so migrate deploy returns P3005. Never mark the
    # whole current schema as applied: the legacy database may contain only the
    # first migration while the repository has since added Core/Pilketos tables.
    # Only an explicit operator flag may enable recovery. It verifies the
    # legacy contract, marks only the first migration as applied, then lets
    # migrate deploy apply every later non-destructive migration.
    if [ "$migration_status" -ne 0 ] &&
       printf '%s\n' "$migration_output" | grep -q 'P3005' &&
       [ "${BASELINE_EXISTING_SCHEMA:-0}" = "1" ]; then
      log_warn "P3005 terdeteksi; memeriksa schema legacy terhadap migration awal..."

      local diff_output diff_status
      if diff_output="$(
        PRISMA_APP_DIR="$APP_DIR" \
        "${PRISMA_RUNNER[@]}" migrate diff \
          --from-config-datasource \
          --to-schema "$APP_DIR/prisma/legacy-baseline.prisma" \
          --script --exit-code \
          --config "$config_file" 2>&1
      )"; then
        diff_status=0
      else
        diff_status=$?
      fi
      printf '%s\n' "$diff_output" |
        sed 's/^/  [prisma-diff] /' | tee -a "$LOG_FILE"

      if [ "$diff_status" -ne 0 ]; then
        if [ "$diff_status" -eq 2 ]; then
          log_err "Schema production tidak identik dengan migration awal; baseline dibatalkan."
          log_err "Database mungkin hanya sebagian ter-migrasi atau memiliki drift. Tinjau diff di deploy.log."
        else
          log_err "Pemeriksaan kesetaraan schema gagal; baseline dibatalkan."
        fi
        rm -f "$config_file"
        return 1
      fi

      local baseline_migration="20260721114333_init"
      log_info "Mendaftarkan hanya migration awal sebagai applied: $baseline_migration"
      local resolve_output resolve_status
      if resolve_output="$(
        PRISMA_APP_DIR="$APP_DIR" \
        "${PRISMA_RUNNER[@]}" migrate resolve \
          --applied "$baseline_migration" \
          --config "$config_file" 2>&1
      )"; then
        resolve_status=0
      else
        resolve_status=$?
      fi
      printf '%s\n' "$resolve_output" |
        sed 's/^/  [prisma-resolve] /' | tee -a "$LOG_FILE"
      if [ "$resolve_status" -ne 0 ] ||
         printf '%s\n' "$resolve_output" |
           grep -qE 'Failed to load config|(^|[[:space:]])Error:|P[0-9]{4}:'; then
        log_err "Gagal mendaftarkan migration awal — deploy dibatalkan."
        rm -f "$config_file"
        return 1
      fi

      log_ok "Baseline migration awal selesai; migration Core/Pilketos akan diterapkan berikutnya."
      run_migrate_deploy
      migration_output="$MIGRATION_OUTPUT"
      migration_status="$MIGRATION_STATUS"
    elif [ "$migration_status" -ne 0 ]; then
      log_err "Prisma migration mengembalikan error — deploy dibatalkan sebelum restart."
      log_err "Jika database existing dibuat sebelum Prisma Migrate, jalankan ulang dengan"
      log_err "BASELINE_EXISTING_SCHEMA=1 setelah memastikan schema production identik."
      rm -f "$config_file"
      return 1
    fi

    rm -f "$config_file"
    if [ "$migration_status" -ne 0 ] ||
       printf '%s\n' "$migration_output" |
         grep -qE 'Failed to load config|(^|[[:space:]])Error:|P[0-9]{4}:'; then
      log_err "Prisma migration mengembalikan error — deploy dibatalkan sebelum restart."
      return 1
    fi
    log_ok "Migration selesai; isi database tidak di-reset."
  }

  log_info "[3.5/6] Menyiapkan database production..."
  if [ -n "$CPANEL_NODEENV_DIR" ]; then
    log_info "cPanel Node environment: $CPANEL_NODEENV_DIR"
  fi
  if [ -n "$CPANEL_NODE_MODULES_DIR" ]; then
    log_info "cPanel dependency path: $CPANEL_NODE_MODULES_DIR"
  fi
  if ! apply_database_migrations; then
    log_err "Migration gagal. Proses yang sedang berjalan tidak dihentikan; backup konfigurasi dipertahankan di: $PROTECT_DIR"
    exit 1
  fi

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

  if grep -qE '(src|href)="/id/assets/' "$APP_DIR/dist/index.html" 2>/dev/null; then
    log_ok "  ✓ Asset base path /id/ terdeteksi di index.html"
  else
    log_err "  ✗ Asset base path /id/ tidak terdeteksi — build ulang dengan VITE_BASE_PATH=/id/"
    VERIFY_ERR=$((VERIFY_ERR + 1))
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
  # Seluruh perubahan file, migration, dan verifikasi sudah selesai. Jika
  # cPanel tidak menyediakan metode restart otomatis, hanya restart manual
  # yang tertunda; konfigurasi tetap sudah dipulihkan dengan benar.
  RESTORE_DONE=1
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
  command -v git >/dev/null 2>&1 || { log_err "'git' tidak ada di PATH."; exit 1; }
  NODE_RUNTIME_BIN="${CPANEL_NODE_BIN:-$(command -v node 2>/dev/null || true)}"
  [ -n "$NODE_RUNTIME_BIN" ] && [ -x "$NODE_RUNTIME_BIN" ] || {
    log_err "Node.js tidak ditemukan. Pilih Node.js 22 pada cPanel Node.js App Manager."
    exit 1
  }
  NODE_MAJOR="$("$NODE_RUNTIME_BIN" -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
  [ "$NODE_MAJOR" = "22" ] || {
    log_err "Node.js 22 wajib dipakai; runtime yang terdeteksi: ${NODE_MAJOR:-tidak diketahui}."
    log_err "Pastikan application '/id' memakai Node.js 22 pada cPanel."
    exit 1
  }
git -C "$APP_DIR" rev-parse --git-dir >/dev/null 2>&1 || { log_err "$APP_DIR bukan repo git."; exit 1; }
git -C "$APP_DIR" remote get-url origin >/dev/null 2>&1 || { log_err "Remote 'origin' belum dikonfigurasi."; exit 1; }
 log_ok "node=$("$NODE_RUNTIME_BIN" --version)  git=$(git --version | awk '{print $3}')"
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
