import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, ArrowLeft, ChevronRight, UserCircle2 } from "lucide-react";

interface ManajemenItem {
  id: string;
  jabatan: string;
  nama: string;
  foto: string | null;
}

export default function ManajemenSekolah({ theme = "light" }: { theme?: "light" | "dark" }) {
  const isDark = theme === "dark";
  const [data, setData] = useState<ManajemenItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manajemen-sekolah")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const jabatanColor: Record<string, string> = {
    "waka-kesiswaan": "from-blue-500 to-blue-700",
    "waka-kurikulum": "from-emerald-500 to-emerald-700",
    "waka-sarpras": "from-violet-500 to-violet-700",
    "waka-humas": "from-amber-500 to-amber-700",
    "kepala-tu": "from-rose-500 to-rose-700",
  };

  return (
    <section
      className={`relative z-10 min-h-screen pt-32 pb-24 transition-colors duration-500 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
      }`}
      id="manajemen-sekolah-page"
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
          <span className="text-amber-500 font-bold">Manajemen Sekolah</span>
        </motion.nav>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-[40px] bg-amber-500" />
            <span className={`text-[10px] font-mono tracking-[0.35em] uppercase font-semibold ${isDark ? "text-amber-500" : "text-amber-600"}`}>
              SCHOOL LEADERSHIP
            </span>
          </div>

          <h1 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight leading-tight mb-2 ${isDark ? "text-white" : "text-slate-950"}`}>
            Jajaran Pimpinan
          </h1>
          <h2 className={`text-xl md:text-3xl font-serif font-light tracking-wide italic mb-5 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
            Manajemen SMKN 1 Wonogiri
          </h2>

          <div className="flex items-start gap-6">
            <div className="h-[1.5px] w-16 mt-3 bg-amber-500 shrink-0" />
            <p className={`text-sm md:text-base font-light leading-relaxed max-w-2xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Pimpinan dan pengelola SMKN 1 Wonogiri yang berdedikasi dalam mewujudkan lembaga pendidikan vokasi berkelas dunia dengan standar internasional.
            </p>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.map((person, i) => {
              const gradClass = jabatanColor[person.id] ?? "from-amber-500 to-amber-700";
              return (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={`group relative rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                    isDark
                      ? "bg-slate-900 border-white/5 hover:border-amber-500/20 hover:shadow-black/50"
                      : "bg-white border-slate-100 hover:border-amber-200/60 hover:shadow-slate-200/60"
                  }`}
                >
                  {/* Photo area */}
                  <div className={`relative h-64 overflow-hidden bg-gradient-to-br ${gradClass} opacity-80`}>
                    {person.foto ? (
                      <img
                        src={person.foto}
                        alt={person.nama}
                        className="w-full h-full object-cover object-top grayscale-[5%] group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                          <UserCircle2 className="w-10 h-10 text-white/70" />
                        </div>
                        <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Foto belum diunggah</span>
                      </div>
                    )}

                    {/* Top accent stripe */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradClass}`} />

                    {/* gradient overlay at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </div>

                  {/* Info */}
                  <div className={`p-6 relative`}>
                    <div className={`inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 font-bold ${
                      isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
                    }`}>
                      <Users className="w-2.5 h-2.5" />
                      {person.jabatan}
                    </div>
                    <h3 className={`text-base font-serif font-bold tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                      {person.nama && person.nama !== "-" ? person.nama : (
                        <span className={`italic font-light text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          Nama belum diatur
                        </span>
                      )}
                    </h3>
                    <div className={`mt-3 h-[1.5px] w-8 ${isDark ? "bg-white/10" : "bg-slate-100"}`} />
                  </div>

                  {/* Corner accent */}
                  <div className={`absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg pointer-events-none transition-colors duration-300 ${
                    isDark ? "border-white/5 group-hover:border-amber-500/30" : "border-slate-100 group-hover:border-amber-300/60"
                  }`} />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
