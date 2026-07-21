import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Users, Target, Calendar, Star, Trophy, Camera, MessageSquare,
  ChevronDown, CheckCircle2, Clock, Instagram, Youtube, Mail, MapPin,
  TrendingUp, Zap, Heart, BookOpen, Music, Dumbbell, Code2,
  Loader2, X, ChevronUp, Eye, User, Send, Sun, Moon, Shield,
} from "lucide-react";
import { navigate } from "../utils/navigation";

interface OsisPageProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

/* ─── Types ─────────────────────────────────────────────────────────── */
interface OsisInfo {
  namaKabinet: string; masaBakti: string; tagline: string;
  visi: string; misi: string[]; sejarah: string;
  quoteKetua: string; namaKetua: string;
  jumlahProker: number; jumlahMember: number; jumlahEkskul: number;
}
interface OsisPengurus {
  id: string; nama: string; jabatan: string; bidang: string;
  foto?: string; tugasPokok: string; instagram: string; email: string; urutan: number;
}
interface OsisProgramKerja {
  id: string; nama: string; bidang: string; deskripsi: string;
  status: "DIRENCANAKAN" | "BERLANGSUNG" | "SELESAI"; progress: number;
  targetDate: string; penanggungJawab: string; urutan: number;
}
interface OsisAgenda {
  id: string; nama: string; tanggal: string; waktu: string;
  tempat: string; deskripsi: string; jenis: "RUTIN" | "BESAR" | "KOLABORASI";
}
interface OsisEkskul {
  id: string; nama: string; kategori: string; deskripsi: string;
  jadwal: string; pembina: string; jumlahAnggota: number; foto?: string; urutan: number;
}
interface OsisGaleri {
  id: string; judul: string; kategori: string; foto: string; createdAt: string;
}
interface OsisPrestasi {
  id: string; judul: string; deskripsi: string; tingkat: string;
  tanggal: string; foto?: string;
}
interface OsisAspirasi {
  id: string; nama: string; kelas: string; kategori: string; isi: string;
  anonim: boolean; status: string; balasan: string; publik: boolean; createdAt: string;
}

/* ─── Countdown helper ───────────────────────────────────────────────── */
function useCountdown(targetDate: string) {
  const [diff, setDiff] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: false });
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const target = new Date(targetDate).getTime();
      const delta = target - now;
      if (delta <= 0) { setDiff({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: true }); return; }
      const s = Math.floor(delta / 1000);
      setDiff({ days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, passed: false });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return diff;
}

/* ─── Status / level configs ─────────────────────────────────────────── */
const STATUS_CFG = {
  DIRENCANAKAN: { label: "Direncanakan", cls: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  BERLANGSUNG:  { label: "Berlangsung",  cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  SELESAI:      { label: "Selesai",      cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
};
const TINGKAT_CFG: Record<string, { cls: string }> = {
  SEKOLAH:    { cls: "bg-slate-500/20 text-slate-300 border border-slate-500/30" },
  KECAMATAN:  { cls: "bg-green-500/15 text-green-400 border border-green-500/30" },
  KABUPATEN:  { cls: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  PROVINSI:   { cls: "bg-purple-500/15 text-purple-400 border border-purple-500/30" },
  NASIONAL:   { cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
};
const EKSKUL_KATEGORI_ICON: Record<string, any> = {
  AKADEMIK: BookOpen, SENI: Music, OLAHRAGA: Dumbbell, KEAGAMAAN: Heart, TEKNOLOGI: Code2,
};
const BIDANG_PROKER = [
  "Ketakwaan", "Bela Negara", "Kepribadian", "Berorganisasi",
  "Kewirausahaan", "Apresiasi Seni", "Kesehatan", "Prestasi",
];

/* ─── Pre-defined floating particles ───────────────────────────────── */
const SPARKS = [
  { l: "6%",  dur: 9,  del: 0,   sz: 3, op: 0.55 },
  { l: "13%", dur: 12, del: 1.5, sz: 2, op: 0.35 },
  { l: "20%", dur: 8,  del: 3,   sz: 2, op: 0.5  },
  { l: "28%", dur: 11, del: 0.5, sz: 3, op: 0.4  },
  { l: "36%", dur: 14, del: 4,   sz: 2, op: 0.6  },
  { l: "44%", dur: 9,  del: 2,   sz: 4, op: 0.3  },
  { l: "52%", dur: 10, del: 5,   sz: 2, op: 0.5  },
  { l: "59%", dur: 13, del: 1,   sz: 3, op: 0.4  },
  { l: "67%", dur: 8,  del: 3.5, sz: 2, op: 0.55 },
  { l: "75%", dur: 11, del: 0,   sz: 3, op: 0.35 },
  { l: "82%", dur: 9,  del: 2.5, sz: 2, op: 0.5  },
  { l: "90%", dur: 12, del: 4,   sz: 3, op: 0.4  },
  { l: "95%", dur: 10, del: 1,   sz: 2, op: 0.45 },
];

/* ─── Floating spark particles ───────────────────────────────────────── */
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {SPARKS.map((p, i) => (
        <div
          key={i}
          className="absolute bottom-0 rounded-full bg-blue-400 osis-spark"
          style={{
            left: p.l,
            width: p.sz,
            height: p.sz,
            opacity: p.op,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.del}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Orbital hero emblem ────────────────────────────────────────────── */
function OrbitalEmblem() {
  return (
    <div className="relative w-40 h-40 mx-auto mb-6 select-none">
      {/* Center core */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-600/50 z-10">
          <Shield className="w-10 h-10 text-white" />
        </div>
        {/* Core glow */}
        <div className="absolute w-20 h-20 rounded-2xl bg-blue-500/30 blur-xl" />
      </div>

      {/* Ring 1 — slow clockwise */}
      <motion.div
        className="absolute inset-4 rounded-full border border-blue-400/30"
        style={{ borderStyle: "dashed" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-400 shadow-sm shadow-blue-400/60" />
      </motion.div>

      {/* Ring 2 — faster counter-clockwise */}
      <motion.div
        className="absolute -inset-2 rounded-full border border-cyan-400/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-1 right-0 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/60" />
        <div className="absolute bottom-1 left-0 w-1 h-1 rounded-full bg-indigo-400" />
      </motion.div>

      {/* Ring 3 — slowest clockwise */}
      <motion.div
        className="absolute -inset-8 rounded-full border border-blue-600/15"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500/70 shadow-sm shadow-blue-500/40" />
        <div className="absolute bottom-3 left-2 w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
        <div className="absolute top-1/2 -right-1 w-1 h-1 rounded-full bg-sky-400/50" />
      </motion.div>
    </div>
  );
}

/* ─── API fetch ──────────────────────────────────────────────────────── */
async function apiFetch(path: string) {
  const r = await fetch(path);
  if (!r.ok) throw new Error("fetch failed");
  return r.json();
}

/* ─── Section anchor nav ─────────────────────────────────────────────── */
const ANCHORS = [
  { id: "hero",      label: "Beranda" },
  { id: "tentang",   label: "Tentang" },
  { id: "pengurus",  label: "Pengurus" },
  { id: "proker",    label: "Program Kerja" },
  { id: "agenda",    label: "Agenda" },
  { id: "ekskul",    label: "Ekskul" },
  { id: "galeri",    label: "Galeri" },
  { id: "prestasi",  label: "Prestasi" },
  { id: "aspirasi",  label: "Aspirasi" },
  { id: "kontak",    label: "Kontak" },
];

/* ═══════════════════════════════════════════════════════════════════════ */
export default function OsisPage({ theme, toggleTheme }: OsisPageProps) {
  const isDark = theme === "dark";

  /* ── Data states ───────────────────────────────────────────────────── */
  const [info, setInfo] = useState<OsisInfo | null>(null);
  const [pengurus, setPengurus] = useState<OsisPengurus[]>([]);
  const [proker, setProker] = useState<OsisProgramKerja[]>([]);
  const [agenda, setAgenda] = useState<OsisAgenda[]>([]);
  const [ekskul, setEkskul] = useState<OsisEkskul[]>([]);
  const [galeri, setGaleri] = useState<OsisGaleri[]>([]);
  const [prestasi, setPrestasi] = useState<OsisPrestasi[]>([]);
  const [aspirasiPublik, setAspirasiPublik] = useState<OsisAspirasi[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── UI states ─────────────────────────────────────────────────────── */
  const [activeSection, setActiveSection] = useState("hero");
  const [ekskulFilter, setEkskulFilter] = useState("SEMUA");
  const [galeriFilter, setGaleriFilter] = useState("SEMUA");
  const [lightbox, setLightbox] = useState<OsisGaleri | null>(null);
  const [selectedPengurus, setSelectedPengurus] = useState<OsisPengurus | null>(null);
  const [prokerBidang, setProkerBidang] = useState("SEMUA");
  const [navOpen, setNavOpen] = useState(false);

  /* ── Aspirasi form ─────────────────────────────────────────────────── */
  const [aspNama, setAspNama] = useState("");
  const [aspKelas, setAspKelas] = useState("");
  const [aspKategori, setAspKategori] = useState("KEGIATAN");
  const [aspIsi, setAspIsi] = useState("");
  const [aspAnonim, setAspAnonim] = useState(false);
  const [aspSending, setAspSending] = useState(false);
  const [aspSuccess, setAspSuccess] = useState(false);
  const [aspError, setAspError] = useState("");

  /* ── Fetch all data ────────────────────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      apiFetch("/api/osis/info"),
      apiFetch("/api/osis/pengurus"),
      apiFetch("/api/osis/proker"),
      apiFetch("/api/osis/agenda"),
      apiFetch("/api/osis/ekskul"),
      apiFetch("/api/osis/galeri"),
      apiFetch("/api/osis/prestasi"),
      apiFetch("/api/osis/aspirasi/publik"),
    ]).then(([inf, peng, prk, agd, eks, gal, prest, asp]) => {
      setInfo(inf); setPengurus(peng); setProker(prk); setAgenda(agd);
      setEkskul(eks); setGaleri(gal); setPrestasi(prest); setAspirasiPublik(asp);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  /* ── Scroll spy ────────────────────────────────────────────────────── */
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id);
    }, { threshold: 0.25 });
    ANCHORS.forEach(a => { const el = document.getElementById(a.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [loading]);

  /* ── Send aspirasi ─────────────────────────────────────────────────── */
  const handleAspirasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aspIsi.trim() || aspIsi.trim().length < 20) { setAspError("Isi aspirasi minimal 20 karakter."); return; }
    setAspSending(true); setAspError("");
    try {
      const r = await fetch("/api/osis/aspirasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: aspAnonim ? "Anonim" : aspNama, kelas: aspKelas, kategori: aspKategori, isi: aspIsi, anonim: aspAnonim }),
      });
      if (!r.ok) { const d = await r.json(); setAspError(d.error || "Gagal mengirim."); return; }
      setAspSuccess(true);
      setAspNama(""); setAspKelas(""); setAspIsi(""); setAspAnonim(false); setAspKategori("KEGIATAN");
      setTimeout(() => setAspSuccess(false), 5000);
    } catch { setAspError("Koneksi gagal. Coba lagi."); }
    finally { setAspSending(false); }
  };

  const nearestEvent = agenda
    .filter(a => new Date(a.tanggal) >= new Date())
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())[0];
  const countdown = useCountdown(nearestEvent?.tanggal || "");

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setNavOpen(false);
  };

  /* ── Color system — blue-first ──────────────────────────────────────── */
  const pageBg    = isDark ? "bg-[#030e20]"   : "bg-sky-50";
  const altBg     = isDark ? "bg-blue-950/20"  : "bg-blue-50";
  const cardBg    = isDark
    ? "bg-blue-950/50 border-blue-900/40"
    : "bg-white border-blue-200";
  const navBg     = isDark
    ? "bg-[#030e20]/90 border-blue-900/40"
    : "bg-white/90 border-blue-200";
  const textPrimary = isDark ? "text-white"     : "text-slate-900";
  const textMuted   = isDark ? "text-blue-200/70" : "text-slate-500";

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${pageBg}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className={`${textMuted} font-mono text-sm tracking-widest`}>MEMUAT OSIS SKANSAGIRI...</p>
      </div>
    </div>
  );

  const ekskulFiltered = ekskulFilter === "SEMUA" ? ekskul : ekskul.filter(e => e.kategori === ekskulFilter);
  const galeriFiltered = galeriFilter === "SEMUA" ? galeri : galeri.filter(g => g.kategori === galeriFilter);
  const prokerFiltered = prokerBidang === "SEMUA" ? proker : proker.filter(p => p.bidang === prokerBidang);
  const galeriCategories = ["SEMUA", ...Array.from(new Set(galeri.map(g => g.kategori)))];

  return (
    <div className={`min-h-screen ${pageBg} ${textPrimary}`}>

      {/* ── Sticky Sub-Nav ─────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-40 backdrop-blur-xl border-b ${navBg} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4">
          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1 py-2">
            <button
              onClick={() => navigate("/")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 ${textMuted} hover:text-blue-400 transition-colors`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </button>
            <div className={`w-px h-4 mx-1 shrink-0 ${isDark ? "bg-blue-900" : "bg-blue-200"}`} />
            <div className="flex items-center gap-1 overflow-x-auto flex-1 no-scrollbar">
              {ANCHORS.map(a => (
                <button key={a.id} onClick={() => scrollTo(a.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeSection === a.id
                      ? "bg-blue-600 text-white"
                      : `${textMuted} hover:text-blue-400`
                  }`}
                >{a.label}</button>
              ))}
            </div>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`ml-2 shrink-0 p-2 rounded-lg transition-colors ${isDark ? "text-blue-400 hover:bg-blue-900/40" : "text-blue-600 hover:bg-blue-100"}`}
              title={isDark ? "Mode Terang" : "Mode Gelap"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center justify-between py-2">
            <button onClick={() => navigate("/")} className={`flex items-center gap-1 text-xs ${textMuted}`}>
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </button>
            <span className="text-xs font-black text-blue-400 tracking-wider">OSIS SKANSAGIRI</span>
            <div className="flex items-center gap-1">
              <button onClick={toggleTheme} className={`p-1.5 rounded-lg ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setNavOpen(v => !v)} className={`text-xs ${textMuted} flex items-center gap-1`}>
                Menu {navOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <AnimatePresence>
            {navOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden pb-2">
                <div className="grid grid-cols-4 gap-1">
                  {ANCHORS.map(a => (
                    <button key={a.id} onClick={() => scrollTo(a.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
                        activeSection === a.id ? "bg-blue-600 text-white" : `${textMuted} hover:text-blue-400`
                      }`}
                    >{a.label}</button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. HERO                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="hero" className="relative overflow-hidden py-16 sm:py-20">
        {/* Background */}
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${isDark
            ? "bg-gradient-to-br from-blue-950 via-[#030e20] to-indigo-950"
            : "bg-gradient-to-br from-blue-100 via-sky-50 to-indigo-100"
          }`} />
          {/* Hex grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
                <polygon points="30,2 58,17 58,35 30,50 2,35 2,17" fill="none" stroke="#60a5fa" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hex)"/>
          </svg>
          {/* Glow orbs */}
          <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-blue-600/25 blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
          {/* Floating energy sparks */}
          <FloatingParticles />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center">
            {/* Orbital emblem */}
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
              <OrbitalEmblem />
            </motion.div>

            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-widest uppercase mb-5">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              {info?.masaBakti || "Organisasi Siswa Intra Sekolah"}
            </motion.div>

            {/* Title */}
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-2 leading-none tracking-tight">
              {info?.namaKabinet || "OSIS SKANSAGIRI"}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-base sm:text-lg text-blue-300/80 font-light mb-1">
              SMKN 1 Wonogiri
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              className={`${textMuted} max-w-xl mx-auto text-sm sm:text-base mb-8 leading-relaxed`}>
              {info?.tagline || "Bersatu, Bergerak, Berprestasi untuk Skansagiri"}
            </motion.p>

            {/* CTA buttons */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <button onClick={() => scrollTo("aspirasi")}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wide transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">
                <MessageSquare className="w-4 h-4" /> Kirim Aspirasi
              </button>
              <button onClick={() => scrollTo("proker")}
                className="px-6 py-3 rounded-xl border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 font-semibold text-sm tracking-wide transition-all hover:scale-105 flex items-center justify-center gap-2">
                <Target className="w-4 h-4" /> Lihat Program Kerja
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
              {[
                { val: info?.jumlahProker || proker.length, label: "Program Kerja", icon: Target },
                { val: info?.jumlahMember || pengurus.length, label: "Anggota Pengurus", icon: Users },
                { val: info?.jumlahEkskul || ekskul.length, label: "Ekstrakurikuler", icon: Star },
              ].map((s, i) => (
                <div key={i} className={`flex flex-col items-center p-3 rounded-xl border backdrop-blur-sm ${isDark ? "bg-white/5 border-white/10" : "bg-blue-600/10 border-blue-300/30"}`}>
                  <s.icon className="w-4 h-4 text-blue-400 mb-1" />
                  <span className="text-2xl sm:text-3xl font-black text-blue-400">{s.val}</span>
                  <span className="text-[10px] text-blue-200/60 mt-0.5 text-center leading-tight">{s.label}</span>
                </div>
              ))}
            </motion.div>

            {/* Countdown */}
            {nearestEvent && !countdown.passed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="mt-8 inline-flex flex-col sm:flex-row items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-white">
                <span className="text-xs text-blue-200/60 tracking-widest uppercase">Event terdekat: <span className="text-blue-400 font-semibold">{nearestEvent.nama}</span></span>
                <div className="flex items-center gap-2">
                  {[["Hari", countdown.days], ["Jam", countdown.hours], ["Menit", countdown.minutes], ["Detik", countdown.seconds]].map(([l, v], i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span className="text-lg font-black text-blue-400 min-w-[2ch] text-center">{String(v).padStart(2, "0")}</span>
                      <span className="text-[9px] text-blue-200/50 uppercase tracking-wider">{l}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. TENTANG OSIS                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="tentang" className={`py-14 px-4 sm:px-6 lg:px-8 relative z-10 ${altBg}`}>
        <div className="max-w-6xl mx-auto">
          <SectionHeader title="Tentang OSIS" subtitle="Mengenal lebih dekat organisasi kami" isDark={isDark} />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className={`p-5 rounded-2xl border ${cardBg}`}>
                <h3 className="text-sm font-bold mb-2 text-blue-400 uppercase tracking-wider">Sejarah Singkat</h3>
                <p className={`${textMuted} leading-relaxed text-sm`}>
                  {info?.sejarah || "OSIS SMKN 1 Wonogiri merupakan wadah pengembangan diri siswa dalam berorganisasi, berkreasi, dan berkontribusi nyata bagi kemajuan sekolah dan masyarakat."}
                </p>
              </div>
              {info?.quoteKetua && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20">
                  <blockquote className={`italic text-sm leading-relaxed ${textMuted} mb-2`}>"{info.quoteKetua}"</blockquote>
                  <p className="text-blue-400 font-semibold text-sm">— {info.namaKetua || "Ketua OSIS"}</p>
                </div>
              )}
              <div className={`p-4 rounded-xl border ${cardBg}`}>
                <p className={`text-xs ${textMuted} mb-1 font-semibold uppercase tracking-wider`}>Landasan Hukum</p>
                <p className={`text-xs ${textMuted}`}>Permendikbud No. 23 Tahun 2015 dan Permendiknas No. 39 Tahun 2008 tentang Pembinaan Kesiswaan.</p>
              </div>
            </div>
            <div className={`p-5 rounded-2xl border ${cardBg}`}>
              <h3 className="text-sm font-bold mb-4 text-blue-400 uppercase tracking-wider">Visi & Misi</h3>
              {info?.visi && (
                <div className="mb-4">
                  <p className={`text-xs ${textMuted} uppercase tracking-widest mb-1.5 font-bold`}>Visi</p>
                  <p className={`${textMuted} text-sm leading-relaxed`}>{info.visi}</p>
                </div>
              )}
              {info?.misi && info.misi.length > 0 && (
                <div>
                  <p className={`text-xs ${textMuted} uppercase tracking-widest mb-2 font-bold`}>Misi</p>
                  <ul className="space-y-2">
                    {info.misi.map((m, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5">{i+1}</span>
                        <span className={textMuted}>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. PENGURUS                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="pengurus" className="py-14 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeader title="Struktur Pengurus" subtitle="Tim yang memimpin OSIS periode ini" isDark={isDark} />
          {pengurus.length === 0 ? (
            <EmptyState icon={Users} text="Data pengurus belum tersedia." textMuted={textMuted} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {pengurus.sort((a,b) => a.urutan - b.urutan).map((p, i) => (
                <motion.button key={p.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                  onClick={() => setSelectedPengurus(p)}
                  className={`flex flex-col items-center p-4 rounded-2xl border transition-all hover:scale-105 hover:border-blue-500/60 hover:shadow-blue-500/10 hover:shadow-lg cursor-pointer text-center ${cardBg}`}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden mb-2 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                    {p.foto ? <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-white" />}
                  </div>
                  <p className={`text-xs font-bold ${textPrimary} leading-tight mb-0.5`}>{p.nama}</p>
                  <p className="text-[10px] text-blue-400 font-medium leading-tight">{p.jabatan}</p>
                  {p.bidang && <p className={`text-[9px] ${textMuted} mt-0.5`}>{p.bidang}</p>}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Pengurus detail modal */}
        <AnimatePresence>
          {selectedPengurus && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelectedPengurus(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl ${cardBg}`}
                onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                      {selectedPengurus.foto ? <img src={selectedPengurus.foto} alt={selectedPengurus.nama} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${textPrimary}`}>{selectedPengurus.nama}</p>
                      <p className="text-blue-400 text-xs">{selectedPengurus.jabatan}</p>
                      {selectedPengurus.bidang && <p className={`text-xs ${textMuted}`}>{selectedPengurus.bidang}</p>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedPengurus(null)} className={`p-1.5 rounded-lg hover:bg-blue-900/30 ${textMuted}`}><X className="w-4 h-4" /></button>
                </div>
                {selectedPengurus.tugasPokok && (
                  <div className="mb-4">
                    <p className={`text-xs ${textMuted} uppercase tracking-widest mb-1.5 font-bold`}>Tugas Pokok</p>
                    <p className={`text-sm ${textMuted} leading-relaxed`}>{selectedPengurus.tugasPokok}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {selectedPengurus.instagram && (
                    <a href={`https://instagram.com/${selectedPengurus.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-400 text-xs font-medium hover:bg-pink-500/20 transition-colors">
                      <Instagram className="w-3.5 h-3.5" /> Instagram
                    </a>
                  )}
                  {selectedPengurus.email && (
                    <a href={`mailto:${selectedPengurus.email}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. PROGRAM KERJA                                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="proker" className={`py-14 px-4 sm:px-6 lg:px-8 relative z-10 ${altBg}`}>
        <div className="max-w-6xl mx-auto">
          <SectionHeader title="Program Kerja" subtitle="Realisasi visi melalui aksi nyata" isDark={isDark} />
          <div className="flex gap-2 flex-wrap mb-6 justify-center">
            {["SEMUA", ...BIDANG_PROKER].map(b => (
              <button key={b} onClick={() => setProkerBidang(b)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  prokerBidang === b
                    ? "bg-blue-600 text-white"
                    : `border ${isDark ? "border-blue-900 text-blue-300/60 hover:border-blue-500" : "border-blue-300 text-slate-500 hover:border-blue-400"}`
                }`}>{b === "SEMUA" ? "Semua Bidang" : b}</button>
            ))}
          </div>
          {proker.length === 0 ? (
            <EmptyState icon={Target} text="Program kerja belum tersedia." textMuted={textMuted} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {prokerFiltered.sort((a,b) => a.urutan - b.urutan).map((pk, i) => {
                const cfg = STATUS_CFG[pk.status] || STATUS_CFG.DIRENCANAKAN;
                return (
                  <motion.div key={pk.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                    className={`p-4 rounded-2xl border ${cardBg}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-400 bg-blue-500/10">{pk.bidang}</span>
                        <h4 className={`mt-1.5 text-sm font-bold ${textPrimary} leading-tight`}>{pk.nama}</h4>
                      </div>
                      <span className={`ml-2 shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                    {pk.deskripsi && <p className={`text-xs ${textMuted} leading-relaxed mb-2 line-clamp-2`}>{pk.deskripsi}</p>}
                    <div className="mb-1.5">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className={textMuted}>Progres</span>
                        <span className="text-blue-400 font-bold">{pk.progress}%</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full ${isDark ? "bg-blue-950" : "bg-blue-100"}`}>
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pk.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          viewport={{ once: true }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-blue-300/50">
                      {pk.targetDate && <span>Target: {new Date(pk.targetDate).toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric"})}</span>}
                      {pk.penanggungJawab && <span>PJ: {pk.penanggungJawab}</span>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 5. AGENDA                                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="agenda" className="py-14 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeader title="Agenda & Event" subtitle="Jadwal kegiatan OSIS yang akan datang" isDark={isDark} />
          {agenda.length === 0 ? (
            <EmptyState icon={Calendar} text="Belum ada agenda yang dijadwalkan." textMuted={textMuted} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agenda.sort((a,b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()).map((ev, i) => {
                const isPast = new Date(ev.tanggal) < new Date();
                const jenisCfg = { RUTIN: "bg-slate-500/15 text-slate-400 border-slate-500/30", BESAR: "bg-blue-500/15 text-blue-400 border-blue-500/30", KOLABORASI: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
                const d = new Date(ev.tanggal);
                return (
                  <motion.div key={ev.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                    className={`p-4 rounded-2xl border transition-all ${cardBg} ${isPast ? "opacity-50" : "hover:border-blue-500/40"}`}>
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 flex flex-col items-center justify-center w-11 h-13 rounded-xl bg-blue-600/20 text-blue-400">
                        <span className="text-[9px] font-bold uppercase">{d.toLocaleDateString("id-ID",{month:"short"})}</span>
                        <span className="text-xl font-black leading-none">{d.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${jenisCfg[ev.jenis]}`}>{ev.jenis}</span>
                          {isPast && <span className="text-[9px] text-blue-300/40 border border-blue-900 px-1.5 py-0.5 rounded-full">Lewat</span>}
                        </div>
                        <h4 className={`text-sm font-bold ${textPrimary} leading-tight mb-1`}>{ev.nama}</h4>
                        {ev.waktu && <p className={`text-xs ${textMuted}`}><Clock className="inline w-3 h-3 mr-1" />{ev.waktu}</p>}
                        {ev.tempat && <p className={`text-xs ${textMuted}`}><MapPin className="inline w-3 h-3 mr-1" />{ev.tempat}</p>}
                        {ev.deskripsi && <p className={`text-xs ${textMuted} mt-1 line-clamp-2`}>{ev.deskripsi}</p>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 6. EKSTRAKURIKULER                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="ekskul" className={`py-14 px-4 sm:px-6 lg:px-8 relative z-10 ${altBg}`}>
        <div className="max-w-6xl mx-auto">
          <SectionHeader title="Ekstrakurikuler" subtitle="Temukan minat dan bakatmu" isDark={isDark} />
          <div className="flex gap-2 flex-wrap mb-6 justify-center">
            {["SEMUA","AKADEMIK","SENI","OLAHRAGA","KEAGAMAAN","TEKNOLOGI"].map(k => {
              const Icon = EKSKUL_KATEGORI_ICON[k];
              return (
                <button key={k} onClick={() => setEkskulFilter(k)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    ekskulFilter === k ? "bg-blue-600 text-white" : `border ${isDark ? "border-blue-900 text-blue-300/60 hover:border-blue-500" : "border-blue-300 text-slate-500 hover:border-blue-400"}`
                  }`}>
                  {Icon && <Icon className="w-3 h-3" />}{k === "SEMUA" ? "Semua" : k.charAt(0) + k.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
          {ekskul.length === 0 ? (
            <EmptyState icon={Zap} text="Data ekstrakurikuler belum tersedia." textMuted={textMuted} />
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {ekskulFiltered.sort((a,b) => a.urutan - b.urutan).map((ex, i) => {
                const Icon = EKSKUL_KATEGORI_ICON[ex.kategori] || Zap;
                return (
                  <motion.div key={ex.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                    className={`overflow-hidden rounded-2xl border ${cardBg} hover:border-blue-500/50 transition-all hover:scale-[1.02]`}>
                    {ex.foto ? (
                      <img src={ex.foto} alt={ex.nama} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-20 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-blue-400/50" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className={`text-sm font-bold ${textPrimary}`}>{ex.nama}</h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{ex.kategori.toLowerCase()}</span>
                      </div>
                      {ex.deskripsi && <p className={`text-xs ${textMuted} leading-relaxed mb-2 line-clamp-2`}>{ex.deskripsi}</p>}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-blue-300/50">
                        {ex.jadwal && <span><Clock className="inline w-3 h-3 mr-0.5" />{ex.jadwal}</span>}
                        {ex.pembina && <span><User className="inline w-3 h-3 mr-0.5" />{ex.pembina}</span>}
                        {ex.jumlahAnggota > 0 && <span><Users className="inline w-3 h-3 mr-0.5" />{ex.jumlahAnggota} anggota</span>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 7. GALERI                                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="galeri" className="py-14 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeader title="Galeri Kegiatan" subtitle="Dokumentasi momen bersejarah OSIS" isDark={isDark} />
          <div className="flex gap-2 flex-wrap mb-5 justify-center">
            {galeriCategories.map(k => (
              <button key={k} onClick={() => setGaleriFilter(k)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  galeriFilter === k ? "bg-blue-600 text-white" : `border ${isDark ? "border-blue-900 text-blue-300/60 hover:border-blue-500" : "border-blue-300 text-slate-500 hover:border-blue-400"}`
                }`}>{k === "SEMUA" ? "Semua" : k}</button>
            ))}
          </div>
          {galeri.length === 0 ? (
            <EmptyState icon={Camera} text="Galeri kegiatan belum tersedia." textMuted={textMuted} />
          ) : (
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
              {galeriFiltered.map((g, i) => (
                <motion.div key={g.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                  className="break-inside-avoid rounded-xl overflow-hidden cursor-pointer group relative"
                  onClick={() => setLightbox(g)}>
                  <img src={g.foto} alt={g.judul} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-white text-xs font-semibold">{g.judul}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setLightbox(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <img src={lightbox.foto} alt={lightbox.judul} className="w-full max-h-[80vh] object-contain rounded-2xl" />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 rounded-b-2xl">
                <p className="text-white font-semibold">{lightbox.judul}</p>
                <p className="text-blue-300 text-sm">{lightbox.kategori}</p>
              </div>
              <button onClick={() => setLightbox(null)} className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/80"><X className="w-5 h-5" /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 8. PRESTASI                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="prestasi" className={`py-14 px-4 sm:px-6 lg:px-8 relative z-10 ${altBg}`}>
        <div className="max-w-4xl mx-auto">
          <SectionHeader title="Prestasi" subtitle="Capaian membanggakan OSIS & Ekstrakurikuler" isDark={isDark} />
          {prestasi.length === 0 ? (
            <EmptyState icon={Trophy} text="Belum ada data prestasi." textMuted={textMuted} />
          ) : (
            <div className="relative">
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-blue-600/20" />
              <div className="space-y-5">
                {prestasi.sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map((p, i) => {
                  const cfg = TINGKAT_CFG[p.tingkat] || TINGKAT_CFG.SEKOLAH;
                  const isLeft = i % 2 === 0;
                  return (
                    <motion.div key={p.id} initial={{ opacity: 0, x: isLeft ? -16 : 16 }}
                      whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                      className={`relative flex items-center gap-4 md:gap-8 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}>
                      <div className="absolute left-4 md:left-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-blue-300 -translate-x-1/2 shadow-lg shadow-blue-500/40 z-10" />
                      <div className={`pl-10 md:pl-0 md:w-1/2 ${isLeft ? "md:pr-8 md:text-right" : "md:pl-8"}`}>
                        <div className={`inline-flex p-4 rounded-2xl border ${cardBg} ${isLeft ? "md:ml-auto" : ""} max-w-sm`}>
                          {p.foto && <img src={p.foto} alt={p.judul} className="w-14 h-14 object-cover rounded-lg mr-3 flex-shrink-0" />}
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.cls}`}>{p.tingkat}</span>
                            </div>
                            <h4 className={`text-sm font-bold ${textPrimary} leading-tight`}>{p.judul}</h4>
                            {p.deskripsi && <p className={`text-xs ${textMuted} mt-1`}>{p.deskripsi}</p>}
                            <p className={`text-[10px] ${textMuted} mt-1`}>{new Date(p.tanggal).toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric"})}</p>
                          </div>
                        </div>
                      </div>
                      <div className="md:w-1/2" />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 9. ASPIRASI SISWA                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="aspirasi" className="py-14 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeader title="Aspirasi Siswa" subtitle="Suaramu penting — OSIS mendengar" isDark={isDark} />
          <div className="grid lg:grid-cols-2 gap-6">
            <div className={`p-5 rounded-2xl border ${cardBg}`}>
              <h3 className="font-bold text-blue-400 mb-4 flex items-center gap-2 text-sm"><MessageSquare className="w-4 h-4" /> Kirim Aspirasi</h3>
              {aspSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                  <p className="font-bold text-emerald-400">Aspirasi terkirim!</p>
                  <p className={`text-sm ${textMuted}`}>Terima kasih. OSIS akan meninjau aspirasimu.</p>
                  <button onClick={() => setAspSuccess(false)} className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors">Kirim Lagi</button>
                </div>
              ) : (
                <form onSubmit={handleAspirasi} className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={aspAnonim} onChange={e => setAspAnonim(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                    <span className={`text-sm ${textMuted}`}>Kirim secara anonim</span>
                  </label>
                  {!aspAnonim && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input value={aspNama} onChange={e => setAspNama(e.target.value)} placeholder="Nama lengkap" className={inputCls(isDark)} />
                      <input value={aspKelas} onChange={e => setAspKelas(e.target.value)} placeholder="Kelas (mis. XII TKJ 1)" className={inputCls(isDark)} />
                    </div>
                  )}
                  <select value={aspKategori} onChange={e => setAspKategori(e.target.value)} className={inputCls(isDark)}>
                    <option value="FASILITAS">Fasilitas</option>
                    <option value="KEGIATAN">Kegiatan</option>
                    <option value="KEBIJAKAN">Kebijakan</option>
                    <option value="SARAN">Saran Umum</option>
                  </select>
                  <textarea value={aspIsi} onChange={e => setAspIsi(e.target.value)} rows={4}
                    placeholder="Tuliskan aspirasimu di sini (minimal 20 karakter)..."
                    className={inputCls(isDark) + " resize-none"} />
                  {aspError && <p className="text-red-400 text-xs">{aspError}</p>}
                  <button type="submit" disabled={aspSending}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                    {aspSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {aspSending ? "Mengirim..." : "Kirim Aspirasi"}
                  </button>
                </form>
              )}
            </div>
            <div className="space-y-3">
              <h3 className={`font-bold ${textPrimary} mb-3 flex items-center gap-2 text-sm`}><Eye className="w-4 h-4 text-blue-400" /> Aspirasi yang Telah Dijawab</h3>
              {aspirasiPublik.length === 0 ? (
                <div className={`p-5 rounded-2xl border ${cardBg} text-center`}>
                  <p className={`text-sm ${textMuted}`}>Belum ada aspirasi publik yang tersedia.</p>
                </div>
              ) : (
                aspirasiPublik.map((asp, i) => (
                  <motion.div key={asp.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                    className={`p-4 rounded-xl border ${cardBg}`}>
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <span className={`text-xs font-bold ${textPrimary}`}>{asp.anonim ? "Anonim" : asp.nama}</span>
                        {asp.kelas && !asp.anonim && <span className={`text-xs ${textMuted} ml-2`}>· {asp.kelas}</span>}
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${
                        asp.kategori === "FASILITAS" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                        asp.kategori === "KEGIATAN" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                        asp.kategori === "KEBIJAKAN" ? "bg-purple-500/10 text-purple-400 border-purple-500/30" :
                        "bg-blue-900/30 text-blue-300/60 border-blue-900/40"
                      }`}>{asp.kategori}</span>
                    </div>
                    <p className={`text-sm ${textMuted} mb-1.5`}>{asp.isi}</p>
                    {asp.balasan && (
                      <div className="mt-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-400 font-semibold mb-0.5">💬 Balasan OSIS:</p>
                        <p className={`text-xs ${textMuted}`}>{asp.balasan}</p>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 10. KONTAK                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="kontak" className={`py-14 px-4 sm:px-6 lg:px-8 relative z-10 ${altBg}`}>
        <div className="max-w-4xl mx-auto text-center">
          <SectionHeader title="Kontak & Follow OSIS" subtitle="Tetap terhubung bersama kami" isDark={isDark} />
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { icon: Instagram, label: "Instagram", href: "https://instagram.com/osis.skansagiri", handle: "@osis.skansagiri", color: "from-pink-600 to-rose-600" },
              { icon: Youtube, label: "YouTube", href: "https://youtube.com/@osiskansagiri", handle: "OSIS Skansagiri", color: "from-red-600 to-red-700" },
              { icon: Mail, label: "Email", href: "mailto:osis@smkn1wonogiri.sch.id", handle: "osis@smkn1wonogiri.sch.id", color: "from-blue-600 to-indigo-600" },
            ].map(({ icon: Icon, label, href, handle, color }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className={`flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br ${color} text-white hover:scale-105 transition-transform shadow-lg`}>
                <Icon className="w-6 h-6 mb-2" />
                <p className="font-bold text-sm">{label}</p>
                <p className="text-xs opacity-80 mt-0.5">{handle}</p>
              </a>
            ))}
          </div>
          <div className={`p-5 rounded-2xl border ${cardBg} text-left`}>
            <h3 className={`font-bold ${textPrimary} mb-3 flex items-center gap-2 text-sm`}><Calendar className="w-4 h-4 text-blue-400" /> Jadwal Audiensi Siswa</h3>
            <div className={`grid sm:grid-cols-2 gap-3 text-sm ${textMuted}`}>
              <div className="flex items-start gap-2"><Clock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" /><div><p className="font-semibold">Senin & Rabu</p><p className="text-xs">12.00 – 13.30 WIB (Jam Istirahat)</p></div></div>
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" /><div><p className="font-semibold">Sekretariat OSIS</p><p className="text-xs">Gedung SMKN 1 Wonogiri, Lantai 1</p></div></div>
            </div>
          </div>
          <div className="mt-5">
            <button onClick={() => navigate("/osis/adm-panel")} className={`text-xs ${textMuted} hover:text-blue-400 transition-colors`}>
              Admin Panel →
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function SectionHeader({ title, subtitle, isDark }: { title: string; subtitle: string; isDark: boolean }) {
  return (
    <div className="text-center mb-8">
      <h2 className="text-2xl sm:text-3xl font-black mb-1.5">
        <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{title}</span>
      </h2>
      <p className={`text-sm ${isDark ? "text-blue-200/50" : "text-slate-500"}`}>{subtitle}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text, textMuted }: { icon: any; text: string; textMuted: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
      <Icon className="w-8 h-8 text-blue-400" />
      <p className={`text-sm ${textMuted}`}>{text}</p>
    </div>
  );
}

function inputCls(isDark: boolean) {
  return `w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors focus:border-blue-500 ${
    isDark ? "bg-blue-950/60 border-blue-900/60 text-white placeholder-blue-300/30" : "bg-white border-blue-200 text-slate-900 placeholder-slate-400"
  }`;
}
