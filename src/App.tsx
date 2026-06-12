/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
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
import KepalaSokolah from "./pages/KepalaSokolah";
import ManajemenSekolah from "./pages/ManajemenSekolah";
import VisiMisi from "./pages/VisiMisi";
import TracerStudi from "./pages/TracerStudi";
import AdminTracerStudi from "./pages/AdminTracerStudi";
import Berita from "./pages/Berita";
import { DataStore } from "./dataStore";

type AppPath = "/" | "/adm-panel" | "/tentang/kepala-sekolah" | "/tentang/manajemen-sekolah" | "/tentang/visi-misi" | "/tracer-studi" | "/admin/tracer-studi" | "/berita";

function getPath(): AppPath {
  const p = window.location.pathname;
  if (p === "/adm-panel") return "/adm-panel";
  if (p === "/tentang/kepala-sekolah") return "/tentang/kepala-sekolah";
  if (p === "/tentang/manajemen-sekolah") return "/tentang/manajemen-sekolah";
  if (p === "/tentang/visi-misi") return "/tentang/visi-misi";
  if (p === "/tracer-studi") return "/tracer-studi";
  if (p === "/admin/tracer-studi") return "/admin/tracer-studi";
  if (p === "/berita") return "/berita";
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
        onBackToFrontpage={() => {
          window.history.pushState({}, "", "/");
          window.dispatchEvent(new Event("popstate"));
        }}
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
          onBack={() => {
            window.history.pushState({}, "", "/");
            window.dispatchEvent(new Event("popstate"));
          }}
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

  return (
    <div className={containerClass} id="application-container">
      <GlobalPageBg theme={theme} />
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      <main className="relative" id="main-content-flow">
        <Hero theme={theme} />
        <Stats theme={theme} />
        <About theme={theme} />
        <Competencies theme={theme} />
        <Ecosystem theme={theme} />
        <Achievements theme={theme} />
        <CampusLife theme={theme} />
        <SuccessStories theme={theme} />
        <News theme={theme} />
        <PPDBcta theme={theme} />
      </main>

      <Footer theme={theme} />
    </div>
  );
}
