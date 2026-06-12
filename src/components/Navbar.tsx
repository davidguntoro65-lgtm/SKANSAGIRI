import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useSpring, AnimatePresence } from "motion/react";
import { Menu, X, Landmark, GraduationCap, ArrowUpRight, Sun, Moon, ChevronDown, Award, Newspaper, Camera, User, Users, Target } from "lucide-react";
import { useBranding } from "../hooks/useBranding";

interface NavbarProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("popstate"));
}

function navigateToAnchor(href: string) {
  if (!href.startsWith("#")) {
    navigate(href);
    return;
  }
  const isOnHomepage = window.location.pathname === "/";
  if (isOnHomepage) {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  } else {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new Event("popstate"));
    setTimeout(() => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 120);
  }
}

export default function Navbar({ theme, toggleTheme }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [aktifitasOpen, setAktifitasOpen] = useState(false);
  const [tentangOpen, setTentangOpen] = useState(false);
  const [mobileAktifitasOpen, setMobileAktifitasOpen] = useState(false);
  const [mobileTentangOpen, setMobileTentangOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const aktifitasRef = useRef<HTMLDivElement>(null);
  const tentangRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  const { getLogo } = useBranding();
  const logoUrl = getLogo(theme);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleLocation = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handleLocation);
    window.addEventListener("hashchange", handleLocation);
    return () => {
      window.removeEventListener("popstate", handleLocation);
      window.removeEventListener("hashchange", handleLocation);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aktifitasRef.current && !aktifitasRef.current.contains(e.target as Node)) {
        setAktifitasOpen(false);
      }
      if (tentangRef.current && !tentangRef.current.contains(e.target as Node)) {
        setTentangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { name: "Kompetensi", href: "#kompetensi" },
    { name: "Kemitraan", href: "#kemitraan" },
    { name: "Tracer Studi", href: "/tracer-studi" },
  ];

  const tentangLinks = [
    { name: "Kepala Sekolah", href: "/tentang/kepala-sekolah", icon: User, desc: "Sambutan & Profil Pimpinan" },
    { name: "Manajemen Sekolah", href: "/tentang/manajemen-sekolah", icon: Users, desc: "Pimpinan & Staf Manajemen" },
    { name: "Visi & Misi", href: "/tentang/visi-misi", icon: Target, desc: "Tujuan & Arah Pengembangan" },
  ];

  const aktifitasLinks = [
    { name: "Prestasi", href: "#prestasi", icon: Award, desc: "Penghargaan & Capaian Sekolah" },
    { name: "Warta", href: "#news", icon: Newspaper, desc: "Berita & Agenda Terbaru" },
    { name: "Kehidupan Kampus", href: "#gallery", icon: Camera, desc: "Galeri & Kegiatan Siswa" }
  ];

  // Check active states
  const isTentangActive = tentangLinks.some(l => currentPath.startsWith(l.href));
  const isTracerActive = currentPath === "/tracer-studi";
  const isBeritaActive = currentPath === "/berita";

  const navScrolledBg = isDark
    ? "bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/40"
    : "bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-lg shadow-slate-200/60";

  const baseLinkClass = `text-xs font-sans uppercase tracking-widest font-medium transition-colors relative group py-2`;

  function linkClass(isActive: boolean) {
    if (isActive) {
      return `${baseLinkClass} ${isDark ? "text-amber-400" : "text-amber-600"}`;
    }
    return `${baseLinkClass} ${isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-950"}`;
  }

  const dropdownPanel = (isDark: boolean) =>
    `absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 rounded-2xl shadow-2xl overflow-hidden border backdrop-blur-xl ${
      isDark
        ? "bg-slate-900/95 border-white/8 shadow-black/50"
        : "bg-white/98 border-slate-200 shadow-slate-200/80"
    }`;

  const dropdownItem = (isDark: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group/item ${
      isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
    }`;

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? `py-3 ${navScrolledBg}` : "py-6 bg-transparent"
        }`}
        id="navbar-root"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Logo */}
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="flex items-center gap-3 group" id="brand-logo">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="SMKN 1 Wonogiri"
                className="h-10 md:h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <>
                <div className="relative w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:scale-110 transition-transform duration-300">
                  <Landmark className="w-5.5 h-5.5 text-slate-950 stroke-[2]" />
                  <div className="absolute inset-0 rounded-lg border border-white/30" />
                </div>
                <div className="flex flex-col">
                  <span className={`font-serif tracking-widest text-sm font-bold md:text-base transition-colors duration-300 ${isDark || !isScrolled ? "text-white" : "text-slate-950"}`}>
                    SMKN 1 WONOGIRI
                  </span>
                  <span className="text-[10px] text-amber-500 tracking-widest font-mono font-medium uppercase">
                    Center of Excellence
                  </span>
                </div>
              </>
            )}
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-8" id="nav-links-desktop">

            {/* TENTANG Dropdown */}
            <div className="relative" ref={tentangRef}>
              <button
                onClick={() => setTentangOpen((v) => !v)}
                className={`${linkClass(isTentangActive)} flex items-center gap-1 cursor-pointer bg-transparent border-0 outline-none`}
                id="btn-tentang-dropdown"
              >
                Tentang
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTentangActive ? "text-amber-400" : "text-amber-500"} ${tentangOpen ? "rotate-180" : ""}`} />
                <span className={`absolute bottom-0 left-0 h-[1.5px] bg-amber-500 transition-all duration-300 ${isTentangActive ? "w-full" : "w-0 group-hover:w-full"}`} />
              </button>

              <AnimatePresence>
                {tentangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={dropdownPanel(isDark)}
                    id="tentang-dropdown-panel"
                  >
                    <div className="p-2">
                      {tentangLinks.map((item) => {
                        const Icon = item.icon;
                        const isItemActive = currentPath === item.href;
                        return (
                          <a
                            key={item.name}
                            href={item.href}
                            onClick={(e) => { e.preventDefault(); navigate(item.href); setTentangOpen(false); }}
                            className={`${dropdownItem(isDark)} ${isItemActive ? (isDark ? "bg-amber-500/10" : "bg-amber-50") : ""}`}
                            id={`link-tentang-${item.name.toLowerCase().replace(/\s/g, "-")}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isItemActive
                                ? isDark ? "bg-amber-500/30" : "bg-amber-100"
                                : isDark ? "bg-amber-500/10 group-hover/item:bg-amber-500/20" : "bg-amber-50 group-hover/item:bg-amber-100"
                            }`}>
                              <Icon className={`w-4 h-4 ${isItemActive ? "text-amber-400" : "text-amber-500"}`} />
                            </div>
                            <div>
                              <span className={`text-xs font-semibold uppercase tracking-widest block ${
                                isItemActive
                                  ? isDark ? "text-amber-300" : "text-amber-700"
                                  : isDark ? "text-white" : "text-slate-900"
                              }`}>
                                {item.name}
                              </span>
                              <span className={`text-[9px] font-mono mt-0.5 block ${
                                isDark ? "text-slate-500" : "text-slate-400"
                              }`}>
                                {item.desc}
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                    <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {navLinks.map((link) => {
              const isActive = link.href === "/tracer-studi" ? isTracerActive : false;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); navigateToAnchor(link.href); }}
                  className={linkClass(isActive)}
                  id={`link-desk-${link.name.toLowerCase()}`}
                >
                  {link.name}
                  <span className={`absolute bottom-0 left-0 h-[1.5px] bg-amber-500 transition-all duration-300 ${isActive ? "w-full" : "w-0 group-hover:w-full"}`} />
                </a>
              );
            })}

            {/* AKTIFITAS Dropdown */}
            <div className="relative" ref={aktifitasRef}>
              <button
                onClick={() => setAktifitasOpen((v) => !v)}
                className={`${linkClass(false)} flex items-center gap-1 cursor-pointer bg-transparent border-0 outline-none`}
                id="btn-aktifitas-dropdown"
              >
                Aktifitas
                <ChevronDown className={`w-3.5 h-3.5 text-amber-500 transition-transform duration-200 ${aktifitasOpen ? "rotate-180" : ""}`} />
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-amber-500 transition-all duration-300 group-hover:w-full" />
              </button>

              <AnimatePresence>
                {aktifitasOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={dropdownPanel(isDark)}
                    id="aktifitas-dropdown-panel"
                  >
                    <div className="p-2">
                      {aktifitasLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <a
                            key={item.name}
                            href={item.href}
                            onClick={(e) => { e.preventDefault(); navigateToAnchor(item.href); setAktifitasOpen(false); }}
                            className={dropdownItem(isDark)}
                            id={`link-aktifitas-${item.name.toLowerCase()}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isDark
                                ? "bg-amber-500/10 group-hover/item:bg-amber-500/20"
                                : "bg-amber-50 group-hover/item:bg-amber-100"
                            }`}>
                              <Icon className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                              <span className={`text-xs font-semibold uppercase tracking-widest block ${
                                isDark ? "text-white" : "text-slate-900"
                              }`}>
                                {item.name}
                              </span>
                              <span className={`text-[9px] font-mono mt-0.5 block ${
                                isDark ? "text-slate-500" : "text-slate-400"
                              }`}>
                                {item.desc}
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                    <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* CTA Actions */}
          <div className="hidden lg:flex items-center gap-4" id="nav-actions-desktop">
            <div className={`flex items-center gap-2 border text-emerald-600 text-[10px] font-mono tracking-wider uppercase py-1.5 px-3 rounded-full ${
              isDark
                ? "bg-slate-900 border-emerald-500/30 text-emerald-400"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}>
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

            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 z-50 ${
                isDark
                  ? "border-white/10 bg-slate-900/40 hover:bg-slate-800/60 text-amber-500 hover:text-amber-400"
                  : "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-amber-600"
              }`}
              aria-label={isDark ? "Mode Terang" : "Mode Gelap"}
              title={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
              id="theme-toggle-desktop"
            >
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          </div>

          {/* Mobile Trigger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`lg:hidden p-2 focus:outline-none focus:ring-1 focus:ring-amber-500/20 rounded-md transition-colors ${
              isDark ? "text-white" : isScrolled ? "text-slate-900" : "text-white"
            }`}
            aria-label="Toggle Menu"
            id="mobile-nav-trigger"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Reading Progress Bar */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 origin-left"
          style={{ scaleX }}
          id="scroll-progress-bar"
        />
      </motion.nav>

      {/* Mobile Menu Panel */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/97 backdrop-blur-2xl flex flex-col justify-center transition-all duration-500 lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-4"
        }`}
        id="mobile-nav-modal"
      >
        <div className="flex flex-col items-center gap-5 px-12 text-center overflow-y-auto py-12">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
            <GraduationCap className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-white font-serif tracking-widest uppercase font-bold text-lg">
            SMKN 1 Wonogiri
          </h3>
          <p className="text-xs text-slate-400 font-sans tracking-wide max-w-xs uppercase">
            Center of Excellence & Innovation
          </p>
          <div className="h-[1px] w-12 bg-amber-500/20 my-1" />

          {/* Mobile TENTANG Accordion */}
          <div className="w-full">
            <button
              onClick={() => setMobileTentangOpen((v) => !v)}
              className={`w-full flex items-center justify-center gap-2 text-base font-serif tracking-widest hover:scale-105 transition-all py-1 cursor-pointer bg-transparent border-0 outline-none ${
                isTentangActive ? "text-amber-400" : "text-slate-300 hover:text-white"
              }`}
              id="btn-tentang-mobile"
            >
              Tentang
              <ChevronDown className={`w-4 h-4 text-amber-500 transition-transform duration-200 ${mobileTentangOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {mobileTentangOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 flex flex-col gap-1">
                    {tentangLinks.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = currentPath === item.href;
                      return (
                        <a
                          key={item.name}
                          href={item.href}
                          onClick={(e) => { e.preventDefault(); navigate(item.href); setIsOpen(false); setMobileTentangOpen(false); }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                            isItemActive ? "bg-amber-500/10" : "hover:bg-white/5"
                          }`}
                          id={`link-tentang-mob-${item.name.toLowerCase().replace(/\s/g, "-")}`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Icon className={`w-3.5 h-3.5 ${isItemActive ? "text-amber-400" : "text-amber-500"}`} />
                          </div>
                          <span className={`text-sm font-serif tracking-widest ${isItemActive ? "text-amber-300" : "text-slate-300"}`}>
                            {item.name}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {navLinks.map((link) => {
            const isActive = link.href === "/tracer-studi" ? isTracerActive : false;
            return (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => { e.preventDefault(); navigateToAnchor(link.href); setIsOpen(false); }}
                className={`text-base font-serif tracking-widest hover:scale-105 transition-all py-1 ${
                  isActive ? "text-amber-400" : "text-slate-300 hover:text-white"
                }`}
                id={`link-mob-${link.name.toLowerCase()}`}
              >
                {link.name}
              </a>
            );
          })}

          {/* Mobile AKTIFITAS Accordion */}
          <div className="w-full">
            <button
              onClick={() => setMobileAktifitasOpen((v) => !v)}
              className="w-full flex items-center justify-center gap-2 text-base text-slate-300 hover:text-white font-serif tracking-widest hover:scale-105 transition-all py-1 cursor-pointer bg-transparent border-0 outline-none"
              id="btn-aktifitas-mobile"
            >
              Aktifitas
              <ChevronDown className={`w-4 h-4 text-amber-500 transition-transform duration-200 ${mobileAktifitasOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {mobileAktifitasOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 flex flex-col gap-1">
                    {aktifitasLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.name}
                          href={item.href}
                          onClick={(e) => { e.preventDefault(); navigateToAnchor(item.href); setIsOpen(false); setMobileAktifitasOpen(false); }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                          id={`link-aktifitas-mob-${item.name.toLowerCase()}`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                          <span className="text-sm text-slate-300 font-serif tracking-widest">
                            {item.name}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Theme Toggle */}
          <button
            onClick={() => { toggleTheme(); setIsOpen(false); }}
            className="mt-1 flex items-center gap-3 px-6 py-2.5 rounded-full border border-white/10 bg-slate-900/40 text-amber-500 transition-all hover:scale-105 active:scale-95 text-xs uppercase tracking-widest font-bold w-full justify-center cursor-pointer"
            id="theme-toggle-mobile"
          >
            {isDark ? (
              <><Sun className="w-4 h-4 text-amber-500" /><span>Mode Terang</span></>
            ) : (
              <><Moon className="w-4 h-4 text-amber-400" /><span>Mode Gelap</span></>
            )}
          </button>

          <a
            href="#ppdb-cta"
            onClick={() => setIsOpen(false)}
            className="mt-4 w-full py-3.5 rounded-full text-slate-950 font-sans font-extrabold uppercase tracking-widest text-xs bg-gradient-to-r from-amber-400 to-yellow-500 text-center"
            id="btn-ppdb-mobile"
          >
            Admisi PPDB Online 2026
          </a>
        </div>
      </div>
    </>
  );
}
