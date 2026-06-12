import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, Briefcase, Award, GraduationCap } from "lucide-react";

interface StatItem {
  id: string;
  target: number;
  suffix: string;
  label: string;
  icon: any;
  palette: {
    darkBg: string;
    darkBorder: string;
    darkIconBg: string;
    darkIconText: string;
    darkIconBorder: string;
    darkGlow: string;
    darkStripe: string;
    darkNumber: string;
    darkSuffix: string;
    darkCorner: string;
    lightBg: string;
    lightBorder: string;
    lightIconBg: string;
    lightIconText: string;
    lightIconBorder: string;
    lightGlow: string;
    lightStripe: string;
    lightNumber: string;
    lightSuffix: string;
    lightCorner: string;
  };
}

const statsList: StatItem[] = [
  {
    id: "students",
    target: 1180,
    suffix: "*",
    label: "Peserta Didik Aktif",
    icon: Users,
    palette: {
      darkBg: "bg-amber-950/20",
      darkBorder: "border-amber-500/20",
      darkIconBg: "bg-amber-500/10",
      darkIconText: "text-amber-400",
      darkIconBorder: "border-amber-500/20",
      darkGlow: "shadow-amber-500/10",
      darkStripe: "bg-gradient-to-r from-amber-500 to-yellow-400",
      darkNumber: "text-amber-300",
      darkSuffix: "text-amber-400",
      darkCorner: "from-amber-400/10",
      lightBg: "bg-amber-50",
      lightBorder: "border-amber-200",
      lightIconBg: "bg-amber-100",
      lightIconText: "text-amber-600",
      lightIconBorder: "border-amber-200",
      lightGlow: "shadow-amber-100",
      lightStripe: "bg-gradient-to-r from-amber-500 to-yellow-400",
      lightNumber: "text-amber-700",
      lightSuffix: "text-amber-500",
      lightCorner: "from-amber-200/60",
    },
  },
  {
    id: "teachers",
    target: 110,
    suffix: "*",
    label: "Guru & Tenaga Kependidikan",
    icon: GraduationCap,
    palette: {
      darkBg: "bg-violet-950/20",
      darkBorder: "border-violet-500/20",
      darkIconBg: "bg-violet-500/10",
      darkIconText: "text-violet-400",
      darkIconBorder: "border-violet-500/20",
      darkGlow: "shadow-violet-500/10",
      darkStripe: "bg-gradient-to-r from-violet-500 to-purple-400",
      darkNumber: "text-violet-300",
      darkSuffix: "text-violet-400",
      darkCorner: "from-violet-400/10",
      lightBg: "bg-violet-50",
      lightBorder: "border-violet-200",
      lightIconBg: "bg-violet-100",
      lightIconText: "text-violet-600",
      lightIconBorder: "border-violet-200",
      lightGlow: "shadow-violet-100",
      lightStripe: "bg-gradient-to-r from-violet-500 to-purple-400",
      lightNumber: "text-violet-700",
      lightSuffix: "text-violet-500",
      lightCorner: "from-violet-200/60",
    },
  },
  {
    id: "disciplines",
    target: 5,
    suffix: " Jurusan Terbaik",
    label: "Program Keahlian Unggulan",
    icon: Award,
    palette: {
      darkBg: "bg-rose-950/20",
      darkBorder: "border-rose-500/20",
      darkIconBg: "bg-rose-500/10",
      darkIconText: "text-rose-400",
      darkIconBorder: "border-rose-500/20",
      darkGlow: "shadow-rose-500/10",
      darkStripe: "bg-gradient-to-r from-rose-500 to-pink-400",
      darkNumber: "text-rose-300",
      darkSuffix: "text-rose-400",
      darkCorner: "from-rose-400/10",
      lightBg: "bg-rose-50",
      lightBorder: "border-rose-200",
      lightIconBg: "bg-rose-100",
      lightIconText: "text-rose-600",
      lightIconBorder: "border-rose-200",
      lightGlow: "shadow-rose-100",
      lightStripe: "bg-gradient-to-r from-rose-500 to-pink-400",
      lightNumber: "text-rose-700",
      lightSuffix: "text-rose-500",
      lightCorner: "from-rose-200/60",
    },
  },
  {
    id: "allies",
    target: 50,
    suffix: "+",
    label: "Mitra Industri",
    icon: Briefcase,
    palette: {
      darkBg: "bg-emerald-950/20",
      darkBorder: "border-emerald-500/20",
      darkIconBg: "bg-emerald-500/10",
      darkIconText: "text-emerald-400",
      darkIconBorder: "border-emerald-500/20",
      darkGlow: "shadow-emerald-500/10",
      darkStripe: "bg-gradient-to-r from-emerald-500 to-teal-400",
      darkNumber: "text-emerald-300",
      darkSuffix: "text-emerald-400",
      darkCorner: "from-emerald-400/10",
      lightBg: "bg-emerald-50",
      lightBorder: "border-emerald-200",
      lightIconBg: "bg-emerald-100",
      lightIconText: "text-emerald-600",
      lightIconBorder: "border-emerald-200",
      lightGlow: "shadow-emerald-100",
      lightStripe: "bg-gradient-to-r from-emerald-500 to-teal-400",
      lightNumber: "text-emerald-700",
      lightSuffix: "text-emerald-500",
      lightCorner: "from-emerald-200/60",
    },
  },
];

export default function Stats({ theme = "dark" }: { theme?: "light" | "dark" }) {
  return (
    <section className="relative z-20 -mt-16 md:-mt-24 px-6 md:px-12 max-w-7xl mx-auto" id="stats-section">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statsList.map((stat, idx) => (
          <StatCounterItem key={stat.id} stat={stat} theme={theme} delay={idx * 0.1} />
        ))}
      </div>
    </section>
  );
}

function StatCounterItem({ stat, theme, delay }: { stat: StatItem; theme: "light" | "dark"; delay?: number }) {
  const [count, setCount] = useState(0);
  const [hovered, setHovered] = useState(false);
  const isDark = theme === "dark";
  const p = stat.palette;

  useEffect(() => {
    let start = 0;
    const end = stat.target;
    if (start === end) return;
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
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.025 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`relative overflow-hidden flex flex-col justify-between rounded-2xl p-6 md:p-8 border backdrop-blur-md transition-all duration-400 cursor-default ${
        isDark
          ? `${p.darkBg} ${p.darkBorder} shadow-xl ${p.darkGlow}`
          : `${p.lightBg} ${p.lightBorder} shadow-lg ${p.lightGlow}`
      }`}
      id={`stat-card-${stat.id}`}
    >
      {/* Corner radial shine */}
      <div className={`absolute top-0 right-0 w-28 h-28 rounded-bl-full pointer-events-none bg-gradient-to-bl to-transparent opacity-70 ${
        isDark ? p.darkCorner : p.lightCorner
      }`} />

      {/* Subtle animated background pulse on hover */}
      <motion.div
        className={`absolute inset-0 rounded-2xl pointer-events-none opacity-0 transition-opacity duration-500 ${
          isDark
            ? `bg-gradient-to-br ${p.darkBg}`
            : `bg-gradient-to-br ${p.lightBg}`
        }`}
        animate={{ opacity: hovered ? 0.6 : 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* Header row: icon + verified badge */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <motion.div
          animate={{ rotate: hovered ? 8 : 0, scale: hovered ? 1.1 : 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 ${
            isDark
              ? `${p.darkIconBg} ${p.darkIconBorder} ${p.darkIconText}`
              : `${p.lightIconBg} ${p.lightIconBorder} ${p.lightIconText}`
          }`}
        >
          <IconComp className="w-5 h-5 stroke-[1.5]" />
        </motion.div>

        <span className={`text-[9px] font-mono uppercase tracking-[0.2em] transition-colors duration-300 ${
          isDark
            ? hovered ? p.darkSuffix : "text-slate-600"
            : hovered ? p.lightSuffix : "text-slate-400"
        }`}>
          Verified
        </span>
      </div>

      {/* Counter & Label */}
      <div className="relative z-10">
        <div className="flex items-baseline flex-wrap gap-x-1 mb-1.5">
          <motion.span
            className={`text-3xl md:text-5xl font-mono font-bold tracking-tight leading-none transition-colors duration-300 ${
              isDark ? p.darkNumber : p.lightNumber
            }`}
          >
            {count.toLocaleString("id-ID")}
          </motion.span>
          <span className={`text-lg md:text-2xl font-sans font-bold leading-none transition-colors duration-300 ${
            isDark ? p.darkSuffix : p.lightSuffix
          }`}>
            {stat.suffix}
          </span>
        </div>

        <p className={`text-xs md:text-sm font-sans leading-snug tracking-wide transition-colors duration-300 ${
          isDark ? "text-slate-400 group-hover:text-slate-300" : "text-slate-600"
        }`}>
          {stat.label}
        </p>
      </div>

      {/* Bottom stripe — full-width gradient unique per card */}
      <motion.div
        className={`absolute bottom-0 left-0 right-0 h-[3px] ${isDark ? p.darkStripe : p.lightStripe}`}
        animate={{ scaleX: hovered ? 1 : 0.35, opacity: hovered ? 1 : 0.5 }}
        initial={{ scaleX: 0.35, opacity: 0.5 }}
        style={{ originX: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </motion.div>
  );
}
