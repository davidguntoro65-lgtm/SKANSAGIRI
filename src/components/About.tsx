import { motion } from "motion/react";
import { Landmark, ArrowRight, ShieldCheck, Award } from "lucide-react";

export default function About() {
  return (
    <section 
      className="py-24 md:py-32 bg-slate-950 relative overflow-hidden" 
      id="about"
    >
      {/* Visual background ambient details */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left Column: Image with Mask & Reveal animations */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative group"
            id="about-visual-container"
          >
            {/* Elegant outer background frame */}
            <div className="absolute -inset-4 rounded-3xl border border-white/5 bg-slate-900/40 -z-10 group-hover:scale-[1.02] duration-500 transition-transform" />
            
            {/* Main high-resolution academic building illustration with masked corner styling */}
            <div className="relative overflow-hidden rounded-2xl aspect-[4/5] md:aspect-[4/3] lg:aspect-[3/4] shadow-2xl shadow-black/80">
              <img
                src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1000&q=80"
                alt="SMKN 1 Wonogiri Premium Building"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 duration-700 transition-all"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              
              {/* Floating micro credential label */}
              <div className="absolute bottom-6 left-6 right-6 p-6 rounded-xl glass-premium border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-500 font-mono uppercase tracking-widest block mb-1">
                    STATUS INSTITUSI
                  </span>
                  <span className="text-white font-serif font-semibold text-sm">
                    Badan Rujukan Nasional Terakreditasi A
                  </span>
                </div>
                <Award className="w-8 h-8 text-amber-500" />
              </div>
            </div>

            {/* Accent Gold Corner Ornaments expressing heritage and elite quality */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-amber-500/60 pointer-events-none" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-amber-500/60 pointer-events-none" />
          </motion.div>

          {/* Right Column: Narrative content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            className="flex flex-col text-left"
            id="about-context-container"
          >
            <span className="text-xs text-amber-500 font-mono tracking-[0.3em] uppercase block mb-3 font-semibold">
              PRESTIGIOUS HERITAGE
            </span>
            
            <h2 className="text-3xl md:text-5xl font-serif text-white mb-6 font-bold tracking-tight leading-tight">
              Mendidik Pemimpin Industri, <span className="italic font-light text-amber-200">Bukan Sekadar Pekerja.</span>
            </h2>

            <div className="h-[1px] w-16 bg-amber-500/40 mb-8" />

            <p className="text-slate-300 font-sans text-sm md:text-base leading-relaxed tracking-wide mb-6">
              SMKN 1 Wonogiri berdiri kokoh sebagai mercusuar pendidikan vokasi terkemuka di Indonesia. Sebagai jajaran resmi <strong className="text-white font-semibold">Center of Excellence (Pusat Keunggulan)</strong>, kami melatih ribuan talenta muda untuk mendominasi lanskap finansial korporat, kriya kuliner mewah, arsitektur mode haute couture, serta akselerasi startup digital berskala global.
            </p>

            <p className="text-slate-400 font-sans text-sm md:text-base leading-relaxed tracking-wide mb-8">
              Dengan mengintegrasikan standar mutu operasional ISO dan membangun kolaborasi fisik langsung bersama puluhan konglomerasi industri multinasional, kami memastikan setiap siswa tumbuh dalam ekosistem nyata yang matang secara moral dan berdaya saing global tinggi.
            </p>

            {/* Grid bullet keys */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10" id="about-keys-grid">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 mt-1">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-white font-sans font-semibold text-sm">Kurikulum Integratif</h4>
                  <p className="text-xs text-slate-400">Selaras 100% kebutuhan korporat modern.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 mt-1">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-white font-sans font-semibold text-sm">Fasilitas Kelas Dunia</h4>
                  <p className="text-xs text-slate-400">Laboratorium praktik berlisensi industri.</p>
                </div>
              </div>
            </div>

            {/* Call to action arrow */}
            <div className="flex items-center gap-6">
              <a
                href="#kompetensi"
                className="group flex items-center gap-2 text-white font-sans uppercase tracking-widest text-xs font-bold hover:text-amber-400 duration-300"
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
