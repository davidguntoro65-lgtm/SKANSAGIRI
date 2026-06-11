import { useState, useEffect } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { Menu, X, Landmark, GraduationCap, ArrowUpRight, Award, Sun, Moon } from "lucide-react";

interface NavbarProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export default function Navbar({ theme, toggleTheme }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Tentang", href: "#about" },
    { name: "Kompetensi", href: "#kompetensi" },
    { name: "Kemitraan", href: "#kemitraan" },
    { name: "Prestasi", href: "#prestasi" },
    { name: "Kehidupan Kampus", href: "#gallery" },
    { name: "Alumni", href: "#testimoni" },
    { name: "Warta", href: "#news" },
    { name: "Sambutan", href: "#headmaster" }
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "py-3 bg-slate-950/75 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/40"
            : "py-6 bg-transparent"
        }`}
        id="navbar-root"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Logo Brand Brand */}
          <a href="#" className="flex items-center gap-3 group" id="brand-logo">
            <div className="relative w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:scale-110 transition-transform duration-300">
              <Landmark className="w-5.5 h-5.5 text-slate-950 stroke-[2]" />
              <div className="absolute inset-0 rounded-lg border border-white/30" />
            </div>
            
            <div className="flex flex-col">
              <span className="text-white font-serif tracking-widest text-sm font-bold md:text-base">
                SMKN 1 WONOGIRI
              </span>
              <span className="text-[10px] text-amber-500 tracking-widest font-mono font-medium uppercase">
                Center of Excellence
              </span>
            </div>
          </a>

          {/* Nav Links Desktop */}
          <div className="hidden lg:flex items-center gap-8" id="nav-links-desktop">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-xs text-slate-300 hover:text-white font-sans uppercase tracking-widest font-medium transition-colors relative group py-2"
                id={`link-desk-${link.name.toLowerCase()}`}
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-amber-500 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* Call To Action Button (Premium Magnetic Glow style) */}
          <div className="hidden lg:flex items-center gap-4" id="nav-actions-desktop">
            <div className="flex items-center gap-2 bg-slate-900 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono tracking-wider uppercase py-1.5 px-3 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              PPDB 2026 Aktif
            </div>

            <a
              href="#ppdb-cta"
              className="relative overflow-hidden group px-6 py-2.5 rounded-full font-sans text-xs uppercase tracking-widest font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all duration-300 flex items-center gap-2"
              id="btn-ppdb-desktop"
            >
              <span>Admisi PPDB</span>
              <ArrowUpRight className="w-4 h-4 text-slate-950 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            {/* Dark & Light Theme Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-200/50 dark:border-white/10 bg-slate-100 dark:bg-slate-900/40 hover:bg-slate-200 dark:hover:bg-slate-800/60 text-slate-600 dark:text-amber-500 hover:text-amber-500 dark:hover:text-amber-400 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 z-50"
              aria-label={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
              title={theme === "dark" ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
              id="theme-toggle-desktop"
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5 text-indigo-950" />}
            </button>
          </div>

          {/* Right Mobile Trigger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-white p-2 focus:outline-none focus:ring-1 focus:ring-amber-500/20 rounded-md"
            aria-label="Toggle Menu"
            id="mobile-nav-trigger"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Reading Progress Bar indicator at the very bottom of navbar */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 origin-left"
          style={{ scaleX }}
          id="scroll-progress-bar"
        />
      </motion.nav>

      {/* Mobile Menu Panel */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-center transition-all duration-500 lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-4"
        }`}
        id="mobile-nav-modal"
      >
        <div className="flex flex-col items-center gap-6 px-12 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-amber-500" />
          </div>
          
          <h3 className="text-white font-serif tracking-widest uppercase font-bold text-lg">
            SMKN 1 Wonogiri
          </h3>
          <p className="text-xs text-slate-400 font-sans tracking-wide max-w-xs uppercase">
            Center of Excellence & Innovation
          </p>

          <div className="h-[1px] w-12 bg-amber-500/20 my-2" />

          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="text-base text-slate-300 hover:text-white font-serif tracking-widest hover:scale-105 transition-all py-1.5"
              id={`link-mob-${link.name.toLowerCase()}`}
            >
              {link.name}
            </a>
          ))}

          {/* Mobile Theme Toggle Button */}
          <button
            onClick={() => {
              toggleTheme();
              setIsOpen(false);
            }}
            className="mt-2 flex items-center gap-3 px-6 py-2.5 rounded-full border border-slate-200/40 dark:border-white/10 bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-amber-500 transition-all hover:scale-105 active:scale-95 text-xs uppercase tracking-widest font-bold w-full justify-center cursor-pointer"
            id="theme-toggle-mobile"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Mode Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-950" />
                <span className="text-slate-800">Mode Gelap</span>
              </>
            )}
          </button>

          <a
            href="#ppdb-cta"
            onClick={() => setIsOpen(false)}
            className="mt-6 w-full py-3.5 rounded-full text-slate-950 font-sans font-extrabold uppercase tracking-widest text-xs bg-gradient-to-r from-amber-400 to-yellow-500 text-center"
            id="btn-ppdb-mobile"
          >
            Admisi PPDB Online 2026
          </a>
        </div>
      </div>
    </>
  );
}
