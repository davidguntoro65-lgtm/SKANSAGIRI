import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  GraduationCap,
  Layers3,
  Sparkles,
} from "lucide-react";
import { navigate } from "../utils/navigation";

interface KelasVirtualProps {
  theme: "light" | "dark";
}

const CLASS_OPTIONS = [
  {
    id: "X",
    eyebrow: "Tingkat 01",
    title: "Kelas X",
    description: "Bangun fondasi belajar dan kenali potensi terbaikmu.",
    modules: "Fondasi & Eksplorasi",
    accent: "from-sky-400 via-cyan-400 to-blue-500",
    soft: "bg-sky-500/10 text-sky-500 border-sky-500/25",
    glow: "shadow-sky-500/20",
  },
  {
    id: "XI",
    eyebrow: "Tingkat 02",
    title: "Kelas XI",
    description: "Perdalam kompetensi dengan pengalaman belajar terarah.",
    modules: "Pendalaman Kompetensi",
    accent: "from-blue-500 via-indigo-500 to-violet-500",
    soft: "bg-indigo-500/10 text-indigo-500 border-indigo-500/25",
    glow: "shadow-indigo-500/20",
  },
  {
    id: "XII",
    eyebrow: "Tingkat 03",
    title: "Kelas XII",
    description: "Siapkan langkah berikutnya menuju dunia kerja dan industri.",
    modules: "Transisi & Persiapan",
    accent: "from-violet-500 via-fuchsia-500 to-blue-500",
    soft: "bg-violet-500/10 text-violet-500 border-violet-500/25",
    glow: "shadow-violet-500/20",
  },
] as const;

const BENEFITS = [
  { icon: BookOpen, label: "Materi terstruktur" },
  { icon: CalendarDays, label: "Jadwal terpusat" },
  { icon: Layers3, label: "Satu ruang belajar" },
];

export default function KelasVirtual({ theme }: KelasVirtualProps) {
  const isDark = theme === "dark";
  const [selectedClass, setSelectedClass] = useState<(typeof CLASS_OPTIONS)[number]["id"]>("X");
  const selected = CLASS_OPTIONS.find((item) => item.id === selectedClass) ?? CLASS_OPTIONS[0];

  return (
    <section
      id="kelas-virtual-page"
      className={`relative z-10 min-h-screen overflow-hidden pt-32 pb-28 transition-colors duration-500 ${
        isDark ? "text-slate-100" : "text-slate-900"
      }`}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className={`absolute -top-40 left-1/2 h-[520px] w-[760px] -translate-x-1/2 rounded-full blur-[130px] ${
          isDark ? "bg-blue-600/[0.12]" : "bg-sky-200/[0.6]"
        }`} />
        <div className={`absolute right-[-12%] top-[34%] h-[420px] w-[420px] rounded-full blur-[120px] ${
          isDark ? "bg-violet-600/[0.1]" : "bg-violet-100/[0.75]"
        }`} />
        <div className={`absolute inset-0 opacity-50 ${
          isDark
            ? "[background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)]"
            : "[background-image:linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)]"
        } [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]`} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 md:px-12">
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-14 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em]"
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
          <span className="font-bold text-blue-500">Kelas Virtual</span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] ${
            isDark
              ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
              : "border-blue-200 bg-blue-50 text-blue-600"
          }`}>
            <Sparkles className="h-3.5 w-3.5" />
            Digital learning space
          </div>
          <h1 className={`text-4xl font-black tracking-[-0.04em] md:text-6xl ${isDark ? "text-white" : "text-slate-950"}`}>
            Kelas <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 bg-clip-text text-transparent">Virtual</span>
          </h1>
          <p className={`mx-auto mt-5 max-w-2xl text-sm leading-relaxed md:text-base ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}>
            Pilih tingkat kelasmu dan temukan ruang belajar digital yang dirancang
            untuk belajar lebih fokus, terarah, dan siap menghadapi masa depan.
          </p>
        </motion.div>

        <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {CLASS_OPTIONS.map((item, index) => {
            const isSelected = selectedClass === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                onClick={() => setSelectedClass(item.id)}
                className={`group relative overflow-hidden rounded-[1.65rem] border p-7 text-left shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                  isSelected
                    ? `${item.glow} border-blue-400/60 shadow-2xl`
                    : isDark
                      ? "border-white/10 bg-slate-900/60 hover:border-white/20"
                      : "border-slate-200 bg-white/80 hover:border-blue-200 hover:shadow-blue-100/70"
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent} transition-opacity ${
                  isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-80"
                }`} />
                <div className="absolute -right-4 -top-8 select-none text-[8rem] font-black leading-none tracking-[-0.12em] text-blue-500/[0.06]">
                  {item.id}
                </div>

                <div className="relative flex items-start justify-between gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-white shadow-lg`}>
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${item.soft}`}>
                    {item.eyebrow}
                  </span>
                </div>

                <div className="relative mt-7">
                  <h2 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                    {item.title}
                  </h2>
                  <p className={`mt-2 min-h-12 text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {item.description}
                  </p>
                </div>

                <div className={`relative mt-7 flex items-center justify-between border-t pt-4 ${
                  isDark ? "border-white/10" : "border-slate-100"
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {item.modules}
                  </span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : isDark ? "bg-white/5 text-slate-400 group-hover:bg-blue-500/15 group-hover:text-blue-300" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                  }`}>
                    {isSelected ? <Check className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`relative overflow-hidden rounded-[1.65rem] border p-6 md:p-8 ${
            isDark ? "border-white/10 bg-slate-900/55" : "border-slate-200 bg-white/75 shadow-xl shadow-slate-200/40"
          }`}
        >
          <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${selected.accent}`} />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-600"
              }`}>
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <p className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-cyan-300" : "text-blue-600"}`}>
                  Pilihanmu
                </p>
                <h3 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-950"}`}>
                  Ruang belajar {selected.title}
                </h3>
                <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Konten pembelajaran untuk tingkat {selected.id} akan hadir di sini.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {BENEFITS.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold ${
                    isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 text-blue-500" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}