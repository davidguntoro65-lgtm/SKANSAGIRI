import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Newspaper, Calendar, Clock, Star } from "lucide-react";
import { DataStore } from "../dataStore";

export default function News({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const [news, setNews] = useState(() => DataStore.getNews());
  const isDark = theme === "dark";

  useEffect(() => {
    const handleUpdate = () => setNews(DataStore.getNews());
    window.addEventListener("data-store-updated", handleUpdate);
    return () => window.removeEventListener("data-store-updated", handleUpdate);
  }, []);

  if (news.length === 0) return null;

  const featuredNews = news[0];
  const highlightNews = news.slice(1);

  return (
    <section
      className={`py-24 md:py-32 relative overflow-hidden transition-colors duration-500 ${
        isDark ? "bg-slate-950" : "bg-slate-50"
      }`}
      id="news"
    >
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/[0.01] rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-xl text-left">
            <div className={`inline-flex items-center gap-2 border px-3 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase mb-4 font-semibold ${
              isDark
                ? "border-amber-500/20 bg-amber-500/5 text-amber-500"
                : "border-amber-600/25 bg-amber-50 text-amber-700"
            }`}>
              <Newspaper className="w-4 h-4" />
              <span>THE INSTITUTIONAL EDITORIAL</span>
            </div>
            <h2 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight ${
              isDark ? "text-white" : "text-slate-950"
            }`}>
              Warta & Agenda Prestasi
            </h2>
          </div>
          <p className={`font-sans text-sm md:text-base max-w-sm text-left font-light ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}>
            Menampilkan catatan akademik resmi, agenda akbar pameran, serta rekaman prestasi nasional murid SMKN 1 Wonogiri.
          </p>
        </div>

        {/* Magazine Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12" id="magazine-news-grid">

          {/* Featured */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7 flex flex-col justify-between group cursor-pointer"
            id={`news-featured-${featuredNews.id}`}
          >
            <div className={`relative overflow-hidden rounded-2xl aspect-video md:aspect-[16/10] border shadow-2xl mb-6 ${
              isDark
                ? "bg-slate-900 border-white/5 shadow-black/40"
                : "bg-slate-200 border-slate-200 shadow-slate-200/60"
            }`}>
              <img
                src={featuredNews.image}
                alt={featuredNews.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${
                isDark
                  ? "from-slate-950 via-slate-950/40 to-transparent"
                  : "from-slate-900/70 via-slate-900/20 to-transparent"
              }`} />

              <div className={`absolute top-4 left-4 border text-[9px] font-mono tracking-widest uppercase py-1 px-3 rounded-full flex items-center gap-1.5 font-bold shadow-lg ${
                isDark
                  ? "border-amber-500/40 bg-slate-950/90 text-amber-400"
                  : "border-amber-400/60 bg-white/90 text-amber-700"
              }`}>
                <Star className="w-3.5 h-3.5 fill-amber-500/20" />
                Featured Editorial
              </div>
            </div>

            <div className="text-left">
              <span className="text-amber-500 font-semibold text-[10px] font-mono tracking-widest uppercase block mb-3">
                {featuredNews.category}
              </span>

              <h3 className={`font-serif text-xl md:text-2xl lg:text-3xl font-bold leading-tight mb-4 transition-colors ${
                isDark
                  ? "text-white group-hover:text-amber-300"
                  : "text-slate-950 group-hover:text-amber-700"
              }`}>
                {featuredNews.title}
              </h3>

              <p className={`text-xs md:text-sm leading-relaxed font-sans font-light mb-6 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                {featuredNews.excerpt}
              </p>

              <div className={`flex flex-wrap items-center justify-between pt-4 border-t gap-4 ${
                isDark ? "border-white/5" : "border-slate-200"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-serif text-xs text-amber-500 font-bold uppercase ${
                    isDark ? "bg-slate-900 border-white/10" : "bg-amber-50 border-amber-200"
                  }`}>
                    {featuredNews.author.charAt(0)}
                  </div>
                  <div>
                    <span className={`text-xs font-semibold block ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                      {featuredNews.author}
                    </span>
                    <span className={`text-[9px] uppercase font-mono block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {featuredNews.authorRole}
                    </span>
                  </div>
                </div>

                <div className={`flex items-center gap-4 text-xs font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {featuredNews.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {featuredNews.readTime}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Highlights */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6 md:gap-8" id="magazine-highlights">
            {highlightNews.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className={`flex items-start gap-4 md:gap-6 group cursor-pointer border-b pb-6 last:border-0 last:pb-0 ${
                  isDark ? "border-white/5" : "border-slate-200"
                }`}
                id={`news-highlight-${item.id}`}
              >
                <div className={`w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden border shrink-0 relative ${
                  isDark ? "bg-slate-900 border-white/5" : "bg-slate-200 border-slate-200"
                }`}>
                  <img
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="text-left flex flex-col justify-between h-full">
                  <div>
                    <span className="text-amber-500/90 font-mono font-bold tracking-widest text-[9px] uppercase block mb-1">
                      {item.category}
                    </span>
                    <h4 className={`font-serif text-sm md:text-base font-bold leading-snug transition-colors line-clamp-3 mb-2 ${
                      isDark
                        ? "text-white group-hover:text-amber-300"
                        : "text-slate-900 group-hover:text-amber-700"
                    }`}>
                      {item.title}
                    </h4>
                  </div>
                  <div className={`flex items-center gap-3 text-[10px] font-mono mt-1 ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.readTime}
                    </span>
                    <span>•</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
