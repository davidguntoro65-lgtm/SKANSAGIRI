import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Quote, Sparkles, Building2, MapPin, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { Alumnus } from "../data";
import { DataStore } from "../dataStore";

export default function SuccessStories() {
  const [alumni, setAlumni] = useState(() => DataStore.getAlumni());
  const [currentIndex, setCurrentIndex] = useState(0);

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
    <section className="py-24 md:py-32 bg-slate-900 border-t border-b border-white/5 relative" id="testimoni">
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-amber-500/[0.01] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-xl text-left">
            <div className="inline-flex items-center gap-2 border border-amber-500/20 bg-amber-500/5 px-3 py-1 rounded-full text-amber-500 text-[9px] font-mono tracking-widest uppercase mb-4 font-semibold">
              <GraduationCap className="w-4 h-4" />
              <span>DISTINGUISHED ALUMNI</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-serif text-white font-bold tracking-tight">
              Testimoni Sukses Alumni
            </h2>
          </div>

          {/* Testimonial slider navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={prevTestimonial}
              className="p-3 rounded-full border border-white/10 hover:border-amber-500 text-white hover:text-amber-400 bg-slate-950/40 transition-colors"
              aria-label="Previous Testimonial"
              id="btn-alumni-prev"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextTestimonial}
              className="p-3 rounded-full border border-white/10 hover:border-amber-500 text-white hover:text-amber-400 bg-slate-950/40 transition-colors"
              aria-label="Next Testimonial"
              id="btn-alumni-next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Elegant Slider Shell Displaying current item */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" id="testimonials-viewframe">
          
          {/* Left Block: Image frame with ornamental accents */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-slate-950 border border-white/10 group">
              <img
                src={alumni[currentIndex].avatar}
                alt={alumni[currentIndex].name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 duration-500 transition-all"
              />
              
              {/* Gold status strip */}
              <div className="absolute top-4 left-4 border border-amber-500/30 bg-slate-950/80 backdrop-blur-md text-amber-400 text-[9px] font-mono tracking-widest uppercase py-1 px-3 rounded-full">
                Alumni Angkatan {alumni[currentIndex].gradYear}
              </div>
            </div>

            {/* Behind frame decorations */}
            <div className="absolute -top-4 -left-4 w-72 h-72 md:w-80 md:h-80 -z-10 bg-slate-950 border border-white/5 rounded-2xl" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-500/40 pointer-events-none" />
          </div>

          {/* Right Block: Content Details */}
          <div className="lg:col-span-7 text-left flex flex-col justify-between">
            <div>
              <Quote className="w-12 h-12 text-amber-500/10 mb-6 shrink-0" />
              
              {/* Alumni Message */}
              <p className="text-white font-serif text-lg md:text-2xl leading-relaxed italic mb-8">
                "{alumni[currentIndex].quote}"
              </p>

              <div className="h-px w-16 bg-amber-500/20 mb-6" />

              {/* Identity labels */}
              <h3 className="text-xl font-serif text-white font-bold tracking-tight">
                {alumni[currentIndex].name}
              </h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 mt-2 font-sans font-light">
                <span className="flex items-center gap-1.5 text-amber-500/90 font-semibold font-mono uppercase tracking-wider text-[11px]">
                  <Building2 className="w-4 h-4 stroke-[1.5]" />
                  {alumni[currentIndex].role} - {alumni[currentIndex].company}
                </span>
                
                <span className="text-slate-600 hidden sm:inline">|</span>
                
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 stroke-[1.5] text-slate-500" />
                  {alumni[currentIndex].location}
                </span>
              </div>
            </div>

            {/* Pagination tracking bar */}
            <div className="flex items-center gap-2 mt-12" id="alumni-pagination-indicator">
              {alumni.map((alumnus, idx) => (
                <button
                  key={alumnus.name}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === currentIndex ? "w-10 bg-amber-500" : "w-2 bg-slate-800"
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
