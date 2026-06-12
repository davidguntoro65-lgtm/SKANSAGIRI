import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  COMPETENCY_DATA, 
  TIMELINE_ACHIEVEMENTS, 
  CAMPUS_LIFE_GALLERY, 
  ALUMNI_TESTIMONIALS, 
  NEWS_COMPILATION,
  INDUSTRI_PARTNERS
} from "./src/data";

const app = express();
const PORT = 5000;
const DATA_DIR = path.join(process.cwd(), "data");

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
  socialMedia: path.join(DATA_DIR, "social-media.json")
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

// Initialize Vite and setup listening
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch(err => {
  console.error("Failed to start server:", err);
});
