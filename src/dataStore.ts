import { 
  COMPETENCY_DATA, Competency,
  TIMELINE_ACHIEVEMENTS, Milestone,
  CAMPUS_LIFE_GALLERY, GalleryItem,
  ALUMNI_TESTIMONIALS, Alumnus,
  NEWS_COMPILATION, NewsArticle
} from "./data";

// Type definitions with strict parity to schema
export interface AppData {
  competencies: Competency[];
  milestones: Milestone[];
  gallery: GalleryItem[];
  alumni: Alumnus[];
  news: NewsArticle[];
}

const STORAGE_KEYS = {
  COMPETENCES: "smkn1_competencies",
  MILESTONES: "smkn1_milestones",
  GALLERY: "smkn1_gallery",
  ALUMNI: "smkn1_alumni",
  NEWS: "smkn1_news"
};

export function getStoredData<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Error parsing stored data for storage key: " + key, e);
    return defaultValue;
  }
}

export function saveStoredData<T>(key: string, data: T, apiEndpoint?: string): void {
  localStorage.setItem(key, JSON.stringify(data));
  // Broadcast event across components for real-time reactivity
  window.dispatchEvent(new Event("data-store-updated"));

  // Sincronisasi asinkron ke server backend
  if (apiEndpoint && typeof window !== "undefined") {
    fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    })
    .then(async (res) => {
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Sincronisasi database backend untuk ${key} gagal:`, errText);
      } else {
        console.log(`Database backend ${key} berhasil disingkronisasikan: OK`);
      }
    })
    .catch((err) => {
      console.error(`Koneksi atau kesalahan saat sinkronisasi ${key}:`, err);
    });
  }
}

export const DataStore = {
  // Fungsi pencetus untuk mengunduh versi database backend terbaru pada saat pemuatan awal
  initializeFromServer: async () => {
    if (typeof window === "undefined") return;
    try {
      console.log("Memulai sinkronisasi seluruh database dari server...");
      const endpoints = [
        { key: STORAGE_KEYS.COMPETENCES, url: "/api/competencies" },
        { key: STORAGE_KEYS.MILESTONES, url: "/api/milestones" },
        { key: STORAGE_KEYS.GALLERY, url: "/api/gallery" },
        { key: STORAGE_KEYS.ALUMNI, url: "/api/alumni" },
        { key: STORAGE_KEYS.NEWS, url: "/api/news" }
      ];

      await Promise.all(
        endpoints.map(async ({ key, url }) => {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const items = await res.json();
              localStorage.setItem(key, JSON.stringify(items));
            }
          } catch (err) {
            console.warn(`Gagal mengambil data dari ${url}:`, err);
          }
        })
      );

      // Pancarkan sinyal perombakan tampilan antarmuka
      window.dispatchEvent(new Event("data-store-updated"));
      console.log("Sinkronisasi data backend selesai.");
    } catch (e) {
      console.error("Gagal melakukan penyesuaian berkas database server.", e);
    }
  },

  getCompetencies: (): Competency[] => getStoredData(STORAGE_KEYS.COMPETENCES, COMPETENCY_DATA),
  saveCompetencies: (data: Competency[]) => saveStoredData(STORAGE_KEYS.COMPETENCES, data, "/api/competencies"),

  getMilestones: (): Milestone[] => getStoredData(STORAGE_KEYS.MILESTONES, TIMELINE_ACHIEVEMENTS),
  saveMilestones: (data: Milestone[]) => saveStoredData(STORAGE_KEYS.MILESTONES, data, "/api/milestones"),

  getGallery: (): GalleryItem[] => getStoredData(STORAGE_KEYS.GALLERY, CAMPUS_LIFE_GALLERY),
  saveGallery: (data: GalleryItem[]) => saveStoredData(STORAGE_KEYS.GALLERY, data, "/api/gallery"),

  getAlumni: (): Alumnus[] => getStoredData(STORAGE_KEYS.ALUMNI, ALUMNI_TESTIMONIALS),
  saveAlumni: (data: Alumnus[]) => saveStoredData(STORAGE_KEYS.ALUMNI, data, "/api/alumni"),

  getNews: (): NewsArticle[] => getStoredData(STORAGE_KEYS.NEWS, NEWS_COMPILATION),
  saveNews: (data: NewsArticle[]) => saveStoredData(STORAGE_KEYS.NEWS, data, "/api/news"),

  resetAll: async () => {
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) {
        localStorage.removeItem(STORAGE_KEYS.COMPETENCES);
        localStorage.removeItem(STORAGE_KEYS.MILESTONES);
        localStorage.removeItem(STORAGE_KEYS.GALLERY);
        localStorage.removeItem(STORAGE_KEYS.ALUMNI);
        localStorage.removeItem(STORAGE_KEYS.NEWS);
        window.dispatchEvent(new Event("data-store-updated"));
      } else {
        console.error("Pengaturan ulang backend gagal.");
      }
    } catch (e) {
      console.error("Kesalahan koneksi saat perombakan database utama:", e);
    }
  }
};

