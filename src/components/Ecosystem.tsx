import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle } from "lucide-react";
import { DataStore } from "../dataStore";
import { IndustriPartner } from "../data";

const COLOR_MAP: Record<string, { dot: string; border: string; name: string; type: string; bg: string }> = {
  amber:   { dot: "bg-amber-400",   border: "border-amber-400/35",   name: "text-amber-300",   type: "text-amber-500/70",   bg: "bg-amber-500/8" },
  blue:    { dot: "bg-blue-400",    border: "border-blue-400/35",    name: "text-blue-300",    type: "text-blue-500/70",    bg: "bg-blue-500/8" },
  emerald: { dot: "bg-emerald-400", border: "border-emerald-400/35", name: "text-emerald-300", type: "text-emerald-500/70", bg: "bg-emerald-500/8" },
  rose:    { dot: "bg-rose-400",    border: "border-rose-400/35",    name: "text-rose-300",    type: "text-rose-500/70",    bg: "bg-rose-500/8" },
  violet:  { dot: "bg-violet-400",  border: "border-violet-400/35",  name: "text-violet-300",  type: "text-violet-500/70",  bg: "bg-violet-500/8" },
  cyan:    { dot: "bg-cyan-400",    border: "border-cyan-400/35",    name: "text-cyan-300",    type: "text-cyan-500/70",    bg: "bg-cyan-500/8" },
  orange:  { dot: "bg-orange-400",  border: "border-orange-400/35",  name: "text-orange-300",  type: "text-orange-500/70",  bg: "bg-orange-500/8" },
  indigo:  { dot: "bg-indigo-400",  border: "border-indigo-400/35",  name: "text-indigo-300",  type: "text-indigo-500/70",  bg: "bg-indigo-500/8" },
  teal:    { dot: "bg-teal-400",    border: "border-teal-400/35",    name: "text-teal-300",    type: "text-teal-500/70",    bg: "bg-teal-500/8" },
};

const COLOR_MAP_LIGHT: Record<string, { dot: string; border: string; name: string; type: string; bg: string }> = {
  amber:   { dot: "bg-amber-500",   border: "border-amber-400/40",   name: "text-amber-800",   type: "text-amber-600",   bg: "bg-amber-50" },
  blue:    { dot: "bg-blue-500",    border: "border-blue-400/40",    name: "text-blue-800",    type: "text-blue-600",    bg: "bg-blue-50" },
  emerald: { dot: "bg-emerald-500", border: "border-emerald-400/40", name: "text-emerald-800", type: "text-emerald-600", bg: "bg-emerald-50" },
  rose:    { dot: "bg-rose-500",    border: "border-rose-400/40",    name: "text-rose-800",    type: "text-rose-600",    bg: "bg-rose-50" },
  violet:  { dot: "bg-violet-500",  border: "border-violet-400/40",  name: "text-violet-800",  type: "text-violet-600",  bg: "bg-violet-50" },
  cyan:    { dot: "bg-cyan-500",    border: "border-cyan-400/40",    name: "text-cyan-800",    type: "text-cyan-600",    bg: "bg-cyan-50" },
  orange:  { dot: "bg-orange-500",  border: "border-orange-400/40",  name: "text-orange-800",  type: "text-orange-600",  bg: "bg-orange-50" },
  indigo:  { dot: "bg-indigo-500",  border: "border-indigo-400/40",  name: "text-indigo-800",  type: "text-indigo-600",  bg: "bg-indigo-50" },
  teal:    { dot: "bg-teal-500",    border: "border-teal-400/40",    name: "text-teal-800",    type: "text-teal-600",    bg: "bg-teal-50" },
};

const FALLBACK_COLOR = {
  dark:  { dot: "bg-amber-400",  border: "border-amber-400/35",  name: "text-amber-300",  type: "text-amber-500/70",  bg: "bg-amber-500/8" },
  light: { dot: "bg-amber-500",  border: "border-amber-400/40",  name: "text-amber-800",  type: "text-amber-600",  bg: "bg-amber-50" },
};

export default function Ecosystem({ theme }: { theme: "light" | "dark" }) {
  const [partners, setPartners] = useState<IndustriPartner[]>([]);

  useEffect(() => {
    setPartners(DataStore.getPartners());
    const handler = () => setPartners(DataStore.getPartners());
    window.addEventListener("data-store-updated", handler);
    return () => window.removeEventListener("data-store-updated", handler);
  }, []);

  const counters = [
    { label: "MOU AKTIF", title: "50+", desc: "Kemitraan Industri Nasional & Global" },
    { label: "KOMPETENSI KERJA", title: "500+", desc: "Siswa Aktif Magang/PKL Tiap Tahun" },
    { label: "INKUBASI BISNIS", title: "100+", desc: "Program Kolaborasi Industri & UMKM" },
    { label: "TINGKAT ABSORPSI", title: "90%+", desc: "Lulusan Terserap Kerja/Wirausaha Mandiri" },
  ];

  const isDark = theme === "dark";
  const colorMap = isDark ? COLOR_MAP : COLOR_MAP_LIGHT;

  const getColor = (color: string) =>
    colorMap[color] ?? (isDark ? FALLBACK_COLOR.dark : FALLBACK_COLOR.light);

  const displayPartners = partners.length > 0 ? partners : [];
  const marqueeItems = displayPartners.length > 0
    ? [...displayPartners, ...displayPartners]
    : [];

  return (
    <section
      className={`py-24 md:py-32 relative overflow-hidden border-y transition-colors duration-500 ${
        isDark ? "bg-slate-950 border-white/5" : "bg-slate-50 border-slate-200/50"
      }`}
      id="kemitraan"
    >
      <div className={`absolute top-0 inset-x-0 h-px transition-all duration-500 ${
        isDark
          ? "bg-gradient-to-r from-transparent via-amber-500/10 to-transparent"
          : "bg-gradient-to-r from-transparent via-amber-600/15 to-transparent"
      }`} />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl text-left">
            <span className={`text-xs font-mono tracking-[0.3em] uppercase block mb-3 font-semibold transition-colors duration-300 ${
              isDark ? "text-amber-500" : "text-amber-700"
            }`}>
              INDUSTRIAL SYNERGY
            </span>
            <h2 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight transition-colors duration-300 ${
              isDark ? "text-white" : "text-slate-950"
            }`}>
              Terhubung dengan Dunia Industri
            </h2>
          </div>
          <p className={`font-sans text-sm md:text-base max-w-sm text-left transition-colors duration-300 ${
            isDark ? "text-slate-400" : "text-slate-650"
          }`}>
            Kurikulum kami diselaraskan penuh dengan tuntutan operasional langsung korporasi papan atas nasional maupun regional.
          </p>
        </div>

        {/* Marquee ticker */}
        <div className={`relative py-6 rounded-3xl border overflow-hidden mb-20 transition-all duration-300 ${
          isDark
            ? "bg-slate-900/60 border-white/5"
            : "bg-white border-slate-200/60 shadow-sm"
        }`}>
          <div className={`absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none ${
            isDark ? "bg-gradient-to-r from-slate-950 to-transparent" : "bg-gradient-to-r from-slate-50 to-transparent"
          }`} />
          <div className={`absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none ${
            isDark ? "bg-gradient-to-l from-slate-950 to-transparent" : "bg-gradient-to-l from-slate-50 to-transparent"
          }`} />

          {marqueeItems.length > 0 ? (
            <div className="flex gap-5 items-center w-full overflow-hidden">
              <div className="flex gap-5 items-center shrink-0 animate-marquee whitespace-nowrap">
                {marqueeItems.map((corp, index) => {
                  const c = getColor(corp.color);
                  return (
                    <div
                      key={`${corp.id}-${index}`}
                      className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl border transition-all duration-300 ${c.bg} ${c.border} ${
                        isDark ? "shadow-md" : "shadow-sm"
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${c.dot}`} />
                      <div>
                        <span className={`text-xs font-serif font-bold uppercase tracking-wider block ${c.name}`}>
                          {corp.name}
                        </span>
                        <span className={`text-[9px] block uppercase font-mono ${c.type}`}>
                          {corp.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`text-center py-6 text-xs font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
              Belum ada mitra industri. Tambahkan melalui panel admin.
            </div>
          )}
        </div>

        {/* Counter Metric Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {counters.map((cnt, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className={`p-6 md:p-8 rounded-2xl border relative flex flex-col justify-between transition-all duration-300 ${
                isDark
                  ? "bg-gradient-to-b from-slate-900 to-slate-950 border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                  : "bg-white border-slate-200/80 shadow-[0_4px_15px_rgba(15,23,42,0.03)]"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[9px] font-mono tracking-widest font-semibold ${
                  isDark ? "text-amber-500" : "text-amber-700"
                }`}>
                  {cnt.label}
                </span>
                <CheckCircle className={`w-4 h-4 ${isDark ? "text-emerald-500" : "text-emerald-600"}`} />
              </div>
              <div>
                <h3 className={`text-4xl md:text-5xl font-mono font-extrabold tracking-tight mb-2 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}>
                  {cnt.title}
                </h3>
                <p className={`text-xs font-sans tracking-wide leading-relaxed ${
                  isDark ? "text-slate-400" : "text-slate-650"
                }`}>
                  {cnt.desc}
                </p>
              </div>
              <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/[0.01] rounded-tr-xl pointer-events-none" />
            </motion.div>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 32s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
