import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Award, CheckCircle2, ChevronRight, X, ArrowUpRight, GraduationCap } from "lucide-react";
import { Competency } from "../data";
import { DataStore } from "../dataStore";
import { SectionPattern, GradientMesh } from "./BackgroundSystem";

export default function Competencies({ theme }: { theme: "light" | "dark" }) {
  const [activeItem, setActiveItem] = useState<Competency | null>(null);
  const [competencies, setCompetencies] = useState(() => DataStore.getCompetencies());

  useEffect(() => {
    const handleUpdate = () => {
      setCompetencies(DataStore.getCompetencies());
    };
    window.addEventListener("data-store-updated", handleUpdate);
    return () => window.removeEventListener("data-store-updated", handleUpdate);
  }, []);

  return (
    <section 
      className={`py-24 md:py-32 relative transition-colors duration-500 border-y ${
        theme === "dark" ? "bg-slate-950 border-white/5" : "bg-white border-slate-200/50"
      }`} 
      id="kompetensi"
    >
      <SectionPattern type="network" theme={theme} />
      <GradientMesh theme={theme} variant="warm" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 flex flex-col items-center">
          <div className={`inline-flex items-center gap-2 border px-3 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase mb-4 font-semibold transition-all duration-300 ${
            theme === "dark" 
              ? "border-amber-500/20 bg-amber-500/5 text-amber-500" 
              : "border-amber-600/30 bg-amber-50 text-amber-700"
          }`}>
            <Award className="w-3 h-3 text-amber-500 dark:text-amber-500" />
            <span>EXCELLENCE DEPARTMENTS</span>
          </div>

          <h2 className={`text-3xl md:text-5xl font-serif mb-6 font-bold tracking-tight transition-colors duration-300 ${
            theme === "dark" ? "text-white" : "text-slate-950"
          }`}>
            Lima Kompetensi Keahlian Unggulan
          </h2>

          <p className={`font-sans text-sm md:text-base leading-relaxed tracking-wide transition-colors duration-300 ${
            theme === "dark" ? "text-slate-400" : "text-slate-650"
          }`}>
            Dirancang secara mendalam guna menjawab kebutuhan dunia usaha, dunia kerja, dan konsorsium industri modern era revolusi digital.
          </p>
        </div>

        {/* Competency Card Grid (5 distinct themes mapped out of data engine) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6" id="competency-cards-grid">
          {competencies.map((item, index) => {
            const isDark = theme === "dark";
            return (
              <motion.div
                key={item.code}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className={`relative rounded-2xl border p-6 flex flex-col justify-between overflow-hidden group transition-all duration-300 min-h-[420px] shadow-lg ${
                  isDark 
                    ? `${item.themeClass} border-[#1e2f54]/60 shadow-black/40`
                    : "bg-gradient-to-b from-white to-slate-50/70 border-slate-200/80 shadow-slate-100/60"
                }`}
                id={`comp-card-${item.code.toLowerCase()}`}
              >
                {/* Visual Glass Shine Overlay */}
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                
                {/* Absolute background image layer with slow zoom and custom lower opacity */}
                <div className={`absolute inset-0 -z-10 transition-all duration-700 pointer-events-none ${
                  isDark ? "opacity-10 group-hover:opacity-15" : "opacity-5 group-hover:opacity-10"
                } group-hover:scale-105`}>
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Card Top Block */}
                <div className="relative">
                  {/* Category Header Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all duration-300 ${isDark ? item.badgeColor : "bg-slate-100 border-slate-200/80 text-slate-700"}`}>
                      {item.code}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Prog. Keahlian
                    </span>
                  </div>

                  {/* Core Title */}
                  <h3 className={`text-xl md:text-2xl font-serif font-semibold leading-tight mb-2 group-hover:text-amber-500 dark:group-hover:text-amber-300 duration-300 ${isDark ? "text-white" : "text-slate-900"}`}>
                    {item.name}
                  </h3>
                  
                  {/* Secondary International English Name */}
                  <p className={`text-[10px] italic font-mono tracking-wide uppercase mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {item.englishName}
                  </p>

                  {/* Curated Excerpt */}
                  <p className={`text-xs font-sans leading-relaxed tracking-wide line-clamp-4 duration-300 ${isDark ? "text-slate-400 group-hover:text-slate-300" : "text-slate-600 group-hover:text-slate-805"}`}>
                    {item.description}
                  </p>
                </div>

                {/* Card Bottom Block */}
                <div className={`mt-8 relative pt-4 border-t transition-colors duration-300 ${isDark ? "border-white/5" : "border-slate-200/50"}`}>
                  <div className="flex flex-col gap-2 mb-4">
                    {item.stats.slice(0, 1).map((stat, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-mono">{stat.label}</span>
                        <span className={`font-mono font-bold ${isDark ? "text-amber-500" : "text-amber-600"}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Command action */}
                  <button
                    onClick={() => setActiveItem(item)}
                    className={`w-full py-2.5 rounded-lg font-sans text-[10px] uppercase tracking-widest font-bold transition-all duration-350 flex items-center justify-center gap-1.5 ${
                      isDark 
                        ? "bg-white/5 border border-white/15 hover:border-amber-400 hover:bg-white/10 text-white"
                        : "bg-slate-100/60 border border-slate-200/80 hover:border-amber-600 hover:bg-slate-200/20 hover:text-amber-700 text-slate-800"
                    }`}
                    id={`btn-comp-detail-${item.code.toLowerCase()}`}
                  >
                    <span>Lihat Kurikulum</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Outer premium corner lights */}
                <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            );
          })}
        </div>

        {/* Detailed Spec Curriculum Drawer Modal (Tactile and Luxury) */}
        <AnimatePresence>
          {activeItem && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
              id="curriculum-modal-backdrop"
            >
              {/* Blur backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveItem(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
              />

              {/* Central Premium Container */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: "spring", duration: 0.6 }}
                className={`relative w-full max-w-2xl p-6 md:p-8 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col justify-between border transition-all duration-300 ${
                  theme === "dark" ? "bg-slate-950 border-white/10 shadow-black/80" : "bg-white border-slate-200/80 shadow-slate-200/60"
                }`}
                id="curr-modal-container"
              >
                {/* Decorative glows */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none" />

                {/* Header block with close */}
                <div className={`flex items-start justify-between mb-6 pb-4 border-b relative transition-colors duration-300 ${theme === "dark" ? "border-white/10" : "border-slate-200/80"}`}>
                  <div>
                    <span className={`text-[10px] font-mono tracking-widest uppercase block mb-1 ${theme === "dark" ? "text-amber-500" : "text-amber-600"}`}>
                      CURRICULUM SPECIALIZATION
                    </span>
                    <h3 className={`text-2xl font-serif font-bold transition-colors duration-300 ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
                      {activeItem.name}
                    </h3>
                    <p className={`text-xs font-mono italic transition-colors duration-300 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      {activeItem.englishName}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveItem(null)}
                    className={`p-1.5 rounded-full border transition-all ${
                      theme === "dark" 
                        ? "bg-white/5 hover:bg-white/15 border-white/10 text-white" 
                        : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                    }`}
                    aria-label="Tutup"
                    id="btn-close-curr-modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Left sub: Description & career outcomes */}
                  <div>
                    <h4 className={`text-xs font-mono tracking-widest uppercase mb-3 flex items-center gap-1.5 transition-colors duration-300 ${theme === "dark" ? "text-amber-500" : "text-amber-600 font-semibold"}`}>
                      <GraduationCap className="w-4 h-4" />
                      Prospek Karir Utama
                    </h4>
                    <p className={`text-xs leading-relaxed mb-4 transition-colors duration-300 ${theme === "dark" ? "text-slate-400" : "text-slate-650"}`}>
                      Sertifikasi industri membekali lulusan untuk langsung diserap di entitas bisnis multinasional:
                    </p>
                    <div className="flex flex-col gap-2">
                      {activeItem.careers.map((career, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs font-sans transition-colors duration-350 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${theme === "dark" ? "text-amber-500" : "text-amber-655 text-amber-600"}`} />
                          <span>{career}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right sub: Core subjects */}
                  <div>
                    <h4 className={`text-xs font-mono tracking-widest uppercase mb-3 flex items-center gap-1.5 transition-colors duration-300 ${theme === "dark" ? "text-amber-500" : "text-amber-600 font-semibold"}`}>
                      <BookOpen className="w-4 h-4" />
                      Materi Keahlian Kunci
                    </h4>
                    <p className={`text-xs leading-relaxed mb-4 transition-colors duration-300 ${theme === "dark" ? "text-slate-400" : "text-slate-655 text-slate-600"}`}>
                      Kerangka mata pelajaran profesional berstandar industri internasional:
                    </p>
                    <div className="flex flex-col gap-2">
                      {activeItem.curriculum.map((subject, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs font-sans transition-colors duration-350 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                          <span className={`text-[10px] font-mono transition-colors duration-300 ${theme === "dark" ? "text-emerald-500" : "text-emerald-600 font-bold"}`}>{(i+1).toString().padStart(2, '0')}.</span>
                          <span>{subject}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer specs of activeItem */}
                <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 border-t gap-4 transition-colors duration-300 ${theme === "dark" ? "border-white/5" : "border-slate-250 border-slate-200/80"}`}>
                  <div className="grid grid-cols-3 gap-4 text-left">
                    {activeItem.stats.map((stat, i) => (
                      <div key={i}>
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">{stat.label}</span>
                        <span className={`text-xs font-mono font-bold block transition-colors duration-300 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href="#ppdb-cta"
                    onClick={() => setActiveItem(null)}
                    className={`py-2.5 px-6 rounded-lg font-sans text-xs font-bold uppercase tracking-widest text-center flex items-center justify-center gap-1 shrink-0 transition-all duration-300 ${
                      theme === "dark"
                        ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950"
                        : "bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700 hover:shadow-[0_4px_12px_rgba(217,119,6,0.25)]"
                    }`}
                    id="btn-curr-regist"
                  >
                    <span>Daftar Jurusan Ini</span>
                    <ArrowUpRight className={`w-3.5 h-3.5 ${theme === "dark" ? "text-slate-950" : "text-white"}`} />
                  </a>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
