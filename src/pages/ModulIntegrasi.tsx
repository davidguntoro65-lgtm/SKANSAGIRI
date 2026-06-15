import { motion } from "motion/react";
import {
  Briefcase, Users, Vote, FileCheck, Mail, Award, Factory, Megaphone,
  ArrowRight, Layers, Clock, ChevronRight, ExternalLink
} from "lucide-react";

import { navigate } from "../utils/navigation";

interface ModulIntegrasiProps {
  theme: "light" | "dark";
}

const modules = [
  {
    id: "prakerin",
    number: "01",
    title: "PRAKERIN",
    subtitle: "Praktik Kerja Industri",
    desc: "Pengajuan tempat PKL, absensi siswa di mitra industri via Geofencing (GPS), logbook digital jurnal harian kegiatan, dan penilaian online langsung dari pembimbing industri.",
    icon: Briefcase,
    tags: ["Geofencing", "Logbook Digital", "E-Penilaian"],
    color: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/20",
    accent: "amber",
  },
  {
    id: "bursa-kerja",
    number: "02",
    title: "BURSA KERJA",
    subtitle: "Portal Lowongan Alumni",
    desc: "Portal lowongan kerja khusus alumni, tracking masa tunggu kerja alumni (Tracer Study wajib Kemendikbud), dan penyaluran kerja ke perusahaan mitra industri.",
    icon: Users,
    tags: ["Tracer Study", "Job Portal", "Alumni Network"],
    color: "from-sky-500 to-blue-600",
    glow: "shadow-sky-500/20",
    accent: "sky",
  },
  {
    id: "osis",
    number: "03",
    title: "OSIS SKANSAGIRI",
    subtitle: "Organisasi Siswa Intra Sekolah",
    desc: "Pemilu Ketua OSIS Digital (E-Pilketos) — sistem pemilihan ketua OSIS secara elektronik yang transparan, aman, dan modern untuk seluruh warga SMKN 1 Wonogiri.",
    icon: Vote,
    tags: ["E-Pilketos", "Digital Election", "E-Vote"],
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
    accent: "violet",
  },
  {
    id: "legalisasi",
    number: "04",
    title: "LEGALISASI ONLINE",
    subtitle: "Layanan Legalisasi Dokumen",
    desc: "Pengajuan dan pengesahan dokumen sekolah secara digital. Proses legalisasi ijazah, transkrip, dan surat keterangan tanpa perlu hadir secara fisik ke sekolah.",
    icon: FileCheck,
    tags: ["E-Dokumen", "Digital Stamp", "Online Service"],
    color: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/20",
    accent: "emerald",
  },
  {
    id: "surat-disposisi",
    number: "05",
    title: "SURAT & DISPOSISI",
    subtitle: "Surat Menyurat & Disposisi Elektronik",
    desc: "Pengelolaan surat masuk dan keluar secara digital, disposisi elektronik antar unit, tracking status surat, serta arsip digital terpusat untuk seluruh dokumen sekolah.",
    icon: Mail,
    tags: ["E-Surat", "Disposisi Digital", "Arsip"],
    color: "from-rose-500 to-pink-600",
    glow: "shadow-rose-500/20",
    accent: "rose",
  },
  {
    id: "ukk",
    number: "06",
    title: "UKK",
    subtitle: "Uji Kompetensi Keahlian",
    desc: "Manajemen pelaksanaan Uji Kompetensi Keahlian secara terpadu — pendaftaran peserta, jadwal ujian, penilaian asesor, dan penerbitan sertifikat kompetensi digital.",
    icon: Award,
    tags: ["Sertifikasi", "Asesor Online", "E-Sertifikat"],
    color: "from-yellow-500 to-amber-600",
    glow: "shadow-yellow-500/20",
    accent: "yellow",
  },
  {
    id: "tefa",
    number: "07",
    title: "TEACHING FACTORY",
    subtitle: "Modul Teaching Factory (TEFA)",
    desc: "Pengelolaan produksi Teaching Factory berbasis industri nyata — manajemen order, production planning, quality control, dan laporan penjualan produk siswa secara real-time.",
    icon: Factory,
    tags: ["Produksi", "Quality Control", "TEFA Report"],
    color: "from-cyan-500 to-indigo-600",
    glow: "shadow-cyan-500/20",
    accent: "cyan",
  },
  {
    id: "aspirasi",
    number: "08",
    title: "SUARA SKANSAGIRI",
    subtitle: "Aspirasi Siswa & Mading Digital",
    desc: "Platform aspirasi siswa dan majalah dinding digital SMKN 1 Wonogiri — menyuarakan gagasan, karya, dan opini seluruh warga sekolah dalam satu platform terpadu.",
    icon: Megaphone,
    tags: ["Mading Digital", "Aspirasi", "Suara Siswa"],
    color: "from-fuchsia-500 to-pink-500",
    glow: "shadow-fuchsia-500/20",
    accent: "fuchsia",
  },
];

const accentMap: Record<string, string> = {
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20 group-hover:border-amber-500/40",
  sky: "text-sky-400 bg-sky-500/10 border-sky-500/20 group-hover:border-sky-500/40",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/20 group-hover:border-violet-500/40",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/20 group-hover:border-rose-500/40",
  yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20 group-hover:border-yellow-500/40",
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 group-hover:border-cyan-500/40",
  fuchsia: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20 group-hover:border-fuchsia-500/40",
};

const tagMap: Record<string, string> = {
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
};

export default function ModulIntegrasi({ theme }: ModulIntegrasiProps) {
  const isDark = theme === "dark";

  return (
    <section className="relative z-10 min-h-screen pt-32 pb-24 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6
            bg-amber-500/10 border-amber-500/25 text-amber-500 text-xs font-mono tracking-widest uppercase">
            <Layers className="w-3.5 h-3.5" />
            Platform Digital Terpadu
          </div>

          <h1 className={`font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-[1.1] ${isDark ? "text-white" : "text-slate-950"}`}>
            Modul{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600">
              Integrasi
            </span>
          </h1>

          <p className={`text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-light ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Ekosistem digital SMKN 1 Wonogiri — delapan modul terintegrasi yang membangun pengalaman
            pendidikan vokasi modern, efisien, dan berbasis data.
          </p>

          <div className={`mt-8 flex items-center justify-center gap-2 text-xs font-mono tracking-widest uppercase
            ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>Dalam pengembangan — akan diluncurkan bertahap</span>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-14">
          <div className={`flex-1 h-px ${isDark ? "bg-white/5" : "bg-slate-200"}`} />
          <span className={`text-[10px] font-mono tracking-[0.25em] uppercase ${isDark ? "text-slate-600" : "text-slate-400"}`}>
            8 Modul Unggulan
          </span>
          <div className={`flex-1 h-px ${isDark ? "bg-white/5" : "bg-slate-200"}`} />
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            const accentClass = accentMap[mod.accent];
            const tagClass = tagMap[mod.accent];

            const isLive = mod.id === "aspirasi";

            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: "easeOut" }}
                onClick={isLive ? () => navigate("/suara-skansagiri") : undefined}
                className={`group relative flex flex-col rounded-2xl border overflow-hidden
                  transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${mod.glow}
                  ${isLive ? "cursor-pointer" : "cursor-default"}
                  ${isDark
                    ? "bg-slate-900/60 border-white/6 hover:border-white/12 hover:bg-slate-900/80"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                  }
                  ${isLive ? (isDark ? "ring-1 ring-fuchsia-500/20 hover:ring-fuchsia-500/40" : "ring-1 ring-fuchsia-300/40 hover:ring-fuchsia-400/60") : ""}
                  `}
              >
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${mod.color} ${isLive ? "opacity-90" : "opacity-60"} group-hover:opacity-100 transition-opacity duration-300`} />

                {/* LIVE badge for active modules */}
                {isLive && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                    <span className="text-[8px] font-mono tracking-widest uppercase text-fuchsia-400">Live</span>
                  </div>
                )}

                {/* Number watermark */}
                <span className={`absolute top-4 right-4 font-mono text-6xl font-black leading-none select-none pointer-events-none
                  ${isDark ? "text-white/4 group-hover:text-white/6" : "text-slate-900/4 group-hover:text-slate-900/6"}
                  transition-all duration-300`}>
                  {mod.number}
                </span>

                <div className="relative p-6 flex flex-col gap-4 flex-1">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${accentClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className={`text-sm font-black tracking-widest uppercase mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                      {mod.title}
                    </h3>
                    <p className={`text-[10px] font-mono tracking-wide uppercase ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {mod.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className={`text-xs leading-relaxed flex-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {mod.desc}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                    {mod.tags.map((tag) => (
                      <span key={tag} className={`text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border ${tagClass}`}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className={`flex items-center justify-between pt-3 border-t mt-1
                    ${isDark ? "border-white/5" : "border-slate-100"}`}>
                    {isLive ? (
                      <span className="text-[9px] font-mono tracking-widest uppercase flex items-center gap-1.5 text-fuchsia-400 group-hover:text-fuchsia-300 transition-colors">
                        <ExternalLink className="w-2.5 h-2.5" />
                        Buka Modul
                      </span>
                    ) : (
                      <span className={`text-[9px] font-mono tracking-widest uppercase flex items-center gap-1.5
                        ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse" />
                        Segera Hadir
                      </span>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5
                      ${isLive
                        ? "text-fuchsia-500 group-hover:text-fuchsia-300"
                        : isDark ? "text-slate-600 group-hover:text-slate-400" : "text-slate-300 group-hover:text-slate-500"
                      }`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65, ease: "easeOut" }}
          className={`mt-16 rounded-2xl border p-8 md:p-10 text-center
            ${isDark
              ? "bg-slate-900/40 border-white/6"
              : "bg-slate-50 border-slate-200"
            }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-5
            bg-amber-500/10 border-amber-500/20 text-amber-500 text-[9px] font-mono tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Roadmap 2025–2026
          </div>
          <h3 className={`font-serif text-2xl md:text-3xl font-bold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>
            Platform Terus Berkembang
          </h3>
          <p className={`text-sm max-w-xl mx-auto leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Setiap modul akan dikembangkan dan diluncurkan secara bertahap. Pantau terus pembaruan
            dan jadilah bagian dari transformasi digital SMKN 1 Wonogiri.
          </p>
          <a
            href="/hubungi-kami"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", "/hubungi-kami");
              window.dispatchEvent(new Event("popstate"));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-sans text-xs uppercase tracking-widest font-bold
              text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500
              hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Hubungi Kami
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </motion.div>

      </div>
    </section>
  );
}
