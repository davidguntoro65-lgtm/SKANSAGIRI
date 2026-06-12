import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Landmark, ArrowRight, ShieldCheck, Award, Quote, UserCircle2, ChevronRight } from "lucide-react";
import { GradientMesh, BusinessIllustration, FloatingShapes } from "./BackgroundSystem";

interface AboutData {
  foto: string | null;
  fotoX: number;
  fotoY: number;
  fotoScale: number;
}

interface KepalaSekolahData {
  nama: string;
  nip: string;
  foto: string | null;
  sambutan: string;
}

export default function About({
  theme = "dark",
  onNavigate,
}: {
  theme?: "light" | "dark";
  onNavigate?: (page: string) => void;
}) {
  const isDark = theme === "dark";
  const [aboutData, setAboutData] = useState<AboutData>({ foto: null, fotoX: 50, fotoY: 50, fotoScale: 100 });
  const [kepala, setKepala] = useState<KepalaSekolahData | null>(null);

  useEffect(() => {
    fetch("/api/about")
      .then(r => r.json())
      .then(d => setAboutData(d))
      .catch(() => {});
    fetch("/api/kepala-sekolah")
      .then(r => r.json())
      .then(d => setKepala(d))
      .catch(() => {});
  }, []);

  const fallbackSrc = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1000&q=80";

  const sambutanExcerpt = kepala?.sambutan
    ? kepala.sambutan.split(/\n+/)[0].slice(0, 180) + (kepala.sambutan.length > 180 ? "…" : "")
    : "";

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

        {/* ── Main grid: building photo + text ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left: Building Image */}
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
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.38) 100%)" }} />
              <div className={`absolute inset-0 bg-gradient-to-t pointer-events-none ${
                isDark ? "from-slate-950 via-slate-950/20 to-transparent" : "from-slate-900/55 via-transparent to-transparent"
              }`} />
              <div className={`absolute bottom-6 left-6 right-6 p-6 rounded-xl border flex items-center justify-between backdrop-blur-md ${
                isDark ? "bg-slate-950/80 border-white/10" : "bg-white/90 border-slate-200/80"
              }`}>
                <div>
                  <span className="text-[10px] text-amber-500 font-mono uppercase tracking-widest block mb-1">STATUS INSTITUSI</span>
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
                <div className={`p-1 rounded border text-amber-500 mt-1 ${isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-sans font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Kurikulum Integratif</h4>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Selaras 100% kebutuhan korporat modern.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`p-1 rounded border text-amber-500 mt-1 ${isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-sans font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Fasilitas Kelas Dunia</h4>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Laboratorium praktik berlisensi industri.</p>
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

        {/* ── Kepala Sekolah profile strip ── */}
        {kepala && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
            className="mt-20 md:mt-28"
          >
            {/* Section label */}
            <div className="flex items-center gap-4 mb-8">
              <div className="h-[1px] flex-1 bg-amber-500/20" />
              <span className={`text-[10px] font-mono tracking-[0.3em] uppercase font-semibold ${isDark ? "text-amber-500" : "text-amber-600"}`}>
                PIMPINAN INSTITUSI
              </span>
              <div className="h-[1px] flex-1 bg-amber-500/20" />
            </div>

            <div
              className={`relative rounded-2xl overflow-hidden border transition-all duration-500 ${
                isDark
                  ? "bg-slate-900/70 border-white/5 hover:border-amber-500/20"
                  : "bg-white/80 border-slate-200 hover:border-amber-300/60"
              }`}
              style={{ backdropFilter: "blur(12px)" }}
            >
              {/* Subtle amber glow top-left */}
              <div className="absolute top-0 left-0 w-64 h-40 pointer-events-none" style={{ background: "radial-gradient(ellipse at top left, rgba(245,158,11,0.07), transparent 70%)" }} />

              <div className="flex flex-col md:flex-row items-stretch">

                {/* Photo column */}
                <div className="relative md:w-52 lg:w-60 shrink-0 overflow-hidden">
                  {/* Corner accent */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-500/50 z-10 pointer-events-none" />

                  {kepala.foto ? (
                    <div className="relative w-full h-56 md:h-full">
                      <img
                        src={kepala.foto}
                        alt={kepala.nama}
                        className="w-full h-full object-cover object-top"
                        style={{ filter: "contrast(1.04) saturate(1.06) brightness(1.01)" }}
                      />
                      {/* Vignette */}
                      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.32) 100%)" }} />
                      {/* Right-side fade for seamless blend on desktop */}
                      <div className={`absolute inset-y-0 right-0 w-16 pointer-events-none hidden md:block ${isDark ? "bg-gradient-to-r from-transparent to-slate-900/70" : "bg-gradient-to-r from-transparent to-white/80"}`} />
                    </div>
                  ) : (
                    <div className={`w-full h-56 md:h-full flex flex-col items-center justify-center gap-2 ${isDark ? "bg-slate-800/50" : "bg-slate-100"}`}>
                      <UserCircle2 className={`w-16 h-16 ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                      <span className={`text-[9px] font-mono uppercase tracking-widest ${isDark ? "text-slate-600" : "text-slate-400"}`}>Foto Belum Tersedia</span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className={`hidden md:block w-[1px] shrink-0 ${isDark ? "bg-white/5" : "bg-slate-200"}`} />

                {/* Text content */}
                <div className="flex flex-col justify-center gap-5 p-7 md:p-10 flex-1">

                  {/* Quote icon */}
                  <Quote className={`w-6 h-6 ${isDark ? "text-amber-500/40" : "text-amber-400/50"}`} />

                  {/* Sambutan excerpt */}
                  {sambutanExcerpt && (
                    <p className={`font-serif text-base md:text-lg leading-relaxed italic ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      "{sambutanExcerpt}"
                    </p>
                  )}

                  {/* Identity + link row */}
                  <div className="flex items-end justify-between gap-4 flex-wrap pt-2">
                    <div className={`border-l-2 border-amber-500/60 pl-4`}>
                      <p className={`font-serif font-bold text-base ${isDark ? "text-white" : "text-slate-900"}`}>
                        {kepala.nama}
                      </p>
                      <p className={`text-[10px] font-mono uppercase tracking-widest mt-0.5 ${isDark ? "text-amber-500" : "text-amber-600"}`}>
                        Kepala SMKN 1 Wonogiri
                      </p>
                      {kepala.nip && (
                        <p className={`text-[10px] font-mono mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          NIP {kepala.nip}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => onNavigate?.("kepala-sekolah")}
                      className={`group flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest font-bold px-4 py-2 rounded-full border transition-all duration-300 shrink-0 ${
                        isDark
                          ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/60"
                          : "border-amber-400/50 text-amber-600 hover:bg-amber-50 hover:border-amber-400"
                      }`}
                    >
                      Baca Sambutan
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </section>
  );
}
