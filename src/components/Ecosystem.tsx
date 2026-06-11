import { motion } from "motion/react";
import { Briefcase, Building2, CheckCircle, GraduationCap, Handshake } from "lucide-react";

export default function Ecosystem({ theme }: { theme: "light" | "dark" }) {
  const corporateAllies = [
    { name: "Astra International", type: "Digital & Automotive" },
    { name: "Bank Mandiri Corp", type: "Accounting & Finance" },
    { name: "Shopee Southeast Asia", type: "Digital Commerce" },
    { name: "Marriott International", type: "Modern Gastronomy" },
    { name: "Uniqlo Asia Pac", type: "Apparel Design" },
    { name: "Sun Premium Hotels", type: "Culinary & Guest" },
    { name: "Toyota Astra Motor", type: "Digital Solutions" },
    { name: "Sritex Tex Tech", type: "Apparel Production" },
    { name: "Akurat Indonesia", type: "Computerized Account" },
  ];

  const counters = [
    { label: "MOU AKTIF", title: "50+", desc: "Kemitraan Industri Nasional & Global" },
    { label: "KOMPETENSI KERJA", title: "500+", desc: "Siswa Aktif Magang/PKL Tiap Tahun" },
    { label: "INKUBASI BISNIS", title: "100+", desc: "Program Kolaborasi Industri & UMKM" },
    { label: "TINGKAT ABSORPSI", title: "90%+", desc: "Lulusan Terserap Kerja/Wirausaha Mandiri" },
  ];

  return (
    <section 
      className={`py-24 md:py-32 relative overflow-hidden border-y transition-colors duration-500 ${
        theme === "dark" ? "bg-slate-950 border-white/5" : "bg-slate-50 border-slate-200/50"
      }`} 
      id="kemitraan"
    >
      {/* Visual top grid */}
      <div className={`absolute top-0 inset-x-0 h-px transition-all duration-500 ${
        theme === "dark" 
          ? "bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" 
          : "bg-gradient-to-r from-transparent via-amber-600/15 to-transparent"
      }`} />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl text-left">
            <span className={`text-xs font-mono tracking-[0.3em] uppercase block mb-3 font-semibold transition-colors duration-300 ${
              theme === "dark" ? "text-amber-500" : "text-amber-700"
            }`}>
              INDUSTRIAL SYNERGY
            </span>
            
            <h2 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-950"
            }`}>
              Terhubung dengan Dunia Industri
            </h2>
          </div>
          
          <p className={`font-sans text-sm md:text-base max-w-sm text-left transition-colors duration-300 ${
            theme === "dark" ? "text-slate-400" : "text-slate-650"
          }`}>
            Kurikulum kami diselaraskan penuh dengan tuntutan operasional langsung korporasi papan atas nasional maupun regional.
          </p>
        </div>

        {/* CSS Ticker (Infinite horizontal sliding banner with custom keyframes) */}
        <div className={`relative py-6 rounded-3xl border overflow-hidden mb-20 transition-all duration-300 ${
          theme === "dark" 
            ? "bg-slate-900/60 border-white/5" 
            : "bg-white border-slate-200/60 shadow-sm"
        }`} id="ecosystem-ticker-container">
          <div className={`absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none transition-all duration-500 ${
            theme === "dark" ? "bg-gradient-to-r from-slate-950 to-transparent" : "bg-gradient-to-r from-slate-50 to-transparent"
          }`} />
          <div className={`absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none transition-all duration-500 ${
            theme === "dark" ? "bg-gradient-to-l from-slate-950 to-transparent" : "bg-gradient-to-l from-slate-50 to-transparent"
          }`} />

          {/* Marquee Scroller Wrapper - Infinite loop */}
          <div className="flex gap-8 items-center w-full overflow-hidden" id="marquee-scroller">
            <div className="flex gap-8 items-center shrink-0 animate-marquee whitespace-nowrap">
              {corporateAllies.concat(corporateAllies).map((corp, index) => (
                <div
                  key={index}
                  className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-xl border transition-all duration-300 ${
                    theme === "dark"
                      ? "bg-slate-950 border-white/5 shadow-md hover:border-amber-500/30"
                      : "bg-slate-50/80 border-slate-150 shadow-sm hover:border-amber-600/30 hover:bg-white"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${theme === "dark" ? "bg-amber-500" : "bg-amber-600"}`} />
                  <div>
                    <span className={`text-xs font-serif font-bold uppercase tracking-wider block transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-950"
                    }`}>
                      {corp.name}
                    </span>
                    <span className={`text-[9px] block uppercase font-mono transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-500" : "text-slate-500"
                    }`}>
                      {corp.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Counter Metric Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8" id="ecosystem-counters-grid">
          {counters.map((cnt, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className={`p-6 md:p-8 rounded-2xl border relative flex flex-col justify-between transition-all duration-300 ${
                theme === "dark"
                  ? "bg-gradient-to-b from-slate-900 to-slate-950 border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                  : "bg-white border-slate-200/80 shadow-[0_4px_15px_rgba(15,23,42,0.03)]"
              }`}
              id={`eco-metric-${i}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[9px] font-mono tracking-widest font-semibold transition-colors duration-300 ${
                  theme === "dark" ? "text-amber-500" : "text-amber-700"
                }`}>
                  {cnt.label}
                </span>
                <CheckCircle className={`w-4 h-4 transition-colors duration-300 ${
                  theme === "dark" ? "text-emerald-500" : "text-emerald-600"
                }`} />
              </div>

              <div>
                <h3 className={`text-4xl md:text-5xl font-mono font-extrabold tracking-tight mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}>
                  {cnt.title}
                </h3>
                <p className={`text-xs font-sans tracking-wide leading-relaxed transition-colors duration-300 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-650"
                }`}>
                  {cnt.desc}
                </p>
              </div>

              {/* micro styling accents */}
              <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/[0.01] rounded-tr-xl pointer-events-none" />
            </motion.div>
          ))}
        </div>

      </div>

      {/* Tailwind keyframe helper injected via styles/custom class */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
