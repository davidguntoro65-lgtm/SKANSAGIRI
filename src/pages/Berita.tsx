import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Newspaper, Calendar, Clock, Star, Search, Tag, ChevronRight, Sparkles
} from "lucide-react";
import { DataStore } from "../dataStore";
import { NewsArticle } from "../data";

export default function Berita({ theme }: { theme: "light" | "dark" }) {
  const [news, setNews] = useState<NewsArticle[]>(() => DataStore.getNews());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const isDark = theme === "dark";

  useEffect(() => {
    const handleUpdate = () => setNews(DataStore.getNews());
    window.addEventListener("data-store-updated", handleUpdate);
    return () => window.removeEventListener("data-store-updated", handleUpdate);
  }, []);

  const categories = ["Semua", ...Array.from(new Set(news.map((n) => n.category)))];

  const filtered = news.filter((item) => {
    const matchCat = activeCategory === "Semua" || item.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.excerpt.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <main className="relative z-10 pt-28 pb-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 md:mb-10 text-left"
        >
          <div className={`inline-flex items-center gap-2 border px-3 py-1.5 rounded-full text-[9px] font-mono tracking-[0.25em] uppercase mb-5 font-bold ${
            isDark
              ? "border-amber-500/20 bg-amber-500/8 text-amber-500"
              : "border-amber-600/30 bg-amber-50/80 text-amber-700"
          }`}>
            <Newspaper className="w-3.5 h-3.5" />
            <span>Warta Sekolah</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <h1 className={`text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight leading-[1.08] mb-3 ${
                isDark ? "text-white" : "text-slate-950"
              }`}>
                Berita{" "}
                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${
                  isDark ? "from-amber-400 to-yellow-500" : "from-amber-600 to-yellow-700"
                }`}>
                  Sekolah
                </span>
              </h1>
              <p className={`text-sm font-sans max-w-lg leading-relaxed ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                Informasi, kegiatan, dan kabar terbaru dari SMK Negeri 1 Wonogiri.
              </p>
            </div>

            {/* Search bar */}
            <div className={`relative flex items-center border rounded-xl px-4 py-3 gap-3 w-full md:w-[300px] transition-all duration-300 ${
              isDark
                ? "bg-slate-900/60 border-white/10 focus-within:border-amber-500/40"
                : "bg-white/80 border-slate-200 focus-within:border-amber-400/60 shadow-sm"
            }`}>
              <Search className={`w-4 h-4 shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              <input
                type="text"
                placeholder="Cari berita..."
                aria-label="Cari berita"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent text-sm font-sans w-full outline-none placeholder:font-light ${
                  isDark
                    ? "text-slate-200 placeholder:text-slate-600"
                    : "text-slate-800 placeholder:text-slate-400"
                }`}
              />
            </div>
          </div>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-wrap gap-2 mb-8 md:mb-10"
        >
          {categories.map((cat, idx) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 + idx * 0.05 }}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
              className={`px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest uppercase font-bold border transition-all duration-200 ${
                activeCategory === cat
                  ? isDark
                    ? "bg-amber-500 text-slate-950 border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.35)]"
                    : "bg-amber-500 text-white border-amber-500 shadow-[0_4px_12px_rgba(217,119,6,0.25)]"
                  : isDark
                  ? "border-white/10 text-slate-500 hover:border-amber-500/30 hover:text-amber-400 bg-transparent"
                  : "border-slate-200 text-slate-500 hover:border-amber-400/60 hover:text-amber-600 bg-white/60"
              }`}
            >
              {cat}
            </motion.button>
          ))}
        </motion.div>

        {/* Empty State */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-28 gap-4"
            >
              <Sparkles className={`w-10 h-10 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
              <p className={`font-serif text-lg font-bold ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                Belum ada berita ditemukan
              </p>
              <p className={`text-sm font-sans ${isDark ? "text-slate-700" : "text-slate-300"}`}>
                Coba ubah kata kunci atau kategori pencarian
              </p>
            </motion.div>
          )}

          {filtered.length > 0 && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Featured Article */}
              {featured && (
                <motion.article
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-10 md:mb-12 group"
                >
                  <div className={`grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-2xl overflow-hidden border transition-all duration-500 ${
                    isDark
                      ? "bg-slate-900/50 border-white/5 hover:border-amber-500/20 shadow-2xl shadow-black/30 hover:shadow-amber-500/5"
                      : "bg-white border-slate-200/80 hover:border-amber-300/60 shadow-xl shadow-slate-200/50 hover:shadow-amber-100/80"
                  }`}>
                    {/* Keep the original image ratio and show the complete photo. */}
                    <div className={`lg:col-span-6 relative aspect-video lg:aspect-auto lg:self-stretch min-h-[280px] flex items-center justify-center p-2 ${
                      isDark ? "bg-slate-950" : "bg-slate-100"
                    }`}>
                      {featured.image ? (
                        <motion.img
                          src={featured.image}
                          alt={featured.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                          transition={{ duration: 0.3 }}
                        />
                      ) : (
                        <Newspaper className={`w-12 h-12 ${isDark ? "text-slate-700" : "text-slate-300"}`} aria-hidden="true" />
                      )}
                      {/* Featured Badge */}
                      <div className={`absolute top-3 left-3 sm:top-5 sm:left-5 flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-[9px] font-mono tracking-widest uppercase font-bold shadow-lg ${
                        isDark
                          ? "border-amber-400/50 bg-slate-950/80 text-amber-400 backdrop-blur-sm"
                          : "border-amber-300/70 bg-white/90 text-amber-700 backdrop-blur-sm"
                      }`}>
                        <Star className="w-3 h-3 fill-amber-500/30" />
                        Berita Pilihan
                      </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-6 flex flex-col justify-between p-5 sm:p-7 md:p-9">
                      <div>
                        <span className={`text-[10px] font-mono tracking-[0.18em] uppercase font-bold block mb-3 ${
                          isDark ? "text-amber-500" : "text-amber-600"
                        }`}>
                          {featured.category}
                        </span>
                        <h2 className={`font-serif text-xl sm:text-2xl md:text-[1.7rem] font-bold leading-snug mb-4 transition-colors duration-300 ${
                          isDark
                            ? "text-white group-hover:text-amber-300"
                            : "text-slate-950 group-hover:text-amber-700"
                        }`}>
                          {featured.title}
                        </h2>
                        <p className={`text-sm leading-7 font-sans mb-6 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}>
                          {featured.excerpt}
                        </p>
                      </div>

                      <div>
                        <div className={`flex items-center justify-between pt-5 border-t mb-5 ${
                          isDark ? "border-white/5" : "border-slate-100"
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-serif text-sm text-amber-500 font-bold uppercase ${
                              isDark ? "bg-slate-800 border-white/10" : "bg-amber-50 border-amber-200"
                            }`}>
                              {featured.author.charAt(0)}
                            </div>
                            <div>
                              <span className={`text-xs font-semibold block ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                {featured.author}
                              </span>
                              <span className={`text-[9px] uppercase font-mono block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                {featured.authorRole}
                              </span>
                            </div>
                          </div>
                          <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {featured.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {featured.readTime}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </motion.article>
              )}

              {/* Divider */}
              {rest.length > 0 && (
                <div className={`flex items-center gap-4 mb-10 ${isDark ? "text-slate-700" : "text-slate-300"}`}>
                  <div className="flex-1 h-px bg-current opacity-40" />
                  <span className="text-[9px] font-mono tracking-[0.3em] uppercase font-semibold opacity-60">
                    Berita Lainnya
                  </span>
                  <div className="flex-1 h-px bg-current opacity-40" />
                </div>
              )}

              {/* Grid of remaining articles */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                {rest.map((item, idx) => (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    className="group flex flex-col"
                  >
                    <div className={`rounded-xl overflow-hidden border flex flex-col h-full transition-all duration-400 ${
                      isDark
                        ? "bg-slate-900/40 border-white/5 hover:border-amber-500/15 shadow-xl shadow-black/20 hover:shadow-amber-500/5"
                        : "bg-white border-slate-200/80 hover:border-amber-200/80 shadow-md shadow-slate-100 hover:shadow-amber-50"
                    }`}>
                      {/* Thumbnail */}
                      <div className={`relative flex items-center justify-center overflow-hidden aspect-video p-2 ${
                        isDark ? "bg-slate-950" : "bg-slate-100"
                      }`}>
                        {item.image ? (
                          <motion.img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                            transition={{ duration: 0.3 }}
                          />
                        ) : (
                          <Newspaper className={`w-9 h-9 ${isDark ? "text-slate-700" : "text-slate-300"}`} aria-hidden="true" />
                        )}
                        {/* Category badge on image */}
                        <div className={`absolute top-3 left-3 border px-2.5 py-1 rounded-full text-[8px] font-mono tracking-widest uppercase font-bold ${
                          isDark
                            ? "border-amber-400/40 bg-slate-950/75 text-amber-400 backdrop-blur-sm"
                            : "border-amber-300/60 bg-white/85 text-amber-700 backdrop-blur-sm"
                        }`}>
                          <Tag className="w-2.5 h-2.5 inline mr-1" />
                          {item.category}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="flex flex-col flex-1 p-5 md:p-6">
                        <h3 className={`font-serif text-base md:text-lg font-bold leading-snug mb-2.5 line-clamp-2 transition-colors duration-200 ${
                          isDark
                            ? "text-white group-hover:text-amber-300"
                            : "text-slate-900 group-hover:text-amber-700"
                        }`}>
                          {item.title}
                        </h3>
                        <p className={`text-xs font-sans font-light leading-relaxed line-clamp-3 mb-4 flex-1 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}>
                          {item.excerpt}
                        </p>

                        {/* Footer */}
                        <div className={`flex items-center justify-between pt-4 border-t ${
                          isDark ? "border-white/5" : "border-slate-100"
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-serif text-xs text-amber-500 font-bold uppercase ${
                              isDark ? "bg-slate-800 border-white/10" : "bg-amber-50 border-amber-200"
                            }`}>
                              {item.author.charAt(0)}
                            </div>
                            <div>
                              <span className={`text-[10px] font-semibold block leading-none ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                {item.author}
                              </span>
                              <span className={`text-[8px] font-mono uppercase ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                {item.authorRole}
                              </span>
                            </div>
                          </div>
                          <div className={`flex items-center gap-3 text-[9px] font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {item.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.readTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
