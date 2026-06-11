import { motion } from "motion/react";

interface ThemeProps {
  theme: "light" | "dark";
}

export function FloatingShapes({ theme }: ThemeProps) {
  const isDark = theme === "dark";
  const shapes = [
    { size: 180, x: "6%",  y: "12%", shape: "circle",  delay: 0,   dur: 18 },
    { size: 110, x: "84%", y: "8%",  shape: "diamond", delay: 3,   dur: 22 },
    { size: 200, x: "74%", y: "68%", shape: "circle",  delay: 6,   dur: 20 },
    { size: 88,  x: "18%", y: "74%", shape: "square",  delay: 1.5, dur: 16 },
    { size: 130, x: "48%", y: "82%", shape: "diamond", delay: 4,   dur: 25 },
    { size: 95,  x: "58%", y: "18%", shape: "circle",  delay: 8,   dur: 19 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: s.x, top: s.y, width: s.size, height: s.size, willChange: "transform" }}
          animate={{ y: [0, -18, 4, 0], rotate: s.shape === "diamond" ? [45, 52, 45, 38, 45] : [0, 4, 0, -4, 0] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className={`w-full h-full border ${
            s.shape === "circle" ? "rounded-full" : s.shape === "square" ? "rounded-xl" : "rounded-sm rotate-45"
          } ${isDark ? "border-white/[0.035] bg-white/[0.012]" : "border-slate-900/[0.03] bg-slate-900/[0.008]"}`} />
        </motion.div>
      ))}
    </div>
  );
}

export function GradientMesh({ theme, variant = "default" }: ThemeProps & { variant?: "default" | "warm" | "cool" }) {
  const isDark = theme === "dark";
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <div className={`absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-[110px] ${
        isDark
          ? variant === "warm" ? "bg-amber-500/[0.045]" : variant === "cool" ? "bg-indigo-500/[0.04]" : "bg-blue-500/[0.03]"
          : variant === "warm" ? "bg-amber-400/[0.07]"  : variant === "cool" ? "bg-blue-300/[0.08]"   : "bg-slate-400/[0.12]"
      }`} />
      <div className={`absolute top-1/2 -right-40 w-[600px] h-[600px] rounded-full blur-[130px] ${
        isDark ? "bg-violet-500/[0.025]" : "bg-purple-200/[0.12]"
      }`} />
      <div className={`absolute -bottom-24 left-1/3 w-[420px] h-[420px] rounded-full blur-[100px] ${
        isDark
          ? variant === "warm" ? "bg-amber-600/[0.03]" : "bg-cyan-500/[0.02]"
          : variant === "warm" ? "bg-amber-200/[0.15]"  : "bg-sky-200/[0.12]"
      }`} />
    </div>
  );
}

export type PatternType = "network" | "editorial" | "achievement" | "grid" | "dots";

export function SectionPattern({ type, theme }: ThemeProps & { type: PatternType }) {
  const isDark = theme === "dark";
  const stroke = isDark ? "rgba(255,255,255,0.055)" : "rgba(15,23,42,0.04)";
  const fill   = isDark ? "rgba(255,255,255,0.025)" : "rgba(15,23,42,0.015)";

  if (type === "network") {
    const nodes: [number, number][] = [[12,22],[34,64],[54,18],[68,52],[83,28],[22,78],[63,83],[88,68],[44,44],[9,52],[78,9],[50,35]];
    const edges: [number,number,number,number][] = [
      [12,22,34,64],[34,64,54,18],[54,18,68,52],[68,52,83,28],
      [22,78,44,44],[63,83,88,68],[12,22,44,44],[68,52,63,83],
      [9,52,22,78],[78,9,83,28],[44,44,68,52],[50,35,54,18],
    ];
    return (
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          {edges.map(([x1,y1,x2,y2], i) => (
            <line key={i} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke={stroke} strokeWidth="0.8" />
          ))}
          {nodes.map(([x, y], i) => (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r="3" fill={fill} stroke={stroke} strokeWidth="0.5" />
          ))}
        </svg>
      </div>
    );
  }

  if (type === "editorial") {
    return (
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 28 }).map((_, i) => (
            <line key={i} x1="0" y1={`${(i + 1) * 3.7}%`} x2="100%" y2={`${(i + 1) * 3.7}%`}
              stroke={stroke} strokeWidth={i % 6 === 0 ? "1" : "0.5"} />
          ))}
          <line x1="22%" y1="0" x2="22%" y2="100%" stroke={stroke} strokeWidth="0.5" strokeDasharray="5 9" />
          <line x1="72%" y1="0" x2="72%" y2="100%" stroke={stroke} strokeWidth="0.5" strokeDasharray="5 9" />
        </svg>
      </div>
    );
  }

  if (type === "achievement") {
    return (
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ach-lines" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
              <line x1="0" y1="64" x2="64" y2="0" stroke={stroke} strokeWidth="1" />
              <line x1="-8" y1="64" x2="56" y2="0" stroke={stroke} strokeWidth="0.4" />
              <line x1="8"  y1="64" x2="72" y2="0" stroke={stroke} strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ach-lines)" />
        </svg>
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div className={`absolute inset-0 pointer-events-none z-0 ${
        isDark
          ? "[background-image:radial-gradient(rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:30px_30px]"
          : "[background-image:radial-gradient(rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:30px_30px]"
      }`} aria-hidden="true" />
    );
  }

  return (
    <div className={`absolute inset-0 pointer-events-none z-0 ${
      isDark
        ? "bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:22px_22px]"
        : "bg-[radial-gradient(rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:22px_22px]"
    }`} aria-hidden="true" />
  );
}

export function AuroraBg({ theme }: ThemeProps) {
  const isDark = theme === "dark";
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <motion.div
        className={`absolute -top-48 left-1/4 w-[700px] h-[700px] rounded-full blur-[150px] ${
          isDark ? "bg-blue-600/[0.06]" : "bg-blue-300/[0.09]"
        }`}
        style={{ willChange: "transform" }}
        animate={{ x: [0, 55, -25, 0], y: [0, -35, 18, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`absolute top-1/3 -right-48 w-[600px] h-[600px] rounded-full blur-[140px] ${
          isDark ? "bg-indigo-500/[0.05]" : "bg-indigo-200/[0.1]"
        }`}
        style={{ willChange: "transform" }}
        animate={{ x: [0, -45, 25, 0], y: [0, 28, -18, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 5 }}
      />
      <motion.div
        className={`absolute -bottom-24 left-1/3 w-[500px] h-[500px] rounded-full blur-[120px] ${
          isDark ? "bg-cyan-500/[0.04]" : "bg-cyan-200/[0.08]"
        }`}
        style={{ willChange: "transform" }}
        animate={{ x: [0, 35, -15, 0], y: [0, 18, -28, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut", delay: 10 }}
      />
    </div>
  );
}

export function BusinessIllustration({ theme, position = "right" }: ThemeProps & { position?: "left" | "right" }) {
  const isDark = theme === "dark";
  const color = isDark ? "#ffffff" : "#0f172a";
  const opacity = isDark ? 0.045 : 0.03;
  return (
    <div
      className={`absolute ${position === "right" ? "right-0 bottom-0" : "left-0 top-0"} w-[380px] h-[380px] pointer-events-none z-0`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 380 380" xmlns="http://www.w3.org/2000/svg" fill="none">
        <rect x="40" y="90" width="58" height="200" stroke={color} strokeWidth="1.5" />
        {[110,145,180].map(y => (<g key={y}><rect x="50" y={y} width="13" height="18" stroke={color} strokeWidth="0.7" /><rect x="74" y={y} width="13" height="18" stroke={color} strokeWidth="0.7" /></g>))}
        <rect x="130" y="155" width="42" height="135" stroke={color} strokeWidth="1.5" />
        {[168,198].map(y => (<g key={y}><rect x="140" y={y} width="9" height="13" stroke={color} strokeWidth="0.7" /><rect x="154" y={y} width="9" height="13" stroke={color} strokeWidth="0.7" /></g>))}
        <circle cx="268" cy="130" r="52" stroke={color} strokeWidth="1.5" />
        <line x1="268" y1="130" x2="268" y2="78" stroke={color} strokeWidth="1.5" />
        <line x1="268" y1="130" x2="320" y2="130" stroke={color} strokeWidth="1.5" />
        <line x1="268" y1="130" x2="231" y2="93" stroke={color} strokeWidth="1.5" />
        <line x1="195" y1="270" x2="360" y2="270" stroke={color} strokeWidth="1" />
        {[[208,232],[236,212],[264,242],[292,192],[320,222]].map(([x,h], i) => (
          <rect key={i} x={x} y={270-h} width="16" height={h} stroke={color} strokeWidth="1" />
        ))}
        {[[82,52],[162,35],[232,58]].map(([x,y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill={color} />
        ))}
        <line x1="85" y1="52" x2="159" y2="35" stroke={color} strokeWidth="0.8" />
        <line x1="165" y1="35" x2="229" y2="58" stroke={color} strokeWidth="0.8" />
      </svg>
    </div>
  );
}

export function GlobalPageBg({ theme }: ThemeProps) {
  const isDark = theme === "dark";
  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      <div className={`absolute inset-0 ${
        isDark
          ? "bg-[linear-gradient(180deg,#020617,#0f172a,#111827)]"
          : "bg-[linear-gradient(180deg,#ffffff,#f8fafc,#eef4ff)]"
      }`} />
      <div className={`absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[160px] ${
        isDark ? "bg-blue-900/[0.06]" : "bg-blue-100/[0.7]"
      }`} />
      <div className={`absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full blur-[140px] ${
        isDark ? "bg-indigo-900/[0.05]" : "bg-indigo-100/[0.6]"
      }`} />
      <div className={`absolute bottom-0 left-1/3 w-[550px] h-[550px] rounded-full blur-[150px] ${
        isDark ? "bg-slate-800/[0.04]" : "bg-slate-100/[0.8]"
      }`} />
    </div>
  );
}
