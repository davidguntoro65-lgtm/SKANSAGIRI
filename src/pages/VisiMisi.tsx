import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Target, CheckCircle2, ArrowLeft, ChevronRight, Telescope } from "lucide-react";

interface VisiMisiData {
  visi: string;
  misi: string[];
}

export default function VisiMisi({ theme = "light" }: { theme?: "light" | "dark" }) {
  const isDark = theme === "dark";
  const [data, setData] = useState<VisiMisiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/visi-misi")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section
      className={`min-h-screen pt-32 pb-24 transition-colors duration-500 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
      }`}
      id="visi-misi-page"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-12 text-[10px] font-mono uppercase tracking-widest"
        >
          <button
            onClick={() => { window.history.pushState({}, "", "/"); window.dispatchEvent(new Event("popstate")); }}
            className={`flex items-center gap-1 transition-colors ${isDark ? "text-slate-500 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"}`}
          >
            <ArrowLeft className="w-3 h-3" />
            Beranda
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className={isDark ? "text-slate-300" : "text-slate-600"}>Tentang</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-amber-500 font-bold">Visi & Misi</span>
        </motion.nav>

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-left"
        >
          <span className={`text-xs font-mono tracking-[0.3em] uppercase block mb-3 font-semibold ${isDark ? "text-amber-500" : "text-amber-600"}`}>
            SCHOOL VISION & MISSION
          </span>
          <h1 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
            Visi &amp; Misi <span className={`italic font-light ${isDark ? "text-amber-400" : "text-amber-600"}`}>Sekolah</span>
          </h1>
          <div className={`h-[1.5px] w-16 mt-6 bg-amber-500`} />
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

            {/* VISI */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className={`relative rounded-3xl p-8 md:p-10 border overflow-hidden ${
                isDark
                  ? "bg-gradient-to-br from-slate-900 to-slate-900/60 border-white/5"
                  : "bg-gradient-to-br from-amber-50 to-white border-amber-100"
              }`}
            >
              {/* Decorative accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-t-3xl" />
              <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
                isDark ? "bg-amber-500/5" : "bg-amber-300/20"
              }`} />

              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
                isDark ? "bg-amber-500/10" : "bg-amber-100"
              }`}>
                <Telescope className="w-6 h-6 text-amber-500" />
              </div>

              <span className={`text-[10px] font-mono uppercase tracking-[0.3em] block mb-3 font-bold ${
                isDark ? "text-amber-500" : "text-amber-600"
              }`}>
                VISI SEKOLAH
              </span>

              <h2 className={`text-2xl md:text-3xl font-serif font-bold tracking-tight mb-6 ${
                isDark ? "text-white" : "text-slate-950"
              }`}>
                Visi
              </h2>

              <blockquote className={`font-serif text-base md:text-lg leading-relaxed italic border-l-2 border-amber-500/40 pl-5 ${
                isDark ? "text-slate-200" : "text-slate-700"
              }`}>
                {data?.visi || "Visi belum diatur. Silakan atur melalui Superadmin Panel."}
              </blockquote>
            </motion.div>

            {/* MISI */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className={`relative rounded-3xl p-8 md:p-10 border ${
                isDark
                  ? "bg-slate-900 border-white/5"
                  : "bg-white border-slate-100"
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 rounded-t-3xl ${
                isDark ? "opacity-30" : "opacity-20"
              }`} />

              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
                isDark ? "bg-white/5" : "bg-slate-100"
              }`}>
                <Target className="w-6 h-6 text-slate-600" />
              </div>

              <span className={`text-[10px] font-mono uppercase tracking-[0.3em] block mb-3 font-bold ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                MISI SEKOLAH
              </span>

              <h2 className={`text-2xl md:text-3xl font-serif font-bold tracking-tight mb-6 ${
                isDark ? "text-white" : "text-slate-950"
              }`}>
                Misi
              </h2>

              {data?.misi && data.misi.length > 0 ? (
                <ol className="space-y-4">
                  {data.misi.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 + i * 0.07 }}
                      className="flex items-start gap-3"
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                        isDark ? "bg-amber-500/10" : "bg-amber-50"
                      }`}>
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className={`text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {item}
                      </p>
                    </motion.li>
                  ))}
                </ol>
              ) : (
                <p className={`text-sm italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Misi belum diatur. Silakan atur melalui Superadmin Panel.
                </p>
              )}
            </motion.div>

          </div>
        )}
      </div>
    </section>
  );
}
