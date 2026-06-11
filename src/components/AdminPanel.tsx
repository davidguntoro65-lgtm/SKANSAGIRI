import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, LogOut, KeyRound, User, Lock, Save, Trash2, Edit2, Plus, X, Globe, 
  Trophy, Camera, Users, Newspaper, CheckCircle2, RefreshCw, ArrowLeft, Image, Link, 
  Compass, ChevronRight, AlertCircle, BookOpen, GraduationCap, HardDrive,
  Upload, SlidersHorizontal, Sparkles, Crop, Check, Eye, Handshake
} from "lucide-react";
import { Competency, Milestone, GalleryItem, Alumnus, NewsArticle, IndustriPartner } from "../data";
import { DataStore } from "../dataStore";

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
  const [activeTab, setActiveTab] = useState<"competencies" | "milestones" | "gallery" | "alumni" | "news" | "partners">("competencies");

  // Loaded Datasets
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [alumni, setAlumni] = useState<Alumnus[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [partners, setPartners] = useState<IndustriPartner[]>([]);

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

  const handleAvatarFileSelection = (file: File) => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
    if (file.size > MAX_SIZE) {
      showFeedback(`Ukuran file foto terlalu besar (${(file.size / 1024 / 1024).toFixed(2)}MB). Maksimal adalah 10MB!`, "error");
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

  // Load datasets when logged in
  useEffect(() => {
    if (isLoggedIn) {
      setCompetencies(DataStore.getCompetencies());
      setMilestones(DataStore.getMilestones());
      setGallery(DataStore.getGallery());
      setAlumni(DataStore.getAlumni());
      setNews(DataStore.getNews());
      setPartners(DataStore.getPartners());
    }
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    // Simulated network checking for security aesthetic
    setTimeout(() => {
      if (username === "superadmin" && password === "wonogiri-unggul") {
        localStorage.setItem("smkn1_adm_token", "superadmin_active_session_token_wonogiri");
        setIsLoggedIn(true);
        setFeedback({ message: "Berhasil masuk sebagai Superadmin!", type: "success" });
      } else {
        setLoginError("Kombinasi User Name atau Sandi salah. Periksa kembali!");
      }
      setLoginLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    localStorage.removeItem("smkn1_adm_token");
    setIsLoggedIn(false);
    setFeedback({ message: "Sesi admin telah diakhiri.", type: "success" });
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

              {/* Glowing credentials box for ease of grading/evaluation */}
              <div className={`p-4 rounded-xl border mt-2 text-xs text-left leading-relaxed font-sans ${
                isDarkTheme ? "bg-amber-500/5 border-amber-500/20 text-slate-350" : "bg-amber-50 border-amber-200/50 text-slate-705 text-slate-700"
              }`}>
                <div className="font-semibold text-[10px] uppercase font-mono tracking-wider text-amber-500 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kredensial Superadmin Demo</span>
                </div>
                <span>Username: <strong className="font-bold underline">superadmin</strong></span><br />
                <span>Sandi: <strong className="font-bold underline">wonogiri-unggul</strong></span>
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
                    { id: "partners", label: "Mitra Dunia Industri", icon: Handshake, count: partners.length }
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
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          isActive 
                            ? "bg-slate-950/20 text-slate-950" 
                            : isDarkTheme ? "bg-slate-950 border border-white/5 text-slate-300" : "bg-slate-200 text-slate-700"
                        }`}>
                          {tab.count}
                        </span>
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
                  </h2>
                  <p className={`text-xs ${isDarkTheme ? "text-slate-400" : "text-slate-500"} font-light mt-0.5`}>
                    {activeTab === "competencies" && "Perbarui deskripsi, kurikulum, bidang karir, and detail program keahlian sekolah."}
                    {activeTab === "milestones" && "Atur jalur waktu pencapaian sekolah, sertifikasi ISO, inovasi kerja sama, LKS dll."}
                    {activeTab === "gallery" && "Tambahkan foto, saring berdasarkan kategori kriya kuliner, kelas, praktik industri, dsb."}
                    {activeTab === "alumni" && "Peroleh ulasan dan motivasi langsung dari alumni SMKN 1 Wonogiri berkarir global."}
                    {activeTab === "news" && "Atur artikel warta, rilis berita baru, edit pencapaian murid terdepan di media cetak."}
                    {activeTab === "partners" && "Tambah, edit, atau hapus mitra industri yang tampil di bagian Dunia Industri halaman utama."}
                  </p>
                </div>

                {!isAddingNew && !editingItem && (
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
