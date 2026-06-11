import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowDown, GraduationCap, ArrowUpRight, Sparkles } from "lucide-react";

export default function Hero({ theme }: { theme: "light" | "dark" }) {
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 800], [0, 260]);
  const opacityFade = useTransform(scrollY, [0, 600], [1, 0]);

  // Handle mouse movement for ambient glow parallax depth
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Cinematic backgrounds representing each Excellence Center (Ken Burns slideshow)
  const slides = [
    {
      url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80",
      title: "Prestigious Academic Ground",
      overlay: "bg-slate-950/70"
    },
    {
      url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80",
      title: "Elite Culinary Gastronomy",
      overlay: "bg-amber-950/75"
    },
    {
      url: "https://images.unsplash.com/photo-1441984969893-c5a710c48ef7?auto=format&fit=crop&w=1600&q=80",
      title: "Luxury Fashion Design Studio",
      overlay: "bg-rose-950/70"
    },
    {
      url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
      title: "Digital Business Innovation Hub",
      overlay: "bg-sky-950/75"
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Headline Text Split
  const mainTitleWords = "Center of Excellence".split(" ");
  const subTitleText = "for Business, Culinary, Fashion & Digital Innovation";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  return (
    <section 
      className={`relative w-full min-h-screen lg:h-screen lg:min-h-[850px] overflow-hidden flex items-center transition-all duration-500 ${
        theme === "dark" ? "bg-slate-950" : "bg-slate-50 border-b border-slate-200/50"
      }`}
      id="hero-section"
    >
      {/* Background Frame Slides with Parallax Ken Burns */}
      <motion.div 
        className="absolute inset-0 z-0"
        style={{ y: yParallax, opacity: opacityFade }}
        id="hero-bg-parallax"
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.url}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              idx === currentSlide ? "opacity-100 scale-105" : "opacity-0 scale-100"
            }`}
          >
            <img
              src={slide.url}
              alt={slide.title}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                theme === "dark" 
                  ? "brightness-110 contrast-[1.05]" 
                  : "brightness-[1.25] opacity-20 contrast-[1.02]"
              }`}
            />
            {/* Split Dark/Light premium overlay gradients */}
            {theme === "dark" ? (
              <>
                <div className={`absolute inset-0 ${slide.overlay} mix-blend-multiply transition-colors duration-1000`} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/60" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/50 to-transparent" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-white/10 mix-blend-overlay transition-colors duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/70 to-slate-50/80" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent" />
              </>
            )}
          </div>
        ))}
      </motion.div>

      {/* Interactive Mouse Ambient Glows */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 z-[1] ${
          theme === "dark" ? "mix-blend-screen opacity-40" : "mix-blend-multiply opacity-25"
        }`}
        id="hero-ambient-lights"
      >
        <div
          className={`absolute w-[450px] h-[450px] rounded-full blur-[130px] transition-all duration-300 ${
            theme === "dark" ? "bg-amber-500/20" : "bg-amber-500/10"
          }`}
          style={{
            transform: `translate(${mousePosition.x * 1.5 - 100}px, ${mousePosition.y * 1.5 - 100}px)`,
            left: "20%",
            top: "15%"
          }}
        />
        <div
          className={`absolute w-[350px] h-[350px] rounded-full blur-[120px] transition-all duration-300 ${
            theme === "dark" ? "bg-violet-500/10" : "bg-violet-500/5"
          }`}
          style={{
            transform: `translate(${mousePosition.x * -1}px, ${mousePosition.y * -1}px)`,
            right: "25%",
            bottom: "20%"
          }}
        />
      </div>

      {/* Grid Overlay Line System (Architectural Look) */}
      <div 
        id="hero-grid-overlay" 
        className={`absolute inset-0 bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_40%_50%,#000_70%,transparent_100%)] pointer-events-none z-[1] transition-all duration-500 ${
          theme === "dark" 
            ? "bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]" 
            : "bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)]"
        }`} 
      />

      {/* Hero Content Container */}
      <div className="relative max-w-7xl mx-auto px-6 md:px-12 w-full z-10 pt-28 pb-32 md:pb-40 flex flex-col justify-center min-h-[calc(100vh-6rem)] lg:h-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-3xl flex flex-col text-left"
          id="hero-text-container"
        >
          {/* Institutional Badge */}
          <motion.div 
            variants={itemVariants}
            className={`inline-flex items-center gap-2 border px-3.5 py-1.5 rounded-full text-[10px] font-mono tracking-[0.25em] uppercase font-bold mb-6 w-fit transition-all duration-300 ${
              theme === "dark" 
                ? "border-amber-500/20 bg-amber-500/10 text-amber-500" 
                : "border-amber-600/30 bg-amber-50/80 text-amber-700 shadow-sm"
            }`}
            id="hero-inst-badge"
          >
            <GraduationCap className={`w-3.5 h-3.5 animate-pulse ${theme === "dark" ? "text-amber-500" : "text-amber-600"}`} />
            <span>Kementerian Pendidikan Nasional R.I.</span>
          </motion.div>

          {/* Subheading School Name */}
          <motion.h2
            variants={itemVariants}
            className={`text-base md:text-xl font-sans tracking-[0.4em] uppercase font-extrabold mb-2 flex items-center gap-2 transition-colors duration-300 ${
              theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}
          >
            SMKN 1 WONOGIRI
          </motion.h2>

          {/* Large Display Title Words (Word-by-word reveal style) */}
          <motion.h1
            variants={itemVariants}
            className={`text-4xl md:text-7xl font-serif tracking-normal font-bold leading-[1.05] mb-5 transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-950"
            }`}
          >
            {mainTitleWords.map((word, idx) => (
              <span key={idx} className="inline-block mr-3">
                {word === "Excellence" ? (
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r transition-all ${
                    theme === "dark" 
                      ? "from-amber-400 via-amber-300 to-yellow-500" 
                      : "from-amber-600 via-amber-700 to-yellow-800"
                  }`}>
                    {word}
                  </span>
                ) : (
                  word
                )}
              </span>
            ))}
          </motion.h1>

          {/* Subheading details */}
          <motion.p
            variants={itemVariants}
            className={`font-sans font-semibold tracking-widest text-xs md:text-sm uppercase mb-6 leading-relaxed max-w-2xl transition-colors duration-300 ${
              theme === "dark" ? "text-amber-500" : "text-amber-700 font-bold"
            }`}
          >
            {subTitleText}
          </motion.p>

          {/* Narrative statement */}
          <motion.p
            variants={itemVariants}
            className={`font-sans text-sm md:text-base tracking-wide font-light leading-relaxed mb-10 max-w-xl transition-colors duration-300 ${
              theme === "dark" 
                ? "text-slate-400 hover:text-slate-200" 
                : "text-slate-650 hover:text-slate-800"
            }`}
          >
            Membangun Generasi Profesional, Berkarakter, dan Siap Menghadapi Dunia Global dengan kurikulum mutakhir berbasis industri modern.
          </motion.p>

          {/* Luxury Buttons Panel */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-4"
            id="hero-cta-buttons"
          >
            {/* Primary explore btn */}
            <a
              href="#about"
              className={`px-8 py-4 rounded-full text-xs font-sans font-bold uppercase tracking-[0.2em] border backdrop-blur-md transition-all duration-300 ${
                theme === "dark"
                  ? "text-white border-white/20 hover:border-amber-400 hover:text-amber-300 bg-slate-900/40 hover:bg-slate-950/80 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]"
                  : "text-slate-800 border-slate-200/80 hover:border-amber-600 hover:text-amber-700 bg-white/70 hover:bg-white/95 hover:shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
              }`}
              id="btn-jelajah"
            >
              Jelajahi Sekolah
            </a>

            {/* Premium action btn */}
            <a
              href="#ppdb-cta"
              className={`px-8 py-4 rounded-full text-xs font-sans font-bold uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 ${
                theme === "dark"
                  ? "text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                  : "text-white bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 hover:shadow-[0_4px_20px_rgba(217,119,6,0.25)]"
              }`}
              id="btn-ppdb-hero"
            >
              <span>PPDB Online</span>
              <ArrowUpRight className={`w-4 h-4 ${theme === "dark" ? "text-slate-950" : "text-white"}`} />
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Sparkles indicator on the bottom right */}
      <div className={`absolute right-12 bottom-12 hidden md:flex items-center gap-3 font-mono text-[10px] tracking-widest uppercase transition-colors duration-300 ${
        theme === "dark" ? "text-slate-500" : "text-slate-400 font-semibold"
      }`}>
        <Sparkles className={`w-4 h-4 animate-spin ${theme === "dark" ? "text-amber-500" : "text-amber-600"}`} style={{ animationDuration: "6s" }} />
        <span>WONOGIRI PRIDE - GLOBAL STANDARD</span>
      </div>

      {/* Elegant mouse-interactive bottom-scroller */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-10" id="scroll-wheel-indicator">
        <span className={`text-[9px] font-mono tracking-[0.3em] uppercase transition-colors duration-300 ${
          theme === "dark" ? "text-slate-500" : "text-slate-400"
        }`}>Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ArrowDown className={`w-4 h-4 ${theme === "dark" ? "text-amber-500/80" : "text-amber-600/80"}`} />
        </motion.div>
      </div>
    </section>
  );
}
