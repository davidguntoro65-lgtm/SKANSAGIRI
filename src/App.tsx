/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import Navbar from "./components/Navbar";
import { GlobalPageBg } from "./components/BackgroundSystem";
import Hero from "./components/Hero";
import Stats from "./components/Stats";
import About from "./components/About";
import Competencies from "./components/Competencies";
import Ecosystem from "./components/Ecosystem";
import Achievements from "./components/Achievements";
import CampusLife from "./components/CampusLife";
import SuccessStories from "./components/SuccessStories";
import News from "./components/News";
import PPDBcta from "./components/PPDBcta";
import Footer from "./components/Footer";
import AdminPanel from "./components/AdminPanel";
import WhatsNewNotification from "./components/WhatsNewNotification";
import KepalaSokolah from "./pages/KepalaSokolah";
import ManajemenSekolah from "./pages/ManajemenSekolah";
import VisiMisi from "./pages/VisiMisi";
import TracerStudi from "./pages/TracerStudi";
import AdminTracerStudi from "./pages/AdminTracerStudi";
import Berita from "./pages/Berita";
import HubungiKami from "./pages/HubungiKami";
import ModulIntegrasi from "./pages/ModulIntegrasi";
import SuaraSkansagiri from "./pages/SuaraSkansagiri";
import AdminSuaraSkansagiri from "./pages/AdminSuaraSkansagiri";
import AduanPublik from "./pages/AduanPublik";
import AdminAduanPublik from "./pages/AdminAduanPublik";
import { DataStore } from "./dataStore";
import { navigate, getAppPath } from "./utils/navigation";

type AppPath = "/" | "/adm-panel" | "/tentang/kepala-sekolah" | "/tentang/manajemen-sekolah" | "/tentang/visi-misi" | "/tracer-studi" | "/admin/tracer-studi" | "/berita" | "/hubungi-kami" | "/modul-integrasi" | "/suara-skansagiri" | "/admin/suara-skansagiri" | "/aduan-publik" | "/admin/aduan-publik";

function getPath(): AppPath {
  const p = getAppPath();
  if (p === "/adm-panel") return "/adm-panel";
  if (p === "/tentang/kepala-sekolah") return "/tentang/kepala-sekolah";
  if (p === "/tentang/manajemen-sekolah") return "/tentang/manajemen-sekolah";
  if (p === "/tentang/visi-misi") return "/tentang/visi-misi";
  if (p === "/tracer-studi") return "/tracer-studi";
  if (p === "/admin/tracer-studi") return "/admin/tracer-studi";
  if (p === "/berita") return "/berita";
  if (p === "/hubungi-kami") return "/hubungi-kami";
  if (p === "/modul-integrasi") return "/modul-integrasi";
  if (p === "/suara-skansagiri") return "/suara-skansagiri";
  if (p === "/admin/suara-skansagiri") return "/admin/suara-skansagiri";
  if (p === "/aduan-publik") return "/aduan-publik";
  if (p === "/admin/aduan-publik") return "/admin/aduan-publik";
  const h = window.location.hash;
  if (h === "#/adm-panel" || h === "#adm-panel") return "/adm-panel";
  return "/";
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      // v2: default changed to light — reset old dark preference once
      if (localStorage.getItem("theme_default_v") !== "2") {
        localStorage.setItem("theme_default_v", "2");
        localStorage.setItem("theme", "light");
        return "light";
      }
      return (localStorage.getItem("theme") as "light" | "dark") || "light";
    }
    return "light";
  });

  useEffect(() => {
    DataStore.initializeFromServer();
  }, []);

  // Dynamic favicon: swap to uploaded school favicon when available
  useEffect(() => {
    fetch("/api/branding")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const faviconUrl = data?.schoolFavicon || data?.schoolLogo;
        if (!faviconUrl) return;
        const link = document.getElementById("app-favicon") as HTMLLinkElement | null;
        if (link) {
          link.type = faviconUrl.startsWith("data:image/svg") ? "image/svg+xml" : "image/png";
          link.href = faviconUrl;
        }
      })
      .catch(() => {});
  }, []);

  const [currentPath, setCurrentPath] = useState<AppPath>(() => {
    if (typeof window !== "undefined") return getPath();
    return "/";
  });

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(getPath());
    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  useEffect(() => {
    if (currentPath !== "/") return;
    const hash = window.location.hash;
    if (!hash) return;
    const id = hash.replace("#", "");
    const tryScroll = (attempts = 0) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (attempts < 10) {
        setTimeout(() => tryScroll(attempts + 1), 100);
      }
    };
    tryScroll();
  }, [currentPath]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  if (currentPath === "/adm-panel") {
    return (
      <AdminPanel
        theme={theme}
        onBackToFrontpage={() => navigate("/")}
      />
    );
  }

  const containerClass = `relative min-h-screen ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"} font-sans antialiased overflow-x-hidden selection:bg-amber-500 selection:text-slate-950 transition-colors duration-500`;

  // Sub-pages (Tentang) — with Navbar + Footer but no hero sections
  if (currentPath === "/tentang/kepala-sekolah") {
    return (
      <div className={containerClass} id="application-container">
        <GlobalPageBg theme={theme} />
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <KepalaSokolah theme={theme} />
        <Footer theme={theme} />
      </div>
    );
  }

  if (currentPath === "/tentang/manajemen-sekolah") {
    return (
      <div className={containerClass} id="application-container">
        <GlobalPageBg theme={theme} />
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <ManajemenSekolah theme={theme} />
        <Footer theme={theme} />
      </div>
    );
  }

  if (currentPath === "/tentang/visi-misi") {
    return (
      <div className={containerClass} id="application-container">
        <GlobalPageBg theme={theme} />
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <VisiMisi theme={theme} />
        <Footer theme={theme} />
      </div>
    );
  }

  if (currentPath === "/tracer-studi") {
    return (
      <div className={containerClass} id="application-container">
        <GlobalPageBg theme={theme} />
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <TracerStudi theme={theme} />
        <Footer theme={theme} />
      </div>
    );
  }

  if (currentPath === "/admin/tracer-studi") {
    return (
      <div className={containerClass} id="application-container">
        <GlobalPageBg theme={theme} />
        <AdminTracerStudi
          theme={theme}
          onBack={() => navigate("/")}
        />
      </div>
    );
  }

  if (currentPath === "/berita") {
    return (
      <div className={containerClass} id="application-container">
        <GlobalPageBg theme={theme} />
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <Berita theme={theme} />
        <Footer theme={theme} />
      </div>
    );
  }

  if (currentPath === "/hubungi-kami") {
    return (
      <div className={containerClass} id="application-container">
        <GlobalPageBg theme={theme} />
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <HubungiKami theme={theme} />
        <Footer theme={theme} />
      </div>
    );
  }

  if (currentPath === "/modul-integrasi") {
    return (
      <div className={containerClass} id="application-container">
        <GlobalPageBg theme={theme} />
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <ModulIntegrasi theme={theme} />
        <Footer theme={theme} />
      </div>
    );
  }

  if (currentPath === "/suara-skansagiri") {
    return (
      <div className={containerClass} id="application-container">
        <GlobalPageBg theme={theme} />
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <SuaraSkansagiri theme={theme} />
        <Footer theme={theme} />
      </div>
    );
  }

  if (currentPath === "/admin/suara-skansagiri") {
    return (
      <AdminSuaraSkansagiri
        theme={theme}
        onBack={() => navigate("/")}
      />
    );
  }

  if (currentPath === "/aduan-publik") {
    return (
      <div className={containerClass} id="application-container">
        <GlobalPageBg theme={theme} />
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <AduanPublik theme={theme} />
        <Footer theme={theme} />
      </div>
    );
  }

  if (currentPath === "/admin/aduan-publik") {
    return <AdminAduanPublik onBack={() => navigate("/")} />;
  }

  return (
    <div className={containerClass} id="application-container">
      <GlobalPageBg theme={theme} />
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      <main className="relative" id="main-content-flow">
        <Hero theme={theme} />
        <Stats theme={theme} />
        <About theme={theme} onNavigate={(page) => {
          navigate(`/tentang/${page}`);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }} />
        <Competencies theme={theme} />
        <Ecosystem theme={theme} />
        <Achievements theme={theme} />
        <CampusLife theme={theme} />
        <SuccessStories theme={theme} />
        <News theme={theme} />
        <PPDBcta theme={theme} />
      </main>

      <Footer theme={theme} />

      {/* What's New — pops up for returning visitors when there are unread articles */}
      <WhatsNewNotification />

      {/* Floating OSDAI Shortcut */}
      <a
        href="https://osdai.smkn1wonogiri.sch.id"
        target="_blank"
        rel="noopener noreferrer"
        id="btn-osdai-float"
        className="osdai-btn fixed bottom-6 right-6 z-50 group flex items-center gap-2.5 pl-3 pr-4 py-3 rounded-2xl font-sans text-white transition-all duration-300 hover:scale-105 active:scale-95 hover:rounded-3xl"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #0c1445 75%, #0f172a 100%)", border: "1px solid rgba(99,102,241,0.55)" }}
      >
        {/* Scan sweep */}
        <span
          className="osdai-scan-line pointer-events-none absolute top-0 left-0 h-full w-1/3 rounded-2xl"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }}
        />

        {/* Brain icon with ping */}
        <span className="relative flex items-center justify-center shrink-0 w-8 h-8 rounded-xl"
          style={{ background: "rgba(99,102,241,0.15)" }}>
          <span className="absolute w-5 h-5 rounded-full bg-cyan-400/25 animate-ping" />
          <Brain className="w-4 h-4 text-cyan-300 relative z-10" />
        </span>

        {/* Label */}
        <span className="osdai-label flex flex-col leading-none">
          <span className="text-[11px] font-black tracking-[0.18em] text-white">OSDAI</span>
          <span className="text-[8px] font-light tracking-[0.1em] text-cyan-300/80 normal-case">Intelligent class</span>
        </span>

        {/* Dots */}
        <span className="flex flex-col items-center gap-[3px] ml-0.5">
          <span className="osdai-dot-1 w-1 h-1 rounded-full bg-cyan-400" />
          <span className="osdai-dot-2 w-1 h-1 rounded-full bg-indigo-400" />
          <span className="osdai-dot-3 w-1 h-1 rounded-full bg-violet-400" />
        </span>

        {/* Tooltip on hover */}
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-xl text-[9px] font-mono tracking-widest uppercase text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap"
          style={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(99,102,241,0.3)" }}>
          Buka OSDAI ↗
        </span>
      </a>
    </div>
  );
}
