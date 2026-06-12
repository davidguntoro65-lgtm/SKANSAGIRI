import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Newspaper, Calendar, Clock, Star, ArrowUpRight, Search, Tag, ChevronRight, Sparkles
} from "lucide-react";
import { DataStore } from "../dataStore";
import { NewsArticle } from "../data";

export default function Berita({ theme }: { theme: "light" | "dark" }) {
  const [news, setNews] = useState<NewsArticle[]>(() => DataStore.getNews());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
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
      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14 text-left"
        >
          <div className={`inline-flex items-center gap-2 border px-3 py-1.5 rounded-full text-[9px] font-mono tracking-[0.25em] uppercase mb-5 font-bold ${
            isDark
              ? "border-amber-500/20 bg-amber-500/8 text-amber-500"
              : "border-amber-600/30 bg-amber-50/80 text-amber-700"
          }`}>
            <Newspaper className="w-3.5 h-3.5" />
            <span>The Institutional Editorial</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className={`text-4xl md:text-6xl font-serif font-bold tracking-tight leading-[1.05] mb-3 ${
                isDark ? "text-white" : "text-slate-950"
              }`}>
                Warta &{" "}
                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${
                  isDark ? "from-amber-400 to-yellow-500" : "from-amber-600 to-yellow-700"
                }`}>
                  Berita
                </span>
              </h1>
              <p className={`text-sm font-sans font-light max-w-lg leading-relaxed ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                Catatan akademik resmi, agenda akbar, dan rekaman prestasi nasional SMKN 1 Wonogiri.
              </p>
            </div>

            {/* Search bar */}
            <div className={`relative flex items-center border rounded-xl px-4 py-2.5 gap-3 min-w-[260px] transition-all duration-300 ${
              isDark
                ? "bg-slate-900/60 border-white/10 focus-within:border-amber-500/40"
                : "bg-white/80 border-slate-200 focus-within:border-amber-400/60 shadow-sm"
            }`}>
              <Search className={`w-4 h-4 shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              <input
                type="text"
                placeholder="Cari berita..."
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
          className="flex flex-wrap gap-2 mb-12"
        >
          {categories.map((cat, idx) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 + idx * 0.05 }}
              onClick={() => setActiveCategory(cat)}
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
                  className="mb-14 group cursor-pointer"
                  onHoverStart={() => setHoveredId(featured.id)}
                  onHoverEnd={() => setHoveredId(null)}
                >
                  <div className={`grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-2xl overflow-hidden border transition-all duration-500 ${
                    isDark
                      ? "bg-slate-900/50 border-white/5 hover:border-amber-500/20 shadow-2xl shadow-black/30 hover:shadow-amber-500/5"
                      : "bg-white border-slate-200/80 hover:border-amber-300/60 shadow-xl shadow-slate-200/50 hover:shadow-amber-100/80"
                  }`}>
                    {/* Image */}
                    <div className="lg:col-span-6 relative overflow-hidden aspect-video lg:aspect-auto min-h-[280px]">
                      <motion.img
                        src={featured.image}
                        alt={featured.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        animate={{ scale: hoveredId === featured.id ? 1.04 : 1 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-r ${
                        isDark ? "from-transparent to-slate-900/30" : "from-transparent to-white/20"
                      }`} />
                      {/* Featured Badge */}
                      <div className={`absolute top-5 left-5 flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-[9px] font-mono tracking-widest uppercase font-bold shadow-lg ${
                        isDark
                          ? "border-amber-400/50 bg-slate-950/80 text-amber-400 backdrop-blur-sm"
                          : "border-amber-300/70 bg-white/90 text-amber-700 backdrop-blur-sm"
                      }`}>
                        <Star className="w-3 h-3 fill-amber-500/30" />
                        Featured Editorial
                      </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-6 flex flex-col justify-between p-8 md:p-10">
                      <div>
                        <span className={`text-[9px] font-mono tracking-[0.25em] uppercase font-bold block mb-3 ${
                          isDark ? "text-amber-500" : "text-amber-600"
                        }`}>
                          {featured.category}
                        </span>
                        <h2 className={`font-serif text-2xl md:text-3xl font-bold leading-snug mb-4 transition-colors duration-300 ${
                          isDark
                            ? "text-white group-hover:text-amber-300"
                            : "text-slate-950 group-hover:text-amber-700"
                        }`}>
                          {featured.title}
                        </h2>
                        <p className={`text-sm leading-relaxed font-sans font-light mb-6 ${
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
                          <div className={`flex items-center gap-4 text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
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

                        <div className={`inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase font-bold transition-all duration-200 ${
                          isDark ? "text-amber-400 group-hover:gap-3" : "text-amber-600 group-hover:gap-3"
                        }`}>
                          <span>Baca Selengkapnya</span>
                          <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                    className="group cursor-pointer flex flex-col"
                    onHoverStart={() => setHoveredId(item.id)}
                    onHoverEnd={() => setHoveredId(null)}
                  >
                    <div className={`rounded-xl overflow-hidden border flex flex-col h-full transition-all duration-400 ${
                      isDark
                        ? "bg-slate-900/40 border-white/5 hover:border-amber-500/15 shadow-xl shadow-black/20 hover:shadow-amber-500/5"
                        : "bg-white border-slate-200/80 hover:border-amber-200/80 shadow-md shadow-slate-100 hover:shadow-amber-50"
                    }`}>
                      {/* Thumbnail */}
                      <div className="relative overflow-hidden aspect-video">
                        <motion.img
                          src={item.image}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          animate={{ scale: hoveredId === item.id ? 1.05 : 1 }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t ${
                          isDark ? "from-slate-900/60 to-transparent" : "from-white/30 to-transparent"
                        }`} />
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
