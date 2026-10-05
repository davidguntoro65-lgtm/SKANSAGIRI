# Panduan Rilis Manual: Replit → GitHub → cPanel

Panduan ini untuk rilis situs yang dipasang di `https://smkn1wonogiri.sch.id/id`.
Semua langkah dijalankan secara manual: build di Replit, commit dan push ke
GitHub, lalu jalankan skrip deploy dari SSH cPanel. Tidak ada deploy otomatis
dari Replit.

## 1. Build di Replit

1. Buka Repl yang benar dan pastikan perubahan kode sudah disimpan.
2. Dari Shell di direktori utama proyek, jalankan:

   ```bash
   npm run build:cpanel
   ```

   `build:cpanel` menjalankan `npm run build` dengan asset prefix `/id/`.
   Untuk situs yang dipasang di `/id`, jangan gunakan `npm run build` biasa:
   hasilnya memakai path root `/` dan aset bisa gagal dimuat setelah di-deploy.
3. Pastikan hasil build lengkap:

   ```bash
   test -s dist/server.cjs
   test -s dist/index.html
   test -d dist/assets
   grep -Eq '(src|href)="/id/assets/' dist/index.html
   ```

   Jika salah satu pemeriksaan gagal, hentikan proses. Jangan commit atau
   deploy hasil build yang belum lengkap.

## 2. Commit dan push secara manual ke GitHub

1. Buka panel **Git / Version Control** Replit dan periksa daftar perubahan.
2. Stage perubahan source code dan dokumentasi yang memang termasuk rilis.
   Stage juga `dist/` jika hasil build berubah. Pastikan `deploy.sh` ikut
   di-commit jika ada perubahan pada prosedur deploy.
3. Jangan stage atau commit `.env`, file rahasia, `logs/`, `app.js`,
   `.htaccess`, atau data lokal. File-file tersebut khusus untuk server dan
   tidak boleh diganti oleh commit rilis.
4. Buat commit dengan pesan yang menjelaskan rilis, lalu gunakan aksi **Push**
   di panel Git untuk mengirim commit ke branch `main` di GitHub.
5. Buka GitHub dan pastikan commit terbaru sudah muncul di branch `main`.
   Periksa bahwa commit memuat source yang dimaksud dan hasil `dist/`.

**Push ke GitHub belum menjalankan deploy cPanel.** Jangan lanjut sebelum
commit yang benar sudah terlihat di GitHub.

## 3. Deploy manual dari cPanel

Lakukan tahap ini hanya setelah push berhasil. Hubungkan ke akun cPanel melalui
SSH, lalu jalankan dari terminal:

```bash
source "$HOME/nodevenv/public_html/id/22/bin/activate"
cd "$HOME/public_html/id"
git status --short
bash deploy.sh main
```

Perintah `git status --short` harus diperiksa sebelum deploy. Skrip melakukan
`git reset --hard` ke branch `main`; jangan lanjut jika ada perubahan tracked
di cPanel yang perlu dipertahankan sampai perubahan itu dicadangkan atau
diselesaikan.

`deploy.sh` mengambil commit dari GitHub, mempertahankan konfigurasi server
seperti `.env`, `app.js`, `.htaccess`, dan `logs/`, memeriksa migration,
menerapkan migration PostgreSQL yang masih pending, lalu me-restart aplikasi.
Production `DATABASE_URL` harus tetap berada di environment Node.js cPanel
atau file `.env` di server. Jangan salin nilainya ke Replit, GitHub, atau chat.

Jangan jalankan `npm run db:migrate` dari Replit untuk database production;
Replit menggunakan koneksi database development. Jangan jalankan `npm ci` di
direktori aplikasi cPanel.

## 4. Periksa hasil deploy

Deploy hanya dianggap berhasil jika log menyatakan deploy selesai dan restart
berhasil. Setelah itu, periksa health endpoint:

```bash
curl -fsS https://smkn1wonogiri.sch.id/id/api/health
```

Buka juga halaman utama `/id` dan periksa bahwa halaman serta asetnya termuat.

## 5. Jika migration atau deploy gagal

- Jika pemeriksaan **Prisma CLI** berhenti atau timeout sebelum migration
  dimulai, periksa akses keluar cPanel ke `registry.npmjs.org` dan cache npm.
- Jika Prisma mengeluarkan `P1001`, periksa host dan port PostgreSQL, koneksi
  keluar dari cPanel, firewall/allowlist provider, dan pengaturan SSL.
- Jika muncul `P1000`, periksa kredensial database pada konfigurasi Node.js
  cPanel atau `.env` server. Jangan tempelkan `DATABASE_URL` ke laporan.
- Jika muncul `P1013`, periksa format URL dan pastikan karakter khusus pada
  username/password telah di-URL-encode.
- Jika CLI berhasil tetapi migration timeout, periksa koneksi PostgreSQL,
  SSL, dan apakah ada migration lain yang sedang memegang lock. Output Prisma
  sekarang tampil langsung di terminal dan `deploy.log`; gunakan pesan error
  yang tercetak, bukan menebak dari tulisan "database error".
- Jika perintah terhenti setelah migration dimulai, sebagian migration
  sebelumnya mungkin sudah selesai. Setelah penyebab koneksi diperbaiki,
  `migrate deploy` dapat melanjutkan migration yang masih pending. Jangan
  menghapus `_prisma_migrations`, me-reset database, atau menjalankan seed
  untuk memperbaiki timeout.
- Gunakan `BASELINE_EXISTING_SCHEMA=1` hanya bila Prisma secara jelas
  mengembalikan `P3005` untuk database lama, dan hanya setelah schema live
  diverifikasi sama dengan baseline lama. Jangan gunakan flag itu untuk
  timeout, masalah jaringan, atau error kredensial.
- Jika deploy gagal, jangan hapus direktori backup `.deploy_protect_*` yang
  disebut di log. Simpan juga `deploy.log` untuk diagnosis; samarkan data
  sensitif sebelum membagikannya.

## Ringkasan urutan

1. Replit Shell: `npm run build:cpanel`, lalu cek `dist/`.
2. Replit Git panel: stage perubahan yang benar, commit, lalu push ke GitHub
   `main`.
3. GitHub: pastikan commit dan hasil build sudah ada.
4. SSH cPanel: aktifkan Node.js 22, masuk ke direktori app, lalu
   `bash deploy.sh main`.
5. Periksa hasil migration, restart, health endpoint, dan halaman `/id`.
