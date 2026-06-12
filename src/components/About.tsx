import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Landmark, ArrowRight, ShieldCheck, Award } from "lucide-react";
import { GradientMesh, BusinessIllustration, FloatingShapes } from "./BackgroundSystem";

interface AboutData {
  foto: string | null;
  fotoX: number;
  fotoY: number;
  fotoScale: number;
}

export default function About({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const isDark = theme === "dark";
  const [aboutData, setAboutData] = useState<AboutData>({ foto: null, fotoX: 50, fotoY: 50, fotoScale: 100 });

  useEffect(() => {
    fetch("/api/about")
      .then(r => r.json())
      .then(d => setAboutData(d))
      .catch(() => {});
  }, []);

  const fallbackSrc = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1000&q=80";

  return (
    <section
      className={`py-24 md:py-32 relative overflow-hidden transition-colors duration-500 ${
        isDark ? "bg-slate-950" : "bg-slate-50"
      }`}
      id="about"
    >
      <GradientMesh theme={theme} variant="warm" />
      <FloatingShapes theme={theme} />
      <BusinessIllustration theme={theme} position="right" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left: Image */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative group"
            id="about-visual-container"
          >
            <div className={`absolute -inset-4 rounded-3xl border -z-10 group-hover:scale-[1.02] duration-500 transition-transform ${
              isDark ? "border-white/5 bg-slate-900/40" : "border-slate-200 bg-white/60"
            }`} />

            <div className={`relative overflow-hidden rounded-2xl aspect-[4/5] md:aspect-[4/3] lg:aspect-[3/4] shadow-2xl ${
              isDark ? "shadow-black/80" : "shadow-slate-200/80"
            }`}>
              {/* Photo */}
              <img
                src={aboutData.foto || fallbackSrc}
                alt="SMKN 1 Wonogiri"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                style={{
                  objectPosition: `${aboutData.fotoX}% ${aboutData.fotoY}%`,
                  transform: `scale(${aboutData.fotoScale / 100})`,
                  transformOrigin: `${aboutData.fotoX}% ${aboutData.fotoY}%`,
                  filter: "contrast(1.06) saturate(1.08) brightness(1.02)",
                }}
              />

              {/* Vignette overlay — subtle dark edges */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.38) 100%)",
                }}
              />

              {/* Bottom gradient for card readability */}
              <div className={`absolute inset-0 bg-gradient-to-t pointer-events-none ${
                isDark ? "from-slate-950 via-slate-950/20 to-transparent" : "from-slate-900/55 via-transparent to-transparent"
              }`} />

              {/* Status card */}
              <div className={`absolute bottom-6 left-6 right-6 p-6 rounded-xl border flex items-center justify-between backdrop-blur-md ${
                isDark ? "bg-slate-950/80 border-white/10" : "bg-white/90 border-slate-200/80"
              }`}>
                <div>
                  <span className="text-[10px] text-amber-500 font-mono uppercase tracking-widest block mb-1">
                    STATUS INSTITUSI
                  </span>
                  <span className={`font-serif font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
                    Badan Rujukan Nasional Terakreditasi A
                  </span>
                </div>
                <Award className="w-8 h-8 text-amber-500" />
              </div>
            </div>

            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-amber-500/60 pointer-events-none" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-amber-500/60 pointer-events-none" />
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            className="flex flex-col text-left"
            id="about-context-container"
          >
            <span className={`text-xs font-mono tracking-[0.3em] uppercase block mb-3 font-semibold ${
              isDark ? "text-amber-500" : "text-amber-600"
            }`}>
              PRESTIGIOUS HERITAGE
            </span>

            <h2 className={`text-3xl md:text-5xl font-serif mb-6 font-bold tracking-tight leading-tight ${
              isDark ? "text-white" : "text-slate-950"
            }`}>
              Mendidik Pemimpin Industri,{" "}
              <span className={`italic font-light ${isDark ? "text-amber-200" : "text-amber-600"}`}>
                Bukan Sekadar Pekerja.
              </span>
            </h2>

            <div className="h-[1px] w-16 bg-amber-500/40 mb-8" />

            <p className={`font-sans text-sm md:text-base leading-relaxed tracking-wide mb-6 ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}>
              SMKN 1 Wonogiri berdiri kokoh sebagai mercusuar pendidikan vokasi terkemuka di Indonesia. Sebagai jajaran resmi{" "}
              <strong className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                Center of Excellence (Pusat Keunggulan)
              </strong>
              , kami melatih ribuan talenta muda untuk mendominasi lanskap finansial korporat, kriya kuliner mewah, arsitektur mode haute couture, serta akselerasi startup digital berskala global.
            </p>

            <p className={`font-sans text-sm md:text-base leading-relaxed tracking-wide mb-8 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}>
              Dengan mengintegrasikan standar mutu operasional ISO dan membangun kolaborasi fisik langsung bersama puluhan konglomerasi industri multinasional, kami memastikan setiap siswa tumbuh dalam ekosistem nyata yang matang secara moral dan berdaya saing global tinggi.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10" id="about-keys-grid">
              <div className="flex items-start gap-3">
                <div className={`p-1 rounded border text-amber-500 mt-1 ${
                  isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-sans font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
                    Kurikulum Integratif
                  </h4>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Selaras 100% kebutuhan korporat modern.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`p-1 rounded border text-amber-500 mt-1 ${
                  isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"
                }`}>
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-sans font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
                    Fasilitas Kelas Dunia
                  </h4>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Laboratorium praktik berlisensi industri.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="#kompetensi"
                className={`group flex items-center gap-2 font-sans uppercase tracking-widest text-xs font-bold duration-300 ${
                  isDark ? "text-white hover:text-amber-400" : "text-slate-900 hover:text-amber-600"
                }`}
                id="link-explore-excellence"
              >
                <span>Saksikan Keunggulan Spektrum</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 duration-300" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
