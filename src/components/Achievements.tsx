import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Trophy, Sparkles, Milestone as MilestoneIcon, Star } from "lucide-react";
import { Milestone } from "../data";
import { DataStore } from "../dataStore";

export default function Achievements({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const [milestones, setMilestones] = useState(() => DataStore.getMilestones());
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setMilestones(DataStore.getMilestones());
    };
    window.addEventListener("data-store-updated", handleUpdate);
    return () => window.removeEventListener("data-store-updated", handleUpdate);
  }, []);

  const handleNext = () => {
    if (activeIndex < milestones.length - 1) {
      setActiveIndex((prev) => prev + 1);
      scrollContainerRef.current?.scrollTo({
        left: (activeIndex + 1) * 320,
        behavior: "smooth"
      });
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
      scrollContainerRef.current?.scrollTo({
        left: (activeIndex - 1) * 320,
        behavior: "smooth"
      });
    }
  };

  const isDark = theme === "dark";

  return (
    <section className={`py-24 md:py-32 border-b transition-colors duration-500 relative overflow-hidden ${
      isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-250 border-slate-200/50"
    }`} id="prestasi">
      {/* Decorative vertical lines representing academic timeline structure */}
      <div className={`absolute top-0 bottom-0 left-1/4 w-px pointer-events-none transition-colors duration-500 ${isDark ? "bg-white/[0.02]" : "bg-slate-900/[0.02]"}`} />
      <div className={`absolute top-0 bottom-0 left-2/4 w-px pointer-events-none transition-colors duration-500 ${isDark ? "bg-white/[0.02]" : "bg-slate-900/[0.02]"}`} />
      <div className={`absolute top-0 bottom-0 left-3/4 w-px pointer-events-none transition-colors duration-500 ${isDark ? "bg-white/[0.02]" : "bg-slate-900/[0.02]"}`} />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl text-left">
            <div className={`inline-flex items-center gap-2 border px-3 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase mb-4 font-semibold transition-colors duration-300 ${
              isDark 
                ? "border-amber-500/20 bg-amber-500/5 text-amber-500" 
                : "border-amber-600/30 bg-amber-50 text-amber-700"
            }`}>
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>ACADEMIC MILESTONES</span>
            </div>
            
            <h2 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight transition-colors duration-350 ${
              isDark ? "text-white" : "text-slate-950"
            }`}>
              Rentang Sejarah & Agenda Prestasi
            </h2>
          </div>

          {/* Custom Horizontal Timeline navigation buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              disabled={activeIndex === 0}
              className={`p-3 rounded-full border transition-all ${
                activeIndex === 0
                  ? isDark ? "border-slate-850 text-slate-705 border-slate-800 text-slate-600 cursor-not-allowed" : "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"
                  : isDark ? "border-white/10 text-white hover:border-amber-500 hover:text-amber-400 bg-slate-950/40" : "border-slate-300 text-slate-700 hover:border-amber-600 hover:text-amber-700 bg-white"
              }`}
              aria-label="Previous Milestone"
              id="btn-timeline-prev"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              disabled={activeIndex === milestones.length - 1}
              className={`p-3 rounded-full border transition-all ${
                activeIndex === milestones.length - 1
                  ? isDark ? "border-slate-850 text-slate-705 border-slate-800 text-slate-600 cursor-not-allowed" : "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"
                  : isDark ? "border-white/10 text-white hover:border-amber-500 hover:text-amber-400 bg-slate-950/40" : "border-slate-300 text-slate-700 hover:border-amber-600 hover:text-amber-700 bg-white"
              }`}
              aria-label="Next Milestone"
              id="btn-timeline-next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main interactive horizon scroll track list */}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-6 pb-8 pt-4 no-scrollbar snap-x scroll-smooth"
          id="timeline-scroller-track"
        >
          {milestones.map((milestone, idx) => {
            const isActive = idx === activeIndex;
            return (
              <motion.div
                key={milestone.year}
                onClick={() => {
                  setActiveIndex(idx);
                  scrollContainerRef.current?.scrollTo({
                    left: idx * 320,
                    behavior: "smooth"
                  });
                }}
                className={`flex-none w-[320px] md:w-[380px] rounded-2xl p-6 md:p-8 border transition-all duration-500 cursor-pointer snap-start relative flex flex-col justify-between min-h-[350px] ${
                  isActive
                    ? isDark 
                      ? "bg-slate-950 border-amber-500/50 shadow-2xl shadow-amber-500/[0.04]"
                      : "bg-white border-amber-500 shadow-xl shadow-slate-100"
                    : isDark 
                      ? "bg-slate-950/40 border-white/5 hover:border-white/15 hover:bg-slate-950/75"
                      : "bg-slate-50 border-slate-200/70 hover:border-amber-600/30 hover:bg-white/80"
                }`}
                id={`milestone-${milestone.year}`}
              >
                {/* Year Badge */}
                <div className="flex items-start justify-between mb-6">
                  <span className={`text-4xl font-mono font-extrabold tracking-tight duration-300 ${
                    isActive ? "text-amber-500" : isDark ? "text-slate-800" : "text-slate-300"
                  }`}>
                    {milestone.year}
                  </span>

                  <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                    milestone.category === "Prestasi"
                      ? isDark ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-600/20"
                      : milestone.category === "Infrastruktur"
                      ? isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-600/20"
                      : isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-600/20"
                  }`}>
                    {milestone.category}
                  </span>
                </div>

                {/* Title & info description */}
                <div>
                  <h3 className={`font-serif text-lg md:text-xl font-bold mb-1 leading-tight group-hover:text-amber-500 transition-colors duration-300 ${
                    isDark ? "text-white" : "text-slate-950"
                  }`}>
                    {milestone.title}
                  </h3>
                  
                  <p className={`font-sans text-xs uppercase tracking-wider font-semibold mb-4 block ${isDark ? "text-amber-300/80" : "text-amber-600"}`}>
                    {milestone.subtitle}
                  </p>

                  <p className={`text-xs leading-relaxed font-sans font-light transition-colors duration-300 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}>
                    {milestone.description}
                  </p>
                </div>

                {/* Bottom Metric highlight */}
                {milestone.metric && (
                  <div className={`mt-6 pt-4 border-t flex items-center justify-between transition-colors duration-300 ${isDark ? "border-white/5" : "border-slate-100"}`}>
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">
                      Keluaran Rujukan
                    </span>
                    <span className={`text-xs font-mono font-bold flex items-center gap-1 ${isDark ? "text-amber-500" : "text-amber-600"}`}>
                      <Star className={`w-3.5 h-3.5 ${isDark ? "fill-amber-500/20" : "fill-amber-600/10"}`} />
                      {milestone.metric}
                    </span>
                  </div>
                )}

                {/* Connection line indicator representing horizontal linkage */}
                <div className={`absolute top-[50%] left-[-12px] w-6 h-px -z-10 ${isDark ? "bg-white/5" : "bg-slate-200/50"}`} />
              </motion.div>
            );
          })}
        </div>

        {/* Story progress pagination dots */}
        <div className="flex items-center justify-center gap-1.5 mt-8" id="timeline-pagination-dots">
          {milestones.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveIndex(idx);
                scrollContainerRef.current?.scrollTo({
                  left: idx * 320,
                  behavior: "smooth"
                });
              }}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === activeIndex 
                  ? "w-8 bg-amber-500" 
                  : isDark ? "w-1.5 bg-slate-800 hover:bg-slate-700" : "w-1.5 bg-slate-200 hover:bg-slate-350"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
