import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, LogOut, KeyRound, User, Lock, Save, Trash2, Edit2, Plus, X, Globe, 
  Trophy, Camera, Users, Newspaper, CheckCircle2, RefreshCw, ArrowLeft, Image, Link, 
  Compass, ChevronRight, AlertCircle, BookOpen, GraduationCap, HardDrive,
  Upload, SlidersHorizontal, Sparkles, Crop, Check, Eye, EyeOff, Handshake, Target, Telescope,
  Inbox, Mail, MailOpen, Search, Phone, MessageSquare, MailCheck, Filter, ChevronDown,
  ShieldCheck, Settings, Activity, Server, Clock, Cpu, Database, Wifi, WifiOff,
  FileSpreadsheet, BarChart3, Briefcase, Store, Download, TrendingUp, Banknote
} from "lucide-react";
import { Competency, Milestone, GalleryItem, Alumnus, NewsArticle, IndustriPartner } from "../data";
import { DataStore } from "../dataStore";
import { useBranding, Branding } from "../hooks/useBranding";

export default function AdminPanel({ 
  theme = "dark", 
  onBackToFrontpage 
}: { 
  theme?: "light" | "dark";
  onBackToFrontpage: () => void;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("smkn1_adm_token");
    }
    return false;
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Admin Sidebar Tab
  const [activeTab, setActiveTab] = useState<"competencies" | "milestones" | "gallery" | "alumni" | "news" | "partners" | "branding" | "about" | "kepala-sekolah" | "manajemen-sekolah" | "visi-misi" | "social-media" | "inbox-pesan" | "server-monitor" | "tracer-studi">("competencies");
  const { branding, saveBranding, getLogo } = useBranding();
  const [brandingDraft, setBrandingDraft] = useState<Branding | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(false);

  // Loaded Datasets
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [alumni, setAlumni] = useState<Alumnus[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [partners, setPartners] = useState<IndustriPartner[]>([]);

  // Tentang section datasets
  interface AboutData { foto: string | null; fotoX: number; fotoY: number; fotoScale: number; }
  interface KepalaSekolahData { nama: string; nip: string; foto: string | null; sambutan: string; }
  interface ManajemenItem { id: string; jabatan: string; nama: string; foto: string | null; }
  interface VisiMisiData { visi: string; misi: string[]; }

  const [aboutData, setAboutData] = useState<AboutData>({ foto: null, fotoX: 50, fotoY: 50, fotoScale: 100 });
  const [aboutLoading, setAboutLoading] = useState(false);

  const [kepalaSekolah, setKepalaSekolah] = useState<KepalaSekolahData>({ nama: "", nip: "", foto: null, sambutan: "" });
  const [kepalaLoading, setKepalaLoading] = useState(false);
  const [manajemenSekolah, setManajemenSekolah] = useState<ManajemenItem[]>([]);
  const [manajemenLoading, setManajemenLoading] = useState(false);
  const [visiMisi, setVisiMisi] = useState<VisiMisiData>({ visi: "", misi: [] });
  const [visiMisiLoading, setVisiMisiLoading] = useState(false);

  interface SocialMediaData { instagram: string; youtube: string; website: string; facebook: string; tiktok: string; twitter: string; }
  const [socialMedia, setSocialMedia] = useState<SocialMediaData>({ instagram: "", youtube: "", website: "", facebook: "", tiktok: "", twitter: "" });
  const [socialMediaLoading, setSocialMediaLoading] = useState(false);

  // Change Password Modal state
  const [showChangePass, setShowChangePass] = useState(false);
  const [cpCurrentPass, setCpCurrentPass] = useState("");
  const [cpNewUser, setCpNewUser] = useState("");
  const [cpNewPass, setCpNewPass] = useState("");
  const [cpConfirmPass, setCpConfirmPass] = useState("");
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");

  // Contact Messages (Inbox)
  interface ContactMessage { id: string; nama: string; email: string; noHp: string; keperluan: string; pesan: string; waktu: string; dibaca: boolean; }
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactFilterStatus, setContactFilterStatus] = useState<"semua" | "belum-dibaca" | "sudah-dibaca">("semua");
  const [contactFilterKeperluan, setContactFilterKeperluan] = useState("semua");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [contactDeleting, setContactDeleting] = useState<Set<string>>(new Set());
  const [contactKeperluanDropOpen, setContactKeperluanDropOpen] = useState(false);

  // Editing state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // States for high-precision image enhancer & cropper (Alumni Avatar)
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [processedImageSrc, setProcessedImageSrc] = useState<string | null>(null);
  const [imageEnhanceOpen, setImageEnhanceOpen] = useState(false);
  const [enhanceSettings, setEnhanceSettings] = useState({
    sharpen: 1.2,      // default pre-adjusted high quality sharp
    brightness: 1.05,  // slightly brightened
    contrast: 1.1,     // slightly contrast enhanced
    cropMode: "circle" as "circle" | "square"
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [compareSplit, setCompareSplit] = useState(false); // comparison slider toggle
  const [dragActive, setDragActive] = useState(false);

  const processImage = (src: string, settings: typeof enhanceSettings) => {
    setIsProcessing(true);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }
      
      // We want to auto-crop to a high-quality 400x400 square (or circular-ready square)
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      
      // Calculate crop coordinates (centered square)
      const imgWidth = img.width;
      const imgHeight = img.height;
      let sx = 0, sy = 0, sWidth = imgWidth, sHeight = imgHeight;
      
      if (imgWidth > imgHeight) {
        sWidth = imgHeight;
        sx = (imgWidth - imgHeight) / 2;
      } else {
        sHeight = imgWidth;
        sy = (imgHeight - imgWidth) / 2;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, size, size);
      
      // Enable high quality scaling in canvas
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      
      // Draw the cropped square onto the 400x400 canvas
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);
      
      // Now get image data to apply filters
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      
      // Adjust brightness & contrast
      const bFactor = settings.brightness;
      const cFactor = settings.contrast;
      
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          let val = data[i + c];
          
          // Apply brightness
          val = val * bFactor;
          
          // Apply contrast
          val = (val - 128) * cFactor + 128;
          
          // Clamp value
          data[i + c] = Math.min(255, Math.max(0, val));
        }
      }
      
      ctx.putImageData(imgData, 0, 0);
      
      // Apply 3x3 Sharpen matrix convolution
      const rawDataCopy = new Uint8ClampedArray(data);
      const a = settings.sharpen;
      const b = 1 + 4 * a;
      const weights = [
         0, -a,  0,
        -a,  b, -a,
         0, -a,  0
      ];
      const side = 3;
      const halfSide = 1;
      
      // Convolute!
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dstOff = (y * size + x) * 4;
          let r = 0, g = 0, bVal = 0;
          
          for (let cy = 0; cy < side; cy++) {
            for (let cx = 0; cx < side; cx++) {
              const scy = Math.min(size - 1, Math.max(0, y + cy - halfSide));
              const scx = Math.min(size - 1, Math.max(0, x + cx - halfSide));
              const srcOff = (scy * size + scx) * 4;
              const wt = weights[cy * side + cx];
              
              r += rawDataCopy[srcOff] * wt;
              g += rawDataCopy[srcOff + 1] * wt;
              bVal += rawDataCopy[srcOff + 2] * wt;
            }
          }
          
          data[dstOff] = Math.min(255, Math.max(0, r));
          data[dstOff + 1] = Math.min(255, Math.max(0, g));
          data[dstOff + 2] = Math.min(255, Math.max(0, bVal));
        }
      }
      
      ctx.putImageData(imgData, 0, 0);
      
      // Export as optimized high quality JPEG to save local storage space
      const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
      setProcessedImageSrc(optimizedDataUrl);
      setIsProcessing(false);
    };
    img.onerror = () => {
      setIsProcessing(false);
      showFeedback("Gagal memuat atau memproses gambar.", "error");
    };
  };

  useEffect(() => {
    if (originalImageSrc && imageEnhanceOpen) {
      const delay = setTimeout(() => {
        processImage(originalImageSrc, enhanceSettings);
      }, 150);
      return () => clearTimeout(delay);
    }
  }, [originalImageSrc, enhanceSettings, imageEnhanceOpen]);

  // ── Image compression utility ─────────────────────────────────────────────
  // Resizes + recompresses images client-side before upload so JSON files
  // stay small enough for cPanel/Apache LimitRequestBody limits (~2-8 MB).
  // SVG files are passed through as-is (already vector / tiny).
  const compressImage = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number,
    maxKB: number
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      // Safety timeout: if the Promise hangs for any reason, reject after 30s
      const timer = setTimeout(() => reject(new Error("Timeout: pemrosesan gambar terlalu lama")), 30_000);
      const done = (result: string) => { clearTimeout(timer); resolve(result); };
      const fail = (err: unknown) => { clearTimeout(timer); reject(err); };

      if (file.type === "image/svg+xml") {
        const r = new FileReader();
        r.onload = (e) => {
          try { done(e.target!.result as string); } catch (err) { fail(err); }
        };
        r.onerror = () => fail(new Error("Gagal membaca file SVG"));
        r.readAsDataURL(file);
        return;
      }

      const r = new FileReader();
      r.onload = (e) => {
        // ── CRITICAL: wrap in try/catch so any throw here calls fail() ──
        try {
          const src = e.target?.result as string;
          if (!src) { fail(new Error("FileReader tidak mengembalikan data")); return; }

          const img = new Image();
          img.onload = () => {
            // ── CRITICAL: wrap in try/catch so canvas errors call fail() ──
            try {
              let { width, height } = img;
              if (!width || !height) { fail(new Error("Dimensi gambar nol")); return; }
              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.max(1, Math.round(width * ratio));
                height = Math.max(1, Math.round(height * ratio));
              }
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                // Canvas 2d unavailable in this environment — fall back to raw data URL
                done(src);
                return;
              }
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
              ctx.drawImage(img, 0, 0, width, height);
              let q = quality;
              // maxKB here matches the server's validateImageFields which uses val.length/1024
              // (base64 string length in KB), so the comparison is chars vs chars, not bytes.
              const targetLen = maxKB * 1024;
              let dataUrl = canvas.toDataURL("image/jpeg", q);
              while (dataUrl.length > targetLen && q > 0.35) {
                q = Math.max(0.35, q - 0.07);
                dataUrl = canvas.toDataURL("image/jpeg", q);
              }
              // Guard: empty canvas result → fall back to raw data URL
              if (!dataUrl || dataUrl === "data:," || dataUrl.length < 100) {
                done(src);
                return;
              }
              done(dataUrl);
            } catch {
              // Canvas operations failed entirely → fall back to raw data URL so user sees the image
              try { done(src); } catch (err2) { fail(err2); }
            }
          };
          img.onerror = () => fail(new Error("Gambar gagal dimuat dari file"));
          img.src = src;
        } catch (err) {
          fail(err);
        }
      };
      r.onerror = () => fail(new Error("FileReader gagal membaca file"));
      r.readAsDataURL(file);
    });

  const handleAvatarFileSelection = (file: File) => {
    const MAX_SIZE = 8 * 1024 * 1024; // 8MB input limit
    if (file.size > MAX_SIZE) {
      showFeedback(`Ukuran file foto terlalu besar (${(file.size / 1024 / 1024).toFixed(2)}MB). Maksimal 8MB.`, "error");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === "string") {
        setOriginalImageSrc(event.target.result);
        setEnhanceSettings({
          sharpen: 1.2,
          brightness: 1.05,
          contrast: 1.1,
          cropMode: "circle"
        });
        setImageEnhanceOpen(true);
        showFeedback("Foto berhasil dimuat! Sesuaikan ketajaman & presisi untuk hasil optimal.", "success");
      }
    };
    reader.onerror = () => {
      showFeedback("Gagal membaca file foto alumni.", "error");
    };
    reader.readAsDataURL(file);
  };

  // Admin Actions Feedback Alerts
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Verify stored token is still valid on mount (handles server restarts)
  useEffect(() => {
    const token = localStorage.getItem("smkn1_adm_token");
    if (!token) return;
    fetch("/api/auth/verify", { headers: { "Authorization": `Bearer ${token}` } })
      .then(res => { if (!res.ok) { localStorage.removeItem("smkn1_adm_token"); setIsLoggedIn(false); } })
      .catch(() => {});
  }, []);

  // Load datasets when logged in
  useEffect(() => {
    if (isLoggedIn) {
      setCompetencies(DataStore.getCompetencies());
      setMilestones(DataStore.getMilestones());
      setGallery(DataStore.getGallery());
      setAlumni(DataStore.getAlumni());
      setNews(DataStore.getNews());
      setPartners(DataStore.getPartners());
      fetch("/api/about").then(r => r.json()).then(d => setAboutData(d)).catch(() => {});
      fetch("/api/kepala-sekolah").then(r => r.json()).then(d => setKepalaSekolah(d)).catch(() => {});
      fetch("/api/manajemen-sekolah").then(r => r.json()).then(d => setManajemenSekolah(Array.isArray(d) ? d : [])).catch(() => {});
      fetch("/api/visi-misi").then(r => r.json()).then(d => setVisiMisi(d)).catch(() => {});
      fetch("/api/social-media").then(r => r.json()).then(d => setSocialMedia(d)).catch(() => {});
    }
  }, [isLoggedIn]);

  const loadContactMessages = () => {
    setContactLoading(true);
    fetch("/api/contact", { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setContactMessages(Array.isArray(d) ? d : []); setContactLoading(false); })
      .catch(() => setContactLoading(false));
  };

  useEffect(() => {
    if (activeTab === "inbox-pesan" && isLoggedIn) loadContactMessages();
  }, [activeTab, isLoggedIn]);

  // --- Server Monitor State ---
  interface HealthFile { name: string; status: string; }
  interface HealthData {
    status: "ok" | "degraded";
    server: string;
    uptime_seconds: number;
    started_at: string;
    timestamp: string;
    node_version: string;
    env: string;
    active_sessions: number;
    data_files: HealthFile[];
  }
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState("");
  const [healthLastFetched, setHealthLastFetched] = useState<Date | null>(null);

  type ServerStatus = "checking" | "online" | "degraded" | "misconfigured" | "unreachable";
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const [serverDiagnosis, setServerDiagnosis] = useState("");

  const diagnoseServer = async (): Promise<{ status: ServerStatus; diagnosis: string; data?: HealthData }> => {
    try {
      const res = await fetch("/api/health");
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        return {
          status: "misconfigured",
          diagnosis: "Server mengembalikan konten bukan-JSON (kemungkinan .htaccess di cPanel belum diperbarui — request API diarahkan ke file app.js sebagai file statis, bukan ke proxy Node.js)."
        };
      }
      const data: HealthData = await res.json();
      return {
        status: data.status === "ok" ? "online" : "degraded",
        diagnosis: data.status === "degraded" ? "Server aktif namun beberapa file data perlu perhatian. Buka tab Monitor Server untuk detail." : "",
        data
      };
    } catch {
      return {
        status: "unreachable",
        diagnosis: "Server tidak dapat dijangkau. Pastikan aplikasi Node.js sudah dijalankan di cPanel Node.js Selector, atau periksa koneksi internet Anda."
      };
    }
  };

  const fetchHealthData = () => {
    setHealthLoading(true);
    setHealthError("");
    diagnoseServer().then(({ status, diagnosis, data }) => {
      setServerStatus(status);
      setServerDiagnosis(diagnosis);
      if (data) {
        setHealthData(data);
        setHealthLastFetched(new Date());
      } else {
        setHealthError(diagnosis);
      }
      setHealthLoading(false);
    });
  };

  useEffect(() => {
    if (activeTab === "server-monitor" && isLoggedIn) {
      fetchHealthData();
      const interval = setInterval(fetchHealthData, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, isLoggedIn]);

  useEffect(() => {
    diagnoseServer().then(({ status, diagnosis }) => {
      setServerStatus(status);
      setServerDiagnosis(diagnosis);
    });
  }, []);

  // --- Tracer Study State & Export ---
  interface TracerEntry {
    id: string; nama: string; jurusan: string; tahunLulus: string;
    status: "bekerja" | "kuliah" | "wirausaha" | "belum_bekerja";
    namaPerusahaan?: string; posisi?: string; kota?: string;
    relevansiJurusan?: string; rentangGaji?: string;
    universitas?: string; programStudi?: string; jalurMasuk?: string;
    namaUsaha?: string; bidangUsaha?: string; tahunBerdiri?: string;
    alasanBelumBekerja?: string; whatsapp?: string; email?: string;
    createdAt: string;
  }
  const STATUS_LABELS: Record<string, string> = { bekerja: "Bekerja", kuliah: "Kuliah", wirausaha: "Wirausaha", belum_bekerja: "Belum Bekerja" };
  const GAJI_LABELS: Record<string, string> = { lt2: "< Rp 2 Juta", "2-4": "Rp 2–4 Juta", "4-6": "Rp 4–6 Juta", gt6: "> Rp 6 Juta" };
  const GAJI_ORDER = ["lt2", "2-4", "4-6", "gt6"];
  const RELEVANCE_LABELS: Record<string, string> = { sangat_relevan: "Sangat Relevan", relevan: "Relevan", cukup_relevan: "Cukup Relevan", tidak_relevan: "Tidak Relevan" };
  const pct = (n: number, total: number) => total ? Math.round((n / total) * 100) : 0;
  const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); } catch { return iso; } };

  const [tracerEntries, setTracerEntries] = useState<TracerEntry[]>([]);
  const [tracerLoading, setTracerLoading] = useState(false);
  const [tracerError, setTracerError] = useState("");
  const [tracerExporting, setTracerExporting] = useState(false);
  const [tracerDeleteId, setTracerDeleteId] = useState<string | null>(null);
  const [tracerFeedback, setTracerFeedback] = useState("");

  const showTracerFeedback = (msg: string) => { setTracerFeedback(msg); setTimeout(() => setTracerFeedback(""), 3000); };

  const loadTracerEntries = () => {
    setTracerLoading(true); setTracerError("");
    fetch("/api/tracer")
      .then(r => r.json())
      .then((d: TracerEntry[]) => { setTracerEntries(Array.isArray(d) ? d : []); setTracerLoading(false); })
      .catch(() => { setTracerError("Gagal memuat data tracer."); setTracerLoading(false); });
  };

  useEffect(() => {
    if (activeTab === "tracer-studi" && isLoggedIn) loadTracerEntries();
  }, [activeTab, isLoggedIn]);

  const tracerStats = useMemo(() => {
    const t = tracerEntries;
    const total = t.length;
    const bekerja = t.filter(e => e.status === "bekerja").length;
    const kuliah = t.filter(e => e.status === "kuliah").length;
    const wirausaha = t.filter(e => e.status === "wirausaha").length;
    const belum = t.filter(e => e.status === "belum_bekerja").length;
    return { total, bekerja, kuliah, wirausaha, belum, productive: bekerja + kuliah + wirausaha };
  }, [tracerEntries]);

  const allTracerJurusan = useMemo(() => [...new Set(tracerEntries.map(e => e.jurusan))].sort(), [tracerEntries]);

  const handleTracerDelete = async (id: string, nama: string) => {
    if (!window.confirm(`Hapus data "${nama}"?`)) return;
    setTracerDeleteId(id);
    try {
      const res = await fetch(`/api/tracer/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) { setTracerEntries(prev => prev.filter(e => e.id !== id)); showTracerFeedback(`Data "${nama}" dihapus.`); }
      else showTracerFeedback("Gagal menghapus data.");
    } catch { showTracerFeedback("Gagal menghapus data."); }
    setTracerDeleteId(null);
  };

  const exportTracerExcel = () => {
    if (tracerEntries.length === 0) return;
    setTracerExporting(true);
    setTimeout(() => {
      try {
        const now = new Date();
        const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        const entries = tracerEntries;
        const stats = tracerStats;
        const wb = XLSX.utils.book_new();

        // Sheet 1 — Ringkasan
        const jurusanMap: Record<string, number> = {};
        entries.forEach(e => { jurusanMap[e.jurusan] = (jurusanMap[e.jurusan] ?? 0) + 1; });
        const jurusanRows = Object.entries(jurusanMap).map(([l, v]) => [l, v, pct(v, stats.total)]).sort((a, b) => (b[1] as number) - (a[1] as number));
        const tahunMap: Record<string, number> = {};
        entries.forEach(e => { tahunMap[e.tahunLulus] = (tahunMap[e.tahunLulus] ?? 0) + 1; });
        const tahunRows = Object.entries(tahunMap).map(([l, v]) => [l, v, pct(v, stats.total)]).sort((a, b) => Number(a[0]) - Number(b[0]));
        const gajiMap: Record<string, number> = {};
        entries.filter(e => e.status === "bekerja" && e.rentangGaji).forEach(e => { gajiMap[e.rentangGaji!] = (gajiMap[e.rentangGaji!] ?? 0) + 1; });
        const gajiRows = GAJI_ORDER.filter(k => gajiMap[k]).map(k => [GAJI_LABELS[k], gajiMap[k], pct(gajiMap[k], stats.bekerja)]);
        const relMap: Record<string, number> = {};
        entries.filter(e => e.status === "bekerja" && e.relevansiJurusan).forEach(e => { relMap[e.relevansiJurusan!] = (relMap[e.relevansiJurusan!] ?? 0) + 1; });
        const relRows = Object.entries(relMap).map(([k, v]) => [RELEVANCE_LABELS[k] ?? k, v, pct(v, stats.bekerja)]);

        const summaryData: (string | number)[][] = [
          ["LAPORAN TRACER STUDI", "", ""], ["SMKN 1 Wonogiri", "", ""], ["", "", ""],
          [`Tanggal Cetak: ${dateStr}`, "", ""], [`Jumlah Responden: ${stats.total}`, "", ""], ["", "", ""],
          ["RINGKASAN STATISTIK", "", ""], ["Kategori", "Jumlah", "Persentase (%)"],
          ["Total Responden", stats.total, 100], ["Bekerja", stats.bekerja, pct(stats.bekerja, stats.total)],
          ["Kuliah", stats.kuliah, pct(stats.kuliah, stats.total)], ["Wirausaha", stats.wirausaha, pct(stats.wirausaha, stats.total)],
          ["Belum Bekerja", stats.belum, pct(stats.belum, stats.total)],
          ["Produktif (Bekerja+Kuliah+Wirausaha)", stats.productive, pct(stats.productive, stats.total)],
          ["", "", ""], ["SEBARAN PER JURUSAN", "", ""], ["Jurusan", "Jumlah", "Persentase (%)"],
          ...jurusanRows,
          ["", "", ""], ["SEBARAN PER TAHUN LULUS", "", ""], ["Tahun Lulus", "Jumlah", "Persentase (%)"],
          ...tahunRows,
          ["", "", ""], ["RENTANG GAJI (Lulusan Bekerja)", "", ""], ["Rentang Gaji", "Jumlah", "% Pekerja"],
          ...gajiRows,
          ["", "", ""], ["RELEVANSI JURUSAN (Lulusan Bekerja)", "", ""], ["Relevansi", "Jumlah", "% Pekerja"],
          ...relRows,
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
        ws1["!cols"] = [{ wch: 45 }, { wch: 12 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan");

        // Sheet 2 — Data Lengkap
        const dataHeaders = ["No","Nama","Jurusan","Tahun Lulus","Status","Perusahaan/Univ/Usaha","Posisi/Prodi/Bidang Usaha","Kota","Relevansi Jurusan","Rentang Gaji","Universitas","Program Studi","Jalur Masuk","Nama Usaha","Bidang Usaha","Tahun Berdiri Usaha","Alasan Belum Bekerja","WhatsApp","Email","Tanggal Mengisi"];
        const dataRows = entries.map((e, i) => [
          i + 1, e.nama, e.jurusan, e.tahunLulus, STATUS_LABELS[e.status] ?? e.status,
          e.namaPerusahaan ?? e.universitas ?? e.namaUsaha ?? "",
          e.posisi ?? e.programStudi ?? e.bidangUsaha ?? "",
          e.kota ?? "", RELEVANCE_LABELS[e.relevansiJurusan ?? ""] ?? (e.relevansiJurusan ?? ""),
          GAJI_LABELS[e.rentangGaji ?? ""] ?? (e.rentangGaji ?? ""),
          e.universitas ?? "", e.programStudi ?? "", e.jalurMasuk ?? "",
          e.namaUsaha ?? "", e.bidangUsaha ?? "", e.tahunBerdiri ?? "",
          e.alasanBelumBekerja ?? "", e.whatsapp ?? "", e.email ?? "", fmtDate(e.createdAt),
        ]);
        const ws2 = XLSX.utils.aoa_to_sheet([dataHeaders, ...dataRows]);
        ws2["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 28 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 22 }, { wch: 18 }, { wch: 25 }, { wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 28 }, { wch: 18 }];
        ws2["!freeze"] = { xSplit: 0, ySplit: 1 };
        XLSX.utils.book_append_sheet(wb, ws2, "Data Responden");

        // Sheet 3 — Per Jurusan × Status
        const crossHeaders = ["Jurusan","Total","Bekerja","%Bekerja","Kuliah","%Kuliah","Wirausaha","%Wirausaha","Belum Bekerja","%Belum Bekerja"];
        const crossRows = allTracerJurusan.map(j => {
          const g = entries.filter(e => e.jurusan === j);
          const tot = g.length;
          const bk = g.filter(e => e.status === "bekerja").length;
          const ku = g.filter(e => e.status === "kuliah").length;
          const wi = g.filter(e => e.status === "wirausaha").length;
          const bb = g.filter(e => e.status === "belum_bekerja").length;
          return [j, tot, bk, `${pct(bk, tot)}%`, ku, `${pct(ku, tot)}%`, wi, `${pct(wi, tot)}%`, bb, `${pct(bb, tot)}%`];
        });
        const ws3 = XLSX.utils.aoa_to_sheet([crossHeaders, ...crossRows]);
        ws3["!cols"] = [{ wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(wb, ws3, "Per Jurusan");

        XLSX.writeFile(wb, `tracer-studi-smkn1wonogiri-${now.toISOString().slice(0, 10)}.xlsx`);
        showTracerFeedback(`Excel berhasil diekspor (${entries.length} data, 3 sheet).`);
      } catch (err) {
        showTracerFeedback("Gagal mengekspor Excel.");
      }
      setTracerExporting(false);
    }, 100);
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}h ${h}j ${m}m`;
    if (h > 0) return `${h}j ${m}m ${s}d`;
    return `${m}m ${s}d`;
  };

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("smkn1_adm_token") || "";
    return {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        setLoginError("Server belum siap atau sedang dalam pemeliharaan. Silakan coba beberapa saat lagi.");
        setLoginLoading(false);
        return;
      }
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("smkn1_adm_token", data.token);
        setIsLoggedIn(true);
        setFeedback({ message: "Berhasil masuk sebagai Superadmin!", type: "success" });
      } else {
        setLoginError(data.error || "Kombinasi User Name atau Sandi salah. Periksa kembali!");
      }
    } catch {
      setLoginError("Gagal menghubungi server. Periksa koneksi internet Anda.");
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: getAuthHeaders() });
    } catch { /* best-effort */ }
    localStorage.removeItem("smkn1_adm_token");
    setIsLoggedIn(false);
    setFeedback({ message: "Sesi admin telah diakhiri.", type: "success" });
  };

  const openChangePass = () => {
    setCpCurrentPass(""); setCpNewUser(""); setCpNewPass(""); setCpConfirmPass("");
    setCpShowCurrent(false); setCpShowNew(false); setCpError("");
    setShowChangePass(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpError("");
    if (cpNewPass !== cpConfirmPass) { setCpError("Konfirmasi password baru tidak cocok."); return; }
    if (cpNewPass.length < 8) { setCpError("Password baru minimal 8 karakter."); return; }
    setCpLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword: cpCurrentPass, newUsername: cpNewUser, newPassword: cpNewPass }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowChangePass(false);
        showFeedback("Password berhasil diubah! Silakan login kembali.", "success");
        setTimeout(() => { localStorage.removeItem("smkn1_adm_token"); setIsLoggedIn(false); }, 2200);
      } else {
        setCpError(data.error || "Gagal mengubah password.");
      }
    } catch { setCpError("Gagal menghubungi server. Periksa koneksi."); }
    setCpLoading(false);
  };

  const showFeedback = (message: string, type: "success" | "error" = "success") => {
    setFeedback({ message, type });
  };

  const resetToFactoryDefault = () => {
    if (window.confirm("Apakah Anda yakin ingin menyetel ulang semua modul ke data awal bawaan sekolah? Seluruh perubahan baru Anda akan dihapus.")) {
      DataStore.resetAll();
      setCompetencies(DataStore.getCompetencies());
      setMilestones(DataStore.getMilestones());
      setGallery(DataStore.getGallery());
      setAlumni(DataStore.getAlumni());
      setNews(DataStore.getNews());
      setPartners(DataStore.getPartners());
      showFeedback("Seluruh modul front-end berhasil diatur ulang ke bentuk bawaan pabrik!", "success");
      setEditingItem(null);
      setIsAddingNew(false);
    }
  };

  // --- CRUD HANDLERS FOR EACH MODULE ---

  // 1. Competencies CRUD
  const saveCompetencyItem = (item: Competency, isNew: boolean) => {
    if (!item.code || !item.name || !item.description) {
      showFeedback("Kode, Nama, dan Keterangan Keahlian wajib diisi!", "error");
      return;
    }
    let updated: Competency[];
    if (isNew) {
      if (competencies.some(c => c.code.toLowerCase() === item.code.toLowerCase())) {
        showFeedback("Kompetensi keahlian dengan Kode '" + item.code + "' sudah ada!", "error");
        return;
      }
      updated = [...competencies, item];
    } else {
      updated = competencies.map(c => c.code === item.code ? item : c);
    }
    DataStore.saveCompetencies(updated);
    setCompetencies(updated);
    setIsAddingNew(false);
    setEditingItem(null);
    showFeedback("Kompetensi keahlian '" + item.name + "' berhasil disimpan!", "success");
  };

  const deleteCompetencyItem = (code: string) => {
    if (window.confirm("Hapus Program Keahlian '" + code + "'?")) {
      const updated = competencies.filter(c => c.code !== code);
      DataStore.saveCompetencies(updated);
      setCompetencies(updated);
      showFeedback("Kompetensi '" + code + "' berhasil dihapus.", "success");
    }
  };


  // 2. Milestones (Achievements) CRUD
  const saveMilestoneItem = (item: Milestone, isNew: boolean, originalYear?: string) => {
    if (!item.year || !item.title || !item.description) {
      showFeedback("Tahun, Judul Prestasi, dan Keterangan wajib diisi!", "error");
      return;
    }
    let updated: Milestone[];
    if (isNew) {
      if (milestones.some(m => m.year === item.year)) {
        showFeedback("Milestone Tahun '" + item.year + "' sudah ada!", "error");
        return;
      }
      updated = [item, ...milestones]; // Newest first
    } else {
      updated = milestones.map(m => m.year === originalYear ? item : m);
    }
    
    // Sort milestones descending by year for elegant presentation
    updated.sort((a, b) => b.year.localeCompare(a.year));

    DataStore.saveMilestones(updated);
    setMilestones(updated);
    setIsAddingNew(false);
    setEditingItem(null);
    showFeedback("Catatan Sejarah tahun " + item.year + " berhasil disimpan!", "success");
  };

  const deleteMilestoneItem = (year: string) => {
    if (window.confirm("Hapus pencapaian sejarah tahun " + year + "?")) {
      const updated = milestones.filter(m => m.year !== year);
      DataStore.saveMilestones(updated);
      setMilestones(updated);
      showFeedback("Milestone tahun " + year + " berhasil dihapus.", "success");
    }
  };


  // 3. Campus Life Gallery CRUD
  const saveGalleryItem = (item: GalleryItem, isNew: boolean) => {
    if (!item.title || !item.image) {
      showFeedback("Judul Galeri dan URL Gambar wajib diisi!", "error");
      return;
    }
    let updated: GalleryItem[];
    if (isNew) {
      const id = "g-" + Date.now();
      const newItem = { ...item, id };
      updated = [newItem, ...gallery];
    } else {
      updated = gallery.map(g => g.id === item.id ? item : g);
    }
    DataStore.saveGallery(updated);
    setGallery(updated);
    setIsAddingNew(false);
    setEditingItem(null);
    showFeedback("Item galeri '" + item.title + "' berhasil disimpan!", "success");
  };

  const deleteGalleryItem = (id: string, name: string) => {
    if (window.confirm("Hapus item galeri '" + name + "'?")) {
      const updated = gallery.filter(g => g.id !== id);
      DataStore.saveGallery(updated);
      setGallery(updated);
      showFeedback("Item galeri berhasil dihapus.", "success");
    }
  };


  // 4. Alumni Testimonials CRUD
  const saveAlumnusItem = (item: Alumnus, isNew: boolean, originalName?: string) => {
    if (!item.name || !item.quote || !item.avatar) {
      showFeedback("Nama Alumni, Kutipan, dan URL Pasfoto wajib diisi!", "error");
      return;
    }
    let updated: Alumnus[];
    if (isNew) {
      updated = [...alumni, item];
    } else {
      updated = alumni.map(a => a.name === originalName ? item : a);
    }
    DataStore.saveAlumni(updated);
    setAlumni(updated);
    setIsAddingNew(false);
    setEditingItem(null);
    showFeedback("Testimoni alumni '" + item.name + "' berhasil disimpan!", "success");
  };

  const deleteAlumnusItem = (name: string) => {
    if (window.confirm("Hapus testimoni dari '" + name + "'?")) {
      const updated = alumni.filter(a => a.name !== name);
      DataStore.saveAlumni(updated);
      setAlumni(updated);
      showFeedback("Testimoni '" + name + "' telah dihapus.", "success");
    }
  };


  // 5. News Articles CRUD
  const saveNewsItem = (item: NewsArticle, isNew: boolean) => {
    if (!item.title || !item.excerpt || !item.image) {
      showFeedback("Judul Warta, Cuplikan Kutipan, dan Gambar Utama wajib diisi!", "error");
      return;
    }
    let updated: NewsArticle[];
    if (isNew) {
      const id = "news-" + Date.now();
      const newItem = { ...item, id };
      updated = [newItem, ...news];
    } else {
      updated = news.map(n => n.id === item.id ? item : n);
    }
    DataStore.saveNews(updated);
    setNews(updated);
    setIsAddingNew(false);
    setEditingItem(null);
    showFeedback("Artikel '" + item.title + "' berhasil disimpan!", "success");
  };

  const deleteNewsItem = (id: string, title: string) => {
    if (window.confirm("Hapus artikel '" + title + "'?")) {
      const updated = news.filter(n => n.id !== id);
      DataStore.saveNews(updated);
      setNews(updated);
      showFeedback("Artikel berhasil dihapus.", "success");
    }
  };

  // 6. Industri Partners CRUD
  const savePartnerItem = (item: IndustriPartner, isNew: boolean) => {
    if (!item.name || !item.type) {
      showFeedback("Nama Mitra dan Bidang Industri wajib diisi!", "error");
      return;
    }
    let updated: IndustriPartner[];
    if (isNew) {
      const newItem = { ...item, id: "p-" + Date.now() };
      updated = [...partners, newItem];
    } else {
      updated = partners.map(p => p.id === item.id ? item : p);
    }
    DataStore.savePartners(updated);
    setPartners(updated);
    setIsAddingNew(false);
    setEditingItem(null);
    showFeedback("Mitra industri '" + item.name + "' berhasil disimpan!", "success");
  };

  const deletePartnerItem = (id: string, name: string) => {
    if (window.confirm("Hapus mitra industri '" + name + "'?")) {
      const updated = partners.filter(p => p.id !== id);
      DataStore.savePartners(updated);
      setPartners(updated);
      showFeedback("Mitra '" + name + "' berhasil dihapus.", "success");
    }
  };

  // Render Login state vs Dashboard state
  const isDarkTheme = theme === "dark";

  return (
    <div className={`min-h-screen font-sans ${isDarkTheme ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} antialiased transition-colors duration-300 relative`}>
      
      {/* Change Password Modal */}
      <AnimatePresence>
        {showChangePass && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) setShowChangePass(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className={`w-full max-w-md rounded-3xl border shadow-2xl p-7 ${isDarkTheme ? "bg-slate-900 border-white/8" : "bg-white border-slate-200"}`}>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDarkTheme ? "bg-amber-500/15" : "bg-amber-50"}`}>
                    <ShieldCheck className="w-4.5 h-4.5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">Keamanan Akun</div>
                    <div className={`text-sm font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Ganti Username & Password</div>
                  </div>
                </div>
                <button onClick={() => setShowChangePass(false)}
                  className={`p-1.5 rounded-lg transition-colors ${isDarkTheme ? "hover:bg-white/8 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Password Saat Ini *</label>
                  <div className="relative">
                    <input type={cpShowCurrent ? "text" : "password"} value={cpCurrentPass}
                      onChange={e => setCpCurrentPass(e.target.value)} required
                      placeholder="Masukkan password saat ini"
                      autoComplete="current-password"
                      className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none transition-colors ${isDarkTheme ? "bg-slate-800 border-white/10 text-white placeholder-slate-500 focus:border-amber-500/40" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400"}`} />
                    <button type="button" onClick={() => setCpShowCurrent(!cpShowCurrent)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkTheme ? "text-slate-400 hover:text-amber-500" : "text-slate-400 hover:text-amber-600"}`}>
                      {cpShowCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className={`h-px ${isDarkTheme ? "bg-white/6" : "bg-slate-100"}`} />

                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                    Username Baru <span className="normal-case">(kosongkan = tidak berubah)</span>
                  </label>
                  <input type="text" value={cpNewUser} onChange={e => setCpNewUser(e.target.value)}
                    placeholder="Username baru (opsional)" autoComplete="username"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${isDarkTheme ? "bg-slate-800 border-white/10 text-white placeholder-slate-500 focus:border-amber-500/40" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400"}`} />
                </div>

                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                    Password Baru * <span className="normal-case">(min. 8 karakter)</span>
                  </label>
                  <div className="relative">
                    <input type={cpShowNew ? "text" : "password"} value={cpNewPass}
                      onChange={e => setCpNewPass(e.target.value)} required
                      placeholder="Buat password baru yang kuat" autoComplete="new-password"
                      className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none transition-colors ${isDarkTheme ? "bg-slate-800 border-white/10 text-white placeholder-slate-500 focus:border-amber-500/40" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400"}`} />
                    <button type="button" onClick={() => setCpShowNew(!cpShowNew)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkTheme ? "text-slate-400 hover:text-amber-500" : "text-slate-400 hover:text-amber-600"}`}>
                      {cpShowNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {cpNewPass.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          cpNewPass.length >= i * 3
                            ? cpNewPass.length >= 12 ? "bg-emerald-500" : cpNewPass.length >= 9 ? "bg-amber-500" : "bg-red-400"
                            : isDarkTheme ? "bg-slate-700" : "bg-slate-200"
                        }`} />
                      ))}
                      <span className={`text-[9px] font-mono ml-1 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                        {cpNewPass.length >= 12 ? "Kuat" : cpNewPass.length >= 8 ? "Cukup" : "Lemah"}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Konfirmasi Password Baru *</label>
                  <input type="password" value={cpConfirmPass}
                    onChange={e => setCpConfirmPass(e.target.value)} required
                    placeholder="Ulangi password baru" autoComplete="new-password"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                      isDarkTheme ? "bg-slate-800 border-white/10 text-white placeholder-slate-500 focus:border-amber-500/40" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400"
                    } ${cpConfirmPass && cpConfirmPass !== cpNewPass ? "!border-red-500/50" : cpConfirmPass && cpConfirmPass === cpNewPass ? "!border-emerald-500/50" : ""}`} />
                  {cpConfirmPass && cpConfirmPass === cpNewPass && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-mono">
                      <CheckCircle2 className="w-3 h-3" /> Password cocok
                    </div>
                  )}
                </div>

                {cpError && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {cpError}
                  </div>
                )}

                <div className={`flex items-start gap-2 text-[10px] font-mono rounded-xl px-3 py-2.5 ${isDarkTheme ? "bg-amber-500/8 text-amber-400/80 border border-amber-500/15" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  Setelah disimpan, semua sesi aktif akan diakhiri dan Anda perlu login ulang dengan kredensial baru.
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowChangePass(false)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-mono uppercase tracking-widest transition-colors cursor-pointer ${isDarkTheme ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                    Batal
                  </button>
                  <button type="submit" disabled={cpLoading || !cpCurrentPass || !cpNewPass || !cpConfirmPass}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold tracking-wider transition-colors cursor-pointer">
                    {cpLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {cpLoading ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Feedback Toast Alert */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl border shadow-xl flex items-center gap-3 backdrop-blur-md max-w-lg transition-all ${
              feedback.type === "success" 
                ? isDarkTheme ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                : isDarkTheme ? "bg-red-950/95 border-red-500/50 text-red-300" : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            <span className="text-xs md:text-sm font-semibold tracking-wide text-left">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoggedIn ? (
        /* SUPERADMIN SECURE LOGIN VIEW */
        <div className="min-h-screen flex flex-col justify-center items-center px-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent">
          {/* Subtle design geometry grids */}
          <div className="absolute top-0 bottom-0 left-1/4 w-px bg-white/[0.01] pointer-events-none" />
          <div className="absolute top-0 bottom-0 left-2/4 w-px bg-white/[0.01] pointer-events-none" />
          <div className="absolute top-0 bottom-0 left-3/4 w-px bg-white/[0.01] pointer-events-none" />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`w-full max-w-md rounded-3xl border p-8 md:p-10 relative overflow-hidden backdrop-blur-xl shadow-2xl ${
              isDarkTheme 
                ? "bg-slate-900/80 border-white/5 shadow-black/60" 
                : "bg-white border-slate-200 shadow-slate-250/20"
            }`}
            id="login-card-shell"
          >
            {/* Top Back Home Button */}
            <button
              onClick={onBackToFrontpage}
              className={`absolute top-4 left-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider py-1.5 px-3 rounded-lg border transition-all ${
                isDarkTheme 
                  ? "border-white/5 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/10" 
                  : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>

            {/* Glowing Accent Ring */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />

            <div className="text-center mt-6 mb-8 flex flex-col items-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border md:mb-5 mb-4 ${
                isDarkTheme ? "bg-slate-950 border-white/5 text-amber-500" : "bg-amber-50 border-amber-200 text-amber-600"
              }`}>
                <KeyRound className="w-7 h-7 stroke-[1.5]" />
              </div>
              
              <h1 className={`text-2xl md:text-3xl font-serif font-bold tracking-tight mb-2 ${isDarkTheme ? "text-white" : "text-slate-950"}`}>
                Keamanan Superadmin
              </h1>
              <p className={`text-xs ${isDarkTheme ? "text-slate-400" : "text-slate-500"} font-light max-w-[280px]`}>
                Silakan masuk dengan kredensial otorisasi terenkripsi untuk mengelola modul SMKN 1 Wonogiri.
              </p>
            </div>

            {/* ── Server health indicator ─────────────────────────────── */}
            <div className="mb-5">
              <AnimatePresence mode="wait">
                {serverStatus === "checking" && (
                  <motion.div key="chk" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs ${isDarkTheme ? "bg-slate-800/60 border-white/5 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Memeriksa koneksi backend…</span>
                  </motion.div>
                )}
                {serverStatus === "online" && (
                  <motion.div key="ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs ${isDarkTheme ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    <span>Backend tersambung dan beroperasi normal</span>
                  </motion.div>
                )}
                {serverStatus === "degraded" && (
                  <motion.div key="deg" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs ${isDarkTheme ? "bg-amber-500/8 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Server aktif — beberapa file data perlu perhatian. Buka <strong>Monitor Server</strong> setelah masuk.</span>
                  </motion.div>
                )}
                {(serverStatus === "misconfigured" || serverStatus === "unreachable") && (
                  <motion.div key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`rounded-xl border text-xs ${isDarkTheme ? "bg-red-500/8 border-red-500/20" : "bg-red-50 border-red-200"}`}>
                    <div className={`flex items-center justify-between gap-2 px-4 pt-3 pb-2 ${isDarkTheme ? "text-red-400" : "text-red-700"}`}>
                      <div className="flex items-center gap-2">
                        <WifiOff className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold">
                          {serverStatus === "misconfigured" ? "Konfigurasi server bermasalah" : "Server tidak dapat dijangkau"}
                        </span>
                      </div>
                      <button onClick={() => { setServerStatus("checking"); diagnoseServer().then(r => { setServerStatus(r.status); setServerDiagnosis(r.diagnosis); }); }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono uppercase tracking-wide transition-all ${isDarkTheme ? "border-red-500/20 hover:bg-red-500/10" : "border-red-200 hover:bg-red-100"}`}>
                        <RefreshCw className="w-2.5 h-2.5" /> Coba Lagi
                      </button>
                    </div>
                    <p className={`px-4 pb-3 text-[11px] leading-relaxed ${isDarkTheme ? "text-red-400/70" : "text-red-600/80"}`}>{serverDiagnosis}</p>
                    <div className={`px-4 pb-3 border-t pt-2 space-y-1 ${isDarkTheme ? "border-red-500/10" : "border-red-100"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDarkTheme ? "text-red-400/60" : "text-red-500/70"}`}>Langkah Perbaikan cPanel:</p>
                      {serverStatus === "misconfigured" ? (
                        <ol className={`text-[10px] leading-relaxed space-y-0.5 list-decimal list-inside ${isDarkTheme ? "text-red-400/60" : "text-red-500/70"}`}>
                          <li>Upload <code className="font-mono">.htaccess</code> terbaru ke folder <code className="font-mono">/id/</code> di File Manager</li>
                          <li>Pastikan rule API menggunakan <code className="font-mono">RewriteRule .* - [L]</code></li>
                          <li>Upload <code className="font-mono">dist/</code> terbaru (termasuk <code className="font-mono">server.cjs</code>)</li>
                          <li>Restart aplikasi Node.js di cPanel → Node.js Selector</li>
                        </ol>
                      ) : (
                        <ol className={`text-[10px] leading-relaxed space-y-0.5 list-decimal list-inside ${isDarkTheme ? "text-red-400/60" : "text-red-500/70"}`}>
                          <li>Buka <strong>cPanel → Node.js Selector</strong></li>
                          <li>Pastikan status aplikasi <strong>Running</strong> (klik Restart jika tidak)</li>
                          <li>Pastikan file startup adalah <code className="font-mono">app.js</code></li>
                          <li>Periksa error log di cPanel untuk detail kesalahan</li>
                        </ol>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {loginError && (
              <div className={`p-4 rounded-xl border mb-6 flex items-start gap-2.5 text-xs text-left animate-shake ${
                isDarkTheme ? "bg-red-950/40 border-red-500/30 text-red-400" : "bg-red-50 border-red-100 text-red-700"
              }`}>
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5 text-left" id="secure-admin-form">
              <div>
                <label className={`block text-[11px] font-mono uppercase tracking-widest font-bold mb-2 ${isDarkTheme ? "text-slate-400" : "text-slate-700"}`}>
                  User Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan user name"
                    className={`w-full text-sm py-3 pl-11 pr-4 rounded-xl border outline-none font-sans font-medium transition-all duration-200 ${
                      isDarkTheme 
                        ? "bg-slate-950 border-white/5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20" 
                        : "bg-slate-50 border-slate-205 text-slate-900 border-slate-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600/10Focus"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-mono uppercase tracking-widest font-bold mb-2 ${isDarkTheme ? "text-slate-400" : "text-slate-700"}`}>
                  Kata Sandi
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className={`w-full text-sm py-3 pl-11 pr-4 rounded-xl border outline-none font-sans font-medium transition-all duration-200 ${
                      isDarkTheme 
                        ? "bg-slate-950 border-white/5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20" 
                        : "bg-slate-50 border-slate-205 text-slate-900 border-slate-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600/10"
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 rounded-xl text-xs uppercase font-extrabold tracking-widest bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                id="btn-login-submit"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <span>Masuk Aman</span>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
        /* SUPERADMIN ACTIVE CONTROL WORKSPACE VIEW */
        <div className="min-h-screen flex flex-col">
          
          {/* Header Dashboard Nav */}
          <header className={`border-b transition-colors duration-200 relative z-30 ${
            isDarkTheme ? "bg-slate-900/90 border-white/5" : "bg-white/95 border-slate-200"
          }`}>
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950">
                  <LayoutDashboard className="w-5.5 h-5.5 stroke-[2]" />
                </div>
                <div className="text-left">
                  <h1 className={`text-md md:text-lg font-serif font-bold tracking-tight ${isDarkTheme ? "text-white" : "text-slate-950"}`}>
                    Superadmin Workspace
                  </h1>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#d97706] font-bold">
                    SMKN 1 Wonogiri
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onBackToFrontpage}
                  className={`px-4 py-2 cursor-pointer font-sans text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
                    isDarkTheme 
                      ? "border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20" 
                      : "border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                  id="btn-back-landing"
                >
                  <Globe className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">Pratinjau Frontpage</span>
                </button>

                <button
                  onClick={openChangePass}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                    isDarkTheme
                      ? "border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10 hover:text-amber-400"
                      : "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-amber-600"
                  }`}
                  title="Ganti Username & Password"
                  id="btn-change-pass"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden md:inline font-mono uppercase text-[10px] tracking-widest">Keamanan</span>
                </button>

                <button
                  onClick={handleLogout}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold text-red-500 ${
                    isDarkTheme 
                      ? "border-red-550/25 border-white/5 hover:bg-red-500/5 hover:border-red-500/20" 
                      : "border-red-200 hover:bg-red-50"
                  }`}
                  title="Logout"
                  id="btn-logout-panel"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline font-mono uppercase text-[10px] tracking-widest">Logout</span>
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row relative z-20">
            
            {/* Sidebar Navigation */}
            <aside className={`w-full lg:w-72 border-r transition-colors duration-200 p-6 lg:min-h-[calc(100vh-5rem)] ${
              isDarkTheme ? "border-white/5" : "border-slate-200 bg-slate-100/30"
            }`}>
              <div className="space-y-6">
                
                <div className="text-left">
                  <span className={`text-[10px] font-mono tracking-widest uppercase font-bold ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>
                    Koleksi Konten
                  </span>
                </div>

                <nav className="space-y-1.5 text-left flex flex-col">
                  {[
                    { id: "competencies", label: "Jurusan / Kompetensi", icon: BookOpen, count: competencies.length },
                    { id: "milestones", label: "Milestones / Sejarah", icon: Trophy, count: milestones.length },
                    { id: "gallery", label: "Galeri Campus Life", icon: Camera, count: gallery.length },
                    { id: "alumni", label: "Testimoni Alumni", icon: Users, count: alumni.length },
                    { id: "news", label: "Warta & Agenda", icon: Newspaper, count: news.length },
                    { id: "partners", label: "Mitra Dunia Industri", icon: Handshake, count: partners.length },
                    { id: "branding", label: "Identitas & Logo", icon: Image, count: null },
                    { id: "about", label: "Foto Gedung Sekolah", icon: Camera, count: null },
                    { id: "kepala-sekolah", label: "Kepala Sekolah", icon: User, count: null },
                    { id: "manajemen-sekolah", label: "Manajemen Sekolah", icon: Users, count: null },
                    { id: "visi-misi", label: "Visi & Misi", icon: Target, count: null },
                    { id: "social-media", label: "Media Sosial", icon: Globe, count: null },
                    { id: "inbox-pesan", label: "Inbox Pesan Masuk", icon: Inbox, count: contactMessages.filter(m => !m.dibaca).length || null },
                    { id: "tracer-studi", label: "Tracer Study", icon: BarChart3, count: tracerEntries.length || null },
                    { id: "server-monitor", label: "Monitor Server", icon: Activity, count: null }
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setEditingItem(null);
                          setIsAddingNew(false);
                        }}
                        className={`w-full px-4 py-3 cursor-pointer rounded-xl flex items-center justify-between text-xs font-semibold transition-all duration-150 ${
                          isActive 
                            ? "bg-amber-500 text-slate-950 shadow-md font-bold" 
                            : isDarkTheme 
                              ? "text-slate-400 hover:text-white hover:bg-white/5" 
                              : "text-slate-700 hover:bg-slate-200/50"
                        }`}
                        id={`btn-sidebar-tab-${tab.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <TabIcon className="w-4 h-4 shrink-0" />
                          <span>{tab.label}</span>
                        </div>
                        {tab.count !== null && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            isActive 
                              ? "bg-slate-950/20 text-slate-950" 
                              : isDarkTheme ? "bg-slate-950 border border-white/5 text-slate-300" : "bg-slate-200 text-slate-700"
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className={`pt-6 border-t font-sans text-left space-y-4 ${isDarkTheme ? "border-white/5" : "border-slate-200"}`}>
                  <div>
                    <h4 className={`text-[10px] font-mono tracking-widest uppercase font-bold mb-2 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>
                      Alat Pemulihan
                    </h4>
                    <p className={`text-[10px] ${isDarkTheme ? "text-slate-500" : "text-slate-550"} font-light leading-relaxed mb-4`}>
                      Gunakan tombol reset bila Anda ingin menghapus seluruh CRUD kustom Anda dan kembali ke konfigurasi sekolah asli.
                    </p>
                    <button
                      onClick={resetToFactoryDefault}
                      className="w-full py-2.5 px-3 cursor-pointer inline-flex items-center justify-center gap-1.5 text-[10px] font-mono tracking-wider font-bold rounded-lg border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/5 transition-colors"
                      id="btn-factory-reset"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Setel Ulang Data</span>
                    </button>
                  </div>
                </div>

              </div>
            </aside>

            {/* Dashboard Workspace */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
              
              {/* Tab Header Action Space */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-light-edge border-slate-200 pb-6 mb-8 text-left">
                <div>
                  <h2 className={`text-xl md:text-2xl font-serif font-bold ${isDarkTheme ? "text-white" : "text-slate-950"}`}>
                    {activeTab === "competencies" && "Kelola Kompetensi Keahlian"}
                    {activeTab === "milestones" && "Kelola Rentang Sejarah & Milestones"}
                    {activeTab === "gallery" && "Kelola Galeri Campus Life"}
                    {activeTab === "alumni" && "Kelola Testimoni Sukses Alumni"}
                    {activeTab === "news" && "Kelola Warta & Agenda Utama"}
                    {activeTab === "partners" && "Kelola Mitra Dunia Industri"}
                    {activeTab === "branding" && "Identitas Visual & Logo Sekolah"}
                    {activeTab === "about" && "Foto Gedung Sekolah (Seksi Tentang)"}
                    {activeTab === "kepala-sekolah" && "Profil & Sambutan Kepala Sekolah"}
                    {activeTab === "manajemen-sekolah" && "Manajemen & Pimpinan Sekolah"}
                    {activeTab === "visi-misi" && "Visi & Misi Sekolah"}
                    {activeTab === "social-media" && "Kelola Tautan Media Sosial"}
                    {activeTab === "inbox-pesan" && "Inbox Pesan Masuk"}
                    {activeTab === "tracer-studi" && "Data & Ekspor Tracer Study"}
                    {activeTab === "server-monitor" && "Monitor Status Server"}
                  </h2>
                  <p className={`text-xs ${isDarkTheme ? "text-slate-400" : "text-slate-500"} font-light mt-0.5`}>
                    {activeTab === "competencies" && "Perbarui deskripsi, kurikulum, bidang karir, and detail program keahlian sekolah."}
                    {activeTab === "milestones" && "Atur jalur waktu pencapaian sekolah, sertifikasi ISO, inovasi kerja sama, LKS dll."}
                    {activeTab === "gallery" && "Tambahkan foto, saring berdasarkan kategori kriya kuliner, kelas, praktik industri, dsb."}
                    {activeTab === "alumni" && "Peroleh ulasan dan motivasi langsung dari alumni SMKN 1 Wonogiri berkarir global."}
                    {activeTab === "news" && "Atur artikel warta, rilis berita baru, edit pencapaian murid terdepan di media cetak."}
                    {activeTab === "partners" && "Tambah, edit, atau hapus mitra industri yang tampil di bagian Dunia Industri halaman utama."}
                    {activeTab === "branding" && "Upload logo sekolah untuk Navbar, Footer, dan seluruh komponen branding portal."}
                    {activeTab === "about" && "Upload foto gedung sekolah dan atur posisi serta zoom untuk tampilan terbaik di seksi Tentang halaman utama."}
                    {activeTab === "kepala-sekolah" && "Edit foto, nama, NIP, dan teks sambutan Kepala Sekolah yang tampil di halaman Kepala Sekolah."}
                    {activeTab === "manajemen-sekolah" && "Perbarui foto dan nama untuk setiap jabatan pimpinan yang tampil di halaman Manajemen Sekolah."}
                    {activeTab === "visi-misi" && "Edit teks Visi dan butir-butir Misi sekolah yang tampil di halaman Visi & Misi."}
                    {activeTab === "social-media" && "Atur URL akun Instagram, YouTube, Facebook, dan Website resmi yang tampil di footer portal."}
                    {activeTab === "inbox-pesan" && "Baca, balas, dan kelola semua pesan yang masuk melalui formulir Hubungi Kami."}
                    {activeTab === "tracer-studi" && "Lihat statistik, kelola responden, dan ekspor seluruh data ke Excel (.xlsx) 3 sheet sekaligus."}
                    {activeTab === "server-monitor" && "Pantau status, uptime, dan integritas file data server secara real-time. Diperbarui otomatis tiap 30 detik."}
                  </p>
                </div>

                {!isAddingNew && !editingItem && activeTab !== "branding" && activeTab !== "about" && activeTab !== "kepala-sekolah" && activeTab !== "manajemen-sekolah" && activeTab !== "visi-misi" && activeTab !== "social-media" && activeTab !== "inbox-pesan" && activeTab !== "server-monitor" && activeTab !== "tracer-studi" && (
                  <button
                    onClick={() => {
                      setIsAddingNew(true);
                      // Set blank placeholder schema
                      if (activeTab === "competencies") {
                        setEditingItem({
                          code: "", name: "", englishName: "", description: "",
                          themeClass: "from-[#0d1e3d] to-[#040e21] border-[#1e2f54]/60 bg-gradient-to-br",
                          badgeColor: "bg-[#1e2f54] text-[#8ea7e9] border-[#2e4375]",
                          stats: [{ label: "", value: "" }],
                          careers: ["", ""],
                          image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=700&q=80",
                          curriculum: ["", ""]
                        });
                      } else if (activeTab === "milestones") {
                        setEditingItem({
                          year: (new Date().getFullYear()) + "", title: "", subtitle: "", description: "",
                          category: "Prestasi", metric: ""
                        });
                      } else if (activeTab === "gallery") {
                        setEditingItem({
                          id: "", title: "", category: "Kuliner",
                          image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
                          aspect: "landscape", caption: ""
                        });
                      } else if (activeTab === "alumni") {
                        setEditingItem({
                          name: "", role: "", company: "", location: "", gradYear: (new Date().getFullYear() - 2) + "",
                          quote: "", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
                        });
                      } else if (activeTab === "news") {
                        setEditingItem({
                          id: "", category: "PRESTASI NASIONAL", title: "", excerpt: "",
                          date: "11 Juni 2026", readTime: "4 min read",
                          image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
                          author: "Superadmin Humas", authorRole: "Koordinator Publikasi"
                        });
                      } else if (activeTab === "partners") {
                        setEditingItem({ id: "", name: "", type: "", color: "amber" });
                      }
                    }}
                    className="px-4 py-2.5 cursor-pointer rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold tracking-wider inline-flex items-center gap-1.5 shadow-md active:scale-95 duration-150"
                    id="btn-add-new-item"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Tambah Data Baru</span>
                  </button>
                )}
              </div>

              {/* DYNAMIC FORM WORKSPACE */}
              {(isAddingNew || editingItem) && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-2xl p-6 md:p-8 mb-8 relative text-left ${
                    isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
                  }`}
                  id="crud-form-shell"
                >
                  <button
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingItem(null);
                    }}
                    className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h3 className={`text-lg font-serif font-bold mb-6 ${isDarkTheme ? "text-white" : "text-slate-950"}`}>
                    {isAddingNew ? "Entri Data Baru Baru" : "Mutakhirkan / Edit Data"}
                  </h3>

                  {/* FORM RENDER: COMPETENCY */}
                  {activeTab === "competencies" && editingItem && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Kode Jurusan (Unique ID)</label>
                          <input
                            type="text"
                            disabled={!isAddingNew}
                            value={editingItem.code}
                            onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                            placeholder="E.g., AKL"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white disabled:bg-slate-900disabled:text-slate-500 focus:border-amber-500" : "bg-slate-50 border-slate-200 disabled:bg-slate-100 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Nama Program Keahlian</label>
                          <input
                            type="text"
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            placeholder="E.g., Akuntansi & Keuangan Lembaga"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Nama Kompetensi Internasional (English Name)</label>
                          <input
                            type="text"
                            value={editingItem.englishName}
                            onChange={(e) => setEditingItem({ ...editingItem, englishName: e.target.value })}
                            placeholder="E.g., Accounting & Institutional Finance"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Tautan URL Gambar Pendukung</label>
                          <input
                            type="text"
                            value={editingItem.image}
                            onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                            placeholder="https://..."
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Deskripsi Deskriptif Lengkap</label>
                        <textarea
                          rows={3}
                          value={editingItem.description}
                          onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                          placeholder="Terangkan secara matang visi pendirian jurusan ini di Wonogiri..."
                          className={`w-full text-xs p-3 rounded-lg border outline-none resize-none ${
                            isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                          }`}
                        />
                      </div>

                      {/* Modular careers input */}
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Prospek Karir Lulusan (Pisahkan dengan tanda koma)</label>
                        <input
                          type="text"
                          value={editingItem.careers?.join(", ")}
                          onChange={(e) => setEditingItem({ ...editingItem, careers: e.target.value.split(",").map(val => val.trim()) })}
                          placeholder="Corporate Accountant, Tax Consultant Specialist..."
                          className={`w-full text-xs p-3 rounded-lg border outline-none ${
                            isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                          }`}
                        />
                      </div>

                      {/* Modular curriculum input */}
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Materi Pokok / Kurikulum (Pisahkan dengan tanda koma)</label>
                        <input
                          type="text"
                          value={editingItem.curriculum?.join(", ")}
                          onChange={(e) => setEditingItem({ ...editingItem, curriculum: e.target.value.split(",").map(val => val.trim()) })}
                          placeholder="Sistem Akuntansi Pajak, Auditing Korporat, Advanced Layout..."
                          className={`w-full text-xs p-3 rounded-lg border outline-none ${
                            isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                          }`}
                        />
                      </div>

                      {/* Simple Stats Grid edits */}
                      <div className="border border-white/5 rounded-xl p-4 bg-slate-950/20">
                        <span className="block text-xs font-semibold mb-3">Highlight Statistik Jurusan</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[0, 1, 2].map((idx) => (
                            <div key={idx} className="space-y-2">
                              <span className="text-[10px] font-mono text-slate-500 block">Item Stat #{idx + 1}</span>
                              <input
                                type="text"
                                value={editingItem.stats?.[idx]?.label || ""}
                                onChange={(e) => {
                                  let statsCopy = [...(editingItem.stats || [])];
                                  if (!statsCopy[idx]) statsCopy[idx] = { label: "", value: "" };
                                  statsCopy[idx].label = e.target.value;
                                  setEditingItem({ ...editingItem, stats: statsCopy });
                                }}
                                placeholder="E.g., Lab Komputer"
                                className={`w-full text-[11px] p-2 rounded border outline-none ${isDarkTheme ? "bg-slate-950 border-white/5" : "bg-slate-50 border-slate-200"}`}
                              />
                              <input
                                type="text"
                                value={editingItem.stats?.[idx]?.value || ""}
                                onChange={(e) => {
                                  let statsCopy = [...(editingItem.stats || [])];
                                  if (!statsCopy[idx]) statsCopy[idx] = { label: "", value: "" };
                                  statsCopy[idx].value = e.target.value;
                                  setEditingItem({ ...editingItem, stats: statsCopy });
                                }}
                                placeholder="E.g., 3 Unit"
                                className={`w-full text-[11px] p-2 rounded border outline-none ${isDarkTheme ? "bg-slate-950 border-white/5" : "bg-slate-50 border-slate-200"}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-4">
                        <button
                          onClick={() => saveCompetencyItem(editingItem, isAddingNew)}
                          className="px-5 py-2.5 cursor-pointer rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-wider inline-flex items-center gap-1.5 active:scale-95 duration-100"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan Program Keahlian</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingNew(false);
                            setEditingItem(null);
                          }}
                          className={`px-5 py-2.5 cursor-pointer rounded-xl text-xs font-semibold border transition-colors ${
                            isDarkTheme 
                              ? "border-white/10 text-slate-450 hover:bg-white/5 text-slate-300" 
                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          Batalkan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* FORM RENDER: MILESTONES */}
                  {activeTab === "milestones" && editingItem && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Tahun Pencapaian (ID)</label>
                          <input
                            type="text"
                            value={editingItem.year}
                            onChange={(e) => setEditingItem({ ...editingItem, year: e.target.value })}
                            placeholder="E.g., 2026"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Kategori Milestone</label>
                          <select
                            value={editingItem.category}
                            onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          >
                            <option value="Prestasi">Prestasi Akademik / Kejuaraan</option>
                            <option value="Infrastruktur">Infrastruktur & Sarana</option>
                            <option value="Kemitraan">Kemitraan Industri Tetap</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Metrik Ringkas (Highlighted Metric)</label>
                          <input
                            type="text"
                            value={editingItem.metric}
                            onChange={(e) => setEditingItem({ ...editingItem, metric: e.target.value })}
                            placeholder="E.g., 3 Medali Emas"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Judul Milestone Utama</label>
                          <input
                            type="text"
                            value={editingItem.title}
                            onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                            placeholder="E.g., Juara Umum LKS Nasional Tingkat Vokasi"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Sub-judul / Asosiasi Lembaga</label>
                          <input
                            type="text"
                            value={editingItem.subtitle}
                            onChange={(e) => setEditingItem({ ...editingItem, subtitle: e.target.value })}
                            placeholder="E.g., Sukses didapat oleh delegasi murid Kriya Busana"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Deskripsi Deskriptif Milestone</label>
                        <textarea
                          rows={3}
                          value={editingItem.description}
                          onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                          placeholder="Berikan rangkuman ringkas tapi bermakna mendalam mengenai peristiwa bersejarah ini..."
                          className={`w-full text-xs p-3 rounded-lg border outline-none resize-none ${
                            isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-4 animate-fadeIn">
                        <button
                          onClick={() => saveMilestoneItem(editingItem, isAddingNew, isAddingNew ? undefined : editingItem.year)}
                          className="px-5 py-2.5 cursor-pointer rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-wider inline-flex items-center gap-1.5 active:scale-95 duration-100"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan Milestone Historis</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingNew(false);
                            setEditingItem(null);
                          }}
                          className={`px-5 py-2.5 cursor-pointer rounded-xl text-xs font-semibold border transition-colors ${
                            isDarkTheme 
                              ? "border-white/10 hover:bg-white/5 text-slate-300" 
                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          Batalkan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* FORM RENDER: GALLERY */}
                  {activeTab === "gallery" && editingItem && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Judul Foto Dokumentasi</label>
                          <input
                            type="text"
                            value={editingItem.title}
                            onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                            placeholder="E.g., Seni Plating Gastronomi Tingkat Tinggi"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Kategori Galeri</label>
                          <select
                            value={editingItem.category}
                            onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          >
                            <option value="Kuliner">Kuliner</option>
                            <option value="Fashion">Fashion</option>
                            <option value="Kelas">Kelas</option>
                            <option value="Praktik Industri">Praktik Industri</option>
                            <option value="Prestasi">Prestasi</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">URL Gambar Unsplash / Cloud</label>
                          <input
                            type="text"
                            value={editingItem.image}
                            onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                            placeholder="https://images.unsplash.com/..."
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Format Tampilan Gambar (Aspect Ratio)</label>
                          <select
                            value={editingItem.aspect}
                            onChange={(e) => setEditingItem({ ...editingItem, aspect: e.target.value as any })}
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          >
                            <option value="landscape">Horizontal (Landscape)</option>
                            <option value="portrait">Vertikal (Portrait)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Keterangan Foto Singkat (Caption)</label>
                        <input
                          type="text"
                          value={editingItem.caption}
                          onChange={(e) => setEditingItem({ ...editingItem, caption: e.target.value })}
                          placeholder="Tulis deksripsi singkat yang akan tampil saat di-zoom..."
                          className={`w-full text-xs p-3 rounded-lg border outline-none ${
                            isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-4 animate-fadeIn">
                        <button
                          onClick={() => saveGalleryItem(editingItem, isAddingNew)}
                          className="px-5 py-2.5 cursor-pointer rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-wider inline-flex items-center gap-1.5 active:scale-95 duration-100"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan Galeri Kegiatan</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingNew(false);
                            setEditingItem(null);
                          }}
                          className={`px-5 py-2.5 cursor-pointer rounded-xl text-xs font-semibold border transition-colors ${
                            isDarkTheme 
                              ? "border-white/10 hover:bg-white/5 text-slate-300" 
                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          Batalkan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* FORM RENDER: ALUMNI */}
                  {activeTab === "alumni" && editingItem && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Nama Lengkap Alumni</label>
                          <input
                            type="text"
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            placeholder="E.g., Ahmad Farhan, S.Tr.Ak"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Pekerjaan Saat Ini / Jabatan</label>
                          <input
                            type="text"
                            value={editingItem.role}
                            onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
                            placeholder="E.g., Senior Budgeting Analyst"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Tahun Lulus (Grad Year)</label>
                          <input
                            type="text"
                            value={editingItem.gradYear}
                            onChange={(e) => setEditingItem({ ...editingItem, gradYear: e.target.value })}
                            placeholder="E.g., 2019"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Perusahaan / Afiliasi Pekerjaan</label>
                          <input
                            type="text"
                            value={editingItem.company}
                            onChange={(e) => setEditingItem({ ...editingItem, company: e.target.value })}
                            placeholder="E.g., Bank Mandiri Head Office"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Lokasi Bekerja</label>
                          <input
                            type="text"
                            value={editingItem.location}
                            onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                            placeholder="E.g., Jakarta, Indonesia"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Testimoni Kutipan Motivasi (Quote)</label>
                          <input
                            type="text"
                            value={editingItem.quote}
                            onChange={(e) => setEditingItem({ ...editingItem, quote: e.target.value })}
                            placeholder="Berikan kalimat inspirasi mengenai SMKN 1 Wonogiri..."
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Foto Pasfoto Alumni (URL atau Upload Maks 10MB)</label>
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editingItem.avatar}
                              onChange={(e) => setEditingItem({ ...editingItem, avatar: e.target.value })}
                              placeholder="https://images.unsplash.com/..."
                              className={`w-full text-xs p-3 rounded-lg border outline-none ${
                                isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                              }`}
                            />
                            
                            {/* Modern Drag and Drop Area */}
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragActive(true);
                              }}
                              onDragLeave={() => setDragActive(false)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragActive(false);
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                  handleAvatarFileSelection(e.dataTransfer.files[0]);
                                }
                              }}
                              onClick={() => {
                                document.getElementById("avatar-file-input")?.click();
                              }}
                              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                                dragActive 
                                  ? "border-amber-500 bg-amber-500/10" 
                                  : isDarkTheme 
                                    ? "border-white/10 hover:border-white/20 bg-slate-950/40 hover:bg-slate-950/60" 
                                    : "border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100"
                              }`}
                            >
                              <input 
                                id="avatar-file-input"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleAvatarFileSelection(e.target.files[0]);
                                  }
                                }}
                              />
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className={`p-2 rounded-lg ${isDarkTheme ? "bg-white/5" : "bg-slate-100"}`}>
                                  <Upload className="w-4 h-4 text-amber-500" />
                                </div>
                                <span className={`text-xs font-medium ${isDarkTheme ? "text-slate-300" : "text-slate-800"}`}>
                                  Tarik & Lepas foto, atau <span className="text-amber-500 hover:text-amber-400 font-bold underline transition-colors">Pilih File</span>
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">Batas Ukuran: Maksimal 10MB | Format: JPG, PNG, WEBP, GIF</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PORTRAIT OPTIMIZER STUDIO ENGINE PANEL */}
                      <AnimatePresence>
                        {imageEnhanceOpen && originalImageSrc && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                              isDarkTheme ? "bg-slate-950/80 border-amber-500/40" : "bg-amber-50/20 border-amber-500/30 shadow-lg"
                            }`}
                          >
                            <div className="border-b border-light-edge border-slate-200/5 p-4 bg-gradient-to-r from-amber-500/10 to-transparent flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                                <span className="text-xs font-bold tracking-wider uppercase text-amber-500 font-mono">SMKN1 Studio Penyelaras Foto Alumni (Presisi HD)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setImageEnhanceOpen(false);
                                  setOriginalImageSrc(null);
                                  setProcessedImageSrc(null);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                              {/* Left column: Visual comparisons screen with toggle */}
                              <div className="lg:col-span-6 space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Layar Pratinjau Komparatif</span>
                                  <button
                                    type="button"
                                    onClick={() => setCompareSplit(!compareSplit)}
                                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider cursor-pointer border uppercase transition-colors ${
                                      compareSplit 
                                        ? "bg-amber-500 text-slate-950 border-amber-500" 
                                        : "border-white/10 hover:bg-white/5 text-slate-300"
                                    }`}
                                  >
                                    {compareSplit ? "Tampilkan Hasil Akhir" : "Bandingkan Sebelum/Sesudah"}
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Item 1: Before (Original Crop/Input) */}
                                  {(!compareSplit || compareSplit) && (
                                    <div className="flex flex-col items-center">
                                      <span className="text-[9px] font-mono text-slate-500 mb-1.5 uppercase">Foto Asli (Raw Input)</span>
                                      <div className={`relative w-44 h-44 border rounded-xl overflow-hidden ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-slate-100 border-slate-200"}`}>
                                        <img 
                                          src={originalImageSrc} 
                                          alt="Original portrait file" 
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                          <span className="text-[9px] font-mono text-white/80 bg-slate-950/80 px-2 py-0.5 rounded border border-white/10 uppercase font-bold">Sebelum Penyelarasan</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Item 2: Processed Preview with real-time masks */}
                                  <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-mono text-amber-500 mb-1.5 uppercase font-bold flex items-center gap-1">
                                      <span>Optimasi Kejenuhan & Ketajaman</span>
                                    </span>
                                    <div className={`relative w-44 h-44 border-2 rounded-xl overflow-hidden ${
                                      enhanceSettings.cropMode === 'circle' ? 'rounded-full' : ''
                                    } ${
                                      isProcessing 
                                        ? "border-amber-500/80 animate-pulse bg-slate-900" 
                                        : "border-amber-500 bg-slate-950"
                                    }`}>
                                      {processedImageSrc ? (
                                        <img 
                                          src={processedImageSrc} 
                                          alt="Enhanced and cropped portrait" 
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover select-none"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                          <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                                        </div>
                                      )}
                                      
                                      {/* Crosshair grid overlay for precise center preview */}
                                      <div className="absolute inset-x-0 top-1/2 h-px bg-white/15 pointer-events-none border-dashed border-b" />
                                      <div className="absolute inset-y-0 left-1/2 w-px bg-white/15 pointer-events-none border-dashed border-r" />
                                      
                                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                                        <span className="text-[8px] font-mono whitespace-nowrap text-amber-400 bg-slate-950/90 px-2 py-0.5 rounded border border-amber-500/30 uppercase font-bold tracking-widest flex items-center gap-1">
                                          <Sparkles className="w-2.5 h-2.5" />
                                          <span>HASIL TAJAM (PRESISI)</span>
                                        </span>
                                      </div>
                                      
                                      {isProcessing && (
                                        <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-1.5">
                                          <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                                          <span className="text-[8px] font-mono text-amber-500 tracking-wider">SEDANG MENGOPTIMALKAN...</span>
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[8px] text-slate-500 font-mono mt-2 uppercase">Hasil Sesuai Tampilan Live PPDB</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right column: Interactive Sliders & Presets Controls */}
                              <div className="lg:col-span-6 space-y-6">
                                <div>
                                  <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">Preset Cepat Studio</label>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEnhanceSettings({ ...enhanceSettings, sharpen: 1.3, brightness: 1.05, contrast: 1.1 })}
                                      className="px-2.5 py-1.5 cursor-pointer rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-[10px] font-bold text-amber-400 font-mono text-left transition-colors"
                                    >
                                      ⚡ HD Auto-Sharp (Bawaan)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEnhanceSettings({ ...enhanceSettings, sharpen: 0.7, brightness: 1.18, contrast: 1.15 })}
                                      className="px-2.5 py-1.5 cursor-pointer rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-300 font-mono text-left transition-colors"
                                    >
                                      💡 Studio Portrait Glow
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEnhanceSettings({ ...enhanceSettings, sharpen: 2.1, brightness: 0.98, contrast: 1.25 })}
                                      className="px-2.5 py-1.5 cursor-pointer rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-300 font-mono text-left transition-colors"
                                    >
                                      🔥 Extreme Edge Detail
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEnhanceSettings({ ...enhanceSettings, sharpen: 0, brightness: 1.0, contrast: 1.0 })}
                                      className="px-2.5 py-1.5 cursor-pointer rounded-lg border border-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-500 font-mono text-left transition-colors"
                                    >
                                      ↺ Reset ke Foto Asli
                                    </button>
                                  </div>
                                </div>

                                {/* Active Adjustment Sliders Container */}
                                <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-slate-900/40 font-sans">
                                  {/* Slider 1: Sharpen */}
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Filter Ketajaman (Sharpen Convolution)</span>
                                      <span className="text-xs font-mono font-bold text-amber-500">{enhanceSettings.sharpen.toFixed(1)}x</span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="0"
                                      max="2.5"
                                      step="0.1"
                                      value={enhanceSettings.sharpen}
                                      onChange={(e) => setEnhanceSettings({ ...enhanceSettings, sharpen: parseFloat(e.target.value) })}
                                      className="w-full accent-amber-500 h-1 rounded bg-slate-950 outline-none"
                                    />
                                    <p className="text-[9px] text-slate-500 font-mono leading-relaxed mt-1">Mengaplikasikan matriks kernel 3x3 untuk meningkatkan kontras tepi sehingga wajah alumnus tampak sangat jelas.</p>
                                  </div>

                                  {/* Slider 2: Contrast */}
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Imersi Kontras Warna (Contrast Range)</span>
                                      <span className="text-xs font-mono font-bold text-amber-500">{enhanceSettings.contrast.toFixed(2)}x</span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="0.6"
                                      max="1.6"
                                      step="0.05"
                                      value={enhanceSettings.contrast}
                                      onChange={(e) => setEnhanceSettings({ ...enhanceSettings, contrast: parseFloat(e.target.value) })}
                                      className="w-full accent-amber-500 h-1 rounded bg-slate-950 outline-none"
                                    />
                                  </div>

                                  {/* Slider 3: Brightness */}
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Kandungan Kecerahan (Exposure/Brightness)</span>
                                      <span className="text-xs font-mono font-bold text-amber-500">{enhanceSettings.brightness.toFixed(2)}x</span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="0.6"
                                      max="1.6"
                                      step="0.05"
                                      value={enhanceSettings.brightness}
                                      onChange={(e) => setEnhanceSettings({ ...enhanceSettings, brightness: parseFloat(e.target.value) })}
                                      className="w-full accent-amber-500 h-1 rounded bg-slate-950 outline-none"
                                    />
                                  </div>

                                  {/* Crop Mode Selection */}
                                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Format Pemangkasan Masking</span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setEnhanceSettings({ ...enhanceSettings, cropMode: "circle" })}
                                        className={`px-3 py-1 cursor-pointer rounded text-[10px] font-bold ${
                                          enhanceSettings.cropMode === 'circle' ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400 border border-white/5'
                                        }`}
                                      >
                                        Bundar (Default)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEnhanceSettings({ ...enhanceSettings, cropMode: "square" })}
                                        className={`px-3 py-1 cursor-pointer rounded text-[10px] font-bold ${
                                          enhanceSettings.cropMode === 'square' ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400 border border-white/5'
                                        }`}
                                      >
                                        Kotak (Vokasi)
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Apply / Cancel buttons in Optimizer box */}
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (processedImageSrc) {
                                        setEditingItem({ ...editingItem, avatar: processedImageSrc });
                                        showFeedback("Foto hasil pengoptimalan berhasil diterapkan!", "success");
                                        setImageEnhanceOpen(false);
                                      }
                                    }}
                                    disabled={!processedImageSrc || isProcessing}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-bold text-slate-950 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer tracking-wider active:scale-95 duration-100 disabled:opacity-50"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Terapkan Hasil Penyelarasan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setImageEnhanceOpen(false);
                                      setOriginalImageSrc(null);
                                      setProcessedImageSrc(null);
                                    }}
                                    className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 text-xs rounded-xl cursor-pointer"
                                  >
                                    Batalkan Penyetelan
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-3 pt-4">
                        <button
                          onClick={() => saveAlumnusItem(editingItem, isAddingNew, isAddingNew ? undefined : editingItem.name)}
                          className="px-5 py-2.5 cursor-pointer rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-wider inline-flex items-center gap-1.5 active:scale-95 duration-100"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan Kutipan Alumni</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingNew(false);
                            setEditingItem(null);
                          }}
                          className={`px-5 py-2.5 cursor-pointer rounded-xl text-xs font-semibold border transition-colors ${
                            isDarkTheme 
                              ? "border-white/10 hover:bg-white/5 text-slate-300" 
                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          Batalkan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* FORM RENDER: NEWS ARTICLES */}
                  {activeTab === "news" && editingItem && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Judul Artikel Warta</label>
                          <input
                            type="text"
                            value={editingItem.title}
                            onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                            placeholder="E.g., Siswa SMKN 1 Wonogiri Memukau di JFW"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Kategori Publikasi / Warta</label>
                          <input
                            type="text"
                            value={editingItem.category}
                            onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                            placeholder="E.g., PRESTASI NASIONAL atau INTERNASIONAL"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Tautan Gambar Berita Utama</label>
                          <input
                            type="text"
                            value={editingItem.image}
                            onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                            placeholder="https://..."
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Tanggal Berita Terbit</label>
                          <input
                            type="text"
                            value={editingItem.date}
                            onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })}
                            placeholder="E.g., 11 Juni 2026"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Estimasi Waktu Baca</label>
                          <input
                            type="text"
                            value={editingItem.readTime}
                            onChange={(e) => setEditingItem({ ...editingItem, readTime: e.target.value })}
                            placeholder="E.g., 4 min read"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Nama Penulis Berita</label>
                          <input
                            type="text"
                            value={editingItem.author}
                            onChange={(e) => setEditingItem({ ...editingItem, author: e.target.value })}
                            placeholder="E.g., Drs. Heri Widyastono"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Jabatan Penulis</label>
                          <input
                            type="text"
                            value={editingItem.authorRole}
                            onChange={(e) => setEditingItem({ ...editingItem, authorRole: e.target.value })}
                            placeholder="E.g., Humas & Hubungan Industri"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Cuplikan Pengantar Kutipan (Excerpt)</label>
                        <textarea
                          rows={3}
                          value={editingItem.excerpt}
                          onChange={(e) => setEditingItem({ ...editingItem, excerpt: e.target.value })}
                          placeholder="Tulis baris kata memikat untuk menuntun pembaca ke arah isinya lengkap..."
                          className={`w-full text-xs p-3 rounded-lg border outline-none resize-none ${
                            isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-4">
                        <button
                          onClick={() => saveNewsItem(editingItem, isAddingNew)}
                          className="px-5 py-2.5 cursor-pointer rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-wider inline-flex items-center gap-1.5 active:scale-95 duration-100"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan Artikel Publikasi</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingNew(false);
                            setEditingItem(null);
                          }}
                          className={`px-5 py-2.5 cursor-pointer rounded-xl text-xs font-semibold border transition-colors ${
                            isDarkTheme 
                              ? "border-white/10 hover:bg-white/5 text-slate-300" 
                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          Batalkan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* FORM RENDER: PARTNERS */}
                  {activeTab === "partners" && editingItem && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Nama Mitra Industri</label>
                          <input
                            type="text"
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            placeholder="E.g., Astra International"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Bidang / Sektor Industri</label>
                          <input
                            type="text"
                            value={editingItem.type}
                            onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                            placeholder="E.g., Digital & Automotive"
                            className={`w-full text-xs p-3 rounded-lg border outline-none ${
                              isDarkTheme ? "bg-slate-950 border-white/5 text-white focus:border-amber-500" : "bg-slate-50 border-slate-200 focus:border-amber-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">Warna Kartu (Tampil di Halaman Utama)</label>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { key: "amber",   label: "Amber",   cls: "bg-amber-400" },
                            { key: "blue",    label: "Biru",    cls: "bg-blue-400" },
                            { key: "emerald", label: "Hijau",   cls: "bg-emerald-400" },
                            { key: "rose",    label: "Merah",   cls: "bg-rose-400" },
                            { key: "violet",  label: "Ungu",    cls: "bg-violet-400" },
                            { key: "cyan",    label: "Cyan",    cls: "bg-cyan-400" },
                            { key: "orange",  label: "Oranye",  cls: "bg-orange-400" },
                            { key: "indigo",  label: "Indigo",  cls: "bg-indigo-400" },
                            { key: "teal",    label: "Teal",    cls: "bg-teal-400" },
                          ].map(({ key, label, cls }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setEditingItem({ ...editingItem, color: key })}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                                editingItem.color === key
                                  ? isDarkTheme ? "border-white/30 bg-white/10 text-white" : "border-slate-400 bg-slate-100 text-slate-900"
                                  : isDarkTheme ? "border-white/5 text-slate-400 hover:border-white/20" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded-full ${cls}`} />
                              {label}
                              {editingItem.color === key && <Check className="w-3 h-3 ml-1" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-4">
                        <button
                          onClick={() => savePartnerItem(editingItem, isAddingNew)}
                          className="px-5 py-2.5 cursor-pointer rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-wider inline-flex items-center gap-1.5 active:scale-95 duration-100"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan Mitra Industri</span>
                        </button>
                        <button
                          onClick={() => { setIsAddingNew(false); setEditingItem(null); }}
                          className={`px-5 py-2.5 cursor-pointer rounded-xl text-xs font-semibold border transition-colors ${
                            isDarkTheme ? "border-white/10 hover:bg-white/5 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          Batalkan
                        </button>
                      </div>
                    </div>
                  )}

                </motion.div>
              )}

              {/* LIST VIEWS IN MAIN BODY */}
              {!isAddingNew && !editingItem && (
                <div className="space-y-4">
                  {/* SEARCH / STATE DATA FEED */}
                  {activeTab === "competencies" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      {competencies.map((c) => (
                        <div key={c.code} className={`border rounded-xl p-5 flex justify-between items-start gap-4 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`} id={`admin-card-${c.code.toLowerCase()}`}>
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-[10px] font-mono tracking-widest font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-amber-500">
                                {c.code}
                              </span>
                              <span className={`text-xs italic font-semibold ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                                {c.englishName}
                              </span>
                            </div>
                            <h3 className={`text-md font-bold font-serif ${isDarkTheme ? "text-white" : "text-slate-950"}`}>{c.name}</h3>
                            <p className={`text-xs mt-2 line-clamp-2 ${isDarkTheme ? "text-slate-400" : "text-slate-600"} leading-relaxed`}>{c.description}</p>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingItem({ ...c });
                                setIsAddingNew(false);
                              }}
                              className={`p-2 rounded-lg border transition-all ${isDarkTheme ? "border-white/5 text-slate-400 hover:bg-white/5 hover:text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                              title="Edit"
                              id={`btn-edit-comp-${c.code.toLowerCase()}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteCompetencyItem(c.code)}
                              className="p-2 rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/5 transition-colors"
                              title="Hapus"
                              id={`btn-delete-comp-${c.code.toLowerCase()}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "milestones" && (
                    <div className="space-y-3 text-left">
                      {milestones.map((milestone) => (
                        <div key={milestone.year} className={`border rounded-xl p-4 flex items-center justify-between gap-4 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <div className="flex items-center gap-4">
                            <span className="text-xl font-mono font-black text-amber-500 shrink-0 w-16">{milestone.year}</span>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[9px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${
                                  milestone.category === 'Prestasi' ? 'bg-amber-500/10 border-amber-500/20 text-text-amber-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}>{milestone.category}</span>
                                {milestone.metric && <span className={`text-[9px] font-mono text-slate-500`}>({milestone.metric})</span>}
                              </div>
                              <h4 className={`text-sm font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>{milestone.title}</h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingItem({ ...milestone });
                                setIsAddingNew(false);
                              }}
                              className={`p-2 rounded-lg border transition-all ${isDarkTheme ? "border-white/5 text-slate-400 hover:bg-white/5 hover:text-white" : "border-slate-300 text-slate-705 hover:bg-slate-100"}`}
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteMilestoneItem(milestone.year)}
                              className="p-2 rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/5 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "gallery" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                      {gallery.map((p) => (
                        <div key={p.id} className={`border rounded-xl overflow-hidden flex flex-col justify-between ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <div className="relative aspect-video w-full bg-slate-950">
                            <img src={p.image} alt={p.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            <span className="absolute top-2 left-2 text-[8px] font-mono whitespace-nowrap px-2 py-0.5 uppercase tracking-wider bg-slate-950/80 border border-white/5 rounded text-amber-500">{p.category}</span>
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className={`text-sm font-bold truncate ${isDarkTheme ? "text-white" : "text-slate-900"}`}>{p.title}</h4>
                              <p className={`text-[10px] ${isDarkTheme ? "text-slate-500" : "text-slate-450"} truncate mt-1`}>{p.caption || "Tidak ada takarir."}</p>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-white/5">
                              <button
                                onClick={() => {
                                  setEditingItem({ ...p });
                                  setIsAddingNew(false);
                                }}
                                className={`px-2.5 py-1.5 cursor-pointer rounded-lg border text-[11px] hover:scale-95 duration-100 flex items-center gap-1 ${
                                  isDarkTheme ? "border-white/5 text-slate-400 hover:bg-white/5 hover:text-white" : "border-slate-300 text-slate-800 hover:bg-slate-150 hover:bg-slate-100"
                                }`}
                              >
                                <Edit2 className="w-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => deleteGalleryItem(p.id, p.title)}
                                className="px-2.5 py-1.5 cursor-pointer rounded-lg border border-red-500/10 text-[11px] text-red-500 hover:bg-red-500/5 hover:scale-95 duration-100 flex items-center gap-1"
                              >
                                <Trash2 className="w-3" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "alumni" && (
                    <div className="space-y-3 text-left">
                      {alumni.map((a) => (
                        <div key={a.name} className={`border rounded-xl p-4 flex items-center justify-between gap-4 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full border overflow-hidden shrink-0 border-white/5 bg-slate-950">
                              <img src={a.avatar} alt={a.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-mono tracking-widest uppercase font-bold text-amber-500`}>Lulusan {a.gradYear}</span>
                                <span className={`text-[9px] text-slate-500 hidden sm:inline`}>•</span>
                                <span className={`text-[9px] font-mono text-slate-600`}>{a.location}</span>
                              </div>
                              <h4 className={`text-sm font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>{a.name}</h4>
                              <p className={`text-[10px] ${isDarkTheme ? "text-slate-400" : "text-slate-550"} italic line-clamp-1`}>"{a.quote}"</p>
                              <span className={`text-[9px] text-[#2563eb] font-semibold dark:text-blue-400`}>{a.role} di {a.company}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingItem({ ...a });
                                setIsAddingNew(false);
                              }}
                              className={`p-2 rounded-lg border transition-all ${isDarkTheme ? "border-white/5 text-slate-400 hover:bg-white/5 hover:text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteAlumnusItem(a.name)}
                              className="p-2 rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/5 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "news" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      {news.map((n) => (
                        <div key={n.id} className={`border rounded-xl p-5 flex justify-between items-start gap-4 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <div className="flex gap-4">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden shrink-0 bg-slate-950 border border-white/5">
                              <img src={n.image} alt={n.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <span className="text-[9px] text-amber-500 font-bold font-mono tracking-wider block uppercase">{n.category}</span>
                              <h4 className={`text-sm font-bold line-clamp-1 mt-0.5 ${isDarkTheme ? "text-white" : "text-slate-900"}`}>{n.title}</h4>
                              <p className={`text-[10px] ${isDarkTheme ? "text-slate-400" : "text-slate-650"} mt-1 line-clamp-2`}>{n.excerpt}</p>
                              <div className="flex items-center gap-2 mt-2 text-[9px] font-mono text-slate-500">
                                <span>{n.date}</span>
                                <span>•</span>
                                <span>{n.readTime}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingItem({ ...n });
                                setIsAddingNew(false);
                              }}
                              className={`p-2 rounded-lg border transition-all ${isDarkTheme ? "border-white/5 text-slate-400 hover:bg-white/5 hover:text-white" : "border-slate-300 text-slate-705 hover:bg-slate-100"}`}
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteNewsItem(n.id, n.title)}
                              className="p-2 rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/5 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* BRANDING PANEL */}
                  {activeTab === "branding" && (() => {
                    const draft = brandingDraft ?? branding;
                    const handleFileInput = (field: keyof Branding) => async (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        showFeedback("Memproses gambar…", "success");
                        const compressed = await compressImage(file, 600, 600, 0.86, 220);
                        setBrandingDraft(prev => ({ ...(prev ?? branding), [field]: compressed }));
                      } catch {
                        showFeedback("Gagal memproses gambar. Coba file lain.", "error");
                      }
                    };
                    const handleRemove = (field: keyof Branding) => {
                      setBrandingDraft(prev => ({ ...(prev ?? branding), [field]: null }));
                    };
                    const handleSave = async () => {
                      if (!draft) return;
                      setBrandingLoading(true);
                      const ok = await saveBranding(draft);
                      setBrandingLoading(false);
                      if (ok) {
                        setBrandingDraft(null);
                        showFeedback("Identitas visual berhasil disimpan!", "success");
                      } else {
                        showFeedback("Gagal menyimpan identitas visual.", "error");
                      }
                    };
                    const logoFields: { key: keyof Branding; label: string; desc: string }[] = [
                      { key: "schoolLogo", label: "Logo Utama (Universal)", desc: "Digunakan sebagai fallback di semua mode" },
                      { key: "schoolLogoDark", label: "Logo Mode Gelap", desc: "Tampil di Navbar & Footer saat dark mode aktif" },
                      { key: "schoolLogoLight", label: "Logo Mode Terang", desc: "Tampil di Navbar & Footer saat light mode aktif" },
                      { key: "schoolFavicon", label: "Favicon (32×32 px)", desc: "Ikon tab browser, format PNG/ICO disarankan" },
                      { key: "schoolAppIcon", label: "App Icon (512×512 px)", desc: "Ikon aplikasi PWA resolusi tinggi" },
                    ];
                    return (
                      <div className="space-y-8 text-left">
                        {/* Current logo preview */}
                        {(draft.schoolLogo || draft.schoolLogoDark || draft.schoolLogoLight) && (
                          <div className={`p-6 rounded-2xl border ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                            <h4 className={`text-[10px] font-mono uppercase tracking-widest font-bold mb-4 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                              Pratinjau Logo Sekarang
                            </h4>
                            <div className="flex flex-wrap gap-6 items-center">
                              {[draft.schoolLogoDark ?? draft.schoolLogo, draft.schoolLogoLight ?? draft.schoolLogo].map((url, i) => url && (
                                <div key={i} className={`p-4 rounded-xl border flex items-center justify-center ${i === 0 ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"}`}>
                                  <img src={url} alt="Logo preview" className="h-14 w-auto object-contain" />
                                  <span className={`ml-3 text-[10px] font-mono ${i === 0 ? "text-slate-400" : "text-slate-500"}`}>{i === 0 ? "Dark Mode" : "Light Mode"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Logo upload fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {logoFields.map(({ key, label, desc }) => (
                            <div key={key} className={`p-5 rounded-2xl border ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className={`text-xs font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>{label}</h4>
                                  <p className={`text-[10px] font-mono mt-0.5 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>{desc}</p>
                                </div>
                                {draft[key] && (
                                  <button
                                    onClick={() => handleRemove(key)}
                                    className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors text-[10px] font-mono"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              {draft[key] ? (
                                <div className={`rounded-xl border overflow-hidden p-3 flex items-center justify-center mb-3 ${isDarkTheme ? "bg-slate-800 border-white/5" : "bg-slate-100 border-slate-200"}`}>
                                  <img src={draft[key] as string} alt={label} className="h-12 w-auto object-contain max-w-full" />
                                </div>
                              ) : (
                                <div className={`rounded-xl border border-dashed h-16 flex items-center justify-center mb-3 ${isDarkTheme ? "border-white/10 bg-slate-800/30" : "border-slate-300 bg-slate-50"}`}>
                                  <span className={`text-[10px] font-mono ${isDarkTheme ? "text-slate-600" : "text-slate-400"}`}>Belum ada logo</span>
                                </div>
                              )}
                              <label className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer transition-all text-[10px] font-mono uppercase tracking-widest font-bold ${
                                isDarkTheme
                                  ? "border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20"
                                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
                              }`}>
                                <Upload className="w-3.5 h-3.5" />
                                <span>{draft[key] ? "Ganti File" : "Upload File"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleFileInput(key)}
                                />
                              </label>
                            </div>
                          ))}
                        </div>

                        {/* Save button */}
                        <div className="flex items-center gap-4">
                          <button
                            onClick={handleSave}
                            disabled={brandingLoading}
                            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold tracking-wider flex items-center gap-2 shadow-md active:scale-95 duration-150"
                          >
                            {brandingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>Simpan Identitas Visual</span>
                          </button>
                          {brandingDraft && (
                            <button
                              onClick={() => setBrandingDraft(null)}
                              className={`px-4 py-3 rounded-xl text-xs font-mono border transition-all ${isDarkTheme ? "border-white/10 text-slate-400 hover:border-white/20" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                            >
                              Batal
                            </button>
                          )}
                          {brandingDraft && (
                            <span className="text-[10px] font-mono text-amber-500">● Perubahan belum disimpan</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ABOUT / FOTO GEDUNG PANEL */}
                  {activeTab === "about" && (() => {
                    const handleAboutFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        showFeedback("Memproses gambar…", "success");
                        const compressed = await compressImage(file, 1400, 1050, 0.82, 420);
                        setAboutData(prev => ({ ...prev, foto: compressed }));
                      } catch {
                        showFeedback("Gagal memproses gambar. Coba file lain.", "error");
                      }
                    };
                    const handleSaveAbout = async () => {
                      setAboutLoading(true);
                      try {
                        const res = await fetch("/api/about", { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(aboutData) });
                        if (res.ok) {
                          showFeedback("Foto gedung berhasil disimpan!", "success");
                        } else {
                          const err = await res.json().catch(() => ({}));
                          showFeedback(err.error || `Gagal menyimpan (${res.status})`, "error");
                        }
                      } catch { showFeedback("Koneksi gagal. Periksa server!", "error"); }
                      setAboutLoading(false);
                    };
                    const fallbackSrc = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1000&q=80";
                    return (
                      <div className="space-y-8 max-w-3xl">

                        {/* Live Preview */}
                        <div className={`p-6 rounded-2xl border ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <h4 className={`text-xs font-bold mb-4 ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Pratinjau Langsung</h4>
                          <div className="relative overflow-hidden rounded-xl aspect-[4/3] shadow-xl">
                            <img
                              src={aboutData.foto || fallbackSrc}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              style={{
                                objectPosition: `${aboutData.fotoX}% ${aboutData.fotoY}%`,
                                transform: `scale(${aboutData.fotoScale / 100})`,
                                transformOrigin: `${aboutData.fotoX}% ${aboutData.fotoY}%`,
                                filter: "contrast(1.06) saturate(1.08) brightness(1.02)",
                              }}
                            />
                            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.38) 100%)" }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-transparent to-transparent pointer-events-none" />
                            <span className="absolute top-3 right-3 text-[9px] font-mono bg-black/50 text-white px-2 py-1 rounded-full">PRATINJAU</span>
                          </div>
                        </div>

                        {/* Photo Upload */}
                        <div className={`p-6 rounded-2xl border ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <h4 className={`text-xs font-bold mb-4 ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Upload Foto Gedung</h4>
                          <div className="flex flex-col sm:flex-row gap-4 items-start">
                            <div className="flex flex-col gap-3 flex-1">
                              <label className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border cursor-pointer transition-all text-[10px] font-mono uppercase tracking-widest font-bold ${isDarkTheme ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>
                                <Upload className="w-3.5 h-3.5" />
                                {aboutData.foto ? "Ganti Foto" : "Upload Foto Gedung"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleAboutFoto} />
                              </label>
                              {aboutData.foto && (
                                <button onClick={() => setAboutData(prev => ({ ...prev, foto: null }))} className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-mono hover:bg-red-500/5 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" /> Gunakan Foto Default
                                </button>
                              )}
                              <p className={`text-[10px] font-mono ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>
                                Format: JPG, PNG, WebP. Gambar otomatis dikompres untuk kestabilan server.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Position & Zoom Controls */}
                        <div className={`p-6 rounded-2xl border space-y-6 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <h4 className={`text-xs font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Posisi & Zoom Foto</h4>

                          {/* X Position */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className={`text-[10px] font-mono uppercase tracking-widest ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Posisi Horizontal</label>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isDarkTheme ? "bg-slate-800 text-amber-400" : "bg-slate-100 text-amber-600"}`}>{aboutData.fotoX}%</span>
                            </div>
                            <input
                              type="range" min={0} max={100} step={1}
                              value={aboutData.fotoX}
                              onChange={e => setAboutData(prev => ({ ...prev, fotoX: Number(e.target.value) }))}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                            <div className={`flex justify-between text-[9px] font-mono ${isDarkTheme ? "text-slate-600" : "text-slate-400"}`}>
                              <span>Kiri</span><span>Tengah</span><span>Kanan</span>
                            </div>
                          </div>

                          {/* Y Position */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className={`text-[10px] font-mono uppercase tracking-widest ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Posisi Vertikal</label>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isDarkTheme ? "bg-slate-800 text-amber-400" : "bg-slate-100 text-amber-600"}`}>{aboutData.fotoY}%</span>
                            </div>
                            <input
                              type="range" min={0} max={100} step={1}
                              value={aboutData.fotoY}
                              onChange={e => setAboutData(prev => ({ ...prev, fotoY: Number(e.target.value) }))}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                            <div className={`flex justify-between text-[9px] font-mono ${isDarkTheme ? "text-slate-600" : "text-slate-400"}`}>
                              <span>Atas</span><span>Tengah</span><span>Bawah</span>
                            </div>
                          </div>

                          {/* Scale / Zoom */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className={`text-[10px] font-mono uppercase tracking-widest ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Zoom</label>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isDarkTheme ? "bg-slate-800 text-amber-400" : "bg-slate-100 text-amber-600"}`}>{aboutData.fotoScale}%</span>
                            </div>
                            <input
                              type="range" min={100} max={200} step={1}
                              value={aboutData.fotoScale}
                              onChange={e => setAboutData(prev => ({ ...prev, fotoScale: Number(e.target.value) }))}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                            <div className={`flex justify-between text-[9px] font-mono ${isDarkTheme ? "text-slate-600" : "text-slate-400"}`}>
                              <span>Normal (100%)</span><span>2× Zoom</span>
                            </div>
                          </div>

                          {/* Reset button */}
                          <button
                            onClick={() => setAboutData(prev => ({ ...prev, fotoX: 50, fotoY: 50, fotoScale: 100 }))}
                            className={`text-[10px] font-mono uppercase tracking-widest px-4 py-2 rounded-lg border transition-colors ${isDarkTheme ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                          >
                            Reset Posisi & Zoom
                          </button>
                        </div>

                        <button onClick={handleSaveAbout} disabled={aboutLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold tracking-wider shadow-md active:scale-95 duration-150">
                          {aboutLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Simpan Foto & Posisi
                        </button>
                      </div>
                    );
                  })()}

                  {/* KEPALA SEKOLAH PANEL */}
                  {activeTab === "kepala-sekolah" && (() => {
                    const handleKepalaFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        showFeedback("Memproses gambar…", "success");
                        const compressed = await compressImage(file, 700, 900, 0.85, 330);
                        setKepalaSekolah(prev => ({ ...prev, foto: compressed }));
                      } catch {
                        showFeedback("Gagal memproses gambar. Coba file lain.", "error");
                      }
                    };
                    const handleSaveKepala = async () => {
                      setKepalaLoading(true);
                      try {
                        const res = await fetch("/api/kepala-sekolah", { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(kepalaSekolah) });
                        if (res.ok) {
                          showFeedback("Data Kepala Sekolah berhasil disimpan!", "success");
                        } else {
                          const err = await res.json().catch(() => ({}));
                          showFeedback(err.error || `Gagal menyimpan (${res.status})`, "error");
                        }
                      } catch { showFeedback("Koneksi gagal. Periksa server!", "error"); }
                      setKepalaLoading(false);
                    };
                    return (
                      <div className="space-y-8 max-w-3xl">
                        {/* Photo Upload */}
                        <div className={`p-6 rounded-2xl border ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <h4 className={`text-xs font-bold mb-4 ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Foto Kepala Sekolah</h4>
                          <div className="flex flex-col sm:flex-row gap-6 items-start">
                            <div className={`w-36 h-44 rounded-2xl overflow-hidden border flex items-center justify-center shrink-0 ${isDarkTheme ? "bg-slate-800 border-white/5" : "bg-slate-100 border-slate-200"}`}>
                              {kepalaSekolah.foto ? (
                                <img src={kepalaSekolah.foto} alt="Kepala Sekolah" className="w-full h-full object-cover object-top" />
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <User className={`w-10 h-10 ${isDarkTheme ? "text-slate-600" : "text-slate-300"}`} />
                                  <span className={`text-[9px] font-mono ${isDarkTheme ? "text-slate-600" : "text-slate-400"}`}>Belum ada foto</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-3 flex-1">
                              <label className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border cursor-pointer transition-all text-[10px] font-mono uppercase tracking-widest font-bold ${isDarkTheme ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>
                                <Upload className="w-3.5 h-3.5" />
                                {kepalaSekolah.foto ? "Ganti Foto" : "Upload Foto"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleKepalaFoto} />
                              </label>
                              {kepalaSekolah.foto && (
                                <button onClick={() => setKepalaSekolah(prev => ({ ...prev, foto: null }))} className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-mono hover:bg-red-500/5 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" /> Hapus Foto
                                </button>
                              )}
                              <p className={`text-[10px] font-mono ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Format: JPG, PNG, WebP. Gambar otomatis dikompres untuk kestabilan server.</p>
                            </div>
                          </div>
                        </div>

                        {/* Identity Fields */}
                        <div className={`p-6 rounded-2xl border space-y-5 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <h4 className={`text-xs font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Identitas Kepala Sekolah</h4>
                          <div>
                            <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Nama Lengkap</label>
                            <input
                              type="text"
                              value={kepalaSekolah.nama}
                              onChange={e => setKepalaSekolah(prev => ({ ...prev, nama: e.target.value }))}
                              placeholder="Nama Kepala Sekolah"
                              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${isDarkTheme ? "bg-slate-800 border-white/10 text-white placeholder-slate-600 focus:border-amber-500/40" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300 focus:border-amber-400"}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>NIP</label>
                            <input
                              type="text"
                              value={kepalaSekolah.nip}
                              onChange={e => setKepalaSekolah(prev => ({ ...prev, nip: e.target.value }))}
                              placeholder="Nomor Induk Pegawai"
                              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${isDarkTheme ? "bg-slate-800 border-white/10 text-white placeholder-slate-600 focus:border-amber-500/40" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300 focus:border-amber-400"}`}
                            />
                          </div>
                        </div>

                        {/* Sambutan Text */}
                        <div className={`p-6 rounded-2xl border space-y-4 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <h4 className={`text-xs font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Teks Sambutan</h4>
                          <p className={`text-[10px] font-mono ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Gunakan baris baru untuk memisahkan paragraf.</p>
                          <textarea
                            rows={10}
                            value={kepalaSekolah.sambutan}
                            onChange={e => setKepalaSekolah(prev => ({ ...prev, sambutan: e.target.value }))}
                            placeholder="Tulis sambutan kepala sekolah di sini..."
                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors resize-y leading-relaxed ${isDarkTheme ? "bg-slate-800 border-white/10 text-white placeholder-slate-600 focus:border-amber-500/40" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300 focus:border-amber-400"}`}
                          />
                        </div>

                        <button onClick={handleSaveKepala} disabled={kepalaLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold tracking-wider shadow-md active:scale-95 duration-150">
                          {kepalaLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Simpan Profil Kepala Sekolah
                        </button>
                      </div>
                    );
                  })()}

                  {/* MANAJEMEN SEKOLAH PANEL */}
                  {activeTab === "manajemen-sekolah" && (() => {
                    const handleManajemenFoto = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        showFeedback("Memproses gambar…", "success");
                        const compressed = await compressImage(file, 600, 800, 0.85, 295);
                        setManajemenSekolah(prev => prev.map(p => p.id === id ? { ...p, foto: compressed } : p));
                      } catch {
                        showFeedback("Gagal memproses gambar. Coba file lain.", "error");
                      }
                    };
                    const handleSaveManajemen = async () => {
                      setManajemenLoading(true);
                      try {
                        const res = await fetch("/api/manajemen-sekolah", { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(manajemenSekolah) });
                        if (res.ok) {
                          showFeedback("Data Manajemen Sekolah berhasil disimpan!", "success");
                        } else {
                          const err = await res.json().catch(() => ({}));
                          showFeedback(err.error || `Gagal menyimpan (${res.status})`, "error");
                        }
                      } catch { showFeedback("Koneksi gagal. Periksa server!", "error"); }
                      setManajemenLoading(false);
                    };
                    return (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {(Array.isArray(manajemenSekolah) ? manajemenSekolah : []).map((person) => (
                            <div key={person.id} className={`p-5 rounded-2xl border space-y-4 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                              <div className={`text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full inline-flex ${isDarkTheme ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
                                {person.jabatan}
                              </div>

                              {/* Photo */}
                              <div className="flex items-center gap-4">
                                <div className={`w-20 h-24 rounded-xl overflow-hidden border flex items-center justify-center shrink-0 ${isDarkTheme ? "bg-slate-800 border-white/5" : "bg-slate-100 border-slate-200"}`}>
                                  {person.foto ? (
                                    <img src={person.foto} alt={person.jabatan} className="w-full h-full object-cover object-top" />
                                  ) : (
                                    <User className={`w-8 h-8 ${isDarkTheme ? "text-slate-600" : "text-slate-300"}`} />
                                  )}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <label className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border cursor-pointer text-[10px] font-mono uppercase tracking-widest font-bold transition-all ${isDarkTheme ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                                    <Upload className="w-3 h-3" />
                                    {person.foto ? "Ganti" : "Upload"} Foto
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleManajemenFoto(person.id, e)} />
                                  </label>
                                  {person.foto && (
                                    <button onClick={() => setManajemenSekolah(prev => prev.map(p => p.id === person.id ? { ...p, foto: null } : p))} className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-red-500/20 text-red-500 text-[10px] font-mono hover:bg-red-500/5 transition-colors">
                                      <Trash2 className="w-3 h-3" /> Hapus
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Name field */}
                              <div>
                                <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Nama Lengkap</label>
                                <input
                                  type="text"
                                  value={person.nama === "-" ? "" : person.nama}
                                  onChange={e => setManajemenSekolah(prev => prev.map(p => p.id === person.id ? { ...p, nama: e.target.value } : p))}
                                  placeholder={`Nama ${person.jabatan}`}
                                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${isDarkTheme ? "bg-slate-800 border-white/10 text-white placeholder-slate-600 focus:border-amber-500/40" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300 focus:border-amber-400"}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <button onClick={handleSaveManajemen} disabled={manajemenLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold tracking-wider shadow-md active:scale-95 duration-150">
                          {manajemenLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Simpan Data Manajemen Sekolah
                        </button>
                      </div>
                    );
                  })()}

                  {/* VISI MISI PANEL */}
                  {activeTab === "visi-misi" && (() => {
                    const handleSaveVisiMisi = async () => {
                      setVisiMisiLoading(true);
                      try {
                        const res = await fetch("/api/visi-misi", { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(visiMisi) });
                        if (res.ok) {
                          showFeedback("Visi & Misi berhasil disimpan!", "success");
                        } else {
                          const err = await res.json().catch(() => ({}));
                          showFeedback(err.error || `Gagal menyimpan (${res.status})`, "error");
                        }
                      } catch { showFeedback("Koneksi gagal. Periksa server!", "error"); }
                      setVisiMisiLoading(false);
                    };
                    const updateMisiItem = (i: number, val: string) => {
                      setVisiMisi(prev => { const m = [...prev.misi]; m[i] = val; return { ...prev, misi: m }; });
                    };
                    const addMisiItem = () => setVisiMisi(prev => ({ ...prev, misi: [...prev.misi, ""] }));
                    const removeMisiItem = (i: number) => setVisiMisi(prev => ({ ...prev, misi: prev.misi.filter((_, idx) => idx !== i) }));
                    return (
                      <div className="space-y-8 max-w-3xl">
                        {/* Visi */}
                        <div className={`p-6 rounded-2xl border space-y-4 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <div className="flex items-center gap-2">
                            <Telescope className="w-4 h-4 text-amber-500" />
                            <h4 className={`text-xs font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Visi Sekolah</h4>
                          </div>
                          <textarea
                            rows={4}
                            value={visiMisi.visi}
                            onChange={e => setVisiMisi(prev => ({ ...prev, visi: e.target.value }))}
                            placeholder="Tulis visi sekolah di sini..."
                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors resize-y leading-relaxed ${isDarkTheme ? "bg-slate-800 border-white/10 text-white placeholder-slate-600 focus:border-amber-500/40" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300 focus:border-amber-400"}`}
                          />
                        </div>

                        {/* Misi */}
                        <div className={`p-6 rounded-2xl border space-y-4 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-slate-500" />
                              <h4 className={`text-xs font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Misi Sekolah</h4>
                            </div>
                            <button onClick={addMisiItem} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-widest font-bold transition-all ${isDarkTheme ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                              <Plus className="w-3 h-3" /> Tambah Butir Misi
                            </button>
                          </div>
                          <div className="space-y-3">
                            {visiMisi.misi.map((item, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <span className={`mt-3 text-[10px] font-mono font-bold shrink-0 w-5 text-center ${isDarkTheme ? "text-amber-500" : "text-amber-600"}`}>{i + 1}.</span>
                                <input
                                  type="text"
                                  value={item}
                                  onChange={e => updateMisiItem(i, e.target.value)}
                                  placeholder={`Butir misi ke-${i + 1}`}
                                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${isDarkTheme ? "bg-slate-800 border-white/10 text-white placeholder-slate-600 focus:border-amber-500/40" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300 focus:border-amber-400"}`}
                                />
                                <button onClick={() => removeMisiItem(i)} className="mt-2 p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            {visiMisi.misi.length === 0 && (
                              <p className={`text-xs italic ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Belum ada butir misi. Klik "Tambah Butir Misi" untuk menambahkan.</p>
                            )}
                          </div>
                        </div>

                        <button onClick={handleSaveVisiMisi} disabled={visiMisiLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold tracking-wider shadow-md active:scale-95 duration-150">
                          {visiMisiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Simpan Visi &amp; Misi
                        </button>
                      </div>
                    );
                  })()}

                  {/* PARTNERS LIST */}
                  {activeTab === "partners" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-left">
                      {partners.map((p) => {
                        const colorDotMap: Record<string, string> = {
                          amber: "bg-amber-400", blue: "bg-blue-400", emerald: "bg-emerald-400",
                          rose: "bg-rose-400", violet: "bg-violet-400", cyan: "bg-cyan-400",
                          orange: "bg-orange-400", indigo: "bg-indigo-400", teal: "bg-teal-400",
                        };
                        const dot = colorDotMap[p.color] ?? "bg-amber-400";
                        return (
                          <div key={p.id} className={`border rounded-xl p-5 flex justify-between items-center gap-4 ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-3 h-3 rounded-full shrink-0 ${dot}`} />
                              <div className="min-w-0">
                                <h4 className={`text-sm font-bold truncate ${isDarkTheme ? "text-white" : "text-slate-900"}`}>{p.name}</h4>
                                <span className={`text-[10px] font-mono uppercase tracking-wider ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>{p.type}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => { setEditingItem({ ...p }); setIsAddingNew(false); }}
                                className={`p-2 rounded-lg border transition-all ${isDarkTheme ? "border-white/5 text-slate-400 hover:bg-white/5 hover:text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deletePartnerItem(p.id, p.name)}
                                className="p-2 rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/5 transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SOCIAL MEDIA MANAGER */}
                  {activeTab === "social-media" && (() => {
                    const socialFields = [
                      { key: "instagram" as const, label: "Instagram", placeholder: "https://instagram.com/smkn1wonogiri", icon: "📸" },
                      { key: "youtube" as const, label: "YouTube", placeholder: "https://youtube.com/@smkn1wonogiri", icon: "▶️" },
                      { key: "facebook" as const, label: "Facebook", placeholder: "https://facebook.com/smkn1wonogiri", icon: "👥" },
                      { key: "tiktok" as const, label: "TikTok", placeholder: "https://tiktok.com/@smkn1wonogiri", icon: "🎵" },
                      { key: "twitter" as const, label: "Twitter / X", placeholder: "https://twitter.com/smkn1wonogiri", icon: "🐦" },
                      { key: "website" as const, label: "Website Resmi", placeholder: "https://smkn1wonogiri.sch.id", icon: "🌐" },
                    ];
                    return (
                      <div className={`rounded-2xl border p-6 md:p-8 text-left ${isDarkTheme ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"}`}>
                        <div className="mb-6 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkTheme ? "bg-amber-500/10" : "bg-amber-50"}`}>
                            <Globe className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <h3 className={`text-sm font-bold ${isDarkTheme ? "text-white" : "text-slate-900"}`}>Tautan Media Sosial & Website</h3>
                            <p className={`text-xs mt-0.5 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>URL yang diisi akan tampil sebagai ikon di footer halaman utama. Kosongkan jika tidak digunakan.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {socialFields.map(({ key, label, placeholder, icon }) => (
                            <div key={key} className="flex flex-col gap-1.5">
                              <label className={`text-xs font-semibold font-mono uppercase tracking-wider ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                                {icon} {label}
                              </label>
                              <input
                                type="url"
                                value={socialMedia[key]}
                                onChange={(e) => setSocialMedia(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={placeholder}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-colors outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 ${
                                  isDarkTheme
                                    ? "bg-slate-800 border-white/5 text-slate-200 placeholder-slate-600"
                                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 flex items-center gap-3">
                          <button
                            onClick={async () => {
                              setSocialMediaLoading(true);
                              try {
                                const res = await fetch("/api/social-media", {
                                  method: "POST",
                                  headers: getAuthHeaders(),
                                  body: JSON.stringify(socialMedia)
                                });
                                if (res.ok) {
                                  showFeedback("Tautan media sosial berhasil disimpan!", "success");
                                } else {
                                  showFeedback("Gagal menyimpan tautan. Coba lagi!", "error");
                                }
                              } catch {
                                showFeedback("Koneksi gagal. Periksa server!", "error");
                              } finally {
                                setSocialMediaLoading(false);
                              }
                            }}
                            disabled={socialMediaLoading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            {socialMediaLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {socialMediaLoading ? "Menyimpan..." : "Simpan Tautan"}
                          </button>
                          <p className={`text-[10px] font-mono ${isDarkTheme ? "text-slate-600" : "text-slate-400"}`}>
                            Perubahan akan tampil di Footer halaman utama.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── INBOX PESAN MASUK PANEL ─────────────────────────── */}
                  {activeTab === "inbox-pesan" && (() => {
                    const keperluanOptions = [
                      "semua",
                      "Informasi Pendaftaran PPDB",
                      "Informasi Jurusan / Program Keahlian",
                      "Informasi Biaya Sekolah",
                      "Kerjasama & Kemitraan Industri",
                      "Magang / PKL Siswa",
                      "Alumni & Bursa Kerja (BKK)",
                      "Permohonan Dokumen / Surat",
                      "Kunjungan / Studi Banding",
                      "Pengaduan & Saran",
                      "Lainnya",
                    ];

                    const filtered = contactMessages.filter(m => {
                      const q = contactSearch.toLowerCase();
                      const matchSearch = !q || m.nama.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.pesan.toLowerCase().includes(q) || m.keperluan.toLowerCase().includes(q);
                      const matchStatus = contactFilterStatus === "semua" || (contactFilterStatus === "belum-dibaca" ? !m.dibaca : m.dibaca);
                      const matchKeperluan = contactFilterKeperluan === "semua" || m.keperluan === contactFilterKeperluan;
                      return matchSearch && matchStatus && matchKeperluan;
                    });

                    const selectedMsg = filtered.find(m => m.id === selectedMessageId) || filtered[0] || null;

                    const markAsRead = async (id: string) => {
                      try {
                        await fetch(`/api/contact/${id}/baca`, { method: "PATCH", headers: getAuthHeaders() });
                        setContactMessages(prev => prev.map(m => m.id === id ? { ...m, dibaca: true } : m));
                      } catch { showFeedback("Gagal menandai pesan.", "error"); }
                    };

                    const deleteMessage = async (id: string, nama: string) => {
                      if (!window.confirm(`Hapus pesan dari "${nama}"? Tindakan ini tidak dapat dibatalkan.`)) return;
                      setContactDeleting(prev => new Set([...prev, id]));
                      try {
                        const res = await fetch(`/api/contact/${id}`, { method: "DELETE", headers: getAuthHeaders() });
                        if (res.ok) {
                          setContactMessages(prev => prev.filter(m => m.id !== id));
                          if (selectedMessageId === id) setSelectedMessageId(null);
                          showFeedback(`Pesan dari "${nama}" berhasil dihapus.`, "success");
                        } else { showFeedback("Gagal menghapus pesan.", "error"); }
                      } catch { showFeedback("Gagal menghapus pesan.", "error"); }
                      setContactDeleting(prev => { const s = new Set(prev); s.delete(id); return s; });
                    };

                    const markAllRead = async () => {
                      const unread = contactMessages.filter(m => !m.dibaca);
                      for (const m of unread) {
                        try { await fetch(`/api/contact/${m.id}/baca`, { method: "PATCH", headers: getAuthHeaders() }); } catch {}
                      }
                      setContactMessages(prev => prev.map(m => ({ ...m, dibaca: true })));
                      showFeedback(`${unread.length} pesan ditandai sudah dibaca.`, "success");
                    };

                    const formatTime = (iso: string) => {
                      try {
                        const d = new Date(iso);
                        const now = new Date();
                        const diffMs = now.getTime() - d.getTime();
                        const diffMin = Math.floor(diffMs / 60000);
                        const diffH = Math.floor(diffMin / 60);
                        const diffD = Math.floor(diffH / 24);
                        if (diffMin < 1) return "Baru saja";
                        if (diffMin < 60) return `${diffMin} mnt lalu`;
                        if (diffH < 24) return `${diffH} jam lalu`;
                        if (diffD < 7) return `${diffD} hari lalu`;
                        return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                      } catch { return iso; }
                    };

                    const formatFullTime = (iso: string) => {
                      try {
                        return new Date(iso).toLocaleString("id-ID", {
                          weekday: "long", day: "numeric", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        });
                      } catch { return iso; }
                    };

                    const totalUnread = contactMessages.filter(m => !m.dibaca).length;

                    return (
                      <div className="space-y-5 text-left">

                        {/* ── Stats Row ── */}
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: "Total Pesan", val: contactMessages.length, icon: MessageSquare, color: "text-blue-500", bg: isDarkTheme ? "bg-blue-500/8 border-blue-500/15" : "bg-blue-50 border-blue-100" },
                            { label: "Belum Dibaca", val: totalUnread, icon: Mail, color: "text-amber-500", bg: isDarkTheme ? "bg-amber-500/8 border-amber-500/15" : "bg-amber-50 border-amber-100" },
                            { label: "Sudah Dibaca", val: contactMessages.length - totalUnread, icon: MailCheck, color: "text-emerald-500", bg: isDarkTheme ? "bg-emerald-500/8 border-emerald-500/15" : "bg-emerald-50 border-emerald-100" },
                          ].map(s => (
                            <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-3 ${s.bg}`}>
                              <s.icon className={`w-5 h-5 shrink-0 ${s.color}`} />
                              <div>
                                <p className={`text-xl font-bold font-mono ${isDarkTheme ? "text-white" : "text-slate-900"}`}>{s.val}</p>
                                <p className={`text-[10px] uppercase tracking-widest font-mono ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>{s.label}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ── Toolbar ── */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className={`flex-1 min-w-[180px] flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${isDarkTheme ? "bg-slate-900 border-white/8" : "bg-white border-slate-200"}`}>
                            <Search className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              placeholder="Cari nama, email, pesan…"
                              value={contactSearch}
                              onChange={e => setContactSearch(e.target.value)}
                              className={`flex-1 outline-none bg-transparent text-xs ${isDarkTheme ? "text-slate-100 placeholder:text-slate-600" : "text-slate-800 placeholder:text-slate-400"}`}
                            />
                            {contactSearch && <button onClick={() => setContactSearch("")} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
                          </div>

                          {/* Status Filter */}
                          {(["semua", "belum-dibaca", "sudah-dibaca"] as const).map(f => (
                            <button key={f} onClick={() => setContactFilterStatus(f)}
                              className={`px-3 py-2 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-all ${
                                contactFilterStatus === f
                                  ? "bg-amber-500 border-amber-500 text-slate-950 font-bold"
                                  : isDarkTheme ? "border-white/8 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-100"
                              }`}>
                              {f === "semua" ? "Semua" : f === "belum-dibaca" ? "Belum Dibaca" : "Sudah Dibaca"}
                            </button>
                          ))}

                          {/* Keperluan Dropdown */}
                          <div className="relative" onClick={() => setContactKeperluanDropOpen(v => !v)}>
                            <button className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-all ${
                              contactFilterKeperluan !== "semua"
                                ? "bg-amber-500 border-amber-500 text-slate-950 font-bold"
                                : isDarkTheme ? "border-white/8 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}>
                              <Filter className="w-3 h-3" />
                              {contactFilterKeperluan === "semua" ? "Keperluan" : contactFilterKeperluan.slice(0, 18) + (contactFilterKeperluan.length > 18 ? "…" : "")}
                              <ChevronDown className={`w-3 h-3 transition-transform ${contactKeperluanDropOpen ? "rotate-180" : ""}`} />
                            </button>
                            <AnimatePresence>
                              {contactKeperluanDropOpen && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                  className={`absolute right-0 top-full mt-2 w-64 rounded-xl border shadow-xl z-50 overflow-hidden ${isDarkTheme ? "bg-slate-900 border-white/8" : "bg-white border-slate-200"}`}>
                                  {keperluanOptions.map(opt => (
                                    <button key={opt} onClick={() => { setContactFilterKeperluan(opt); setContactKeperluanDropOpen(false); }}
                                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                                        contactFilterKeperluan === opt
                                          ? "bg-amber-500 text-slate-950 font-bold"
                                          : isDarkTheme ? "text-slate-300 hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"
                                      }`}>
                                      {opt === "semua" ? "— Semua Keperluan —" : opt}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="ml-auto flex items-center gap-2">
                            {totalUnread > 0 && (
                              <button onClick={markAllRead}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-all ${isDarkTheme ? "border-white/8 text-emerald-400 hover:bg-emerald-500/8" : "border-slate-200 text-emerald-600 hover:bg-emerald-50"}`}>
                                <MailCheck className="w-3.5 h-3.5" />
                                Tandai Semua Dibaca
                              </button>
                            )}
                            <button onClick={loadContactMessages} disabled={contactLoading}
                              className={`p-2 rounded-xl border transition-all ${isDarkTheme ? "border-white/8 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                              <RefreshCw className={`w-4 h-4 ${contactLoading ? "animate-spin" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* ── Main Two-Panel Email Client Layout ── */}
                        {contactLoading ? (
                          <div className="flex items-center justify-center py-20">
                            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                          </div>
                        ) : filtered.length === 0 ? (
                          <div className={`py-20 text-center rounded-2xl border ${isDarkTheme ? "border-dashed border-white/5" : "border-dashed border-slate-200"}`}>
                            <Inbox className="w-8 h-8 mx-auto text-slate-400/50 mb-3" />
                            <p className={`text-sm font-semibold ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                              {contactMessages.length === 0 ? "Belum ada pesan masuk" : "Tidak ada pesan yang cocok"}
                            </p>
                            <p className={`text-xs mt-1 ${isDarkTheme ? "text-slate-600" : "text-slate-400"}`}>
                              {contactMessages.length === 0 ? "Pesan dari halaman Hubungi Kami akan muncul di sini." : "Coba ubah filter pencarian."}
                            </p>
                          </div>
                        ) : (
                          <div className={`rounded-2xl border overflow-hidden ${isDarkTheme ? "border-white/8" : "border-slate-200"}`}
                            style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: 560 }}>

                            {/* Left: Message List */}
                            <div className={`border-r overflow-y-auto ${isDarkTheme ? "border-white/8" : "border-slate-200"}`} style={{ maxHeight: 620 }}>
                              {filtered.map(msg => {
                                const isSelected = selectedMessageId === msg.id || (!selectedMessageId && msg.id === filtered[0]?.id);
                                return (
                                  <button key={msg.id} onClick={() => { setSelectedMessageId(msg.id); if (!msg.dibaca) markAsRead(msg.id); }}
                                    className={`w-full text-left px-4 py-4 border-b transition-all ${
                                      isDarkTheme ? "border-white/5" : "border-slate-100"
                                    } ${isSelected
                                      ? isDarkTheme ? "bg-amber-500/10 border-l-2 border-l-amber-500" : "bg-amber-50 border-l-2 border-l-amber-500"
                                      : isDarkTheme ? "hover:bg-white/3" : "hover:bg-slate-50"
                                    }`}>
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-2 min-w-0">
                                        {!msg.dibaca && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />}
                                        <span className={`text-xs font-semibold truncate ${isDarkTheme ? "text-slate-100" : "text-slate-900"} ${!msg.dibaca ? "font-bold" : ""}`}>
                                          {msg.nama}
                                        </span>
                                      </div>
                                      <span className={`text-[10px] font-mono shrink-0 ${isDarkTheme ? "text-slate-600" : "text-slate-400"}`}>
                                        {formatTime(msg.waktu)}
                                      </span>
                                    </div>
                                    <p className={`text-[10px] truncate mb-1.5 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>{msg.email}</p>
                                    <span className={`inline-block text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                      isDarkTheme ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                                    }`}>{msg.keperluan.slice(0, 28)}{msg.keperluan.length > 28 ? "…" : ""}</span>
                                    <p className={`text-[11px] mt-2 leading-relaxed line-clamp-2 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>
                                      {msg.pesan}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Right: Message Detail */}
                            {selectedMsg ? (
                              <div className={`flex flex-col ${isDarkTheme ? "bg-slate-900/40" : "bg-white"}`}>
                                {/* Detail Header */}
                                <div className={`px-6 py-4 border-b flex items-start justify-between gap-4 ${isDarkTheme ? "border-white/8" : "border-slate-100"}`}>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                        selectedMsg.dibaca
                                          ? isDarkTheme ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                                          : isDarkTheme ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
                                      }`}>
                                        {selectedMsg.dibaca ? "Sudah Dibaca" : "Belum Dibaca"}
                                      </span>
                                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full ${isDarkTheme ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                                        {selectedMsg.keperluan}
                                      </span>
                                    </div>
                                    <h3 className={`text-sm font-bold mt-1 ${isDarkTheme ? "text-white" : "text-slate-900"}`}>{selectedMsg.nama}</h3>
                                    <p className={`text-[11px] mt-0.5 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>{formatFullTime(selectedMsg.waktu)}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {!selectedMsg.dibaca && (
                                      <button onClick={() => markAsRead(selectedMsg.id)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-all ${isDarkTheme ? "border-white/8 text-emerald-400 hover:bg-emerald-500/8" : "border-slate-200 text-emerald-600 hover:bg-emerald-50"}`}>
                                        <Eye className="w-3.5 h-3.5" />
                                        Tandai Dibaca
                                      </button>
                                    )}
                                    <button onClick={() => deleteMessage(selectedMsg.id, selectedMsg.nama)}
                                      disabled={contactDeleting.has(selectedMsg.id)}
                                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-all ${isDarkTheme ? "border-red-500/20 text-red-400 hover:bg-red-500/8" : "border-red-200 text-red-500 hover:bg-red-50"}`}>
                                      {contactDeleting.has(selectedMsg.id) ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                      Hapus
                                    </button>
                                  </div>
                                </div>

                                {/* Sender Details */}
                                <div className={`px-6 py-4 border-b grid grid-cols-3 gap-4 ${isDarkTheme ? "border-white/8 bg-slate-900/60" : "border-slate-100 bg-slate-50/60"}`}>
                                  {[
                                    { icon: User, label: "Nama Lengkap", val: selectedMsg.nama },
                                    { icon: Mail, label: "Email", val: selectedMsg.email, href: `mailto:${selectedMsg.email}` },
                                    { icon: Phone, label: "No. HP/WA", val: selectedMsg.noHp || "—", href: selectedMsg.noHp ? `tel:${selectedMsg.noHp}` : undefined },
                                  ].map(({ icon: Icon, label, val, href }) => (
                                    <div key={label}>
                                      <p className={`text-[9px] font-mono uppercase tracking-widest mb-1 ${isDarkTheme ? "text-slate-600" : "text-slate-400"}`}>{label}</p>
                                      {href ? (
                                        <a href={href} className={`text-xs font-medium break-all ${isDarkTheme ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700"}`}>{val}</a>
                                      ) : (
                                        <p className={`text-xs font-medium ${isDarkTheme ? "text-slate-200" : "text-slate-700"}`}>{val}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Message Body */}
                                <div className="px-6 py-5 flex-1">
                                  <p className={`text-[10px] font-mono uppercase tracking-widest mb-3 ${isDarkTheme ? "text-slate-600" : "text-slate-400"}`}>Isi Pesan</p>
                                  <div className={`p-5 rounded-xl border leading-relaxed text-sm whitespace-pre-wrap ${isDarkTheme ? "bg-slate-900 border-white/5 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                                    {selectedMsg.pesan}
                                  </div>
                                </div>

                                {/* Quick Reply Buttons */}
                                <div className={`px-6 py-4 border-t flex gap-3 ${isDarkTheme ? "border-white/8" : "border-slate-100"}`}>
                                  <a href={`mailto:${selectedMsg.email}?subject=Re: ${encodeURIComponent(selectedMsg.keperluan)} - SMKN 1 Wonogiri&body=Yth. ${encodeURIComponent(selectedMsg.nama)},%0A%0A`}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-widest transition-colors shadow-sm">
                                    <MailOpen className="w-3.5 h-3.5" />
                                    Balas via Email
                                  </a>
                                  {selectedMsg.noHp && (
                                    <a href={`https://wa.me/${selectedMsg.noHp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Halo " + selectedMsg.nama + ", terima kasih telah menghubungi SMKN 1 Wonogiri.")}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-colors ${isDarkTheme ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/8" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                                      <Phone className="w-3.5 h-3.5" />
                                      WhatsApp
                                    </a>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full text-center p-8">
                                <div>
                                  <Inbox className="w-10 h-10 mx-auto text-slate-400/40 mb-3" />
                                  <p className={`text-sm ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Pilih pesan untuk membacanya</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Tracer Study Panel */}
                  {activeTab === "tracer-studi" && (
                    <div className="space-y-6">
                      {/* Feedback toast */}
                      <AnimatePresence>
                        {tracerFeedback && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
                          >
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            {tracerFeedback}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Action bar */}
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={loadTracerEntries}
                          disabled={tracerLoading}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                            isDarkTheme
                              ? "bg-slate-800 border-white/8 text-slate-300 hover:bg-slate-700"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <RefreshCw className={`w-4 h-4 ${tracerLoading ? "animate-spin" : ""}`} />
                          {tracerLoading ? "Memuat..." : "Refresh"}
                        </button>
                        <button
                          onClick={exportTracerExcel}
                          disabled={tracerExporting || tracerEntries.length === 0}
                          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          {tracerExporting ? "Mengekspor..." : `Ekspor Excel (.xlsx) — ${tracerEntries.length} data`}
                        </button>
                      </div>

                      {/* Error */}
                      {tracerError && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" /> {tracerError}
                        </div>
                      )}

                      {/* Stats cards */}
                      {!tracerLoading && tracerEntries.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          {[
                            { label: "Total Responden", value: tracerStats.total, icon: Users, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                            { label: "Bekerja", value: tracerStats.bekerja, icon: Briefcase, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                            { label: "Kuliah", value: tracerStats.kuliah, icon: GraduationCap, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                            { label: "Wirausaha", value: tracerStats.wirausaha, icon: Store, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
                            { label: "Belum Bekerja", value: tracerStats.belum, icon: Clock, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
                            { label: "% Produktif", value: `${pct(tracerStats.productive, tracerStats.total)}%`, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                          ].map(({ label, value, icon: Icon, color, bg }) => (
                            <div key={label} className={`rounded-xl p-4 border ${isDarkTheme ? "bg-slate-800/60 border-white/8" : "bg-white border-slate-200"} flex flex-col gap-2`}>
                              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                              </div>
                              <div className={`text-2xl font-bold ${color}`}>{value}</div>
                              <div className={`text-xs ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Export info card */}
                      <div className={`rounded-xl p-5 border ${isDarkTheme ? "bg-slate-800/40 border-white/8" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <div className={`font-semibold text-sm mb-1 ${isDarkTheme ? "text-slate-100" : "text-slate-800"}`}>Format Ekspor Excel — 3 Sheet</div>
                            <ul className={`text-xs space-y-1 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                              <li>• <span className="font-medium text-emerald-400">Sheet 1 — Ringkasan:</span> Statistik total, sebaran jurusan, tahun lulus, rentang gaji, relevansi</li>
                              <li>• <span className="font-medium text-blue-400">Sheet 2 — Data Responden:</span> Semua kolom per baris (20 kolom lengkap)</li>
                              <li>• <span className="font-medium text-violet-400">Sheet 3 — Per Jurusan:</span> Tabel silang jurusan × status (bekerja, kuliah, wirausaha, belum)</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Data table */}
                      <div className={`rounded-xl border overflow-hidden ${isDarkTheme ? "border-white/8" : "border-slate-200"}`}>
                        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkTheme ? "bg-slate-800/60 border-white/8" : "bg-slate-50 border-slate-200"}`}>
                          <span className={`text-sm font-semibold ${isDarkTheme ? "text-slate-200" : "text-slate-700"}`}>
                            Daftar Responden
                          </span>
                          <span className={`text-xs ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                            {tracerEntries.length} responden
                          </span>
                        </div>

                        {tracerLoading ? (
                          <div className="flex items-center justify-center py-16 gap-3">
                            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                            <span className={`text-sm ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Memuat data...</span>
                          </div>
                        ) : tracerEntries.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <BarChart3 className={`w-10 h-10 ${isDarkTheme ? "text-slate-600" : "text-slate-300"}`} />
                            <span className={`text-sm ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Belum ada data tracer study</span>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className={`text-xs uppercase tracking-wider ${isDarkTheme ? "bg-slate-800/80 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                                  <th className="px-4 py-3 text-left font-semibold">Nama</th>
                                  <th className="px-4 py-3 text-left font-semibold">Jurusan</th>
                                  <th className="px-4 py-3 text-left font-semibold">Tahun</th>
                                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                                  <th className="px-4 py-3 text-left font-semibold">Detail</th>
                                  <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                                  <th className="px-4 py-3 text-center font-semibold">Hapus</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {[...tracerEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(entry => {
                                  const statusColors: Record<string, string> = {
                                    bekerja: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                                    kuliah: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                                    wirausaha: "text-violet-400 bg-violet-500/10 border-violet-500/20",
                                    belum_bekerja: "text-slate-400 bg-slate-500/10 border-slate-500/20",
                                  };
                                  const detail = entry.namaPerusahaan ?? entry.universitas ?? entry.namaUsaha ?? entry.alasanBelumBekerja ?? "—";
                                  return (
                                    <tr key={entry.id} className={`transition-colors ${isDarkTheme ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                                      <td className={`px-4 py-3 font-medium ${isDarkTheme ? "text-slate-200" : "text-slate-800"}`}>{entry.nama}</td>
                                      <td className={`px-4 py-3 text-xs ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>{entry.jurusan}</td>
                                      <td className={`px-4 py-3 text-xs ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>{entry.tahunLulus}</td>
                                      <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColors[entry.status] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20"}`}>
                                          {({bekerja:"Bekerja",kuliah:"Kuliah",wirausaha:"Wirausaha",belum_bekerja:"Belum"})[entry.status] ?? entry.status}
                                        </span>
                                      </td>
                                      <td className={`px-4 py-3 text-xs max-w-[180px] truncate ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`} title={detail}>{detail}</td>
                                      <td className={`px-4 py-3 text-xs whitespace-nowrap ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>{fmtDate(entry.createdAt)}</td>
                                      <td className="px-4 py-3 text-center">
                                        <button
                                          onClick={() => handleTracerDelete(entry.id, entry.nama)}
                                          disabled={tracerDeleteId === entry.id}
                                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                          title="Hapus entri ini"
                                        >
                                          {tracerDeleteId === entry.id
                                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                                            : <Trash2 className="w-4 h-4" />
                                          }
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Server Monitor Panel */}
                  {activeTab === "server-monitor" && (
                    <div className="space-y-6">
                      {/* Top action bar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {healthData && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest ${
                              healthData.status === "ok"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {healthData.status === "ok" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                              {healthData.status === "ok" ? "Server Online" : "Degraded"}
                            </span>
                          )}
                          {healthLastFetched && (
                            <span className={`text-[10px] font-mono ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>
                              Diperbarui: {healthLastFetched.toLocaleTimeString("id-ID")}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={fetchHealthData}
                          disabled={healthLoading}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                            isDarkTheme
                              ? "border-white/10 text-slate-300 hover:bg-white/5"
                              : "border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                      </div>

                      {/* Error / diagnosis state */}
                      {(healthError || serverStatus === "misconfigured" || serverStatus === "unreachable") && (
                        <div className={`rounded-2xl border ${isDarkTheme ? "bg-red-500/8 border-red-500/20" : "bg-red-50 border-red-200"}`}>
                          <div className={`flex items-center gap-3 p-4 ${isDarkTheme ? "text-red-400" : "text-red-700"}`}>
                            <WifiOff className="w-4 h-4 shrink-0" />
                            <div>
                              <p className="font-semibold text-sm">
                                {serverStatus === "misconfigured" ? "Konfigurasi server bermasalah" : "Server tidak dapat dijangkau"}
                              </p>
                              <p className={`text-xs mt-0.5 leading-relaxed ${isDarkTheme ? "text-red-400/70" : "text-red-600/80"}`}>{serverDiagnosis || healthError}</p>
                            </div>
                          </div>
                          <div className={`px-4 pb-4 border-t pt-3 space-y-2 ${isDarkTheme ? "border-red-500/10" : "border-red-100"}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkTheme ? "text-red-400/50" : "text-red-500/60"}`}>Langkah Perbaikan cPanel:</p>
                            {serverStatus === "misconfigured" ? (
                              <ol className={`text-xs leading-relaxed space-y-1.5 list-decimal list-inside ${isDarkTheme ? "text-red-400/70" : "text-red-600/80"}`}>
                                <li>Upload <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${isDarkTheme ? "bg-red-500/10" : "bg-red-100"}`}>.htaccess</code> terbaru dari repositori ke folder <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${isDarkTheme ? "bg-red-500/10" : "bg-red-100"}`}>/id/</code> di cPanel File Manager</li>
                                <li>Pastikan rule API menggunakan <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${isDarkTheme ? "bg-red-500/10" : "bg-red-100"}`}>RewriteRule .* - [L]</code>, bukan <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${isDarkTheme ? "bg-red-500/10" : "bg-red-100"}`}>app.js</code></li>
                                <li>Upload seluruh folder <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${isDarkTheme ? "bg-red-500/10" : "bg-red-100"}`}>dist/</code> terbaru (termasuk <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${isDarkTheme ? "bg-red-500/10" : "bg-red-100"}`}>server.cjs</code>)</li>
                                <li>Restart aplikasi Node.js di <strong>cPanel → Node.js Selector</strong></li>
                                <li>Buka halaman di tab incognito untuk memastikan service worker lama tidak aktif</li>
                              </ol>
                            ) : (
                              <ol className={`text-xs leading-relaxed space-y-1.5 list-decimal list-inside ${isDarkTheme ? "text-red-400/70" : "text-red-600/80"}`}>
                                <li>Buka <strong>cPanel → Node.js Selector</strong></li>
                                <li>Pastikan status aplikasi <strong>Running</strong> — klik <strong>Restart</strong> jika perlu</li>
                                <li>Pastikan file startup adalah <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${isDarkTheme ? "bg-red-500/10" : "bg-red-100"}`}>app.js</code> dan direktori aplikasi sudah benar</li>
                                <li>Periksa error log di cPanel untuk detail crash</li>
                                <li>Pastikan <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${isDarkTheme ? "bg-red-500/10" : "bg-red-100"}`}>dist/server.cjs</code> ada di folder aplikasi (jalankan <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${isDarkTheme ? "bg-red-500/10" : "bg-red-100"}`}>npm run build</code> terlebih dahulu)</li>
                              </ol>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Loading skeleton */}
                      {healthLoading && !healthData && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className={`h-28 rounded-2xl animate-pulse ${isDarkTheme ? "bg-white/5" : "bg-slate-100"}`} />
                          ))}
                        </div>
                      )}

                      {/* Stat Cards */}
                      {healthData && (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Status */}
                            <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${isDarkTheme ? "bg-white/3 border-white/8" : "bg-white border-slate-200 shadow-sm"}`}>
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${healthData.status === "ok" ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
                                {healthData.status === "ok"
                                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                  : <AlertCircle className="w-5 h-5 text-amber-400" />
                                }
                              </div>
                              <div>
                                <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Status</p>
                                <p className={`text-lg font-bold font-mono capitalize ${healthData.status === "ok" ? "text-emerald-400" : "text-amber-400"}`}>
                                  {healthData.status}
                                </p>
                              </div>
                            </div>

                            {/* Uptime */}
                            <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${isDarkTheme ? "bg-white/3 border-white/8" : "bg-white border-slate-200 shadow-sm"}`}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/15">
                                <Clock className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Uptime</p>
                                <p className={`text-lg font-bold font-mono ${isDarkTheme ? "text-white" : "text-slate-900"}`}>
                                  {formatUptime(healthData.uptime_seconds)}
                                </p>
                              </div>
                            </div>

                            {/* Node.js */}
                            <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${isDarkTheme ? "bg-white/3 border-white/8" : "bg-white border-slate-200 shadow-sm"}`}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/15">
                                <Cpu className="w-5 h-5 text-amber-400" />
                              </div>
                              <div>
                                <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Node.js</p>
                                <p className={`text-lg font-bold font-mono ${isDarkTheme ? "text-white" : "text-slate-900"}`}>
                                  {healthData.node_version}
                                </p>
                              </div>
                            </div>

                            {/* Active Sessions */}
                            <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${isDarkTheme ? "bg-white/3 border-white/8" : "bg-white border-slate-200 shadow-sm"}`}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-500/15">
                                <Users className="w-5 h-5 text-purple-400" />
                              </div>
                              <div>
                                <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Sesi Aktif</p>
                                <p className={`text-lg font-bold font-mono ${isDarkTheme ? "text-white" : "text-slate-900"}`}>
                                  {healthData.active_sessions}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Server Meta */}
                          <div className={`p-5 rounded-2xl border ${isDarkTheme ? "bg-white/3 border-white/8" : "bg-white border-slate-200 shadow-sm"}`}>
                            <div className="flex items-center gap-2 mb-4">
                              <Server className="w-4 h-4 text-amber-400" />
                              <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}>Info Server</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className={`text-[10px] font-mono uppercase tracking-wider mb-1 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Environment</p>
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                                  healthData.env === "production"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                }`}>{healthData.env}</span>
                              </div>
                              <div>
                                <p className={`text-[10px] font-mono uppercase tracking-wider mb-1 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Mulai Sejak</p>
                                <p className={`text-xs font-mono ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}>
                                  {new Date(healthData.started_at).toLocaleString("id-ID")}
                                </p>
                              </div>
                              <div>
                                <p className={`text-[10px] font-mono uppercase tracking-wider mb-1 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Waktu Server</p>
                                <p className={`text-xs font-mono ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}>
                                  {new Date(healthData.timestamp).toLocaleString("id-ID")}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Data Files Integrity */}
                          <div className={`p-5 rounded-2xl border ${isDarkTheme ? "bg-white/3 border-white/8" : "bg-white border-slate-200 shadow-sm"}`}>
                            <div className="flex items-center gap-2 mb-4">
                              <Database className="w-4 h-4 text-amber-400" />
                              <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}>Integritas File Data</h3>
                              <span className={`ml-auto text-[10px] font-mono ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>
                                {healthData.data_files.filter(f => f.status === "ok").length}/{healthData.data_files.length} OK
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {healthData.data_files.map((file) => (
                                <div
                                  key={file.name}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs ${
                                    file.status === "ok"
                                      ? isDarkTheme ? "bg-emerald-500/8 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
                                      : file.status === "optional"
                                      ? isDarkTheme ? "bg-slate-500/8 border-white/8" : "bg-slate-50 border-slate-200"
                                      : file.status === "missing"
                                      ? isDarkTheme ? "bg-amber-500/8 border-amber-500/20" : "bg-amber-50 border-amber-200"
                                      : isDarkTheme ? "bg-red-500/8 border-red-500/20" : "bg-red-50 border-red-200"
                                  }`}
                                >
                                  <span className={`font-mono font-semibold truncate ${
                                    file.status === "ok" ? (isDarkTheme ? "text-emerald-300" : "text-emerald-700")
                                    : file.status === "optional" ? (isDarkTheme ? "text-slate-400" : "text-slate-500")
                                    : file.status === "missing" ? (isDarkTheme ? "text-amber-300" : "text-amber-700")
                                    : (isDarkTheme ? "text-red-300" : "text-red-700")
                                  }`}>{file.name}</span>
                                  <span className="shrink-0 ml-2">
                                    {file.status === "ok" && <Check className="w-3 h-3 text-emerald-400" />}
                                    {file.status === "optional" && <span className={`text-[9px] font-bold ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>OPT</span>}
                                    {file.status === "missing" && <AlertCircle className="w-3 h-3 text-amber-400" />}
                                    {file.status === "corrupt" && <X className="w-3 h-3 text-red-400" />}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Empty Alert Checker if superadmin deletes everything */}
                  {((activeTab === "competencies" && competencies.length === 0) ||
                    (activeTab === "milestones" && milestones.length === 0) ||
                    (activeTab === "gallery" && gallery.length === 0) ||
                    (activeTab === "alumni" && alumni.length === 0) ||
                    (activeTab === "news" && news.length === 0) ||
                    (activeTab === "partners" && partners.length === 0)) && (
                    <div className={`p-10 text-center rounded-2xl border ${isDarkTheme ? "border-dashed border-white/5" : "border-dashed border-slate-200"}`}>
                      <AlertCircle className="w-8 h-8 mx-auto text-amber-500/50 mb-3" />
                      <h4 className="text-sm font-bold mb-1">Koleksi Modul ini Kosong</h4>
                      <p className={`text-xs ${isDarkTheme ? "text-slate-500" : "text-slate-450"} max-w-[280px] mx-auto`}>Tidak ada data tersimpan di local storage. Klik tombol "Tambah Data Baru" di atas untuk membuat entri awal!</p>
                    </div>
                  )}
                </div>
              )}

            </main>
          </div>

        </div>
      )}

    </div>
  );
}
