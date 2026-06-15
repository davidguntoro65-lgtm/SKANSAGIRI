import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowRight, Sparkles, Laptop, Search, FileEdit, School, Users, ClipboardCheck, 
  Calendar, ArrowUpRight, Shield, Server, Cpu, Activity, ChevronDown, ChevronUp, FileText, Info, Timer
} from "lucide-react";

// Live countdown to end of a date (23:59:59 on that day)
function useCountdownToDate(endDate: Date) {
  const getRemaining = () => {
    const target = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, expired: false };
  };
  const [remaining, setRemaining] = useState(getRemaining);
  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(id);
  }, [endDate.getTime()]);
  return remaining;
}

// Countdown display sub-component (safe: hooks called at top level of component)
function CountdownDisplay({ endDate, isDark }: { endDate: Date; isDark: boolean }) {
  const { days, hours, minutes, seconds, expired } = useCountdownToDate(endDate);
  if (expired) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const units = [
    { label: "Hari", value: days },
    { label: "Jam", value: hours },
    { label: "Menit", value: minutes },
    { label: "Detik", value: seconds },
  ];
  return (
    <div className={`w-full rounded-xl p-3 mb-4 border ${
      isDark
        ? "bg-slate-900/70 border-amber-400/20"
        : "bg-[#fff8f6] border-[#f15e42]/20"
    }`}>
      <div className={`flex items-center gap-1.5 mb-2.5 justify-center font-mono text-[8.5px] tracking-widest uppercase font-bold ${
        isDark ? "text-amber-400" : "text-[#f15e42]"
      }`}>
        <Timer className="w-3 h-3 animate-pulse" />
        <span>Sisa Waktu Tahap Ini</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {units.map(({ label, value }) => (
          <div key={label} className={`flex flex-col items-center rounded-lg py-1.5 px-1 ${
            isDark ? "bg-white/5 border border-white/10" : "bg-white border border-slate-200 shadow-xs"
          }`}>
            <span className={`font-mono text-[16px] font-black leading-none tabular-nums ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              {pad(value)}
            </span>
            <span className={`font-mono text-[7px] uppercase tracking-widest mt-1 font-bold ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Compute real-time status from date range
function getStepStatus(start: Date, end: Date): { status: string; statusType: "active" | "upcoming" | "done" } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (today > e) return { status: "Selesai", statusType: "done" };
  if (today >= s && today <= e) return { status: "Berlangsung", statusType: "active" };
  return { status: "Akan Datang", statusType: "upcoming" };
}

export default function PPDBcta({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const isDark = theme === "dark";
  const [openFaq, setOpenFaq] = useState<number | null>(0); // Initialize first FAQ open for beautiful presentation

  const stepsRaw = [
    {
      num: "01",
      name: "Pengajuan Akun",
      start: new Date(2026, 5, 3),
      end: new Date(2026, 5, 12),
      datePart1: "03 Juni 2026 s/d 12",
      datePart2: "Juni 2026",
      desc: "Calon peserta didik mengajukan pembuatan akun verifikasi secara mandiri di portal resmi.",
      icon: "laptop",
      attributes: [
        { label: "Akses Utama", value: "Gadget/PC Mandiri" },
        { label: "Dokumen", value: "NIK, NISN & KK" },
        { label: "Validasi", value: "Dukcapil Integrasi" }
      ]
    },
    {
      num: "02",
      name: "Verifikasi Akun",
      start: new Date(2026, 5, 4),
      end: new Date(2026, 5, 13),
      datePart1: "04 Juni 2026 s/d 13",
      datePart2: "Juni 2026",
      desc: "Admin operator melakukan verifikasi berkas dan syarat administrasi pendaftaran.",
      icon: "search",
      attributes: [
        { label: "Verifikator", value: "Panitia PPDB" },
        { label: "Dokumen", value: "Scan Ijazah & Akta" },
        { label: "SLA Respon", value: "Maksimal 1x24 Jam" }
      ]
    },
    {
      num: "03",
      name: "Aktivasi Akun",
      start: new Date(2026, 5, 4),
      end: new Date(2026, 5, 13),
      datePart1: "04 Juni 2026 s/d 13",
      datePart2: "Juni 2026",
      desc: "Calon peserta didik melakukan aktivasi akun setelah mendapatkan persetujuan verifikasi.",
      icon: "laptop-check",
      attributes: [
        { label: "Metode", value: "Aktivasi Token" },
        { label: "Output", value: "ID & Password" },
        { label: "Sertifikasi", value: "SSL Enkripsi" }
      ]
    },
    {
      num: "04",
      name: "Daftar Sekolah",
      start: new Date(2026, 5, 15),
      end: new Date(2026, 5, 18),
      datePart1: "15 Juni 2026 s/d 18",
      datePart2: "Juni 2026",
      desc: "Pemilihan kompetensi keahlian dan pendaftaran pilihan sekolah di sistem PPDB.",
      icon: "school",
      attributes: [
        { label: "Kompetensi", value: "Max. 3 Pilihan" },
        { label: "Jalur", value: "Zonasi & Prestasi" },
        { label: "Sistem", value: "Seleksi Terpusat" }
      ]
    },
    {
      num: "05",
      name: "Hasil Seleksi SPMB",
      start: new Date(2026, 5, 21),
      end: new Date(2026, 5, 21),
      datePart1: "21 Juni 2026",
      datePart2: "",
      desc: "Pengumuman resmi hasil seleksi penerimaan murid baru secara serentak.",
      icon: "users",
      attributes: [
        { label: "Sifat PDF", value: "SAH & Legalitas" },
        { label: "Frekuensi", value: "Realtime Tiap Jam" },
        { label: "Saringan", value: "Nilai & Afinitas" }
      ]
    },
    {
      num: "06",
      name: "Daftar Ulang",
      start: new Date(2026, 5, 22),
      end: new Date(2026, 5, 25),
      datePart1: "22 Juni 2026 s/d 25",
      datePart2: "Juni 2026",
      desc: "Registrasi fisik dan penyerahan berkas asli bagi calon siswa yang dinyatakan lolos.",
      icon: "clipboard",
      attributes: [
        { label: "Tempat", value: "Loket SMKN 1" },
        { label: "Prosedur", value: "Fisik & Seragam" },
        { label: "Berkas Utama", value: "Ijazah & SKL Asli" }
      ]
    }
  ];

  const applicationSteps = stepsRaw.map(s => ({
    ...s,
    ...getStepStatus(s.start, s.end),
    isBlue: getStepStatus(s.start, s.end).statusType === "active",
  }));

  const faqData = [
    {
      title: "Informasi SPMB Jawa Tengah",
      content: "Penerimaan Peserta Didik Baru (SPMB) merupakan rangkaian kegiatan sistematik yang dirancang untuk mengatur penyelenggaraan penerimaan peserta didik baru mulai dari pendaftaran, proses seleksi, pengumuman hingga daftar ulang. Penyelenggaraan SPMB dilaksanakan setiap tahunnya oleh Dinas Pendidikan Provinsi Jawa Tengah untuk jenjang SMA, SMK, dan SLB di daerah Provinsi Jawa Tengah."
    },
    {
      title: "SOP dan Juknis SPMB",
      isHtml: true,
      content: (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span>Dokumen Standar Operasional Prosedur (SOP) dan Petunjuk Teknis Pelaksanaan SPMB Jawa Tengah Tahun 2026 dapat diunduh pada tautan berikut:</span>
          <a
            href="https://spmb.jatengprov.go.id/dokumen-pendukung" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md bg-[#f15e42] text-white hover:bg-[#d64e33] transition-colors shadow-xs shrink-0 self-start sm:self-auto"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Klik disini!</span>
          </a>
        </div>
      )
    },
    {
      title: "Cara Pendaftaran SPMB",
      content: "Proses pendaftaran SPMB untuk jenjang SMA/SMK/SLB di Jawa Tengah, dapat diakses secara online melalui website spmb.jatengprov.go.id pada masa pendaftaran yang telah ditetapkan."
    },
    {
      title: "Dokumen Persyaratan Umum SPMB",
      isHtml: true,
      content: (
        <div className="space-y-4 text-justify">
          <p className="font-semibold underline">Dokumen Persyaratan Umum:</p>
          <ol className="list-decimal pl-5 space-y-3 leading-relaxed">
            <li>
              Ijazah SMP/sederajat atau surat keterangan yang berpenghargaan sama dengan ijazah SMP/ijazah Program Paket B/Ijazah satuan pendidikan luar negeri yang dinilai/dihargai sama/setingkat dengan SMP, atau surat keterangan telah menyelesaikan program pendidikan/kartu peserta ujian sekolah, jika ijazah belum terbit.
            </li>
            <li>
              Akta kelahiran/Kartu Identitas Anak, dengan batas usia paling tinggi 21 (dua puluh satu) tahun pada tanggal 1 Juli tahun berjalan, dan belum menikah.
            </li>
            <li>
              Calon Murid penyandang disabilitas dikecualikan dari ketentuan persyaratan batas usia dan ijazah, atau dokumen lain yang menyatakan kelulusan, kecuali bagi yang akan melanjutkan ke SMPLB atau SMALB, menyertakan ijazah SDLB atau SMPLB.
            </li>
            <li>
              Kartu Keluarga (KK) yang menerangkan domisili Calon Murid.
            </li>
            <li>
              Dokumen Surat Tanggung Jawab Mutlak atau Pakta Integritas orang tua yang menyatakan data Calon Murid asli, dan bersedia dikenakan sanksi jika terbukti ada pemalsuan, dibubuhi materai dan ditandatangani orang tua (format dapat diunduh pada website SPMB).
            </li>
          </ol>
        </div>
      )
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "laptop":
        return <Laptop className="w-5.5 h-5.5 text-[#f15e42]" />;
      case "search":
        return <Search className="w-5.5 h-5.5 text-[#f15e42]" />;
      case "laptop-check":
        return <FileEdit className="w-5.5 h-5.5 text-[#f15e42]" />;
      case "school":
        return <School className="w-5.5 h-5.5 text-[#f15e42]" />;
      case "users":
        return <Users className="w-5.5 h-5.5 text-[#f15e42]" />;
      case "clipboard":
        return <ClipboardCheck className="w-5.5 h-5.5 text-[#f15e42]" />;
      default:
        return <FileEdit className="w-5.5 h-5.5 text-[#f15e42]" />;
    }
  };

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <section 
      className={`py-28 md:py-36 relative overflow-hidden transition-all duration-500 border-t ${
        isDark 
          ? "bg-slate-950 border-white/5 text-white" 
          : "bg-[#f8fafc] border-slate-200/80 text-slate-800"
      }`} 
      id="ppdb-cta"
    >
      {/* 1. Cyber-Tech Blueprint Background Grid */}
      <div className={`absolute inset-0 pointer-events-none z-0 ${isDark ? "opacity-[0.05]" : "opacity-[0.035]"}`}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      {/* 2. Interactive SVG Tech Wave & Circuit Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M-100,200 Q150,280 400,150 T900,250 T1400,100" fill="none" stroke={isDark ? "url(#neon-grad-dark)" : "url(#neon-grad-light)"} strokeWidth="3" strokeDasharray="10 5" />
        <path d="M-50,600 Q300,450 650,550 T1350,450" fill="none" stroke={isDark ? "url(#neon-grad-dark)" : "url(#neon-grad-light)"} strokeWidth="2" opacity="0.7" />
        
        {/* Futuristic circuit trace connections */}
        <polyline points="100,150 180,150 240,210 320,210" fill="none" stroke="#f15e42" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="320" cy="210" r="3" fill="#f15e42" />
        <polyline points="1100,850 1180,850 1240,790 1320,790" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="1100" cy="850" r="3" fill="#3b82f6" />

        <defs>
          <linearGradient id="neon-grad-dark" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f15e42" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="neon-grad-light" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>

      {/* 3. Glowing Futuristic Ambient Orbs */}
      <div className={`absolute top-0 left-10 w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none opacity-40 mix-blend-screen transition-opacity duration-1000 ${
        isDark ? "bg-[radial-gradient(circle_at_center,#f15e420f_0%,transparent_70%)]" : "bg-[radial-gradient(circle_at_center,#f15e4207_0%,transparent_70%)]"
      }`} />
      <div className={`absolute bottom-0 right-10 w-[700px] h-[700px] rounded-full blur-[180px] pointer-events-none opacity-50 mix-blend-screen transition-opacity duration-1000 ${
        isDark ? "bg-[radial-gradient(circle_at_center,#3b82f60d_0%,transparent_70%)]" : "bg-[radial-gradient(circle_at_center,#3b82f605_0%,transparent_70%)]"
      }`} />

      {/* 4. Elegant Cyber Corners & Blueprint System Indicators */}
      <div className="absolute top-10 left-10 items-center gap-2 font-mono text-[9px] text-[#f15e42]/65 tracking-[0.2em] uppercase hidden lg:flex pointer-events-none">
        <Cpu className="w-3 h-3 animate-pulse" />
        <span>SYS-NODE: PPDB-ONLINE_2026_ACTIVE</span>
      </div>
      <div className="absolute bottom-10 right-10 items-center gap-2 font-mono text-[9px] text-blue-500/65 tracking-[0.2em] uppercase hidden lg:flex pointer-events-none">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        <span>SINKRONISASI DATABASE: TERHUBUNG</span>
      </div>

      {/* 5. Center Core Structural Guide Line */}
      <div className={`absolute top-0 bottom-0 left-1/2 w-px pointer-events-none ${
        isDark ? "bg-white/[0.03]" : "bg-slate-900/[0.03]"
      }`} />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 w-full animate-fadeIn">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`inline-flex items-center gap-2.5 border px-5 py-2 rounded-full text-[10px] font-mono tracking-[0.25em] uppercase font-bold mb-8 transition-all duration-350 shadow-sm ${
              isDark 
                ? "border-amber-400/30 bg-amber-400/10 text-amber-300" 
                : "border-amber-600/25 bg-amber-500/5 text-amber-700"
            }`}
            id="ppdb-badge-highlight"
          >
            <Sparkles className={`w-3.5 h-3.5 animate-spin ${isDark ? "text-amber-300" : "text-amber-600"}`} style={{ animationDuration: "5s" }} />
            <span>PORTAL ADMISI TERINTEGRASI REALTIME</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-6xl font-serif font-black tracking-tight mb-5 leading-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
            id="ppdb-main-title"
          >
            Penerimaan Peserta Didik Baru
          </motion.h2>

          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className={`text-2xl md:text-3xl font-sans font-black tracking-widest uppercase mb-8 transition-all duration-300 ${
              isDark 
                ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-500" 
                : "text-transparent bg-clip-text bg-[#f15e42]"
            }`}
          >
            Tahun Ajaran 2026 / 2027
          </motion.h3>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={`font-sans text-sm md:text-base leading-relaxed font-light ${
              isDark ? "text-slate-350" : "text-slate-600"
            }`}
          >
            Sistem pendaftaran satu pintu untuk mendaftarkan diri Anda di SMK Negeri 1 Wonogiri. 
            Semua tahapan dilakukan secara daring secara transparan dan tepercaya.
          </motion.p>
        </div>

        {/* Alur Header with neat tech layout indicators */}
        <div className="mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-dashed border-slate-500/20 pb-6">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#f15e42] animate-pulse" />
            <h3 className={`text-sm md:text-base font-sans font-black uppercase tracking-wider ${isDark ? "text-slate-100" : "text-slate-800"}`}>
              TAHAPAN UTAMA ALUR PPDB 2026 / 2027
            </h3>
          </div>
          <div className="flex gap-2 items-center">
            <span className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
              isDark ? "bg-slate-900/80 border-white/5 text-slate-400" : "bg-white border-slate-200 text-slate-600"
            }`}>
              <Server className="w-3.5 h-3.5 text-[#f15e42]" />
              Database Sync: OK
            </span>
            <span className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
              isDark ? "bg-slate-900/80 border-white/5 text-emerald-400" : "bg-white border-slate-200 text-emerald-600"
            }`}>
              <Shield className="w-3.5 h-3.5" />
              Secure 256-bit
            </span>
          </div>
        </div>

        {/* Steps Grid (Focusing on clean, high-contrast, premium layouts) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 max-w-7xl mx-auto mb-20 text-center relative z-10" id="ppdb-steps-row">
          {applicationSteps.map((step, idx) => {
            const isActive = step.statusType === "active";
            const isDone = step.statusType === "done";
            
            // Premium background and styling configurations
            let cardClasses = "";
            let nameClasses = "";
            let dateClasses = "";
            let descClasses = "";
            let statusBadgeClasses = "";
            let statusDotClasses = "";
            let labelClasses = "";
            let attrValClasses = "";

            if (isDark) {
              labelClasses = "text-slate-400";
              attrValClasses = "text-white font-medium";

              if (isActive) {
                cardClasses = "bg-white/[0.09] hover:bg-white/[0.14] border border-white/20 hover:border-amber-400/60 text-white shadow-[0_20px_45px_-12px_rgba(255,255,255,0.03)] hover:shadow-[0_20px_50px_rgba(245,158,11,0.08)]";
                nameClasses = "text-white font-black";
                dateClasses = "text-[#f15e42] bg-white border border-[#feeae6] font-extrabold shadow-md";
                descClasses = "text-slate-200 text-[11px] leading-relaxed font-light";
                statusBadgeClasses = "bg-amber-400/20 text-amber-300 border border-amber-400/40 font-extrabold";
                statusDotClasses = "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]";
              } else if (isDone) {
                cardClasses = "bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/20 hover:border-emerald-400/40 text-slate-100 shadow-md hover:shadow-[0_20px_45px_rgba(16,185,129,0.08)] opacity-80";
                nameClasses = "text-slate-200 font-extrabold";
                dateClasses = "text-emerald-300 bg-emerald-900/50 font-extrabold border border-emerald-500/20";
                descClasses = "text-slate-400 text-[11px] leading-relaxed font-light";
                statusBadgeClasses = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-extrabold";
                statusDotClasses = "bg-emerald-500";
              } else {
                cardClasses = "bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 hover:border-[#f15e42]/40 text-slate-100 shadow-md hover:shadow-[0_20px_45px_rgba(0,0,0,0.3)]";
                nameClasses = "text-white font-extrabold";
                dateClasses = "text-slate-750 bg-slate-100/90 font-extrabold border border-white/10";
                descClasses = "text-slate-350 text-[11px] leading-relaxed font-light";
                statusBadgeClasses = "bg-white/5 text-slate-400 border border-white/5";
                statusDotClasses = "bg-slate-500";
              }
            } else {
              labelClasses = "text-slate-500";
              attrValClasses = "text-slate-800 font-bold";

              if (isActive) {
                cardClasses = "bg-white border-2 border-slate-900 text-slate-900 shadow-[0_22px_45px_-12px_rgba(15,23,42,0.08)] hover:shadow-2xl hover:border-[#f15e42]";
                nameClasses = "text-slate-950 font-black";
                dateClasses = "text-white bg-[#f15e42] font-black shadow-sm text-center";
                descClasses = "text-slate-650 text-[11.5px] leading-relaxed font-medium";
                statusBadgeClasses = "bg-[#feeae6] text-[#f15e42] border border-[#f15e42]/20 font-black";
                statusDotClasses = "bg-[#f15e42] shadow-[0_0_8px_rgba(241,94,66,0.6)]";
              } else if (isDone) {
                cardClasses = "bg-emerald-50 border border-emerald-200 text-slate-700 shadow-sm hover:shadow-md hover:border-emerald-400 opacity-80";
                nameClasses = "text-slate-700 font-extrabold";
                dateClasses = "text-emerald-700 bg-emerald-100 font-black border border-emerald-200";
                descClasses = "text-slate-500 text-[11.5px] leading-relaxed font-normal";
                statusBadgeClasses = "bg-emerald-100 text-emerald-700 border border-emerald-200 font-black";
                statusDotClasses = "bg-emerald-500";
              } else {
                cardClasses = "bg-white border border-slate-200/80 text-slate-800 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.03)] hover:shadow-xl hover:border-slate-400";
                nameClasses = "text-slate-900 font-extrabold";
                dateClasses = "text-[#f15e42] bg-[#feeae6] font-black shadow-none border border-transparent";
                descClasses = "text-slate-550 text-[11.5px] leading-relaxed font-normal";
                statusBadgeClasses = "bg-slate-100 text-slate-500 border border-slate-200";
                statusDotClasses = "bg-slate-400";
              }
            }

            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + idx * 0.08 }}
                className={`p-6 rounded-2xl flex flex-col justify-between items-center text-center transition-all duration-300 hover:-translate-y-2 relative group cursor-default h-full z-10 ${cardClasses}`}
              >
                {/* Connector arrow line for desktop grids */}
                {idx < 5 && (
                  <div className={`hidden xl:block absolute top-[20%] left-[90%] w-1/3 h-[2px] border-t border-dashed pointer-events-none z-0 ${
                    isDark ? "border-white/10" : "border-slate-300"
                  }`} />
                )}

                <div className="flex flex-col items-center w-full relative z-10">
                  {/* Top Header Labeling & Indicators */}
                  <div className="flex items-center justify-between w-full mb-5 font-mono text-[9px] tracking-widest font-bold">
                    <span className={isActive ? "text-[#f15e42] font-bold" : isDone ? "text-emerald-500 font-bold" : "text-slate-400"}>
                      LANGKAH {step.num}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[8.5px] uppercase ${statusBadgeClasses}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "animate-pulse" : ""} ${statusDotClasses}`} />
                      {step.status}
                    </span>
                  </div>

                  {/* Icon Shield Circle with double-pulsing rings */}
                  <div className="relative mb-5 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-13 h-13 rounded-full bg-[#feeae6] flex items-center justify-center shadow-md relative z-10 border border-[#feeae6]">
                      {getIcon(step.icon)}
                    </div>
                    {isActive && (
                      <>
                        <div className="absolute inset-0 bg-[#f15e42]/20 rounded-full animate-ping z-0" />
                        <div className="absolute inset-2 bg-amber-500/20 rounded-full animate-pulse z-0" style={{ animationDuration: "1.5s" }} />
                      </>
                    )}
                    {isDone && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center z-20 shadow-sm">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Step Title */}
                  <h4 className={`font-sans text-[15.5px] tracking-tight leading-snug min-h-[46px] flex items-center justify-center text-center mb-4 ${nameClasses}`}>
                    {step.name}
                  </h4>

                  {/* Elegant Calendar Schedule Badge */}
                  <div className={`mb-4 p-2.5 rounded-xl w-full flex items-center justify-center gap-2 ${dateClasses}`}>
                    <Calendar className="w-4 h-4 shrink-0 text-[#f15e42]" />
                    <div className="flex flex-col text-center text-[10px] leading-tight font-sans">
                      <span className="font-extrabold">{step.datePart1}</span>
                      {step.datePart2 && (
                        <span className="font-extrabold mt-0.5">{step.datePart2}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live countdown — only on the active step */}
                {isActive && <CountdownDisplay endDate={step.end} isDark={isDark} />}

                {/* Main Descriptive content inside */}
                <p className={`mb-6 text-center leading-relaxed font-sans ${descClasses}`}>
                  {step.desc}
                </p>

                {/* 6. High-Class Extra Metadata Attributes for each Step */}
                <div className={`w-full border-t border-dashed pt-4 mb-4 text-left ${isDark ? "border-white/10" : "border-slate-200"}`}>
                  <div className="flex flex-col gap-2 font-sans text-[10px]">
                    {step.attributes.map((attr, aIdx) => (
                      <div key={aIdx} className="flex justify-between items-center">
                        <span className={`font-medium ${labelClasses}`}>{attr.label}</span>
                        <span className={`font-extrabold tracking-tight ${attrValClasses}`}>{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Micro tech card bottom trim bar */}
                <div className={`w-14 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-350 ${
                  isActive ? "bg-[#f15e42]" : "bg-slate-400"
                }`} />
              </motion.div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* NEW SECTION: HIGHLY DYNAMIC & PRECISE FAQ ACCORDIONS (DROPDOWN) */}
        {/* ========================================================= */}
        <div className="max-w-4xl mx-auto mb-20 relative z-10" id="ppdb-faq-accordion-block">
          
          {/* Header Title for MCQ */}
          <div className="mb-8 flex items-center gap-3 border-b pb-4 border-slate-500/10">
            <Info className="w-5 h-5 text-[#f15e42]" />
            <h3 className={`text-base font-sans font-black tracking-wider uppercase ${
              isDark ? "text-slate-100" : "text-slate-800"
            }`}>
              FAQ (Pertanyaan yang Sering Diajukan)
            </h3>
          </div>

          <div className="space-y-4">
            {faqData.map((faq, idx) => {
              const isOpen = openFaq === idx;
              
              return (
                <div 
                  key={idx}
                  className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                    isOpen 
                      ? isDark 
                        ? "bg-slate-900/60 border-[#f15e42]/40 shadow-[0_10px_25px_rgba(241,94,66,0.06)]"
                        : "bg-white border-[#f15e42] shadow-[0_12px_32px_rgba(0,0,0,0.04)]"
                      : isDark
                        ? "bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]"
                        : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-350"
                  }`}
                >
                  {/* Accordion Trigger Header */}
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-sans cursor-pointer group focus:outline-hidden"
                    aria-expanded={isOpen}
                  >
                    <span className={`text-[14px] md:text-[15px] font-bold tracking-wide transition-colors duration-300 ${
                      isOpen
                        ? "text-[#f15e42]" 
                        : isDark ? "text-white group-hover:text-[#f15e42]" : "text-slate-800 group-hover:text-[#f15e42]"
                    }`}>
                      {faq.title}
                    </span>
                    
                    {/* Interactive Animated Chevron */}
                    <div className={`p-1.5 rounded-full transition-colors duration-300 ${
                      isOpen
                        ? "bg-[#feeae6] text-[#f15e42]"
                        : isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"
                    }`}>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Expanding Panel */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className={`px-6 pb-6 pt-1 text-[13px] md:text-[14px] leading-relaxed border-t border-dashed ${
                          isDark 
                            ? "text-slate-300 border-white/5 bg-slate-950/20" 
                            : "text-slate-650 border-slate-100 bg-slate-50/40"
                        }`}>
                          {faq.isHtml ? (
                            faq.content
                          ) : (
                            <p className="text-justify">{faq.content}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })}
          </div>

        </div>

        {/* Dynamic Premium CTAs with refined buttons & shadow glows */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto z-10 relative"
          id="ppdb-final-cta-buttons"
        >
          <a
            href="https://spmb.jatengprov.go.id/"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full sm:w-auto px-10 py-5 rounded-full text-xs font-sans font-black uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
              isDark 
                ? "text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-350 hover:to-yellow-450 hover:shadow-[0_0_35px_rgba(245,158,11,0.5)]"
                : "text-white bg-[#f15e42] hover:bg-[#d64e33] hover:shadow-[0_8px_30px_rgba(241,94,66,0.3)] hover:-translate-y-1"
            }`}
            id="btn-regist-now"
          >
            <span>Daftar PPDB Online</span>
            <ArrowUpRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </a>
          
          <a
            href="#about"
            className={`w-full sm:w-auto px-10 py-5 rounded-full text-xs font-sans font-black uppercase tracking-[0.25em] transition-all duration-300 border text-center ${
              isDark 
                ? "text-white border-white/10 hover:border-amber-400 bg-slate-900/40 hover:bg-slate-950/85 hover:shadow-lg"
                : "text-slate-800 border-slate-300 hover:border-[#f15e42] bg-white hover:bg-slate-50 shadow-md hover:-translate-y-1"
            }`}
            id="btn-download-brochure"
          >
            Unduh Panduan Pendaftaran
          </a>
        </motion.div>

        {/* Educational Institutional Metadata Sign */}
        <div className="mt-16 text-center border-t border-slate-500/10 pt-10 max-w-lg mx-auto z-10 relative">
          <p className={`text-[10px] font-mono uppercase tracking-[0.25em] transition-colors duration-300 ${
            isDark ? "text-slate-550" : "text-slate-450 font-extrabold"
          }`}>
            Sistem Informasi Terintegrasi • Dinas Pendidikan Jawa Tengah
          </p>
          <p className={`text-[9px] font-sans mt-2 transition-colors duration-300 ${
            isDark ? "text-slate-600" : "text-slate-400 font-medium"
          }`}>
            Berlandaskan asas Akuntabel, Transparan, Efektif, dan Non-Diskriminatif
          </p>
        </div>

      </div>
    </section>
  );
}
