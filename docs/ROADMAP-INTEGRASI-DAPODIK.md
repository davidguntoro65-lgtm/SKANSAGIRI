# Roadmap Integrasi API Dapodik

**Status:** Draft pembahasan  
**Tanggal:** 29 September 2026  
**Target aplikasi:** Website SMKN 1 Wonogiri  
**Target hosting:** cPanel server `tirtonirmolo`  
**Runtime:** Node.js  
**Database:** PostgreSQL  
**IP shared hosting yang diberikan:** `202.52.146.217` — perlu diverifikasi sebagai IP egress aktual sebelum digunakan untuk allowlist

## 1. Ringkasan keputusan awal

Integrasi Dapodik memungkinkan, tetapi dua sumber teknis yang tersedia menggambarkan dua generasi layanan yang berbeda:

1. **Dokumen teknis API Dapodik 2009**
   - HTTP GET.
   - Host lama `operator.jardiknas.org`.
   - Endpoint `/dapodik/api.php`.
   - Login menggunakan `username` dan MD5 password untuk memperoleh `passport`.
   - Setiap request membawa `passport`.
   - Sesi berakhir setelah 30 menit tanpa aktivitas.
   - Output berupa pasangan `name=value`, bukan JSON.
   - Read-only.

2. **Catatan Web Service Dapodik lokal**
   - Dapodik berjalan di komputer/server sekolah melalui `localhost:5774`.
   - Endpoint berbentuk `/rest/...`.
   - Contoh endpoint:
     - `/rest/Sekolah`
     - `/rest/PesertaDidik`
     - `/rest/Ptk`
     - `/rest/RombonganBelajar`
     - `/rest/Pengguna`
   - Request memakai header `Authorization: Bearer` dan `Npsn`.
   - Output diharapkan JSON.

**Keputusan awal:** Web Service lokal modern menjadi target utama. API 2009 diperlakukan sebagai adapter legacy sampai versi Dapodik sekolah dan response aktual sudah diuji.

## 2. Risiko konektivitas utama

Server cPanel tidak dapat mengakses `localhost:5774` milik komputer sekolah secara langsung. Diperlukan salah satu jalur:

### Pilihan A — Agen sinkronisasi lokal, direkomendasikan

```text
Dapodik lokal
    ↓ localhost:5774
Agen sinkronisasi di komputer/server sekolah
    ↓ HTTPS outbound
Node.js di cPanel
    ↓
PostgreSQL
```

Agen lokal mengambil data dari Dapodik lalu mengirim data yang sudah dinormalisasi ke endpoint ingest aplikasi.

Kelebihan:

- Tidak perlu membuka port Dapodik ke internet.
- Tetap bekerja di balik NAT.
- Tidak bergantung pada IP publik komputer sekolah.
- Cocok untuk shared hosting cPanel.
- Koneksi keluar dapat dibatasi melalui HTTPS.

### Pilihan B — Pull melalui tunnel atau VPN

```text
Node.js cPanel
    ↓ HTTPS
Cloudflare Tunnel / VPN
    ↓
Komputer sekolah
    ↓ localhost:5774
Dapodik
```

Pilihan ini hanya digunakan jika Web Service Dapodik terbukti dapat berjalan melalui tunnel dan pembatasan aksesnya dapat diterapkan dengan benar.

### Pilihan yang tidak disarankan

- Membuka port `5774` langsung ke internet.
- Mengandalkan IP komputer sekolah yang berubah.
- Menaruh token di source code.
- Menjalankan sinkronisasi besar di dalam satu request HTTP.

## 3. Verifikasi IP cPanel

IP `202.52.146.217` adalah IP shared hosting yang diberikan, tetapi belum tentu menjadi alamat IP sumber untuk koneksi keluar dari aplikasi Node.js.

Sebelum IP tersebut didaftarkan pada Web Service Dapodik, verifikasi dari shell cPanel:

```bash
curl https://api.ipify.org
```

Alamat yang muncul dari pengujian aktual harus dibandingkan dengan konfigurasi allowlist Dapodik. Jika memakai agen lokal push, kebutuhan allowlist berdasarkan IP cPanel dapat dihindari; endpoint ingest cukup dilindungi dengan service token atau HMAC signature.

## 4. Fase roadmap

### Fase 0 — Konfirmasi versi dan akses Dapodik

Pastikan:

- Versi Dapodik yang terpasang.
- Apakah menu **Pengaturan → Web Service Lokal** tersedia.
- Apakah `/rest/PesertaDidik` tersedia.
- Format response aktual: JSON atau format legacy.
- NPSN sekolah.
- Token Web Service.
- Komputer/server yang selalu menjalankan Dapodik.
- Apakah agen lokal dapat dijalankan.
- Apakah integrasi hanya untuk satu sekolah atau beberapa sekolah.

**Output:**

- Adapter yang akan digunakan.
- Contoh response aktual.
- Keputusan koneksi push atau pull.
- Daftar field yang benar-benar tersedia.

### Fase 1 — Proof of Connection

Uji hanya endpoint sekolah terlebih dahulu:

```text
/rest/Sekolah
```

Uji yang wajib dilakukan:

- DNS atau URL tunnel.
- TLS/HTTPS.
- Header Bearer.
- Header NPSN.
- Timeout.
- Response status.
- Format response.
- Token salah.
- NPSN salah.
- Dapodik tidak aktif.
- Komputer sekolah kehilangan koneksi internet.

Belum ada data siswa yang ditulis ke PostgreSQL pada fase ini.

**Gate:** koneksi harus stabil, terautentikasi, dan dapat dicatat tanpa membocorkan token.

### Fase 2 — Adapter dan normalisasi

Buat lapisan adapter yang terpisah dari database:

```text
DapodikLocalRestAdapter
DapodikLegacyAdapter
```

Keduanya menghasilkan bentuk internal yang seragam:

```text
School
Student
Teacher
ClassGroup
Enrollment
```

Adapter modern menangani JSON, null field, status HTTP, dan kemungkinan pagination.

Adapter legacy menangani:

- Pasangan `name=value`.
- Baris kosong.
- Encoding.
- Nilai yang mengandung karakter pemisah.
- Tanggal tidak valid.
- Response error yang bukan pasangan `name=value`.
- Refresh passport sebelum sesi kedaluwarsa.

### Fase 3 — Pemetaan ke PostgreSQL

Aplikasi sudah memiliki model akademik yang dapat menjadi tujuan sinkronisasi:

| Data Dapodik | Model aplikasi |
|---|---|
| Peserta Didik | `CoreStudent` |
| Rombongan Belajar | `AcademicClass` |
| Keanggotaan kelas | `StudentEnrollment` |
| PTK/guru | `CoreTeacher` |
| Akun aplikasi | `CoreUser` |
| Riwayat sinkronisasi | model integrasi baru |
| Audit perubahan | `CoreAuditLog` atau log sinkronisasi khusus |

Kemungkinan diperlukan model tambahan:

#### `DapodikConnection`

- NPSN.
- Mode adapter.
- Base URL.
- Status koneksi.
- Waktu pengujian terakhir.
- Status aktif.
- Referensi secret, bukan token mentah.

#### `DapodikSyncRun`

- Waktu mulai dan selesai.
- Status `RUNNING`, `SUCCESS`, `PARTIAL`, atau `FAILED`.
- Jumlah data dibaca.
- Jumlah data baru.
- Jumlah data berubah.
- Jumlah data tidak valid.
- Checkpoint terakhir.
- Error ringkas.

#### Mapping external identity

Untuk mencegah benturan data, simpan pemetaan sumber eksternal:

```text
sourceSystem
externalId
entityType
localEntityId
lastSeenAt
lastHash
```

NISN tetap dapat digunakan sebagai identifier bisnis, tetapi bukan satu-satunya foreign key internal jika API menyediakan ID eksternal yang stabil.

### Fase 4 — Mesin sinkronisasi bertahap

Urutan sinkronisasi:

1. Sekolah.
2. Tahun ajaran.
3. Rombongan belajar.
4. Siswa.
5. Enrollment siswa.
6. Guru/PTK.
7. Validasi relasi.
8. Laporan hasil.

Aturan mesin sinkronisasi:

- Idempotent; sinkronisasi ulang tidak menggandakan data.
- Upsert berdasarkan external ID atau NISN.
- Data yang tidak muncul tidak langsung dihapus.
- Perubahan kelas dibuat sebagai perubahan enrollment yang dapat diaudit.
- Setiap batch mempunyai checkpoint.
- Retry menggunakan exponential backoff.
- Ada timeout dan circuit breaker.
- Ada database lock agar dua job tidak berjalan bersamaan.
- Error satu batch tidak membatalkan batch yang sudah berhasil.
- Token, password, NISN lengkap, dan data sensitif tidak ditulis ke log umum.

Untuk cPanel, gunakan cPanel Cron Job atau agen lokal terjadwal. Jangan bergantung pada `setInterval` jangka panjang di proses Node.js karena proses hosting dapat restart.

### Fase 5 — Staging, preview, dan persetujuan operator

Data Dapodik sebaiknya tidak langsung menimpa master akademik.

Alur yang direkomendasikan:

```text
Tarik data
    ↓
Staging
    ↓
Preview perubahan
    ↓
Persetujuan operator
    ↓
Commit transaksional
```

Preview harus menampilkan:

- Siswa baru.
- Siswa berubah.
- Perubahan kelas.
- Siswa yang tidak lagi muncul.
- Duplikat NISN.
- NIS berbeda untuk NISN yang sama.
- Rombel yang belum memiliki mapping.
- Guru yang belum dapat dipetakan.
- Field tanggal atau kode yang tidak valid.

Desain ini mengikuti prinsip import akademik yang sudah digunakan aplikasi: preview-first, validasi, commit transaksional, checksum, dan audit.

### Fase 6 — Keamanan dan privasi

Minimum security baseline:

- Token hanya di environment variable atau secret manager.
- Tidak ada token di source code.
- Tidak ada token di log atau error report.
- Endpoint ingest tidak boleh terbuka tanpa service authentication.
- HTTPS wajib untuk koneksi internet.
- Port Dapodik tidak dibuka langsung ke internet.
- Akses admin dan operator dipisahkan.
- Setiap sync dan commit dicatat pada audit log.
- Backup PostgreSQL dienkripsi.
- Akses data siswa dibatasi berdasarkan role.
- Terapkan retention policy untuk data sinkronisasi dan log.

Untuk API legacy yang mewajibkan MD5, jangan menyimpan password asli. Nilai credential hanya boleh berada pada environment/secret yang diperlukan adapter dan tidak boleh dicetak.

### Fase 7 — Deployment cPanel

Checklist:

1. Node.js Application cPanel berjalan.
2. PostgreSQL dapat dijangkau dari cPanel.
3. `DATABASE_URL` tersedia di environment aplikasi.
4. `prisma migrate deploy` berhasil.
5. Endpoint health merespons.
6. Koneksi keluar dari cPanel telah diuji.
7. Endpoint Dapodik atau agen lokal dapat dijangkau.
8. Sinkronisasi sample berhasil.
9. Preview dan audit dapat diperiksa operator.
10. Cron dijalankan setelah persetujuan hasil sample.

## 5. Rencana pengujian

### Koneksi

- Dapodik aktif.
- Dapodik mati.
- Token salah.
- NPSN salah.
- URL tunnel tidak tersedia.
- TLS gagal.
- Timeout.
- Response kosong.
- Response bukan JSON.

### Sinkronisasi

- Siswa baru.
- Perubahan nama.
- Perubahan kelas.
- Siswa tidak muncul sementara.
- Duplikat NISN.
- Sinkronisasi identik dua kali.
- Proses terputus di tengah.
- Proses dilanjutkan dari checkpoint.
- Dua job berjalan bersamaan.
- Relasi kelas belum tersedia.

### Keamanan

- Endpoint dipanggil tanpa token.
- Signature salah.
- Token kedaluwarsa.
- Siswa mencoba endpoint operator.
- Log diperiksa untuk memastikan token dan data sensitif tidak bocor.
- Port Dapodik tidak dapat diakses langsung dari internet.

## 6. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Dapodik lokal mati | Sinkronisasi gagal | Status `FAILED`, retry, notifikasi operator |
| Internet sekolah putus | Batch terhenti | Checkpoint dan resume |
| IP cPanel berubah | Allowlist tidak cocok | Verifikasi egress atau gunakan agen push |
| Format API berubah | Parser gagal | Adapter versioned dan contract test |
| Duplikat NISN | Data salah | Validasi staging dan blok commit |
| Siswa tidak muncul sementara | Data terhapus | Jangan auto-delete; gunakan review |
| Token bocor | Akses data tidak sah | Environment secret, redaction log, rotasi token |
| Cron ganda | Data diproses bersamaan | PostgreSQL advisory lock atau sync lock |
| Shared hosting membatasi koneksi | Pull gagal | Gunakan agen lokal push |

## 7. Keputusan yang perlu dikonfirmasi

1. Versi Dapodik yang benar-benar terpasang.
2. Apakah menu Web Service Lokal tersedia.
3. Apakah endpoint `/rest/PesertaDidik` dapat dipanggil.
4. Apakah integrasi memakai agen lokal atau tunnel.
5. Apakah data akan disinkron otomatis atau memerlukan persetujuan operator.
6. Apakah data guru/PTK juga diperlukan.
7. Apakah satu aplikasi akan melayani satu NPSN atau beberapa NPSN.
8. Kebijakan untuk siswa yang tidak lagi dikembalikan oleh Dapodik.

## 8. Rekomendasi final sementara

1. Gunakan Web Service Dapodik lokal modern jika tersedia.
2. Gunakan agen lokal push sebagai pilihan utama untuk shared cPanel.
3. Gunakan Cloudflare Tunnel/VPN hanya bila pull langsung memang diperlukan.
4. Pertahankan adapter API 2009 sebagai fallback, bukan asumsi utama.
5. Terapkan staging, preview, checkpoint, dan audit sebelum commit.
6. Jangan mengubah password akun siswa dari hasil sinkronisasi tanpa kebijakan eksplisit.
7. Jangan menjadikan IP shared cPanel sebagai allowlist sebelum IP egress aktual diverifikasi.
8. Mulai dengan proof of connection endpoint sekolah sebelum menarik data siswa.
