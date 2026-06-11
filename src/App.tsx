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
import Headmaster from "./components/Headmaster";
import PPDBcta from "./components/PPDBcta";
import Footer from "./components/Footer";
import AdminPanel from "./components/AdminPanel";
import { DataStore } from "./dataStore";

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "light" | "dark") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    DataStore.initializeFromServer();
  }, []);

  const [currentPath, setCurrentPath] = useState<"/" | "/adm-panel">(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      if (p === "/adm-panel") return "/adm-panel";
      const h = window.location.hash;
      if (h === "#/adm-panel" || h === "#adm-panel") return "/adm-panel";
    }
    return "/";
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const p = window.location.pathname;
      const h = window.location.hash;
      if (p === "/adm-panel" || h === "#/adm-panel" || h === "#adm-panel") {
        setCurrentPath("/adm-panel");
      } else {
        setCurrentPath("/");
      }
    };
    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

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

  return (
    <div
      className={`relative min-h-screen ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"} font-sans antialiased overflow-x-hidden selection:bg-amber-500 selection:text-slate-950 transition-colors duration-500`}
      id="application-container"
    >
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
        <Headmaster theme={theme} />
        <PPDBcta theme={theme} />
      </main>

      <Footer theme={theme} />
    </div>
  );
}
