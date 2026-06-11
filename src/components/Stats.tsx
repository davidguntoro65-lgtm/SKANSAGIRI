import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, Briefcase, Award, GraduationCap } from "lucide-react";

interface StatItem {
  id: string;
  target: number;
  suffix: string;
  label: string;
  icon: any;
  accent: string;
}

export default function Stats({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const statsList: StatItem[] = [
    {
      id: "students",
      target: 3500,
      suffix: "+",
      label: "Peserta Didik Aktif",
      icon: Users,
      accent: "text-amber-500",
    },
    {
      id: "teachers",
      target: 180,
      suffix: "+",
      label: "Guru & Tenaga Kependidikan",
      icon: GraduationCap,
      accent: "text-violet-500",
    },
    {
      id: "disciplines",
      target: 5,
      suffix: " Spektrum Jurusan",
      label: "Program Keahlian Unggulan",
      icon: Award,
      accent: "text-pink-500",
    },
    {
      id: "allies",
      target: 50,
      suffix: "+",
      label: "Mitra Industri Aktif",
      icon: Briefcase,
      accent: "text-emerald-500",
    },
  ];

  return (
    <section className="relative z-20 -mt-16 md:-mt-24 px-6 md:px-12 max-w-7xl mx-auto" id="stats-section">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statsList.map((stat) => (
          <StatCounterItem key={stat.id} stat={stat} theme={theme} />
        ))}
      </div>
    </section>
  );
}

function StatCounterItem({ stat, theme }: { stat: StatItem; theme: "light" | "dark"; key?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = stat.target;
    if (start === end) return;

    // determine multiplier/speed depending on scale of target
    const duration = 2000;
    const incrementTime = Math.max(Math.floor(duration / end), 12);
    const step = Math.ceil(end / (duration / incrementTime));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [stat.target]);

  const IconComp = stat.icon;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`glass-premium p-6 md:p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between group transition-all duration-300 ${
        theme === "dark" ? "shadow-xl shadow-slate-950/50" : "shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
      }`}
      id={`stat-card-${stat.id}`}
    >
      {/* Decorative internal card light */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none transition-opacity duration-300 ${
        theme === "dark" 
          ? "bg-gradient-to-bl from-white/5 to-transparent" 
          : "bg-gradient-to-bl from-slate-900/5 to-transparent"
      }`} />

      {/* Card Header Icon with background glowing sphere */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-slate-900 border-white/5 text-slate-400 group-hover:text-amber-400" 
            : "bg-amber-50 border-amber-200/50 text-amber-600 group-hover:text-amber-700 hover:shadow-sm"
        }`}>
          <IconComp className="w-5 h-5 stroke-[1.5]" />
        </div>
        
        {/* Mini dot referencing high status */}
        <span className={`text-[9px] font-mono uppercase tracking-widest duration-300 transition-colors ${
          theme === "dark" 
            ? "text-slate-600 group-hover:text-amber-500/50" 
            : "text-slate-500 group-hover:text-amber-600"
        }`}>
          Verified
        </span>
      </div>

      {/* Main Counter Display */}
      <div>
        <h3 className="text-3xl md:text-5xl font-mono font-bold tracking-tight mb-2 flex items-baseline">
          <span className={`transition-colors duration-300 ${
            theme === "dark" ? "text-white selection:bg-amber-500" : "text-slate-950 selection:bg-amber-100"
          }`}>
            {count.toLocaleString("id-ID")}
          </span>
          <span className={`text-2xl font-sans ml-1 font-bold group-hover:scale-110 duration-300 transition-colors ${
            theme === "dark" ? "text-amber-500" : "text-amber-600"
          }`}>
            {stat.suffix}
          </span>
        </h3>
        
        <p className={`text-xs md:text-sm font-sans tracking-wide leading-tight transition-colors duration-300 ${
          theme === "dark" ? "text-slate-400 group-hover:text-slate-300" : "text-slate-600 group-hover:text-slate-800"
        }`}>
          {stat.label}
        </p>
      </div>

      {/* bottom Accent lines */}
      <div className={`absolute bottom-0 left-0 right-0 h-[3px] transition-colors duration-500 ${
        theme === "dark" ? "bg-slate-800 group-hover:bg-amber-500" : "bg-slate-200 group-hover:bg-amber-600"
      }`} />
    </motion.div>
  );
}
