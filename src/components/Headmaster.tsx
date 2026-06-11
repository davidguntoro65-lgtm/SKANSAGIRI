import { motion } from "motion/react";
import { Quote, Award, Feather } from "lucide-react";

export default function Headmaster({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const isDark = theme === "dark";

  return (
    <section
      className={`py-24 md:py-32 border-t relative overflow-hidden transition-colors duration-500 ${
        isDark ? "bg-slate-950 border-white/5" : "bg-slate-50 border-slate-200"
      }`}
      id="headmaster"
    >
      <div className={`absolute top-0 bottom-0 left-0 right-0 opacity-[0.02] pointer-events-none ${
        isDark
          ? "bg-[radial-gradient(#ffffff_1px,transparent_1px)]"
          : "bg-[radial-gradient(#000000_1px,transparent_1px)]"
      } bg-[size:16px_16px]`} />

      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-slate-900 via-amber-500 to-slate-900" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center">

          {/* Portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-5 flex justify-center relative group"
            id="headmaster-portrait-frame"
          >
            <div className={`relative w-72 h-96 md:w-80 md:h-[420px] rounded-3xl overflow-hidden shadow-2xl border-4 ${
              isDark
                ? "shadow-black/60 border-slate-800 bg-slate-800"
                : "shadow-slate-200/80 border-white bg-slate-200"
            }`}>
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80"
                alt="Kepala Sekolah SMKN 1 Wonogiri"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 group-hover:scale-105 duration-700 transition-all"
              />
              <div className={`absolute inset-0 bg-gradient-to-t to-transparent pointer-events-none ${
                isDark ? "from-slate-950/60 via-transparent" : "from-slate-900/50 via-transparent"
              }`} />
            </div>

            <div className={`absolute -bottom-6 -left-6 border px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-xl ${
              isDark
                ? "bg-slate-950 border-amber-500/20"
                : "bg-white border-amber-400/30 shadow-slate-200"
            }`}>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-amber-500 block uppercase font-mono tracking-widest font-semibold">
                  CHIEF EXECUTIVE
                </span>
                <span className={`text-xs font-sans font-bold block ${isDark ? "text-white" : "text-slate-900"}`}>
                  Drs. Gunawan, M.Pd.
                </span>
              </div>
            </div>

            <div className={`absolute -top-3 -right-3 w-10 h-10 border-t-2 border-r-2 pointer-events-none ${
              isDark ? "border-white/10" : "border-slate-900/20"
            }`} />
            <div className={`absolute -bottom-3 -left-3 w-10 h-10 border-b-2 border-l-2 pointer-events-none ${
              isDark ? "border-white/10" : "border-slate-900/20"
            }`} />
          </motion.div>

          {/* Editorial */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-7 text-left"
            id="headmaster-context-frame"
          >
            <span className={`text-xs font-mono tracking-[0.3em] uppercase block mb-3 font-semibold ${
              isDark ? "text-amber-500" : "text-amber-600"
            }`}>
              PRESIDENTIAL ADDRESS
            </span>

            <h2 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight mb-8 ${
              isDark ? "text-white" : "text-slate-950"
            }`}>
              Pernyataan Sambutan <br />
              <span className={`italic font-light ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                Kepala Sekolah
              </span>
            </h2>

            <Quote className={`w-12 h-12 mb-4 shrink-0 ${isDark ? "text-amber-500/20" : "text-amber-500/20"}`} />

            <div className={`font-serif text-base md:text-lg leading-relaxed italic mb-6 space-y-4 ${
              isDark ? "text-slate-200" : "text-slate-800"
            }`}>
              <p>
                "Atas nama segenap keluarga besar SMKN 1 Wonogiri, saya menyambut kehadiran Anda di gerbang digital institusi terakreditasi unggul kami. Kami percaya bahwa pendidikan kejuruan mandiri tidak hanya mengajarkan metode teknis semata, namun mencetak kesiapan karakter, kepemimpinan, dan etika moral kelas dunia."
              </p>
              <p className={`text-sm font-sans not-italic leading-relaxed font-light ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}>
                Sebagai Center of Excellence Nasional, kami mendesain setiap detail proses belajar mengajar dengan standar internasional paling prima. Kami mendedikasikan seluruh daya upaya guna meluncurkan lulusan yang siap mengambil peranan krusial sebagai inovator bisnis, ahli kriya, serta motor penggerak ekonomi global.
              </p>
            </div>

            <div className={`h-px w-20 mb-6 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />

            <div className="flex items-center gap-4 justify-between flex-wrap">
              <div>
                <h4 className={`font-sans font-bold text-sm tracking-wide uppercase ${
                  isDark ? "text-white" : "text-slate-950"
                }`}>
                  Drs. Gunawan, M.Pd.
                </h4>
                <p className={`text-xs font-sans tracking-wide ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  NIP. 19680324 199403 1 008 • Kepala SMKN 1 Wonogiri
                </p>
              </div>

              <div className={`flex items-center gap-1.5 border font-mono text-[9px] tracking-widest uppercase px-3.5 py-2 rounded-full shadow-sm ${
                isDark
                  ? "border-white/5 bg-slate-900 text-slate-400"
                  : "border-slate-200 bg-white text-slate-600"
              }`}>
                <Feather className="w-3.5 h-3.5 text-amber-600" />
                <span>Verified Seal</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
