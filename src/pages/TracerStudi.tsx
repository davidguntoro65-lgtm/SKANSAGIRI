import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase, GraduationCap, Store, Clock, ArrowLeft, ArrowRight,
  CheckCircle2, ChevronRight, Users, TrendingUp, Award, MapPin,
  Phone, Mail, ChevronDown, BarChart3, Sparkles
} from "lucide-react";

interface TracerEntry {
  id: string;
  nama: string;
  jurusan: string;
  tahunLulus: string;
  status: "bekerja" | "kuliah" | "wirausaha" | "belum_bekerja";
  namaPerusahaan?: string;
  posisi?: string;
  kota?: string;
  relevansiJurusan?: string;
  rentangGaji?: string;
  universitas?: string;
  programStudi?: string;
  jalurMasuk?: string;
  namaUsaha?: string;
  bidangUsaha?: string;
  tahunBerdiri?: string;
  alasanBelumBekerja?: string;
  whatsapp?: string;
  email?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  bekerja: number;
  kuliah: number;
  wirausaha: number;
  belum_bekerja: number;
}

type Step = "data-diri" | "status" | "detail" | "kontak" | "success";

const JURUSAN = [
  "Akuntansi & Keuangan Lembaga (AKL)",
  "Manajemen Perkantoran & Layanan Bisnis (MPLB)",
  "Bisnis Daring dan Pemasaran",
  "Kuliner",
  "Desain Mode & Tata Busana",
];

const TAHUN_LULUS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

const RELEVANCE_OPTIONS = [
  { value: "sangat_relevan", label: "Sangat Relevan" },
  { value: "relevan", label: "Relevan" },
  { value: "cukup_relevan", label: "Cukup Relevan" },
  { value: "tidak_relevan", label: "Tidak Relevan" },
];

const GAJI_OPTIONS = [
  { value: "lt2", label: "< Rp2 Juta" },
  { value: "2-4", label: "Rp2 – 4 Juta" },
  { value: "4-6", label: "Rp4 – 6 Juta" },
  { value: "gt6", label: "> Rp6 Juta" },
];

const JALUR_MASUK = ["SNBP", "SNBT", "Mandiri", "Lainnya"];

const ALASAN_BELUM_BEKERJA = [
  "Sedang Mencari Kerja",
  "Sedang Mengikuti Pelatihan",
  "Fokus Keluarga",
  "Lainnya",
];

function computeStats(entries: TracerEntry[]): Stats {
  const total = entries.length;
  const bekerja = entries.filter((e) => e.status === "bekerja").length;
  const kuliah = entries.filter((e) => e.status === "kuliah").length;
  const wirausaha = entries.filter((e) => e.status === "wirausaha").length;
  const belum_bekerja = entries.filter((e) => e.status === "belum_bekerja").length;
  return { total, bekerja, kuliah, wirausaha, belum_bekerja };
}

function pct(count: number, total: number) {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

export default function TracerStudi({ theme = "light" }: { theme?: "light" | "dark" }) {
  const isDark = theme === "dark";
  const [entries, setEntries] = useState<TracerEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const [step, setStep] = useState<Step>("data-diri");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nama: "",
    jurusan: "",
    tahunLulus: "",
    status: "" as "" | TracerEntry["status"],
    namaPerusahaan: "",
    posisi: "",
    kota: "",
    relevansiJurusan: "",
    rentangGaji: "",
    universitas: "",
    programStudi: "",
    jalurMasuk: "",
    namaUsaha: "",
    bidangUsaha: "",
    tahunBerdiri: "",
    alasanBelumBekerja: "",
    whatsapp: "",
    email: "",
  });

  useEffect(() => {
    fetch("/api/tracer")
      .then((r) => r.json())
      .then((d: TracerEntry[]) => { setEntries(Array.isArray(d) ? d : []); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));
  }, []);

  const stats = computeStats(entries);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const stepIndex = ["data-diri", "status", "detail", "kontak"].indexOf(step);
  const totalSteps = 4;

  const canNextDataDiri = form.nama.trim().length >= 2 && form.jurusan && form.tahunLulus;
  const canNextStatus = !!form.status;

  async function handleSubmit() {
    setSubmitting(true);
    const entry: Omit<TracerEntry, "id" | "createdAt"> = {
      nama: form.nama.trim(),
      jurusan: form.jurusan,
      tahunLulus: form.tahunLulus,
      status: form.status as TracerEntry["status"],
      ...(form.status === "bekerja" && {
        namaPerusahaan: form.namaPerusahaan,
        posisi: form.posisi,
        kota: form.kota,
        relevansiJurusan: form.relevansiJurusan,
        rentangGaji: form.rentangGaji,
      }),
      ...(form.status === "kuliah" && {
        universitas: form.universitas,
        programStudi: form.programStudi,
        jalurMasuk: form.jalurMasuk,
      }),
      ...(form.status === "wirausaha" && {
        namaUsaha: form.namaUsaha,
        bidangUsaha: form.bidangUsaha,
        tahunBerdiri: form.tahunBerdiri,
      }),
      ...(form.status === "belum_bekerja" && {
        alasanBelumBekerja: form.alasanBelumBekerja,
      }),
      ...(form.whatsapp && { whatsapp: form.whatsapp }),
      ...(form.email && { email: form.email }),
    };
    try {
      const res = await fetch("/api/tracer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const saved = await res.json();
        setEntries((prev) => [...prev, saved]);
        setStep("success");
      }
    } catch {
      alert("Gagal menyimpan data, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  const bg = isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900";
  const card = isDark ? "bg-slate-900/80 border-white/8" : "bg-white border-slate-200";
  const inputCls = isDark
    ? "w-full bg-slate-800 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
    : "w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors";

  const selectCls = `${inputCls} appearance-none cursor-pointer`;

  return (
    <section className={`relative z-10 min-h-screen pt-28 pb-24 transition-colors duration-500 ${bg}`} id="tracer-studi-page">
      <div className="max-w-5xl mx-auto px-5 md:px-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-10 text-[10px] font-mono uppercase tracking-widest">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", "/"); window.dispatchEvent(new Event("popstate")); }}
            className={`transition-colors ${isDark ? "text-slate-500 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"}`}
          >
            Beranda
          </a>
          <ChevronRight className="w-3 h-3 text-amber-500" />
          <span className="text-amber-500 font-semibold">Tracer Studi</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-amber-500 border border-amber-500/30 rounded-full px-3 py-1.5 mb-4">
            <BarChart3 className="w-3 h-3" />
            Alumni Research Program
          </div>
          <h1 className={`text-3xl md:text-4xl font-serif font-bold mb-3 leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            Tracer Studi<br />
            <span className="text-amber-500 italic">Alumni SMKN 1 Wonogiri</span>
          </h1>
          <p className={`text-sm leading-relaxed max-w-xl ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Bantu sekolah terus berkembang dengan memperbarui data Anda. Hanya perlu <strong className="text-amber-500">2 menit</strong>.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { icon: Briefcase, label: "Bekerja", count: stats.bekerja, color: "text-emerald-500", bg: isDark ? "bg-emerald-500/10" : "bg-emerald-50" },
            { icon: GraduationCap, label: "Kuliah", count: stats.kuliah, color: "text-blue-500", bg: isDark ? "bg-blue-500/10" : "bg-blue-50" },
            { icon: Store, label: "Wirausaha", count: stats.wirausaha, color: "text-violet-500", bg: isDark ? "bg-violet-500/10" : "bg-violet-50" },
            { icon: Users, label: "Total Alumni", count: stats.total, color: "text-amber-500", bg: isDark ? "bg-amber-500/10" : "bg-amber-50" },
          ].map(({ icon: Icon, label, count, color, bg: cbg }) => (
            <div key={label} className={`rounded-2xl border p-4 flex items-center gap-3 ${card}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cbg}`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <div>
                <div className={`text-lg font-bold font-serif ${color}`}>
                  {statsLoading ? "—" : stats.total > 0 ? `${pct(count, stats.total)}%` : count}
                </div>
                <div className={`text-[10px] font-mono uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bar (only while filling form) */}
        {step !== "success" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-mono uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Langkah {Math.max(stepIndex, 0) + 1} dari {totalSteps}
              </span>
              <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">
                {step === "data-diri" ? "Data Diri" : step === "status" ? "Status Saat Ini" : step === "detail" ? "Detail" : "Kontak"}
              </span>
            </div>
            <div className={`h-1.5 rounded-full w-full ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                animate={{ width: `${((Math.max(stepIndex, 0) + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <AnimatePresence mode="wait">
          {step === "data-diri" && (
            <motion.div
              key="data-diri"
              initial={{ opacity: 1, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className={`rounded-3xl border p-6 md:p-8 shadow-sm ${card}`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-amber-500/15" : "bg-amber-50"}`}>
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className={`text-base font-bold font-serif ${isDark ? "text-white" : "text-slate-900"}`}>Data Diri Alumni</h2>
                  <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Isi nama dan informasi kelulusan Anda</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Nama Lengkap *</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="contoh: Budi Santoso"
                    value={form.nama}
                    onChange={(e) => set("nama", e.target.value)}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Jurusan *</label>
                  <div className="relative">
                    <select className={selectCls} value={form.jurusan} onChange={(e) => set("jurusan", e.target.value)}>
                      <option value="">Pilih jurusan...</option>
                      {JURUSAN.map((j) => <option key={j} value={j}>{j}</option>)}
                    </select>
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Tahun Lulus *</label>
                  <div className="relative">
                    <select className={selectCls} value={form.tahunLulus} onChange={(e) => set("tahunLulus", e.target.value)}>
                      <option value="">Pilih tahun...</option>
                      {TAHUN_LULUS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  </div>
                </div>
              </div>

              <div className="mt-7 flex justify-end">
                <button
                  onClick={() => setStep("status")}
                  disabled={!canNextDataDiri}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:shadow-[0_0_18px_rgba(245,158,11,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Lanjutkan <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "status" && (
            <motion.div
              key="status"
              initial={{ opacity: 1, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className={`rounded-3xl border p-6 md:p-8 shadow-sm ${card}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-amber-500/15" : "bg-amber-50"}`}>
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className={`text-base font-bold font-serif ${isDark ? "text-white" : "text-slate-900"}`}>Status Saat Ini</h2>
                  <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    Halo <span className="text-amber-500 font-semibold">{form.nama}</span>, apa yang sedang Anda lakukan sekarang?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {[
                  { value: "bekerja", label: "Bekerja", desc: "Karyawan / Pegawai", icon: Briefcase, color: "emerald" },
                  { value: "kuliah", label: "Kuliah", desc: "Perguruan Tinggi", icon: GraduationCap, color: "blue" },
                  { value: "wirausaha", label: "Wirausaha", desc: "Usaha Mandiri", icon: Store, color: "violet" },
                  { value: "belum_bekerja", label: "Belum Bekerja", desc: "Sedang Mencari", icon: Clock, color: "slate" },
                ].map(({ value, label, desc, icon: Icon, color }) => {
                  const isSelected = form.status === value;
                  const colorMap: Record<string, string> = {
                    emerald: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
                    blue: "border-blue-500 bg-blue-500/10 text-blue-500",
                    violet: "border-violet-500 bg-violet-500/10 text-violet-500",
                    slate: isDark ? "border-slate-500 bg-slate-700/40 text-slate-400" : "border-slate-300 bg-slate-100 text-slate-500",
                  };
                  return (
                    <button
                      key={value}
                      onClick={() => set("status", value)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                        isSelected
                          ? colorMap[color]
                          : isDark
                            ? "border-white/8 bg-slate-800/60 hover:border-white/20"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-current/15" : isDark ? "bg-slate-700" : "bg-white"}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? "text-current" : isDark ? "text-slate-400" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${isSelected ? "text-current" : isDark ? "text-white" : "text-slate-900"}`}>{label}</div>
                        <div className={`text-[11px] mt-0.5 ${isSelected ? "text-current/70" : isDark ? "text-slate-500" : "text-slate-400"}`}>{desc}</div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 ml-auto text-current" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-7 flex justify-between">
                <button onClick={() => setStep("data-diri")} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-colors ${isDark ? "border-white/10 text-slate-400 hover:text-white hover:border-white/20" : "border-slate-200 text-slate-500 hover:text-slate-700"}`}>
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                <button
                  onClick={() => setStep("detail")}
                  disabled={!canNextStatus}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:shadow-[0_0_18px_rgba(245,158,11,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Lanjutkan <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "detail" && (
            <motion.div
              key="detail"
              initial={{ opacity: 1, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className={`rounded-3xl border p-6 md:p-8 shadow-sm ${card}`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-amber-500/15" : "bg-amber-50"}`}>
                  {form.status === "bekerja" ? <Briefcase className="w-5 h-5 text-amber-500" />
                    : form.status === "kuliah" ? <GraduationCap className="w-5 h-5 text-amber-500" />
                    : form.status === "wirausaha" ? <Store className="w-5 h-5 text-amber-500" />
                    : <Clock className="w-5 h-5 text-amber-500" />}
                </div>
                <div>
                  <h2 className={`text-base font-bold font-serif ${isDark ? "text-white" : "text-slate-900"}`}>
                    {form.status === "bekerja" ? "Info Pekerjaan"
                      : form.status === "kuliah" ? "Info Perguruan Tinggi"
                      : form.status === "wirausaha" ? "Info Usaha"
                      : "Keterangan"}
                  </h2>
                  <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Semua pertanyaan bersifat opsional</p>
                </div>
              </div>

              <div className="space-y-4">
                {form.status === "bekerja" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Nama Perusahaan</label>
                        <input type="text" className={inputCls} placeholder="PT / CV / Instansi..." value={form.namaPerusahaan} onChange={(e) => set("namaPerusahaan", e.target.value)} />
                      </div>
                      <div>
                        <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Posisi / Jabatan</label>
                        <input type="text" className={inputCls} placeholder="Staff, Supervisor..." value={form.posisi} onChange={(e) => set("posisi", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        <MapPin className="w-3 h-3 inline mr-1" />Kota
                      </label>
                      <input type="text" className={inputCls} placeholder="Jakarta, Surabaya..." value={form.kota} onChange={(e) => set("kota", e.target.value)} />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-mono uppercase tracking-widest mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Relevansi dengan Jurusan</label>
                      <div className="grid grid-cols-2 gap-2">
                        {RELEVANCE_OPTIONS.map((o) => (
                          <button key={o.value} onClick={() => set("relevansiJurusan", o.value)} className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${form.relevansiJurusan === o.value ? "border-amber-500 bg-amber-500/10 text-amber-500" : isDark ? "border-white/8 bg-slate-800 text-slate-400 hover:border-white/20" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"}`}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-mono uppercase tracking-widest mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Rentang Gaji <span className={isDark ? "text-slate-600" : "text-slate-300"}>(Opsional)</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {GAJI_OPTIONS.map((o) => (
                          <button key={o.value} onClick={() => set("rentangGaji", o.value)} className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${form.rentangGaji === o.value ? "border-amber-500 bg-amber-500/10 text-amber-500" : isDark ? "border-white/8 bg-slate-800 text-slate-400 hover:border-white/20" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"}`}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {form.status === "kuliah" && (
                  <>
                    <div>
                      <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Universitas / Perguruan Tinggi</label>
                      <input type="text" className={inputCls} placeholder="Universitas Gadjah Mada..." value={form.universitas} onChange={(e) => set("universitas", e.target.value)} />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Program Studi</label>
                      <input type="text" className={inputCls} placeholder="Akuntansi, Manajemen..." value={form.programStudi} onChange={(e) => set("programStudi", e.target.value)} />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-mono uppercase tracking-widest mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Jalur Masuk</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {JALUR_MASUK.map((j) => (
                          <button key={j} onClick={() => set("jalurMasuk", j)} className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${form.jalurMasuk === j ? "border-amber-500 bg-amber-500/10 text-amber-500" : isDark ? "border-white/8 bg-slate-800 text-slate-400 hover:border-white/20" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"}`}>
                            {j}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {form.status === "wirausaha" && (
                  <>
                    <div>
                      <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Nama Usaha</label>
                      <input type="text" className={inputCls} placeholder="Nama bisnis / usaha Anda..." value={form.namaUsaha} onChange={(e) => set("namaUsaha", e.target.value)} />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Bidang Usaha</label>
                      <input type="text" className={inputCls} placeholder="Kuliner, Fashion, Digital..." value={form.bidangUsaha} onChange={(e) => set("bidangUsaha", e.target.value)} />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Tahun Berdiri</label>
                      <div className="relative">
                        <select className={selectCls} value={form.tahunBerdiri} onChange={(e) => set("tahunBerdiri", e.target.value)}>
                          <option value="">Pilih tahun...</option>
                          {TAHUN_LULUS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                      </div>
                    </div>
                  </>
                )}

                {form.status === "belum_bekerja" && (
                  <div>
                    <label className={`block text-[11px] font-mono uppercase tracking-widest mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Keterangan</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALASAN_BELUM_BEKERJA.map((a) => (
                        <button key={a} onClick={() => set("alasanBelumBekerja", a)} className={`py-3 px-4 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${form.alasanBelumBekerja === a ? "border-amber-500 bg-amber-500/10 text-amber-500" : isDark ? "border-white/8 bg-slate-800 text-slate-400 hover:border-white/20" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"}`}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-7 flex justify-between">
                <button onClick={() => setStep("status")} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-colors ${isDark ? "border-white/10 text-slate-400 hover:text-white hover:border-white/20" : "border-slate-200 text-slate-500 hover:text-slate-700"}`}>
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                <button onClick={() => setStep("kontak")} className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:shadow-[0_0_18px_rgba(245,158,11,0.3)] transition-all">
                  Lanjutkan <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "kontak" && (
            <motion.div
              key="kontak"
              initial={{ opacity: 1, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className={`rounded-3xl border p-6 md:p-8 shadow-sm ${card}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-amber-500/15" : "bg-amber-50"}`}>
                  <Phone className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className={`text-base font-bold font-serif ${isDark ? "text-white" : "text-slate-900"}`}>Kontak <span className={`font-normal text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>(Opsional)</span></h2>
                  <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Agar sekolah bisa menghubungi Anda untuk program alumni</p>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    <Phone className="w-3 h-3 inline mr-1" />WhatsApp
                  </label>
                  <input type="tel" className={inputCls} placeholder="08xxxxxxxxxx" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    <Mail className="w-3 h-3 inline mr-1" />Email
                  </label>
                  <input type="email" className={inputCls} placeholder="nama@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
              </div>

              <div className={`mt-5 p-4 rounded-2xl text-xs ${isDark ? "bg-amber-500/8 border border-amber-500/20 text-amber-400/80" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
                Data kontak hanya digunakan untuk keperluan program alumni dan tidak disebarluaskan.
              </div>

              <div className="mt-7 flex justify-between">
                <button onClick={() => setStep("detail")} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-colors ${isDark ? "border-white/10 text-slate-400 hover:text-white hover:border-white/20" : "border-slate-200 text-slate-500 hover:text-slate-700"}`}>
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-7 py-3 rounded-full font-bold text-xs uppercase tracking-widest text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:shadow-[0_0_24px_rgba(245,158,11,0.4)] transition-all disabled:opacity-60"
                >
                  {submitting ? "Menyimpan..." : <><Sparkles className="w-4 h-4" /> Kirim Data</>}
                </button>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 1, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`rounded-3xl border p-8 md:p-12 shadow-sm text-center ${card}`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
                className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h2 className={`text-2xl font-serif font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  Data Berhasil Dikirim!
                </h2>
                <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Terima kasih, <span className="text-amber-500 font-semibold">{form.nama}</span>.<br />
                  Kontribusi Anda membantu SMKN 1 Wonogiri terus berkembang.
                </p>

                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400/20 to-yellow-400/10 border border-amber-500/30 mb-8">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold font-mono uppercase tracking-widest text-amber-500">Alumni Terverifikasi</span>
                </div>

                {/* Updated Stats */}
                <div className={`grid grid-cols-3 gap-3 p-5 rounded-2xl mb-8 ${isDark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                  {[
                    { label: "Bekerja", value: `${pct(computeStats(entries).bekerja, computeStats(entries).total)}%`, color: "text-emerald-500" },
                    { label: "Kuliah", value: `${pct(computeStats(entries).kuliah, computeStats(entries).total)}%`, color: "text-blue-500" },
                    { label: "Wirausaha", value: `${pct(computeStats(entries).wirausaha, computeStats(entries).total)}%`, color: "text-violet-500" },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className={`text-xl font-bold font-serif ${color}`}>{value}</div>
                      <div className={`text-[10px] font-mono uppercase tracking-widest mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{label}</div>
                    </div>
                  ))}
                </div>

                <p className={`text-[11px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                  Anda adalah bagian dari {computeStats(entries).total} alumni yang telah terdata.
                </p>

                <button
                  onClick={() => { window.history.pushState({}, "", "/"); window.dispatchEvent(new Event("popstate")); }}
                  className={`mt-6 flex items-center gap-2 mx-auto text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full border transition-colors ${isDark ? "border-white/10 text-slate-400 hover:text-white hover:border-white/20" : "border-slate-200 text-slate-500 hover:text-slate-700"}`}
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
