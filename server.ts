import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { db } from "./src/db";
import {
  COMPETENCY_DATA,
  TIMELINE_ACHIEVEMENTS,
  CAMPUS_LIFE_GALLERY,
  ALUMNI_TESTIMONIALS,
  NEWS_COMPILATION,
  INDUSTRI_PARTNERS
} from "./src/data";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// ─── Server-side file logger ─────────────────────────────────────────────────
const LOG_DIR      = path.join(process.cwd(), "logs");
const SERVER_LOG   = path.join(LOG_DIR, "server.log");
const MAX_LOG_SIZE = 512 * 1024;

function serverLog(level: "INFO" | "WARN" | "ERROR", message: string) {
  const line = `${new Date().toISOString()} [${level}] ${message}\n`;
  (level === "ERROR" ? process.stderr : process.stdout).write(line);
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    if (fs.existsSync(SERVER_LOG) && fs.statSync(SERVER_LOG).size > MAX_LOG_SIZE) {
      const old = path.join(LOG_DIR, "server.log.1");
      if (fs.existsSync(old)) { try { fs.renameSync(old, path.join(LOG_DIR, "server.log.2")); } catch {} }
      fs.renameSync(SERVER_LOG, old);
    }
    fs.appendFileSync(SERVER_LOG, line, "utf-8");
  } catch { /* best-effort */ }
}

serverLog("INFO", `server.ts loaded — PORT=${PORT}  NODE_ENV=${process.env.NODE_ENV}  BASE_PATH=${process.env.BASE_PATH}`);

// ─── Session TTL ─────────────────────────────────────────────────────────────
const SESSION_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// ─── DB-backed session helpers ────────────────────────────────────────────────
async function addSession(token: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  // Purge expired sessions while we're here
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  await db.session.create({ data: { token, expiresAt } });
}

async function hasSession(token: string): Promise<boolean> {
  if (!token) return false;
  const sess = await db.session.findUnique({ where: { token } });
  if (!sess) return false;
  if (sess.expiresAt < new Date()) {
    await db.session.delete({ where: { token } }).catch(() => {});
    return false;
  }
  return true;
}

async function removeSession(token: string) {
  await db.session.delete({ where: { token } }).catch(() => {});
}

async function removeAllSessions() {
  await db.session.deleteMany({});
}

// Login rate limiter: max 5 attempts per IP, then 60s lockout
const loginAttempts = new Map<string, { count: number; lockUntil: number; lastSeen: number }>();
function checkRateLimit(ip: string): { allowed: boolean; secondsLeft?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockUntil: 0, lastSeen: now };
  if (now < entry.lockUntil) {
    return { allowed: false, secondsLeft: Math.ceil((entry.lockUntil - now) / 1000) };
  }
  return { allowed: true };
}
function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockUntil: 0, lastSeen: now };
  entry.count += 1;
  entry.lastSeen = now;
  if (entry.count >= 5) {
    entry.lockUntil = now + 60_000;
    entry.count = 0;
  }
  loginAttempts.set(ip, entry);
}
function clearAttempts(ip: string) { loginAttempts.delete(ip); }
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [ip, entry] of loginAttempts.entries()) {
    if (entry.lastSeen < cutoff && entry.lockUntil < Date.now()) loginAttempts.delete(ip);
  }
}, 10 * 60 * 1000).unref();

// ─── Auth middleware ──────────────────────────────────────────────────────────
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token || !(await hasSession(token))) {
    return res.status(401).json({ error: "Tidak diotorisasi. Silakan login kembali." });
  }
  next();
}

// ─── Admin credentials helpers ────────────────────────────────────────────────
async function getAdminCredentials(): Promise<{ username: string; password: string }> {
  const cred = await db.adminCredential.findFirst();
  if (cred) return { username: cred.username, password: cred.password };
  return {
    username: process.env.ADMIN_USERNAME || "jobenenterprise",
    password: process.env.ADMIN_PASSWORD || "KuraKuraNinja!0!",
  };
}

// ─── Setting helpers (replaces all JSON file r/w for config + collections) ────
async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } });
  if (row) return row.value as T;
  // Seed default on first access
  await db.setting.create({ data: { key, value: fallback as any } }).catch(() => {});
  return fallback;
}

async function setSetting(key: string, value: any) {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// ─── Image size guard ─────────────────────────────────────────────────────────
function validateImageFields(obj: any, fields: string[], maxKB: number): string | null {
  for (const field of fields) {
    const val = obj?.[field];
    if (val && typeof val === "string" && val.startsWith("data:")) {
      const sizeKB = Math.ceil(val.length / 1024);
      if (sizeKB > maxKB) {
        return `Gambar pada field '${field}' terlalu besar (${sizeKB} KB). Maksimal ${maxKB} KB per gambar. Harap kompres gambar terlebih dahulu.`;
      }
    }
  }
  return null;
}

// ─── Default setting values ───────────────────────────────────────────────────
const DEFAULT_BRANDING = {
  schoolLogo: null, schoolLogoDark: null, schoolLogoLight: null,
  schoolFavicon: null, schoolAppIcon: null
};
const DEFAULT_KEPALA_SEKOLAH = {
  nama: "Drs. Gunawan, M.Pd.",
  nip: "19680324 199403 1 008",
  foto: null,
  sambutan: "Atas nama segenap keluarga besar SMKN 1 Wonogiri, saya menyambut kehadiran Anda di gerbang digital institusi terakreditasi unggul kami. Kami percaya bahwa pendidikan kejuruan mandiri tidak hanya mengajarkan metode teknis semata, namun mencetak kesiapan karakter, kepemimpinan, dan etika moral kelas dunia.\n\nSebagai Center of Excellence Nasional, kami mendesain setiap detail proses belajar mengajar dengan standar internasional paling prima. Kami mendedikasikan seluruh daya upaya guna meluncurkan lulusan yang siap mengambil peranan krusial sebagai inovator bisnis, ahli kriya, serta motor penggerak ekonomi global."
};
const DEFAULT_MANAJEMEN = [
  { id: "waka-kesiswaan", jabatan: "Waka Kesiswaan", nama: "-", foto: null },
  { id: "waka-kurikulum", jabatan: "Waka Kurikulum", nama: "-", foto: null },
  { id: "waka-sarpras", jabatan: "Waka Sarpras & Ketenagakerjaan", nama: "-", foto: null },
  { id: "waka-humas", jabatan: "Waka Humas", nama: "-", foto: null },
  { id: "kepala-tu", jabatan: "Kepala Tata Usaha", nama: "-", foto: null },
];
const DEFAULT_VISI_MISI = {
  visi: "Terwujudnya SMKN 1 Wonogiri sebagai lembaga pendidikan kejuruan yang unggul, berkarakter, dan berdaya saing global dalam rangka mewujudkan masyarakat yang sejahtera.",
  misi: [
    "Menyelenggarakan pendidikan dan pelatihan kejuruan berkualitas tinggi berbasis kompetensi dan standar industri nasional maupun internasional.",
    "Mengembangkan karakter peserta didik yang beriman, bertaqwa kepada Tuhan Yang Maha Esa, berakhlak mulia, dan berwawasan kebangsaan.",
    "Membangun kemitraan strategis dengan dunia usaha dan dunia industri (DUDI) untuk penguatan kompetensi lulusan.",
    "Menciptakan lingkungan belajar yang inovatif, inspiratif, dan adaptif terhadap perkembangan ilmu pengetahuan dan teknologi.",
    "Menghasilkan lulusan yang kompeten, produktif, mandiri, dan siap memasuki dunia kerja serta berwirausaha di era global."
  ]
};
const DEFAULT_SOCIAL_MEDIA = {
  instagram: "https://instagram.com/smkn1wonogiri",
  youtube: "https://youtube.com/@smkn1wonogiri",
  website: "https://smkn1wonogiri.sch.id",
  facebook: "", tiktok: "", twitter: ""
};
const DEFAULT_ABOUT = { foto: null, fotoX: 50, fotoY: 50, fotoScale: 100 };

// ─── Seed defaults into DB on startup ─────────────────────────────────────────
async function seedDefaults() {
  const seeds: [string, any][] = [
    ["competencies", COMPETENCY_DATA],
    ["milestones", TIMELINE_ACHIEVEMENTS],
    ["gallery", CAMPUS_LIFE_GALLERY],
    ["alumni", ALUMNI_TESTIMONIALS],
    ["news", NEWS_COMPILATION],
    ["partners", INDUSTRI_PARTNERS],
    ["branding", DEFAULT_BRANDING],
    ["kepala-sekolah", DEFAULT_KEPALA_SEKOLAH],
    ["manajemen-sekolah", DEFAULT_MANAJEMEN],
    ["visi-misi", DEFAULT_VISI_MISI],
    ["social-media", DEFAULT_SOCIAL_MEDIA],
    ["about", DEFAULT_ABOUT],
  ];
  for (const [key, value] of seeds) {
    const exists = await db.setting.findUnique({ where: { key } });
    if (!exists) {
      await db.setting.create({ data: { key, value } }).catch(() => {});
    }
  }
}

// ─── Parsing Middlewares ──────────────────────────────────────────────────────
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// BASE_PATH prefix stripping (cPanel/Passenger)
app.use((req, res, next) => {
  const BASE = (process.env.BASE_PATH || "").replace(/\/$/, "");
  if (BASE) {
    if (req.url === BASE) return res.redirect(302, BASE + "/");
    if (req.url.startsWith(BASE + "/")) req.url = req.url.slice(BASE.length);
  }
  next();
});

// Global write-protection
app.use((req, res, next) => {
  const writeMethods = ["POST", "DELETE", "PUT", "PATCH"];
  if (!writeMethods.includes(req.method)) return next();
  const publicExact = ["/api/auth/login", "/api/tracer", "/api/contact", "/api/suara", "/api/aduan"];
  if (publicExact.includes(req.path)) return next();
  const publicPatterns = [
    /^\/api\/suara\/[^/]+\/komentar$/,
    /^\/api\/suara\/[^/]+\/like$/,
    /^\/api\/suara\/[^/]+\/view$/,
  ];
  if (publicPatterns.some(re => re.test(req.path))) return next();
  return requireAuth(req, res, next);
});

// ─── Auth Endpoints ───────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const { allowed, secondsLeft } = checkRateLimit(ip);
  if (!allowed) return res.status(429).json({ error: `Terlalu banyak percobaan login. Coba lagi dalam ${secondsLeft} detik.` });
  const { username, password } = req.body;
  const creds = await getAdminCredentials();
  if (username === creds.username && password === creds.password) {
    clearAttempts(ip);
    const token = crypto.randomBytes(48).toString("hex");
    await addSession(token);
    return res.json({ token });
  }
  recordFailedAttempt(ip);
  return res.status(401).json({ error: "Kombinasi User Name atau Sandi salah. Periksa kembali!" });
});

app.post("/api/auth/change-password", async (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Password lama dan password baru wajib diisi." });
  if (newPassword.length < 8) return res.status(400).json({ error: "Password baru minimal 8 karakter." });
  const creds = await getAdminCredentials();
  if (currentPassword !== creds.password) return res.status(401).json({ error: "Password saat ini salah." });
  const updated = { username: (newUsername || "").trim() || creds.username, password: newPassword };
  try {
    await db.adminCredential.upsert({
      where: { id: 1 },
      update: updated,
      create: { id: 1, ...updated },
    });
    await removeAllSessions();
    return res.json({ success: true, username: updated.username });
  } catch (err: any) {
    return res.status(500).json({ error: "Gagal menyimpan perubahan: " + err.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (token) await removeSession(token);
  return res.json({ success: true });
});

app.get("/api/auth/verify", async (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (token && (await hasSession(token))) return res.json({ valid: true });
  return res.status(401).json({ valid: false });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const startedAt = new Date(Date.now() - process.uptime() * 1000).toISOString();
  let dbStatus = "ok";
  let sessionCount = 0;
  try {
    const result = await db.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "Session" WHERE "expiresAt" > NOW()`;
    sessionCount = Number(result[0].count);
  } catch (e: any) {
    dbStatus = "error: " + e.message;
  }
  res.status(dbStatus === "ok" ? 200 : 207).json({
    status: dbStatus === "ok" ? "ok" : "degraded",
    server: "running",
    uptime_seconds: Math.floor(process.uptime()),
    started_at: startedAt,
    timestamp: new Date().toISOString(),
    node_version: process.version,
    env: process.env.NODE_ENV || "development",
    active_sessions: sessionCount,
    database: dbStatus,
  });
});

// ─── Logs Endpoint ────────────────────────────────────────────────────────────
app.get("/api/logs", requireAuth as any, (_req, res) => {
  const files = [
    { name: "app.log",    path: path.join(process.cwd(), "logs", "app.log") },
    { name: "server.log", path: SERVER_LOG },
    { name: "app.log.1",  path: path.join(process.cwd(), "logs", "app.log.1") },
  ];
  const TAIL_LINES = 200;
  const result: Record<string, string[]> = {};
  for (const f of files) {
    try {
      if (!fs.existsSync(f.path)) { result[f.name] = ["(file not found)"]; continue; }
      const raw = fs.readFileSync(f.path, "utf-8");
      result[f.name] = raw.split("\n").filter(Boolean).slice(-TAIL_LINES);
    } catch (e: any) {
      result[f.name] = [`(read error: ${e.message})`];
    }
  }
  res.json({ generated_at: new Date().toISOString(), files: result });
});

// ─── Generic setting GET/POST factory ─────────────────────────────────────────
function settingRoutes(
  key: string,
  defaultValue: any,
  opts: {
    validateArray?: boolean;
    imageFields?: string[];
    maxImgKB?: number;
    arrayItemImageFields?: string[];
    arrayItemMaxKB?: number;
  } = {}
) {
  app.get(`/api/${key}`, async (_req, res) => {
    try {
      res.json(await getSetting(key, defaultValue));
    } catch (e: any) {
      res.status(500).json({ error: `Failed to read ${key}: ` + e.message });
    }
  });

  app.post(`/api/${key}`, async (req, res) => {
    try {
      const data = opts.validateArray ? req.body.data : req.body;
      if (opts.validateArray && !Array.isArray(data)) {
        return res.status(400).json({ error: `Data must be an array` });
      }
      // Per-object image validation
      if (opts.imageFields) {
        const err = validateImageFields(data, opts.imageFields, opts.maxImgKB ?? 800);
        if (err) return res.status(413).json({ error: err });
      }
      // Per-item image validation for arrays
      if (opts.arrayItemImageFields && Array.isArray(data)) {
        for (const item of data) {
          const err = validateImageFields(item, opts.arrayItemImageFields, opts.arrayItemMaxKB ?? 800);
          if (err) return res.status(413).json({ error: err });
        }
      }
      await setSetting(key, data);
      res.json({ success: true, count: Array.isArray(data) ? data.length : undefined });
    } catch (e: any) {
      res.status(500).json({ error: `Failed to save ${key}: ` + e.message });
    }
  });
}

// Register all setting-backed routes
settingRoutes("competencies", COMPETENCY_DATA, { validateArray: true });
settingRoutes("milestones", TIMELINE_ACHIEVEMENTS, { validateArray: true });
settingRoutes("gallery", CAMPUS_LIFE_GALLERY, { validateArray: true, arrayItemImageFields: ["image"], arrayItemMaxKB: 800 });
settingRoutes("alumni", ALUMNI_TESTIMONIALS, { validateArray: true, arrayItemImageFields: ["avatar"], arrayItemMaxKB: 500 });
settingRoutes("news", NEWS_COMPILATION, { validateArray: true, arrayItemImageFields: ["image"], arrayItemMaxKB: 800 });
settingRoutes("partners", INDUSTRI_PARTNERS, { validateArray: true });
settingRoutes("kepala-sekolah", DEFAULT_KEPALA_SEKOLAH, { imageFields: ["foto"], maxImgKB: 800 });
settingRoutes("manajemen-sekolah", DEFAULT_MANAJEMEN, {
  validateArray: false,
  arrayItemImageFields: ["foto"],
  arrayItemMaxKB: 800,
});
settingRoutes("visi-misi", DEFAULT_VISI_MISI);
settingRoutes("social-media", DEFAULT_SOCIAL_MEDIA);
settingRoutes("about", DEFAULT_ABOUT, { imageFields: ["foto"], maxImgKB: 800 });

// ─── Branding (special: POST wraps body as-is, with logo field validation) ────
app.get("/api/branding", async (_req, res) => {
  try { res.json(await getSetting("branding", DEFAULT_BRANDING)); }
  catch (e: any) { res.status(500).json({ error: "Failed to read branding: " + e.message }); }
});
app.post("/api/branding", async (req, res) => {
  try {
    const data = req.body;
    const logoFields = ["schoolLogo", "schoolLogoDark", "schoolLogoLight", "schoolFavicon", "schoolAppIcon"];
    const imgErr = validateImageFields(data, logoFields, 800);
    if (imgErr) return res.status(413).json({ error: imgErr });
    await setSetting("branding", data);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: "Failed to save branding: " + e.message }); }
});

// ─── Reset to defaults ────────────────────────────────────────────────────────
app.post("/api/reset", async (_req, res) => {
  try {
    await Promise.all([
      setSetting("competencies", COMPETENCY_DATA),
      setSetting("milestones", TIMELINE_ACHIEVEMENTS),
      setSetting("gallery", CAMPUS_LIFE_GALLERY),
      setSetting("alumni", ALUMNI_TESTIMONIALS),
      setSetting("news", NEWS_COMPILATION),
      setSetting("partners", INDUSTRI_PARTNERS),
    ]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: "Failed to reset data: " + e.message }); }
});

// ─── Tracer Study ─────────────────────────────────────────────────────────────
app.get("/api/tracer", async (_req, res) => {
  try {
    const entries = await db.tracerEntry.findMany({ orderBy: { createdAt: "asc" } });
    res.json(entries.map(e => ({ id: e.id, createdAt: e.createdAt, ...(e.data as object) })));
  } catch (e: any) { res.status(500).json({ error: "Failed to read tracer data: " + e.message }); }
});

app.post("/api/tracer", async (req, res) => {
  try {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const entry = await db.tracerEntry.create({
      data: { id, data: req.body },
    });
    res.json({ id: entry.id, createdAt: entry.createdAt, ...(entry.data as object) });
  } catch (e: any) { res.status(500).json({ error: "Failed to save tracer entry: " + e.message }); }
});

app.delete("/api/tracer/:id", async (req, res) => {
  try {
    await db.tracerEntry.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    if ((e as any).code === "P2025") return res.status(404).json({ error: "Entry not found" });
    res.status(500).json({ error: "Failed to delete tracer entry: " + e.message });
  }
});

// ─── Contact Messages ─────────────────────────────────────────────────────────
app.post("/api/contact", async (req, res) => {
  try {
    const { nama, email, noHp, keperluan, pesan, waktu } = req.body;
    if (!nama || !email || !keperluan || !pesan) return res.status(400).json({ error: "Field wajib tidak lengkap." });
    if (pesan.trim().length < 20) return res.status(400).json({ error: "Pesan minimal 20 karakter." });
    const msg = await db.contactMessage.create({
      data: {
        nama: String(nama).trim(),
        email: String(email).trim().toLowerCase(),
        noHp: String(noHp || "").trim(),
        keperluan: String(keperluan).trim(),
        pesan: String(pesan).trim(),
        waktu: waktu ? new Date(waktu) : new Date(),
      },
    });
    res.json({ success: true, id: msg.id });
  } catch (e: any) { res.status(500).json({ error: "Gagal menyimpan pesan." }); }
});

app.get("/api/contact", requireAuth as any, async (_req, res) => {
  try {
    const msgs = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
    res.json(msgs.map(m => ({ ...m, waktu: m.waktu.toISOString(), createdAt: m.createdAt.toISOString() })));
  } catch (e: any) { res.status(500).json({ error: "Gagal membaca pesan." }); }
});

app.patch("/api/contact/:id/baca", requireAuth as any, async (req, res) => {
  try {
    await db.contactMessage.update({ where: { id: req.params.id }, data: { dibaca: true } });
    res.json({ success: true });
  } catch (e: any) {
    if ((e as any).code === "P2025") return res.status(404).json({ error: "Pesan tidak ditemukan." });
    res.status(500).json({ error: "Gagal memperbarui status pesan." });
  }
});

app.delete("/api/contact/:id", requireAuth as any, async (req, res) => {
  try {
    await db.contactMessage.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Gagal menghapus pesan." }); }
});

// ─── Aduan Publik ─────────────────────────────────────────────────────────────
app.post("/api/aduan", async (req, res) => {
  try {
    const { namaLengkap, noHp, alamat, judul, isi, tanggal, lokasi, lokasiLainnya, kategori, anonim, rahasia } = req.body;
    if (!judul || !isi || !tanggal || !lokasi || !kategori) return res.status(400).json({ error: "Field wajib tidak lengkap." });
    if (isi.trim().length < 30) return res.status(400).json({ error: "Isi laporan minimal 30 karakter." });
    const entry = await db.aduanPublik.create({
      data: {
        namaLengkap: anonim ? "Anonim" : String(namaLengkap || "").trim(),
        noHp: anonim ? "" : String(noHp || "").trim(),
        alamat: anonim ? "" : String(alamat || "").trim(),
        judul: String(judul).trim(),
        isi: String(isi).trim(),
        tanggal: String(tanggal).trim(),
        lokasi: lokasi === "Lokasi Lainnya" ? String(lokasiLainnya || lokasi).trim() : String(lokasi).trim(),
        kategori: String(kategori).trim(),
        anonim: !!anonim,
        rahasia: !!rahasia,
      },
    });
    res.json({ success: true, id: entry.id });
  } catch (e: any) { res.status(500).json({ error: "Gagal menyimpan aduan." }); }
});

app.get("/api/aduan", requireAuth as any, async (_req, res) => {
  try {
    const list = await db.aduanPublik.findMany({ orderBy: { createdAt: "desc" } });
    res.json(list.map(a => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })));
  } catch (e: any) { res.status(500).json({ error: "Gagal membaca aduan." }); }
});

app.patch("/api/aduan/:id/status", requireAuth as any, async (req, res) => {
  try {
    const { status, catatan } = req.body;
    const data: any = {};
    if (status) data.status = String(status).trim();
    if (catatan !== undefined) data.catatan = String(catatan).trim();
    await db.aduanPublik.update({ where: { id: req.params.id }, data });
    res.json({ success: true });
  } catch (e: any) {
    if ((e as any).code === "P2025") return res.status(404).json({ error: "Aduan tidak ditemukan." });
    res.status(500).json({ error: "Gagal memperbarui status." });
  }
});

app.delete("/api/aduan/:id", requireAuth as any, async (req, res) => {
  try {
    await db.aduanPublik.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Gagal menghapus aduan." }); }
});

app.post("/api/aduan/bulk-delete", requireAuth as any, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids harus array." });
    await db.aduanPublik.deleteMany({ where: { id: { in: ids } } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Gagal menghapus aduan." }); }
});

// ─── Suara Skansagiri ─────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 80);
}

app.get("/api/suara", async (req, res) => {
  try {
    const { category, search } = req.query as Record<string, string>;
    const where: any = { status: "PUBLISHED" };
    if (category && category !== "ALL") where.category = category;
    if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
        { authorName: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ];
    }
    const result = await db.karyaSiswa.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
    res.json(result.map(k => ({
      ...k,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
      publishedAt: k.publishedAt?.toISOString() ?? null,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/suara/admin", requireAuth as any, async (_req, res) => {
  try {
    const all = await db.karyaSiswa.findMany({ orderBy: { createdAt: "desc" } });
    res.json(all.map(k => ({
      ...k,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
      publishedAt: k.publishedAt?.toISOString() ?? null,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/suara/leaderboard", async (_req, res) => {
  try {
    const published = await db.karyaSiswa.findMany({ where: { status: "PUBLISHED" } });
    const map = new Map<string, {
      authorName: string; authorClass: string; authorJurusan: string;
      points: number; publishedCount: number; totalLikes: number; totalViews: number;
      latestTitle: string; latestDate: string; categories: Set<string>;
    }>();
    for (const k of published) {
      const key = k.authorName.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          authorName: k.authorName, authorClass: k.authorClass,
          authorJurusan: k.authorJurusan, points: 0, publishedCount: 0,
          totalLikes: 0, totalViews: 0, latestTitle: "", latestDate: "",
          categories: new Set(),
        });
      }
      const e = map.get(key)!;
      e.publishedCount += 1;
      e.points += 10 + Math.floor(k.likes / 5);
      e.totalLikes += k.likes;
      e.totalViews += k.views;
      e.categories.add(k.category);
      const pubDate = k.publishedAt?.toISOString() || k.createdAt.toISOString();
      if (!e.latestDate || pubDate > e.latestDate) {
        e.latestDate = pubDate;
        e.latestTitle = k.title;
      }
    }
    const board = [...map.values()]
      .map(e => ({ ...e, categories: [...e.categories] }))
      .sort((a, b) => b.points - a.points || b.totalLikes - a.totalLikes)
      .slice(0, 15);
    res.json(board);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/suara/komentar/admin", requireAuth as any, async (_req, res) => {
  try {
    const all = await db.komentarSuara.findMany({ orderBy: { createdAt: "desc" } });
    res.json(all.map(k => ({ ...k, createdAt: k.createdAt.toISOString() })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/suara/:id", async (req, res) => {
  try {
    const karya = await db.karyaSiswa.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
    });
    if (!karya) return res.status(404).json({ error: "Karya tidak ditemukan" });
    if (karya.status !== "PUBLISHED") {
      const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
      if (!token || !(await hasSession(token))) return res.status(403).json({ error: "Karya belum dipublikasikan" });
    }
    res.json({
      ...karya,
      createdAt: karya.createdAt.toISOString(),
      updatedAt: karya.updatedAt.toISOString(),
      publishedAt: karya.publishedAt?.toISOString() ?? null,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/suara", async (req, res) => {
  try {
    const { title, content, category, authorName, authorClass, authorJurusan, tags } = req.body;
    if (!title || !content || !category || !authorName || !authorClass)
      return res.status(400).json({ error: "Field wajib tidak lengkap." });
    if (content.trim().length < 200) return res.status(400).json({ error: "Konten minimal 200 karakter." });
    const validCats = ["JURNAL_VOKASI", "ESAI_INOVASI", "SASTRA", "OPINI"];
    if (!validCats.includes(category)) return res.status(400).json({ error: "Kategori tidak valid." });

    const baseSlug = slugify(title);
    let slug = baseSlug || `karya-${Date.now()}`;
    let counter = 1;
    while (await db.karyaSiswa.findUnique({ where: { slug } })) slug = `${baseSlug}-${counter++}`;

    const trimmedContent = content.trim();
    const excerpt = trimmedContent.replace(/\n+/g, " ").substring(0, 220) + (trimmedContent.length > 220 ? "..." : "");
    const parsedTags: string[] = Array.isArray(tags)
      ? tags.map((t: string) => t.trim()).filter(Boolean)
      : (tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);

    const newKarya = await db.karyaSiswa.create({
      data: {
        title: title.trim(), slug, content: trimmedContent, excerpt,
        category, status: "REVIEW", views: 0, likes: 0,
        authorName: authorName.trim(), authorClass: authorClass.trim(),
        authorJurusan: (authorJurusan || "").trim(), tags: parsedTags,
      },
    });
    res.json({ success: true, id: newKarya.id, slug: newKarya.slug });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/suara/:id", requireAuth as any, async (req, res) => {
  try {
    const { title, content, category, tags, authorName, authorClass, authorJurusan } = req.body;
    if (!title || !content || !category) return res.status(400).json({ error: "Judul, konten, dan kategori wajib diisi." });
    if (content.trim().length < 200) return res.status(400).json({ error: "Konten minimal 200 karakter." });
    const validCats = ["JURNAL_VOKASI", "ESAI_INOVASI", "SASTRA", "OPINI"];
    if (!validCats.includes(category)) return res.status(400).json({ error: "Kategori tidak valid." });

    const existing = await db.karyaSiswa.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Karya tidak ditemukan." });

    let slug = existing.slug;
    if (title.trim() !== existing.title) {
      const baseSlug = slugify(title);
      slug = baseSlug || `karya-${Date.now()}`;
      let counter = 1;
      while (await db.karyaSiswa.findFirst({ where: { slug, NOT: { id: req.params.id } } })) slug = `${baseSlug}-${counter++}`;
    }

    const trimmedContent = content.trim();
    const excerpt = trimmedContent.replace(/\n+/g, " ").substring(0, 220) + (trimmedContent.length > 220 ? "..." : "");
    const parsedTags: string[] = Array.isArray(tags)
      ? tags.map((t: string) => t.trim()).filter(Boolean)
      : (tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);

    const updated = await db.karyaSiswa.update({
      where: { id: req.params.id },
      data: {
        title: title.trim(), slug, content: trimmedContent, excerpt,
        category, tags: parsedTags,
        authorName: authorName ? authorName.trim() : existing.authorName,
        authorClass: authorClass ? authorClass.trim() : existing.authorClass,
        authorJurusan: authorJurusan !== undefined ? authorJurusan.trim() : existing.authorJurusan,
      },
    });
    res.json({ success: true, data: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), publishedAt: updated.publishedAt?.toISOString() ?? null } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/suara/:id/like", async (req, res) => {
  try {
    const updated = await db.karyaSiswa.update({ where: { id: req.params.id }, data: { likes: { increment: 1 } } });
    res.json({ likes: updated.likes });
  } catch (e: any) {
    if ((e as any).code === "P2025") return res.status(404).json({ error: "Karya tidak ditemukan" });
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/suara/:id/view", async (req, res) => {
  try {
    const updated = await db.karyaSiswa.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
    res.json({ views: updated.views });
  } catch (e: any) {
    if ((e as any).code === "P2025") return res.status(404).json({ error: "Karya tidak ditemukan" });
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/suara/:id/approve", requireAuth as any, async (req, res) => {
  try {
    const existing = await db.karyaSiswa.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Karya tidak ditemukan" });
    await db.karyaSiswa.update({
      where: { id: req.params.id },
      data: { status: "PUBLISHED", feedback: null, publishedAt: existing.publishedAt ?? new Date() },
    });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/suara/:id/reject", requireAuth as any, async (req, res) => {
  try {
    const { feedback, action } = req.body;
    await db.karyaSiswa.update({
      where: { id: req.params.id },
      data: { status: action === "archive" ? "ARCHIVED" : "REVISION", feedback: feedback || null },
    });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/suara/:id", requireAuth as any, async (req, res) => {
  try {
    await db.karyaSiswa.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    if ((e as any).code === "P2025") return res.status(404).json({ error: "Karya tidak ditemukan" });
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/suara/:id/komentar", async (req, res) => {
  try {
    const list = await db.komentarSuara.findMany({
      where: { artikelId: req.params.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    });
    res.json(list.map(k => ({ ...k, createdAt: k.createdAt.toISOString() })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/suara/:id/komentar", async (req, res) => {
  try {
    const karya = await db.karyaSiswa.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }], status: "PUBLISHED" },
    });
    if (!karya) return res.status(404).json({ error: "Artikel tidak ditemukan" });
    const { authorName, authorClass, content } = req.body;
    if (!authorName?.trim() || !content?.trim()) return res.status(400).json({ error: "Nama dan isi komentar wajib diisi." });
    if (content.trim().length < 10) return res.status(400).json({ error: "Komentar minimal 10 karakter." });
    if (content.trim().length > 500) return res.status(400).json({ error: "Komentar maksimal 500 karakter." });
    await db.komentarSuara.create({
      data: {
        artikelId: karya.id,
        artikelTitle: karya.title,
        authorName: authorName.trim(),
        authorClass: (authorClass || "").trim(),
        content: content.trim(),
        status: "PENDING",
      },
    });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/suara/komentar/:commentId/approve", requireAuth as any, async (req, res) => {
  try {
    await db.komentarSuara.update({ where: { id: req.params.commentId }, data: { status: "APPROVED" } });
    res.json({ success: true });
  } catch (e: any) {
    if ((e as any).code === "P2025") return res.status(404).json({ error: "Komentar tidak ditemukan" });
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/suara/komentar/:commentId", requireAuth as any, async (req, res) => {
  try {
    await db.komentarSuara.delete({ where: { id: req.params.commentId } });
    res.json({ success: true });
  } catch (e: any) {
    if ((e as any).code === "P2025") return res.status(404).json({ error: "Komentar tidak ditemukan" });
    res.status(500).json({ error: e.message });
  }
});

// ─── Sitemap ──────────────────────────────────────────────────────────────────
app.get("/sitemap.xml", async (req, res) => {
  const BASE_URL = (process.env.SITE_URL || "https://smkn1wonogiri.sch.id/id").replace(/\/$/, "");
  const staticRoutes = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/berita", priority: "0.9", changefreq: "daily" },
    { path: "/tentang/kepala-sekolah", priority: "0.8", changefreq: "monthly" },
    { path: "/tentang/manajemen-sekolah", priority: "0.8", changefreq: "monthly" },
    { path: "/tentang/visi-misi", priority: "0.8", changefreq: "monthly" },
    { path: "/tracer-studi", priority: "0.7", changefreq: "weekly" },
    { path: "/modul-integrasi", priority: "0.7", changefreq: "monthly" },
    { path: "/suara-skansagiri", priority: "0.7", changefreq: "weekly" },
    { path: "/hubungi-kami", priority: "0.6", changefreq: "monthly" },
  ];
  let newsUrls = "";
  try {
    const newsData = await getSetting<any[]>("news", []);
    newsData.forEach((item: any) => {
      if (item.id) {
        newsUrls += `\n  <url><loc>${BASE_URL}/berita#${item.id}</loc><priority>0.6</priority><changefreq>never</changefreq></url>`;
      }
    });
  } catch {}
  const today = new Date().toISOString().split("T")[0];
  const staticXml = staticRoutes.map(r =>
    `\n  <url><loc>${BASE_URL}${r.path}</loc><lastmod>${today}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`
  ).join("");
  res.set("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticXml}${newsUrls}\n</urlset>`);
});

// ─── Vite / Static serving ────────────────────────────────────────────────────
async function main() {
  // Connect to DB and seed defaults
  await seedDefaults();
  serverLog("INFO", "Database connected and defaults seeded.");

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const mimeOverride: express.RequestHandler = (_req, res, next) => {
      const url = _req.url;
      if (url.endsWith(".js") || url.endsWith(".mjs")) res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      else if (url.endsWith(".css")) res.setHeader("Content-Type", "text/css; charset=utf-8");
      else if (url.endsWith(".json")) res.setHeader("Content-Type", "application/json; charset=utf-8");
      next();
    };
    app.use(mimeOverride);
    app.use(express.static(distPath, { index: false }));
    app.get("/", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
    app.get("/*splat", (req, res) => {
      if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API endpoint not found" });
      const filePath = path.join(distPath, req.path);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return res.sendFile(filePath);
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    serverLog("ERROR", `Unhandled Express error on ${req.method} ${req.originalUrl}: ${err.stack || err.message}`);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    serverLog("INFO", `Express listening on port ${PORT} — ready to accept requests`);
  });
}

main().catch(err => {
  serverLog("ERROR", `main() failed: ${err.stack || err.message}`);
  process.exit(1);
});
