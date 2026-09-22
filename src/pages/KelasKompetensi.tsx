import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Calculator,
  ChefHat,
  ChevronRight,
  Shirt,
  Store,
} from "lucide-react";
import { navigate } from "../utils/navigation";

interface KelasKompetensiProps {
  theme: "light" | "dark";
  grade: "X" | "XI" | "XII";
}

const COMPETENCIES = [
  {
    title: "Pemasaran",
    subtitle: "Bisnis Daring & Pemasaran",
    code: "BDP",
    icon: Store,
    accent: "from-sky-300 via-blue-500 to-indigo-600",
  },
  {
    title: "Akuntansi",
    subtitle: "Akuntansi & Keuangan Lembaga",
    code: "AKL",
    icon: Calculator,
    accent: "from-cyan-300 via-blue-500 to-blue-700",
  },
  {
    title: "Tata Boga",
    subtitle: "Kuliner & Gastronomi",
    code: "KUL",
    icon: ChefHat,
    accent: "from-blue-300 via-indigo-500 to-violet-700",
  },
  {
    title: "Tata Busana",
    subtitle: "Desain Mode & Tata Busana",
    code: "TBS",
    icon: Shirt,
    accent: "from-indigo-300 via-blue-500 to-cyan-600",
  },
  {
    title: "Perkantoran",
    subtitle: "Manajemen Perkantoran & Layanan Bisnis",
    code: "MPLB",
    icon: Briefcase,
    accent: "from-sky-300 via-cyan-500 to-blue-700",
  },
] as const;

export default function KelasKompetensi({ theme, grade }: KelasKompetensiProps) {
  const isDark = theme === "dark";

  return (
    <section
      id={`kelas-${grade.toLowerCase()}-kompetensi-page`}
      className={`relative z-10 min-h-screen overflow-hidden pt-32 pb-28 ${
        isDark ? "text-slate-100" : "text-slate-900"
      }`}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className={`absolute -top-36 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full blur-[140px] ${
          isDark ? "bg-blue-700/[0.13]" : "bg-sky-200/[0.72]"
        }`} />
        <div className={`absolute bottom-0 right-[-8%] h-[420px] w-[420px] rounded-full blur-[130px] ${
          isDark ? "bg-indigo-700/[0.1]" : "bg-indigo-100/[0.75]"
        }`} />
        <div className={`absolute inset-0 opacity-60 ${
          isDark
            ? "[background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]"
            : "[background-image:linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)]"
        } [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]`} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 md:px-12">
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-14 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em]"
        >
          <button
            onClick={() => navigate("/")}
            className={`flex items-center gap-1.5 transition-colors ${
              isDark ? "text-slate-500 hover:text-cyan-300" : "text-slate-400 hover:text-blue-600"
            }`}
          >
            <ArrowLeft className="h-3 w-3" />
            Beranda
          </button>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <button
            onClick={() => navigate("/kelas-virtual")}
            className={`transition-colors ${
              isDark ? "text-slate-500 hover:text-cyan-300" : "text-slate-400 hover:text-blue-600"
            }`}
          >
            Kelas Virtual
          </button>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="font-bold text-blue-500">Kelas {grade}</span>
        </motion.nav>

        <motion.header
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mx-auto mb-14 max-w-4xl text-center"
        >
          <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] ${
            isDark
              ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
              : "border-blue-200 bg-blue-50 text-blue-600"
          }`}>
            Kompetensi Keahlian · Kelas {grade}
          </div>
          <h1 className={`text-4xl font-black uppercase tracking-[-0.04em] md:text-6xl ${
            isDark ? "text-white" : "text-slate-950"
          }`}>
            Kompetensi <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 bg-clip-text text-transparent">Keahlian</span>
          </h1>
          <p className={`mx-auto mt-5 max-w-2xl text-sm leading-relaxed md:text-base ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}>
            Jelajahi pilihan kompetensi keahlian yang menjadi ruang tumbuh,
            berkarya, dan menyiapkan masa depanmu di SMKN 1 Wonogiri.
          </p>
        </motion.header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
          {COMPETENCIES.map((item, index) => {
            const Icon = item.icon;
            const centeredStart = index === 3 ? "md:col-start-2" : index === 4 ? "md:col-start-4" : "";

            return (
              <motion.div
                key={item.code}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                className={`group relative min-h-[190px] overflow-hidden rounded-[1.4rem] border p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl md:col-span-2 ${centeredStart} ${
                  isDark
                    ? "border-blue-200/15 bg-[#071a3a] shadow-blue-950/30 hover:border-cyan-300/40"
                    : "border-blue-200 bg-[#071a3a] shadow-blue-200/50 hover:border-cyan-300"
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent}`} />
                <div className="absolute -right-5 -top-10 text-[8rem] font-black leading-none tracking-[-0.15em] text-white/[0.045]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="absolute -bottom-24 -right-12 h-48 w-48 rounded-full bg-cyan-300/[0.08] blur-3xl transition-all duration-500 group-hover:bg-cyan-300/[0.16]" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-slate-950 shadow-lg shadow-cyan-900/30`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-cyan-200/70">
                    {item.code}
                  </span>
                </div>

                <div className="relative mt-8">
                  <h2 className="!text-white text-2xl font-black uppercase italic tracking-tight md:text-[1.7rem]">
                    {item.title}
                  </h2>
                  <p className="mt-2 max-w-[18rem] text-[10px] font-medium uppercase leading-relaxed tracking-[0.14em] text-blue-100/65">
                    {item.subtitle}
                  </p>
                </div>

                <div className="relative mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-200/60">
                    Ruang keahlian
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-cyan-300/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}