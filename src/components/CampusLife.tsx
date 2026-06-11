import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Eye, X, Compass, ChevronRight } from "lucide-react";
import { GalleryItem } from "../data";
import { DataStore } from "../dataStore";

export default function CampusLife({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [gallery, setGallery] = useState(() => DataStore.getGallery());
  const isDark = theme === "dark";

  useEffect(() => {
    const handleUpdate = () => setGallery(DataStore.getGallery());
    window.addEventListener("data-store-updated", handleUpdate);
    return () => window.removeEventListener("data-store-updated", handleUpdate);
  }, []);

  const categories = ["ALL", "Kuliner", "Fashion", "Kelas", "Praktik Industri", "Prestasi"];
  const filteredGallery = filter === "ALL" ? gallery : gallery.filter((item) => item.category === filter);

  return (
    <section
      className={`py-24 md:py-32 relative transition-colors duration-500 ${
        isDark ? "bg-slate-950" : "bg-slate-50"
      }`}
      id="gallery"
    >
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-amber-500/[0.01] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-xl text-left">
            <div className={`inline-flex items-center gap-2 border px-3 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase mb-4 font-semibold ${
              isDark
                ? "border-amber-500/20 bg-amber-500/5 text-amber-500"
                : "border-amber-600/25 bg-amber-50 text-amber-700"
            }`}>
              <Camera className="w-3 h-3" />
              <span>CAMPUS LIFE EXPERIENCES</span>
            </div>
            <h2 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight ${
              isDark ? "text-white" : "text-slate-950"
            }`}>
              Galeri Kehidupan Kampus
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 justify-start" id="gallery-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full font-sans text-[10px] uppercase font-bold tracking-widest border transition-all duration-300 ${
                  filter === cat
                    ? "bg-amber-400 text-slate-950 border-amber-400 font-extrabold"
                    : isDark
                      ? "bg-transparent text-slate-400 border-white/5 hover:border-white/15 hover:text-white"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                }`}
                id={`btn-tab-${cat.toLowerCase().replace(" ", "-")}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6" id="masonry-gallery-container">
          {filteredGallery.map((photo) => (
            <motion.div
              key={photo.id}
              layoutId={`gallery-item-${photo.id}`}
              onClick={() => setSelectedPhoto(photo)}
              className={`break-inside-avoid relative rounded-2xl overflow-hidden group cursor-pointer border shadow-lg ${
                isDark
                  ? "border-white/5 shadow-black/40"
                  : "border-slate-200 shadow-slate-100/80"
              }`}
              id={`photo-card-${photo.id}`}
            >
              <img
                src={photo.image}
                alt={photo.title}
                referrerPolicy="no-referrer"
                className="w-full object-cover rounded-2xl grayscale-[15%] group-hover:grayscale-0 group-hover:scale-[1.03] transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6" />
              <div className="absolute inset-x-0 bottom-0 p-6 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 text-left">
                <span className="text-[9px] font-mono text-amber-400 tracking-widest uppercase font-semibold block mb-1">
                  {photo.category}
                </span>
                <h3 className="text-white font-serif text-sm md:text-base font-semibold leading-tight flex items-center justify-between gap-2">
                  <span>{photo.title}</span>
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Eye className="w-3.5 h-3.5 text-white" />
                  </div>
                </h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Lightbox — always dark for contrast */}
        <AnimatePresence>
          {selectedPhoto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12" id="lightbox-overlay">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPhoto(null)}
                className="absolute inset-0 bg-slate-950/92 backdrop-blur-2xl"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="relative max-w-4xl w-full bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 text-left flex flex-col md:flex-row"
                id="lightbox-card"
              >
                <div className="md:w-3/5 bg-black flex items-center justify-center aspect-video md:aspect-auto">
                  <img
                    src={selectedPhoto.image}
                    alt={selectedPhoto.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover max-h-[80vh]"
                  />
                </div>
                <div className="md:w-2/5 p-6 md:p-8 flex flex-col justify-between relative bg-slate-950">
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[10px] text-amber-500 border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 rounded-full font-mono tracking-widest uppercase font-semibold">
                        {selectedPhoto.category}
                      </span>
                      <button
                        onClick={() => setSelectedPhoto(null)}
                        className="p-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                        aria-label="Tutup"
                        id="btn-close-lightbox"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="text-xl md:text-2xl font-serif text-white font-bold leading-tight mb-4">
                      {selectedPhoto.title}
                    </h3>
                    <div className="h-px w-12 bg-amber-500/30 mb-6" />
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-sans mb-6 font-light">
                      {selectedPhoto.caption}
                    </p>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Compass className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">
                        Dokumentasi Resmi SMKN 1
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedPhoto(null)}
                      className="text-[10px] text-amber-400 hover:text-white font-mono uppercase tracking-widest font-semibold flex items-center gap-1 group"
                      id="btn-close-lightbox-text"
                    >
                      <span>Kembali</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 duration-300" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
