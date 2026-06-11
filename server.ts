import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  COMPETENCY_DATA, 
  TIMELINE_ACHIEVEMENTS, 
  CAMPUS_LIFE_GALLERY, 
  ALUMNI_TESTIMONIALS, 
  NEWS_COMPILATION 
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
  news: path.join(DATA_DIR, "news.json")
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

// 6. Reset API
app.post("/api/reset", (req, res) => {
  try {
    fs.writeFileSync(filePaths.competencies, JSON.stringify(COMPETENCY_DATA, null, 2), "utf-8");
    fs.writeFileSync(filePaths.milestones, JSON.stringify(TIMELINE_ACHIEVEMENTS, null, 2), "utf-8");
    fs.writeFileSync(filePaths.gallery, JSON.stringify(CAMPUS_LIFE_GALLERY, null, 2), "utf-8");
    fs.writeFileSync(filePaths.alumni, JSON.stringify(ALUMNI_TESTIMONIALS, null, 2), "utf-8");
    fs.writeFileSync(filePaths.news, JSON.stringify(NEWS_COMPILATION, null, 2), "utf-8");
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
