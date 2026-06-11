import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Quote, Building2, MapPin, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { DataStore } from "../dataStore";

export default function SuccessStories({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const [alumni, setAlumni] = useState(() => DataStore.getAlumni());
  const [currentIndex, setCurrentIndex] = useState(0);
  const isDark = theme === "dark";

  useEffect(() => {
    const handleUpdate = () => {
      const fresh = DataStore.getAlumni();
      setAlumni(fresh);
      setCurrentIndex((prev) => {
        if (fresh.length === 0) return 0;
        if (prev >= fresh.length) return fresh.length - 1;
        return prev;
      });
    };
    window.addEventListener("data-store-updated", handleUpdate);
    return () => window.removeEventListener("data-store-updated", handleUpdate);
  }, []);

  const nextTestimonial = () => {
    if (alumni.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % alumni.length);
  };

  const prevTestimonial = () => {
    if (alumni.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + alumni.length) % alumni.length);
  };

  if (alumni.length === 0) return null;

  return (
    <section
      className={`py-24 md:py-32 border-t border-b relative transition-colors duration-500 ${
        isDark
          ? "bg-slate-900 border-white/5"
          : "bg-white border-slate-200"
      }`}
      id="testimoni"
    >
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-amber-500/[0.01] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-xl text-left">
            <div className={`inline-flex items-center gap-2 border px-3 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase mb-4 font-semibold ${
              isDark
                ? "border-amber-500/20 bg-amber-500/5 text-amber-500"
                : "border-amber-600/25 bg-amber-50 text-amber-700"
            }`}>
              <GraduationCap className="w-4 h-4" />
              <span>DISTINGUISHED ALUMNI</span>
            </div>
            <h2 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight ${
              isDark ? "text-white" : "text-slate-950"
            }`}>
              Testimoni Sukses Alumni
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={prevTestimonial}
              className={`p-3 rounded-full border transition-colors ${
                isDark
                  ? "border-white/10 hover:border-amber-500 text-white hover:text-amber-400 bg-slate-950/40"
                  : "border-slate-300 hover:border-amber-500 text-slate-700 hover:text-amber-600 bg-white"
              }`}
              aria-label="Previous"
              id="btn-alumni-prev"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextTestimonial}
              className={`p-3 rounded-full border transition-colors ${
                isDark
                  ? "border-white/10 hover:border-amber-500 text-white hover:text-amber-400 bg-slate-950/40"
                  : "border-slate-300 hover:border-amber-500 text-slate-700 hover:text-amber-600 bg-white"
              }`}
              aria-label="Next"
              id="btn-alumni-next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slider */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" id="testimonials-viewframe">

          {/* Image */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className={`relative w-72 h-72 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl border group ${
              isDark
                ? "shadow-slate-950 border-white/10"
                : "shadow-slate-200 border-slate-200"
            }`}>
              <img
                src={alumni[currentIndex].avatar}
                alt={alumni[currentIndex].name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 duration-500 transition-all"
              />
              <div className={`absolute top-4 left-4 border text-[9px] font-mono tracking-widest uppercase py-1 px-3 rounded-full text-amber-400 ${
                isDark
                  ? "border-amber-500/30 bg-slate-950/80 backdrop-blur-md"
                  : "border-amber-400/40 bg-white/90 text-amber-700"
              }`}>
                Alumni Angkatan {alumni[currentIndex].gradYear}
              </div>
            </div>

            <div className={`absolute -top-4 -left-4 w-72 h-72 md:w-80 md:h-80 -z-10 border rounded-2xl ${
              isDark ? "bg-slate-950 border-white/5" : "bg-slate-100 border-slate-200"
            }`} />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-500/40 pointer-events-none" />
          </div>

          {/* Content */}
          <div className="lg:col-span-7 text-left flex flex-col justify-between">
            <div>
              <Quote className={`w-12 h-12 mb-6 shrink-0 ${isDark ? "text-amber-500/10" : "text-amber-500/15"}`} />

              <p className={`font-serif text-lg md:text-2xl leading-relaxed italic mb-8 ${
                isDark ? "text-white" : "text-slate-800"
              }`}>
                "{alumni[currentIndex].quote}"
              </p>

              <div className={`h-px w-16 mb-6 ${isDark ? "bg-amber-500/20" : "bg-amber-400/30"}`} />

              <h3 className={`text-xl font-serif font-bold tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                {alumni[currentIndex].name}
              </h3>

              <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs mt-2 font-sans font-light ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                <span className={`flex items-center gap-1.5 font-semibold font-mono uppercase tracking-wider text-[11px] ${
                  isDark ? "text-amber-500/90" : "text-amber-600"
                }`}>
                  <Building2 className="w-4 h-4 stroke-[1.5]" />
                  {alumni[currentIndex].role} - {alumni[currentIndex].company}
                </span>

                <span className={`hidden sm:inline ${isDark ? "text-slate-600" : "text-slate-300"}`}>|</span>

                <span className="flex items-center gap-1">
                  <MapPin className={`w-3.5 h-3.5 stroke-[1.5] ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  {alumni[currentIndex].location}
                </span>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-2 mt-12" id="alumni-pagination-indicator">
              {alumni.map((alumnus, idx) => (
                <button
                  key={alumnus.name}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? "w-10 bg-amber-500"
                      : isDark ? "w-2 bg-slate-800" : "w-2 bg-slate-300"
                  }`}
                  aria-label={`Go to alumni ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
