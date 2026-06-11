import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Newspaper, Calendar, Clock, ArrowRight, BookOpen, Star } from "lucide-react";
import { NewsArticle } from "../data";
import { DataStore } from "../dataStore";

export default function News() {
  const [news, setNews] = useState(() => DataStore.getNews());

  useEffect(() => {
    const handleUpdate = () => {
      setNews(DataStore.getNews());
    };
    window.addEventListener("data-store-updated", handleUpdate);
    return () => window.removeEventListener("data-store-updated", handleUpdate);
  }, []);

  if (news.length === 0) return null;

  const featuredNews = news[0];
  const highlightNews = news.slice(1);

  return (
    <section className="py-24 md:py-32 bg-slate-950 relative overflow-hidden" id="news">
      {/* Background ambient light overlay */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/[0.01] rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-xl text-left">
            <div className="inline-flex items-center gap-2 border border-amber-500/20 bg-amber-500/5 px-3 py-1 rounded-full text-amber-500 text-[9px] font-mono tracking-widest uppercase mb-4 font-semibold">
              <Newspaper className="w-4 h-4" />
              <span>THE INSTITUTIONAL EDITORIAL</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-serif text-white font-bold tracking-tight">
              Warta & Agenda Prestasi
            </h2>
          </div>

          <p className="text-slate-400 font-sans text-sm md:text-base max-w-sm text-left font-light">
            Menampilkan catatan akademik resmi, agenda akbar pameran, serta rekaman prestasi nasional murid SMKN 1 Wonogiri.
          </p>
        </div>

        {/* Magazine-Style Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12" id="magazine-news-grid">
          
          {/* Left Panel: 1 Featured News Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7 flex flex-col justify-between group cursor-pointer"
            id={`news-featured-${featuredNews.id}`}
          >
            <div className="relative overflow-hidden rounded-2xl aspect-video md:aspect-[16/10] bg-slate-900 border border-white/5 shadow-2xl mb-6">
              <img
                src={featuredNews.image}
                alt={featuredNews.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              
              {/* Grand status flash */}
              <div className="absolute top-4 left-4 border border-amber-500/40 bg-slate-950/90 text-amber-400 text-[9px] font-mono tracking-widest uppercase py-1 px-3 rounded-full flex items-center gap-1.5 font-bold shadow-lg">
                <Star className="w-3.5 h-3.5 fill-amber-500/20" />
                Featured Editorial
              </div>
            </div>

            <div className="text-left">
              {/* Category banner */}
              <span className="text-amber-500 font-semibold text-[10px] font-mono tracking-widest uppercase block mb-3">
                {featuredNews.category}
              </span>

              {/* Title */}
              <h3 className="text-white font-serif text-xl md:text-2xl lg:text-3xl font-bold leading-tight mb-4 group-hover:text-amber-300 transition-colors">
                {featuredNews.title}
              </h3>

              {/* Excerpt details */}
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-sans font-light mb-6">
                {featuredNews.excerpt}
              </p>

              {/* Meta metrics and writer credits */}
              <div className="flex flex-wrap items-center justify-between pt-4 border-t border-white/5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center font-serif text-xs text-amber-500 font-bold uppercase">
                    {featuredNews.author.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      {featuredNews.author}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-mono block">
                      {featuredNews.authorRole}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
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

          {/* Right Panel: 3 Highlight News items stacked */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6 md:gap-8" id="magazine-highlights">
            {highlightNews.map((news, idx) => (
              <motion.div
                key={news.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="flex items-start gap-4 md:gap-6 group cursor-pointer border-b border-white/5 pb-6 last:border-0 last:pb-0"
                id={`news-highlight-${news.id}`}
              >
                {/* Micro Thumbnail image */}
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden bg-slate-900 border border-white/5 shrink-0 relative">
                  <img
                    src={news.image}
                    alt={news.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* News descriptions */}
                <div className="text-left flex flex-col justify-between h-full">
                  <div>
                    <span className="text-amber-500/90 font-mono font-bold tracking-widest text-[9px] uppercase block mb-1">
                      {news.category}
                    </span>
                    
                    <h4 className="text-white font-serif text-sm md:text-base font-bold leading-snug group-hover:text-amber-300 transition-colors line-clamp-3 mb-2">
                      {news.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {news.readTime}
                    </span>
                    <span>•</span>
                    <span>{news.date}</span>
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
