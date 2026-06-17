import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
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
const DATA_DIR = path.join(process.cwd(), "data");

// ─── Server-side file logger ─────────────────────────────────────────────────
const LOG_DIR      = path.join(process.cwd(), "logs");
const SERVER_LOG   = path.join(LOG_DIR, "server.log");
const MAX_LOG_SIZE = 512 * 1024; // rotate at 512 KB

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
  } catch { /* best-effort — never crash the server because of logging */ }
}

serverLog("INFO", `server.ts loaded — PORT=${PORT}  NODE_ENV=${process.env.NODE_ENV}  BASE_PATH=${process.env.BASE_PATH}`);

// ─── Persistent session store ────────────────────────────────────────────────
// Sessions are written to data/sessions.json so they survive Passenger restarts.
// Each entry maps token → expiry timestamp (48h TTL).
const SESSION_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function loadSessions(): Map<string, number> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
      const now = Date.now();
      // Hydrate and drop expired entries
      return new Map(Object.entries(raw as Record<string, number>).filter(([, exp]) => exp > now));
    }
  } catch { /* fall through */ }
  return new Map();
}

function saveSessions(sessions: Map<string, number>) {
  try {
    const obj: Record<string, number> = {};
    sessions.forEach((exp, tok) => { obj[tok] = exp; });
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj), "utf-8");
  } catch { /* best-effort */ }
}

const activeSessions = loadSessions();

function addSession(token: string) {
  const now = Date.now();
  // Purge expired sessions while we're at it
  activeSessions.forEach((exp, tok) => { if (exp <= now) activeSessions.delete(tok); });
  activeSessions.set(token, now + SESSION_TTL_MS);
  saveSessions(activeSessions);
}

function hasSession(token: string): boolean {
  const exp = activeSessions.get(token);
  if (!exp) return false;
  if (Date.now() > exp) { activeSessions.delete(token); saveSessions(activeSessions); return false; }
  return true;
}

function removeSession(token: string) {
  activeSessions.delete(token);
  saveSessions(activeSessions);
}

// Login rate limiter: max 5 attempts per IP, then 60s lockout
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();
function checkRateLimit(ip: string): { allowed: boolean; secondsLeft?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  if (now < entry.lockUntil) {
    return { allowed: false, secondsLeft: Math.ceil((entry.lockUntil - now) / 1000) };
  }
  return { allowed: true };
}
function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) {
    entry.lockUntil = now + 60_000;
    entry.count = 0;
  }
  loginAttempts.set(ip, entry);
}
function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

// Auth middleware — protects all write endpoints
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token || !hasSession(token)) {
    return res.status(401).json({ error: "Tidak diotorisasi. Silakan login kembali." });
  }
  next();
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const filePaths = {
  competencies: path.join(DATA_DIR, "competencies.json"),
  milestones: path.join(DATA_DIR, "milestones.json"),
  gallery: path.join(DATA_DIR, "gallery.json"),
  alumni: path.join(DATA_DIR, "alumni.json"),
  news: path.join(DATA_DIR, "news.json"),
  partners: path.join(DATA_DIR, "partners.json"),
  branding: path.join(DATA_DIR, "branding.json"),
  kepalaSekolah: path.join(DATA_DIR, "kepala-sekolah.json"),
  manajemenSekolah: path.join(DATA_DIR, "manajemen-sekolah.json"),
  visiMisi: path.join(DATA_DIR, "visi-misi.json"),
  socialMedia: path.join(DATA_DIR, "social-media.json"),
  adminCredentials: path.join(DATA_DIR, "admin-credentials.json")
};

// Helper to initialize files with initial data if they don't exist
function initJsonFile(filePath: string, initialData: any) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), "utf-8");
  } else {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      JSON.parse(content);
    } catch (e) {
      console.error(`Invalid JSON in ${filePath}, resetting to default.`);
      fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), "utf-8");
    }
  }
}

// Initialize dynamic datasets with full protection
initJsonFile(filePaths.competencies, COMPETENCY_DATA);
initJsonFile(filePaths.milestones, TIMELINE_ACHIEVEMENTS);
initJsonFile(filePaths.gallery, CAMPUS_LIFE_GALLERY);
initJsonFile(filePaths.alumni, ALUMNI_TESTIMONIALS);
initJsonFile(filePaths.news, NEWS_COMPILATION);
initJsonFile(filePaths.partners, INDUSTRI_PARTNERS);
initJsonFile(filePaths.branding, {
  schoolLogo: null,
  schoolLogoDark: null,
  schoolLogoLight: null,
  schoolFavicon: null,
  schoolAppIcon: null
});
initJsonFile(filePaths.kepalaSekolah, {
  nama: "Drs. Gunawan, M.Pd.",
  nip: "19680324 199403 1 008",
  foto: null,
  sambutan: "Atas nama segenap keluarga besar SMKN 1 Wonogiri, saya menyambut kehadiran Anda di gerbang digital institusi terakreditasi unggul kami. Kami percaya bahwa pendidikan kejuruan mandiri tidak hanya mengajarkan metode teknis semata, namun mencetak kesiapan karakter, kepemimpinan, dan etika moral kelas dunia.\n\nSebagai Center of Excellence Nasional, kami mendesain setiap detail proses belajar mengajar dengan standar internasional paling prima. Kami mendedikasikan seluruh daya upaya guna meluncurkan lulusan yang siap mengambil peranan krusial sebagai inovator bisnis, ahli kriya, serta motor penggerak ekonomi global."
});
initJsonFile(filePaths.manajemenSekolah, [
  { id: "waka-kesiswaan", jabatan: "Waka Kesiswaan", nama: "-", foto: null },
  { id: "waka-kurikulum", jabatan: "Waka Kurikulum", nama: "-", foto: null },
  { id: "waka-sarpras", jabatan: "Waka Sarpras & Ketenagakerjaan", nama: "-", foto: null },
  { id: "waka-humas", jabatan: "Waka Humas", nama: "-", foto: null },
  { id: "kepala-tu", jabatan: "Kepala Tata Usaha", nama: "-", foto: null }
]);
const aboutPath = path.join(DATA_DIR, "about.json");
initJsonFile(aboutPath, { foto: null, fotoX: 50, fotoY: 50, fotoScale: 100 });

initJsonFile(filePaths.socialMedia, {
  instagram: "https://instagram.com/smkn1wonogiri",
  youtube: "https://youtube.com/@smkn1wonogiri",
  website: "https://smkn1wonogiri.sch.id",
  facebook: "",
  tiktok: "",
  twitter: ""
});

initJsonFile(filePaths.visiMisi, {
  visi: "Terwujudnya SMKN 1 Wonogiri sebagai lembaga pendidikan kejuruan yang unggul, berkarakter, dan berdaya saing global dalam rangka mewujudkan masyarakat yang sejahtera.",
  misi: [
    "Menyelenggarakan pendidikan dan pelatihan kejuruan berkualitas tinggi berbasis kompetensi dan standar industri nasional maupun internasional.",
    "Mengembangkan karakter peserta didik yang beriman, bertaqwa kepada Tuhan Yang Maha Esa, berakhlak mulia, dan berwawasan kebangsaan.",
    "Membangun kemitraan strategis dengan dunia usaha dan dunia industri (DUDI) untuk penguatan kompetensi lulusan.",
    "Menciptakan lingkungan belajar yang inovatif, inspiratif, dan adaptif terhadap perkembangan ilmu pengetahuan dan teknologi.",
    "Menghasilkan lulusan yang kompeten, produktif, mandiri, dan siap memasuki dunia kerja serta berwirausaha di era global."
  ]
});

// Parsing Middlewares
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Security headers — applied to every response
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// Path normalisation — strip the BASE_PATH prefix (/id) when Passenger passes the
// full URI to Express (e.g. /id/api/auth/login → /api/auth/login).
// Harmless when the frontend calls /api/… directly (no /id prefix present).
app.use((req, _res, next) => {
  const BASE = (process.env.BASE_PATH || "").replace(/\/$/, ""); // e.g. "/id"
  if (BASE && req.url.startsWith(BASE + "/")) {
    req.url = req.url.slice(BASE.length); // strip prefix; req.path updates automatically
  }
  next();
});

// Global write-protection: every POST/DELETE/PUT except public ones requires a valid session token
app.use((req, res, next) => {
  const writeMethods = ["POST", "DELETE", "PUT", "PATCH"];
  if (!writeMethods.includes(req.method)) return next();
  const publicPosts = ["/api/auth/login", "/api/tracer"];
  if (publicPosts.includes(req.path)) return next();
  return requireAuth(req, res, next);
});

// --- Auth Endpoints ---

function getAdminCredentials(): { username: string; password: string } {
  try {
    if (fs.existsSync(filePaths.adminCredentials)) {
      const saved = JSON.parse(fs.readFileSync(filePaths.adminCredentials, "utf-8"));
      if (saved.username && saved.password) return saved;
    }
  } catch { /* fall through */ }
  return {
    username: process.env.ADMIN_USERNAME || "jobenenterprise",
    password: process.env.ADMIN_PASSWORD || "KuraKuraNinja!0!",
  };
}

app.post("/api/auth/login", (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const { allowed, secondsLeft } = checkRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({ error: `Terlalu banyak percobaan login. Coba lagi dalam ${secondsLeft} detik.` });
  }
  const { username, password } = req.body;
  const creds = getAdminCredentials();
  if (username === creds.username && password === creds.password) {
    clearAttempts(ip);
    const token = crypto.randomBytes(48).toString("hex");
    addSession(token);
    return res.json({ token });
  }
  recordFailedAttempt(ip);
  return res.status(401).json({ error: "Kombinasi User Name atau Sandi salah. Periksa kembali!" });
});

app.post("/api/auth/change-password", (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Password lama dan password baru wajib diisi." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password baru minimal 8 karakter." });
  }
  const creds = getAdminCredentials();
  if (currentPassword !== creds.password) {
    return res.status(401).json({ error: "Password saat ini salah." });
  }
  const updated = {
    username: (newUsername || "").trim() || creds.username,
    password: newPassword,
  };
  try {
    fs.writeFileSync(filePaths.adminCredentials, JSON.stringify(updated, null, 2), "utf-8");
    // Invalidate all active sessions so user must re-login with new credentials
    activeSessions.clear();
    saveSessions(activeSessions);
    return res.json({ success: true, username: updated.username });
  } catch (err: any) {
    return res.status(500).json({ error: "Gagal menyimpan perubahan: " + err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (token) removeSession(token);
  return res.json({ success: true });
});

app.get("/api/auth/verify", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (token && hasSession(token)) return res.json({ valid: true });
  return res.status(401).json({ valid: false });
});

// --- Health Check Endpoint ---

app.get("/api/health", (_req, res) => {
  const startedAt = new Date(Date.now() - process.uptime() * 1000).toISOString();
  const uptimeSeconds = Math.floor(process.uptime());

  // adminCredentials is intentionally optional — falls back to env vars when absent
  const optionalFiles = new Set(["adminCredentials"]);

  const dataFiles = Object.entries(filePaths) as [string, string][];
  const fileStatus = dataFiles.map(([name, filePath]) => {
    try {
      if (!fs.existsSync(filePath)) return { name, status: optionalFiles.has(name) ? "optional" : "missing" };
      const raw = fs.readFileSync(filePath, "utf-8");
      JSON.parse(raw);
      return { name, status: "ok" };
    } catch {
      return { name, status: "corrupt" };
    }
  });

  const allOk = fileStatus.every(f => f.status === "ok" || f.status === "optional");

  res.status(allOk ? 200 : 207).json({
    status: allOk ? "ok" : "degraded",
    server: "running",
    uptime_seconds: uptimeSeconds,
    started_at: startedAt,
    timestamp: new Date().toISOString(),
    node_version: process.version,
    env: process.env.NODE_ENV || "development",
    active_sessions: activeSessions.size,
    data_files: fileStatus,
  });
});

// --- Logs Endpoint (auth-protected) ---

app.get("/api/logs", requireAuth, (_req, res) => {
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
      const lines = raw.split("\n").filter(Boolean);
      result[f.name] = lines.slice(-TAIL_LINES);
    } catch (e: any) {
      result[f.name] = [`(read error: ${e.message})`];
    }
  }
  res.json({ generated_at: new Date().toISOString(), files: result });
});

// --- Express REST API Routes for High Integrity CRUD ---

// 1. Competencies API
app.get("/api/competencies", (req, res) => {
  try {
    const data = fs.readFileSync(filePaths.competencies, "utf-8");
    res.json(JSON.parse(data));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read competencies: " + error.message });
  }
});

app.post("/api/competencies", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of competencies" });
    }
    fs.writeFileSync(filePaths.competencies, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save competencies: " + error.message });
  }
});

// 2. Milestones API
app.get("/api/milestones", (req, res) => {
  try {
    const data = fs.readFileSync(filePaths.milestones, "utf-8");
    res.json(JSON.parse(data));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read milestones: " + error.message });
  }
});

app.post("/api/milestones", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of milestones" });
    }
    fs.writeFileSync(filePaths.milestones, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save milestones: " + error.message });
  }
});

// 3. Gallery API
app.get("/api/gallery", (req, res) => {
  try {
    const data = fs.readFileSync(filePaths.gallery, "utf-8");
    res.json(JSON.parse(data));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read gallery: " + error.message });
  }
});

app.post("/api/gallery", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of gallery items" });
    }
    fs.writeFileSync(filePaths.gallery, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save gallery: " + error.message });
  }
});

// 4. Alumni API
app.get("/api/alumni", (req, res) => {
  try {
    const data = fs.readFileSync(filePaths.alumni, "utf-8");
    res.json(JSON.parse(data));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read alumni: " + error.message });
  }
});

app.post("/api/alumni", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of alumni" });
    }
    fs.writeFileSync(filePaths.alumni, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save alumni: " + error.message });
  }
});

// 5. News API
app.get("/api/news", (req, res) => {
  try {
    const data = fs.readFileSync(filePaths.news, "utf-8");
    res.json(JSON.parse(data));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read news: " + error.message });
  }
});

app.post("/api/news", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of news items" });
    }
    fs.writeFileSync(filePaths.news, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save news: " + error.message });
  }
});

// 6. Partners API
app.get("/api/partners", (req, res) => {
  try {
    const data = fs.readFileSync(filePaths.partners, "utf-8");
    res.json(JSON.parse(data));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read partners: " + error.message });
  }
});

app.post("/api/partners", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of partners" });
    }
    fs.writeFileSync(filePaths.partners, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save partners: " + error.message });
  }
});

// 7. Kepala Sekolah API
app.get("/api/kepala-sekolah", (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(filePaths.kepalaSekolah, "utf-8")));
  } catch (e: any) {
    res.status(500).json({ error: "Failed to read kepala sekolah: " + e.message });
  }
});
app.post("/api/kepala-sekolah", (req, res) => {
  try {
    fs.writeFileSync(filePaths.kepalaSekolah, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to save kepala sekolah: " + e.message });
  }
});

// 8. Manajemen Sekolah API
app.get("/api/manajemen-sekolah", (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(filePaths.manajemenSekolah, "utf-8")));
  } catch (e: any) {
    res.status(500).json({ error: "Failed to read manajemen sekolah: " + e.message });
  }
});
app.post("/api/manajemen-sekolah", (req, res) => {
  try {
    fs.writeFileSync(filePaths.manajemenSekolah, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to save manajemen sekolah: " + e.message });
  }
});

// 9. Visi Misi API
app.get("/api/visi-misi", (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(filePaths.visiMisi, "utf-8")));
  } catch (e: any) {
    res.status(500).json({ error: "Failed to read visi misi: " + e.message });
  }
});
app.post("/api/visi-misi", (req, res) => {
  try {
    fs.writeFileSync(filePaths.visiMisi, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to save visi misi: " + e.message });
  }
});

// --- SOCIAL MEDIA API ---
app.get("/api/social-media", (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(filePaths.socialMedia, "utf-8")));
  } catch (e: any) {
    res.status(500).json({ error: "Failed to read social media: " + e.message });
  }
});
app.post("/api/social-media", (req, res) => {
  try {
    fs.writeFileSync(filePaths.socialMedia, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to save social media: " + e.message });
  }
});

// --- ABOUT SECTION API ---
app.get("/api/about", (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(aboutPath, "utf-8")));
  } catch (e: any) {
    res.status(500).json({ error: "Failed to read about: " + e.message });
  }
});
app.post("/api/about", (req, res) => {
  try {
    fs.writeFileSync(aboutPath, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to save about: " + e.message });
  }
});

// --- BRANDING LOGO MANAGEMENT API ---
app.get("/api/branding", (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(filePaths.branding, "utf-8")));
  } catch (e: any) {
    res.status(500).json({ error: "Failed to read branding: " + e.message });
  }
});

app.post("/api/branding", (req, res) => {
  try {
    const data = req.body;
    fs.writeFileSync(filePaths.branding, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to save branding: " + e.message });
  }
});

// 10. Tracer Study API
const tracerPath = path.join(DATA_DIR, "tracer.json");
initJsonFile(tracerPath, []);

app.get("/api/tracer", (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(tracerPath, "utf-8")));
  } catch (e: any) {
    res.status(500).json({ error: "Failed to read tracer data: " + e.message });
  }
});

app.post("/api/tracer", (req, res) => {
  try {
    const existing: any[] = JSON.parse(fs.readFileSync(tracerPath, "utf-8"));
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    existing.push(entry);
    fs.writeFileSync(tracerPath, JSON.stringify(existing, null, 2), "utf-8");
    res.json(entry);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to save tracer entry: " + e.message });
  }
});

app.delete("/api/tracer/:id", (req, res) => {
  try {
    const existing: any[] = JSON.parse(fs.readFileSync(tracerPath, "utf-8"));
    const updated = existing.filter((e: any) => e.id !== req.params.id);
    if (updated.length === existing.length) {
      return res.status(404).json({ error: "Entry not found" });
    }
    fs.writeFileSync(tracerPath, JSON.stringify(updated, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to delete tracer entry: " + e.message });
  }
});

app.post("/api/reset", (req, res) => {
  try {
    fs.writeFileSync(filePaths.competencies, JSON.stringify(COMPETENCY_DATA, null, 2), "utf-8");
    fs.writeFileSync(filePaths.milestones, JSON.stringify(TIMELINE_ACHIEVEMENTS, null, 2), "utf-8");
    fs.writeFileSync(filePaths.gallery, JSON.stringify(CAMPUS_LIFE_GALLERY, null, 2), "utf-8");
    fs.writeFileSync(filePaths.alumni, JSON.stringify(ALUMNI_TESTIMONIALS, null, 2), "utf-8");
    fs.writeFileSync(filePaths.news, JSON.stringify(NEWS_COMPILATION, null, 2), "utf-8");
    fs.writeFileSync(filePaths.partners, JSON.stringify(INDUSTRI_PARTNERS, null, 2), "utf-8");
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to reset data: " + error.message });
  }
});

// ── Contact Messages ─────────────────────────────────────────────────────────
const CONTACT_FILE = path.join(DATA_DIR, "contact-messages.json");

function readContactMessages(): any[] {
  try {
    if (!fs.existsSync(CONTACT_FILE)) return [];
    return JSON.parse(fs.readFileSync(CONTACT_FILE, "utf-8"));
  } catch {
    return [];
  }
}

app.post("/api/contact", (req, res) => {
  try {
    const { nama, email, noHp, keperluan, pesan, waktu } = req.body;
    if (!nama || !email || !keperluan || !pesan) {
      return res.status(400).json({ error: "Field wajib tidak lengkap." });
    }
    if (pesan.trim().length < 20) {
      return res.status(400).json({ error: "Pesan minimal 20 karakter." });
    }
    const messages = readContactMessages();
    const newMsg = {
      id: crypto.randomUUID(),
      nama: String(nama).trim(),
      email: String(email).trim().toLowerCase(),
      noHp: String(noHp || "").trim(),
      keperluan: String(keperluan).trim(),
      pesan: String(pesan).trim(),
      waktu: waktu || new Date().toISOString(),
      dibaca: false,
    };
    messages.unshift(newMsg);
    fs.writeFileSync(CONTACT_FILE, JSON.stringify(messages, null, 2), "utf-8");
    res.json({ success: true, id: newMsg.id });
  } catch (error: any) {
    res.status(500).json({ error: "Gagal menyimpan pesan." });
  }
});

app.get("/api/contact", requireAuth, (req, res) => {
  res.json(readContactMessages());
});

app.patch("/api/contact/:id/baca", requireAuth, (req, res) => {
  try {
    const messages = readContactMessages();
    const idx = messages.findIndex((m: any) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Pesan tidak ditemukan." });
    messages[idx].dibaca = true;
    fs.writeFileSync(CONTACT_FILE, JSON.stringify(messages, null, 2), "utf-8");
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Gagal memperbarui status pesan." });
  }
});

app.delete("/api/contact/:id", requireAuth, (req, res) => {
  try {
    const messages = readContactMessages();
    const filtered = messages.filter((m: any) => m.id !== req.params.id);
    fs.writeFileSync(CONTACT_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Gagal menghapus pesan." });
  }
});

// ── Suara Skansagiri ──────────────────────────────────────────────────────────
interface KaryaSiswa {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: "JURNAL_VOKASI" | "ESAI_INOVASI" | "SASTRA" | "OPINI";
  status: "REVIEW" | "PUBLISHED" | "REVISION" | "ARCHIVED";
  feedback: string | null;
  views: number;
  likes: number;
  authorName: string;
  authorClass: string;
  authorJurusan: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

const SUARA_FILE = path.join(DATA_DIR, "suara-skansagiri.json");
initJsonFile(SUARA_FILE, []);

function readSuara(): KaryaSiswa[] {
  try { return JSON.parse(fs.readFileSync(SUARA_FILE, "utf-8")); } catch { return []; }
}
function writeSuara(data: KaryaSiswa[]) {
  fs.writeFileSync(SUARA_FILE, JSON.stringify(data, null, 2), "utf-8");
}
function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 80);
}

interface KomentarSuara {
  id: string;
  artikelId: string;
  artikelTitle: string;
  authorName: string;
  authorClass: string;
  content: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

const KOMENTAR_FILE = path.join(DATA_DIR, "suara-komentar.json");
initJsonFile(KOMENTAR_FILE, []);

function readKomentar(): KomentarSuara[] {
  try { return JSON.parse(fs.readFileSync(KOMENTAR_FILE, "utf-8")); } catch { return []; }
}
function writeKomentar(data: KomentarSuara[]) {
  fs.writeFileSync(KOMENTAR_FILE, JSON.stringify(data, null, 2), "utf-8");
}

app.get("/api/suara", (req, res) => {
  try {
    const all = readSuara();
    const { category, search } = req.query as Record<string, string>;
    let result = all.filter(k => k.status === "PUBLISHED");
    if (category && category !== "ALL") result = result.filter(k => k.category === category);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(k =>
        k.title.toLowerCase().includes(q) ||
        k.excerpt.toLowerCase().includes(q) ||
        k.authorName.toLowerCase().includes(q) ||
        k.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/suara/admin", requireAuth, (req, res) => {
  try {
    const all = readSuara();
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(all);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/suara/leaderboard", (req, res) => {
  try {
    const all = readSuara();
    const published = all.filter(k => k.status === "PUBLISHED");
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
      e.points += 10;
      e.points += Math.floor(k.likes / 5);
      e.totalLikes += k.likes;
      e.totalViews += k.views;
      e.categories.add(k.category);
      if (!e.latestDate || k.publishedAt! > e.latestDate) {
        e.latestDate = k.publishedAt || k.createdAt;
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

app.get("/api/suara/komentar/admin", requireAuth, (req, res) => {
  try {
    const all = readKomentar();
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(all);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/suara/:id", (req, res) => {
  try {
    const all = readSuara();
    const karya = all.find(k => k.id === req.params.id || k.slug === req.params.id);
    if (!karya) return res.status(404).json({ error: "Karya tidak ditemukan" });
    if (karya.status !== "PUBLISHED") {
      const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
      if (!token || !hasSession(token)) return res.status(403).json({ error: "Karya belum dipublikasikan" });
    }
    res.json(karya);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/suara", (req, res) => {
  try {
    const { title, content, category, authorName, authorClass, authorJurusan, tags } = req.body;
    if (!title || !content || !category || !authorName || !authorClass)
      return res.status(400).json({ error: "Field wajib tidak lengkap." });
    if (content.trim().length < 200)
      return res.status(400).json({ error: "Konten minimal 200 karakter." });
    const validCats = ["JURNAL_VOKASI", "ESAI_INOVASI", "SASTRA", "OPINI"];
    if (!validCats.includes(category)) return res.status(400).json({ error: "Kategori tidak valid." });
    const all = readSuara();
    const baseSlug = slugify(title);
    let slug = baseSlug || `karya-${Date.now()}`;
    let counter = 1;
    while (all.some(k => k.slug === slug)) slug = `${baseSlug}-${counter++}`;
    const excerpt = content.trim().replace(/\n+/g, " ").substring(0, 220) + (content.length > 220 ? "..." : "");
    const now = new Date().toISOString();
    const newKarya: KaryaSiswa = {
      id: crypto.randomUUID(), title: title.trim(), slug, content: content.trim(), excerpt,
      category, status: "REVIEW", feedback: null, views: 0, likes: 0,
      authorName: authorName.trim(), authorClass: authorClass.trim(),
      authorJurusan: (authorJurusan || "").trim(),
      tags: Array.isArray(tags) ? tags.map((t: string) => t.trim()).filter(Boolean)
        : (tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
      createdAt: now, updatedAt: now, publishedAt: null,
    };
    all.push(newKarya);
    writeSuara(all);
    res.json({ success: true, id: newKarya.id, slug: newKarya.slug });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/suara/:id/like", (req, res) => {
  try {
    const all = readSuara();
    const idx = all.findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Karya tidak ditemukan" });
    all[idx].likes = (all[idx].likes || 0) + 1;
    all[idx].updatedAt = new Date().toISOString();
    writeSuara(all);
    res.json({ likes: all[idx].likes });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/suara/:id/view", (req, res) => {
  try {
    const all = readSuara();
    const idx = all.findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Karya tidak ditemukan" });
    all[idx].views = (all[idx].views || 0) + 1;
    writeSuara(all);
    res.json({ views: all[idx].views });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/suara/:id/approve", requireAuth, (req, res) => {
  try {
    const all = readSuara();
    const idx = all.findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Karya tidak ditemukan" });
    const now = new Date().toISOString();
    all[idx].status = "PUBLISHED"; all[idx].feedback = null;
    all[idx].publishedAt = all[idx].publishedAt || now; all[idx].updatedAt = now;
    writeSuara(all);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/suara/:id/reject", requireAuth, (req, res) => {
  try {
    const all = readSuara();
    const idx = all.findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Karya tidak ditemukan" });
    const { feedback, action } = req.body;
    all[idx].status = action === "archive" ? "ARCHIVED" : "REVISION";
    all[idx].feedback = feedback || null;
    all[idx].updatedAt = new Date().toISOString();
    writeSuara(all);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/suara/:id", requireAuth, (req, res) => {
  try {
    const all = readSuara();
    const filtered = all.filter(k => k.id !== req.params.id);
    if (filtered.length === all.length) return res.status(404).json({ error: "Karya tidak ditemukan" });
    writeSuara(filtered);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/suara/:id/komentar", (req, res) => {
  try {
    const all = readKomentar();
    const approved = all
      .filter(k => k.artikelId === req.params.id && k.status === "APPROVED")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(approved);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/suara/:id/komentar", (req, res) => {
  try {
    const all = readSuara();
    const karya = all.find(k => k.id === req.params.id);
    if (!karya || karya.status !== "PUBLISHED")
      return res.status(404).json({ error: "Artikel tidak ditemukan" });
    const { authorName, authorClass, content } = req.body;
    if (!authorName?.trim() || !content?.trim())
      return res.status(400).json({ error: "Nama dan isi komentar wajib diisi." });
    if (content.trim().length < 10)
      return res.status(400).json({ error: "Komentar minimal 10 karakter." });
    if (content.trim().length > 500)
      return res.status(400).json({ error: "Komentar maksimal 500 karakter." });
    const newKomentar: KomentarSuara = {
      id: crypto.randomUUID(),
      artikelId: karya.id,
      artikelTitle: karya.title,
      authorName: authorName.trim(),
      authorClass: (authorClass || "").trim(),
      content: content.trim(),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    const existing = readKomentar();
    existing.push(newKomentar);
    writeKomentar(existing);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/suara/komentar/:commentId/approve", requireAuth, (req, res) => {
  try {
    const all = readKomentar();
    const idx = all.findIndex(k => k.id === req.params.commentId);
    if (idx === -1) return res.status(404).json({ error: "Komentar tidak ditemukan" });
    all[idx].status = "APPROVED";
    writeKomentar(all);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/suara/komentar/:commentId", requireAuth, (req, res) => {
  try {
    const all = readKomentar();
    const filtered = all.filter(k => k.id !== req.params.commentId);
    if (filtered.length === all.length) return res.status(404).json({ error: "Komentar tidak ditemukan" });
    writeKomentar(filtered);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Sitemap generator
app.get("/sitemap.xml", (req, res) => {
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
    const newsData: any[] = JSON.parse(fs.readFileSync(filePaths.news, "utf-8"));
    newsData.forEach((item: any) => {
      if (item.id) {
        newsUrls += `
  <url>
    <loc>${BASE_URL}/berita#${item.id}</loc>
    <priority>0.6</priority>
    <changefreq>never</changefreq>
  </url>`;
      }
    });
  } catch (_) {}

  const today = new Date().toISOString().split("T")[0];
  const staticXml = staticRoutes.map(r => `
  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticXml}${newsUrls}
</urlset>`;

  res.set("Content-Type", "application/xml");
  res.send(xml);
});

// Initialize Vite and setup listening
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // IMPORTANT: The BASE_PATH middleware above (line ~203) already strips the /id
    // prefix from req.url for ALL incoming requests.  After stripping, every URL
    // arrives here as /api/…, /assets/…, /adm-panel, etc. — WITHOUT the /id prefix.
    // Therefore ALL static / SPA routes must be mounted at root ("/"), not at BASE.
    // This is identical whether BASE_PATH="/id" (cPanel) or BASE_PATH="" (Replit).

    // Explicit MIME types — prevents Passenger / Apache returning wrong content-type
    const mimeOverride: express.RequestHandler = (_req, res, next) => {
      const url = _req.url;
      if (url.endsWith(".js") || url.endsWith(".mjs")) {
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      } else if (url.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css; charset=utf-8");
      } else if (url.endsWith(".json")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      next();
    };

    app.use(mimeOverride);
    app.use(express.static(distPath, { index: false }));
    app.get("/", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
    // SPA catch-all — serve index.html for any non-API, non-file path
    app.get("/*splat", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      const filePath = path.join(distPath, req.path);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Express error handler — logs every unhandled error to file
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
