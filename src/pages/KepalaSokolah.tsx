import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Quote, Award, Feather, ArrowLeft, ChevronRight } from "lucide-react";
import { navigate } from "../utils/navigation";

interface KepalaSekolahData {
  nama: string;
  nip: string;
  foto: string | null;
  sambutan: string;
}

export default function KepalaSokolah({ theme = "light" }: { theme?: "light" | "dark" }) {
  const isDark = theme === "dark";
  const [data, setData] = useState<KepalaSekolahData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kepala-sekolah")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const paragraphs = data?.sambutan?.split("\n").filter(Boolean) ?? [];

  return (
    <section
      className={`relative z-10 min-h-screen pt-32 pb-24 transition-colors duration-500 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
      }`}
      id="kepala-sekolah-page"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-12 text-[10px] font-mono uppercase tracking-widest"
        >
          <button
            onClick={() => { navigate("/"); }}
            className={`flex items-center gap-1 transition-colors ${isDark ? "text-slate-500 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"}`}
          >
            <ArrowLeft className="w-3 h-3" />
            Beranda
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className={isDark ? "text-slate-300" : "text-slate-600"}>Tentang</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-amber-500 font-bold">Kepala Sekolah</span>
        </motion.nav>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">

            {/* Portrait */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-5 flex justify-center relative group"
            >
              <div className={`relative w-72 h-96 md:w-80 md:h-[440px] rounded-3xl overflow-hidden shadow-2xl border-4 ${
                isDark
                  ? "shadow-black/60 border-slate-800 bg-slate-800"
                  : "shadow-slate-200/80 border-white bg-slate-200"
              }`}>
                {data?.foto ? (
                  <img
                    src={data.foto}
                    alt={data.nama}
                    className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 group-hover:scale-105 duration-700 transition-all"
                  />
                ) : (
                  <div className={`w-full h-full flex flex-col items-center justify-center gap-4 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                    <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-300 bg-white"}`}>
                      <Award className="w-10 h-10 text-amber-500" />
                    </div>
                    <span className={`text-xs font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>Foto belum diunggah</span>
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-t to-transparent pointer-events-none ${
                  isDark ? "from-slate-950/60 via-transparent" : "from-slate-900/40 via-transparent"
                }`} />
              </div>

              <div className={`absolute -bottom-6 -left-6 border px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-xl ${
                isDark ? "bg-slate-950 border-amber-500/20" : "bg-white border-amber-400/30 shadow-slate-200"
              }`}>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-amber-500 block uppercase font-mono tracking-widest font-semibold">
                    KEPALA SEKOLAH
                  </span>
                  <span className={`text-xs font-sans font-bold block ${isDark ? "text-white" : "text-slate-900"}`}>
                    {data?.nama ?? "—"}
                  </span>
                </div>
              </div>

              <div className={`absolute -top-3 -right-3 w-10 h-10 border-t-2 border-r-2 pointer-events-none ${isDark ? "border-white/10" : "border-slate-900/20"}`} />
              <div className={`absolute -bottom-3 -left-3 w-10 h-10 border-b-2 border-l-2 pointer-events-none ${isDark ? "border-white/10" : "border-slate-900/20"}`} />
            </motion.div>

            {/* Editorial */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-7 text-left"
            >
              <span className={`text-xs font-mono tracking-[0.3em] uppercase block mb-3 font-semibold ${
                isDark ? "text-amber-500" : "text-amber-600"
              }`}>
                PRESIDENTIAL ADDRESS
              </span>

              <h1 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight mb-8 ${
                isDark ? "text-white" : "text-slate-950"
              }`}>
                Sambutan <br />
                <span className={`italic font-light ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                  Kepala Sekolah
                </span>
              </h1>

              <Quote className={`w-12 h-12 mb-4 shrink-0 ${isDark ? "text-amber-500/20" : "text-amber-500/20"}`} />

              <div className={`font-serif text-base md:text-lg leading-relaxed space-y-5 mb-8 ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}>
                {paragraphs.length > 0 ? (
                  <>
                    <p className="italic">&ldquo;{paragraphs[0]}&rdquo;</p>
                    {paragraphs.slice(1).map((p, i) => (
                      <p key={i} className={`text-sm font-sans not-italic leading-relaxed font-light ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}>
                        {p}
                      </p>
                    ))}
                  </>
                ) : (
                  <p className={`text-sm font-sans not-italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    Sambutan belum diatur. Silakan atur melalui Superadmin Panel.
                  </p>
                )}
              </div>

              <div className={`h-px w-20 mb-6 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />

              <div className="flex items-center gap-4 justify-between flex-wrap">
                <div>
                  <h4 className={`font-sans font-bold text-sm tracking-wide uppercase ${
                    isDark ? "text-white" : "text-slate-950"
                  }`}>
                    {data?.nama ?? "—"}
                  </h4>
                  {data?.nip && (
                    <p className={`text-xs font-sans tracking-wide ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                      NIP. {data.nip} • Kepala SMKN 1 Wonogiri
                    </p>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 border font-mono text-[9px] tracking-widest uppercase px-3.5 py-2 rounded-full shadow-sm ${
                  isDark ? "border-white/5 bg-slate-900 text-slate-400" : "border-slate-200 bg-white text-slate-600"
                }`}>
                  <Feather className="w-3.5 h-3.5 text-amber-600" />
                  <span>Verified Seal</span>
                </div>
              </div>
            </motion.div>

          </div>
        )}
      </div>
    </section>
  );
}
