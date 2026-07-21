import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { navigate } from "../utils/navigation";
import {
  ArrowLeft, ChevronRight, MapPin, Phone, Mail, MessageSquare,
  ExternalLink, Building2, Shield, Megaphone, Send, CheckCircle2,
  Paperclip, X, AlertTriangle, CalendarDays, FileText, AlignLeft,
  Tag, Eye, EyeOff, Loader2, Info
} from "lucide-react";

interface AduanPublikProps {
  theme: "light" | "dark";
}

/* ─── Static data ──────────────────────────────────────────────── */
const ADUAN_CHANNELS = [
  {
    id: "lapor",
    icon: Megaphone,
    badge: "SP4N-LAPOR!",
    badgeSub: "Layanan Aspirasi & Pengaduan",
    description:
      "Punya aspirasi, permintaan informasi, atau pengaduan mengenai layanan pendidikan kami? Sampaikan secara aman dan rahasia melalui SP4N-LAPOR!, sistem pengaduan nasional terintegrasi yang dipantau langsung oleh Kepresidenan.",
    href: "https://www.lapor.go.id/",
    btnLabel: "Sampaikan Aduan di LAPOR!",
    btnColor: "bg-red-600 hover:bg-red-700 text-white",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    borderAccent: "border-l-4 border-red-500",
  },
  {
    id: "wbs",
    icon: Shield,
    badge: "WBS Wonogiri",
    badgeSub: "Whistleblowing System Daerah",
    description:
      "Whistleblowing System (WBS) Kabupaten Wonogiri memfasilitasi pelaporan dugaan pelanggaran hukum, korupsi, kolusi, nepotisme, dan penyimpangan prosedur kerja secara rahasia dan terlindungi penuh.",
    href: "https://wonogirikab.go.id/wbs/",
    btnLabel: "Laporkan Pelanggaran di WBS",
    btnColor: "bg-blue-600 hover:bg-blue-700 text-white",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    borderAccent: "border-l-4 border-blue-500",
  },
  {
    id: "dinas",
    icon: MessageSquare,
    badge: "SALURAN DINAS P dan K",
    badgeSub: "Whistleblower, aduan dan kritik Dinas P dan K Wonogiri",
    description:
      'Butuh koordinasi administratif, pelaporan cepat, atau bantuan langsung dari Dinas Pendidikan dan Kebudayaan Kabupaten Wonogiri? Hubungi WhatsApp resmi "Halo Kakak" untuk mendapatkan tanggapan yang cepat dan responsif.',
    href: "https://dinaspdank.wonogirikab.go.id/halokakak",
    btnLabel: "Layanan Aduan Dinas P dan K Wonogiri",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    borderAccent: "border-l-4 border-emerald-500",
  },
];

const IDENTITY_INFO = [
  { icon: Building2, label: "Nama Satuan Pendidikan", value: "SMK NEGERI 1 WONOGIRI" },
  { icon: MapPin, label: "Alamat", value: "Jalan Arjuna VI, Wonokarto, Wonogiri, Jawa Tengah — Kode Pos 57612" },
  { icon: Phone, label: "No. Telp / Fax", value: "0273 321322", href: "tel:+62273321322" },
  { icon: MessageSquare, label: "WhatsApp", value: "Liliek Arief S — 081329650011", href: "https://wa.me/6281329650011" },
  { icon: Mail, label: "Alamat Email", value: "office@smkn1wonogiri.sch.id", href: "mailto:office@smkn1wonogiri.sch.id" },
];

const KATEGORI_OPTIONS = [
  "Pelayanan Administrasi",
  "Fasilitas & Sarana Prasarana",
  "Kegiatan Belajar Mengajar",
  "Perilaku Tenaga Pendidik",
  "Perilaku Tenaga Kependidikan",
  "Keamanan & Ketertiban Sekolah",
  "Pungutan Tidak Resmi",
  "Transparansi Informasi",
  "Topik Lainnya",
];

const LOKASI_OPTIONS = [
  "Ruang Kelas",
  "Laboratorium",
  "Kantin / Area Makan",
  "Lapangan / Area Olahraga",
  "Toilet / Kamar Mandi",
  "Perpustakaan",
  "Ruang Guru / TU",
  "Parkiran",
  "Lingkungan Sekolah Lainnya",
  "Di Luar Lingkungan Sekolah",
  "Lokasi Lainnya",
];

interface FormState {
  judul: string;
  isi: string;
  tanggal: string;
  lokasi: string;
  lokasiLainnya: string;
  kategori: string;
  anonim: boolean;
  rahasia: boolean;
}

const INITIAL_FORM: FormState = {
  judul: "",
  isi: "",
  tanggal: "",
  lokasi: "",
  lokasiLainnya: "",
  kategori: "",
  anonim: false,
  rahasia: false,
};

/* ─── Component ───────────────────────────────────────────────── */
export default function AduanPublik({ theme }: AduanPublikProps) {
  const isDark = theme === "dark";

  /* form state */
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* helpers */
  const set = (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const setCheck = (field: "anonim" | "rahasia") =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.checked }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.judul.trim()) e.judul = "Judul laporan wajib diisi.";
    if (!form.isi.trim() || form.isi.trim().length < 30) e.isi = "Isi laporan minimal 30 karakter.";
    if (!form.tanggal) e.tanggal = "Tanggal kejadian wajib diisi.";
    if (!form.lokasi) e.lokasi = "Lokasi kejadian wajib dipilih.";
    if (form.lokasi === "Lokasi Lainnya" && !form.lokasiLainnya.trim())
      e.lokasiLainnya = "Mohon tuliskan lokasi kejadian.";
    if (!form.kategori) e.kategori = "Kategori laporan wajib dipilih.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files).filter(
      (f: File) => f.size <= 5 * 1024 * 1024
    );
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
    e.target.value = "";
  };

  const removeFile = (i: number) => setFiles((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1600));
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setFiles([]);
    setErrors({});
    setSubmitted(false);
  };

  /* style tokens */
  const card = isDark
    ? "bg-slate-900/70 border border-white/8"
    : "bg-white border border-slate-200 shadow-sm";

  const inputBase = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 ${
    isDark
      ? "bg-slate-800/70 border border-white/10 text-white placeholder-slate-500 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
  }`;

  const labelBase = `block text-[11px] font-bold uppercase tracking-widest mb-1.5 ${
    isDark ? "text-slate-400" : "text-slate-500"
  }`;

  const errClass = "mt-1.5 text-[11px] text-red-500 flex items-center gap-1";

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <section
      className={`min-h-screen pt-28 pb-20 relative z-10 ${isDark ? "text-white" : "text-slate-900"}`}
      id="aduan-publik-page"
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12">

        {/* Breadcrumb */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          onClick={() => navigate("/")}
          className={`flex items-center gap-2 text-xs uppercase tracking-widest font-bold mb-10 transition-colors group cursor-pointer bg-transparent border-0 outline-none ${
            isDark ? "text-slate-400 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"
          }`}
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          Beranda
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className={isDark ? "text-amber-400" : "text-amber-600"}>Aduan Publik</span>
        </motion.button>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-center mb-12"
        >
          <span className={`text-[10px] font-mono tracking-[0.3em] uppercase font-bold mb-3 block ${isDark ? "text-amber-400" : "text-amber-600"}`}>
            Keterbukaan &amp; Akuntabilitas
          </span>
          <h1 className={`font-serif text-3xl md:text-4xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>
            Pelayanan &amp; Pengaduan Publik
          </h1>
          <p className={`text-sm leading-relaxed max-w-2xl mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Sebagai instansi pendidikan negeri, kami berkomitmen mewujudkan transparansi informasi pelayanan dan menampung aspirasi masyarakat secara resmi.
          </p>
          <div className="mt-6 h-[2px] w-16 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto rounded-full" />
        </motion.div>

        {/* Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`rounded-2xl p-6 md:p-8 mb-10 ${card}`}
        >
          <h2 className={`text-[10px] font-mono tracking-[0.25em] uppercase font-bold mb-5 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
            Identitas Layanan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {IDENTITY_INFO.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isDark ? "bg-amber-500/10" : "bg-amber-50"}`}>
                    <Icon className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className={`text-[10px] font-mono uppercase tracking-widest mb-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{item.label}</p>
                    {(item as { href?: string }).href ? (
                      <a href={(item as { href?: string }).href} target={(item as { href?: string }).href!.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                        className={`text-sm font-semibold transition-colors ${isDark ? "text-slate-200 hover:text-amber-400" : "text-slate-800 hover:text-amber-600"}`}>
                        {item.value}
                      </a>
                    ) : (
                      <p className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{item.value}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Channel heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="mb-6"
        >
          <span className={`text-[10px] font-mono tracking-[0.25em] uppercase font-bold block mb-1 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
            Saluran Informasi &amp; Pengaduan Publik
          </span>
          <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Akses portal resmi kementerian dan daerah untuk pemantauan standar layanan serta penyampaian aspirasi masyarakat.
          </p>
        </motion.div>

        {/* Channel Cards */}
        <div className="grid gap-5 md:grid-cols-3 mb-16">
          {ADUAN_CHANNELS.map((ch, i) => {
            const Icon = ch.icon;
            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22 + i * 0.07 }}
                className={`flex flex-col rounded-2xl overflow-hidden ${isDark ? "bg-slate-900/60 border border-white/8" : "bg-white border border-slate-200 shadow-sm"} ${ch.borderAccent}`}
              >
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ch.iconBg}`}>
                      <Icon className={`w-4.5 h-4.5 ${ch.iconColor}`} />
                    </div>
                    <div>
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-widest block ${ch.iconColor}`}>{ch.badge}</span>
                      <span className={`text-[9px] font-mono uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>{ch.badgeSub}</span>
                    </div>
                  </div>
                  <p className={`text-xs leading-relaxed flex-1 mb-4 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{ch.description}</p>
                  <a
                    href={ch.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-200 hover:scale-[1.02] active:scale-95 ${ch.btnColor}`}
                  >
                    {ch.btnLabel}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ─── FORM ADUAN ONLINE ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.38 }}
          id="form-aduan-online"
        >
          {/* Section header */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`flex-1 h-[1px] ${isDark ? "bg-white/8" : "bg-slate-200"}`} />
            <div className="text-center">
              <span className={`text-[10px] font-mono tracking-[0.25em] uppercase font-bold block mb-0.5 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                Layanan Digital
              </span>
              <h2 className={`font-serif text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                Form Aduan Online
              </h2>
            </div>
            <div className={`flex-1 h-[1px] ${isDark ? "bg-white/8" : "bg-slate-200"}`} />
          </div>

          {/* Info banner */}
          <div className={`flex items-start gap-3 rounded-xl p-4 mb-6 ${isDark ? "bg-amber-500/8 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}>
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Form ini khusus untuk <strong>Pengaduan</strong> terkait layanan SMK Negeri 1 Wonogiri. Setiap pengaduan akan ditindaklanjuti oleh tim kami dalam 3 × 24 jam pada hari kerja. Pastikan informasi yang Anda sampaikan akurat dan dapat dipertanggungjawabkan.
            </p>
          </div>

          {/* Success state */}
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className={`rounded-2xl p-10 text-center ${card}`}
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className={`font-serif text-xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  Aduan Berhasil Dikirim
                </h3>
                <p className={`text-sm mb-6 max-w-md mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Terima kasih telah menyampaikan pengaduan Anda. Kami akan menindaklanjuti dalam 3 × 24 jam pada hari kerja.
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border-0 outline-none"
                >
                  Kirim Aduan Baru
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                noValidate
                className={`rounded-2xl p-6 md:p-8 ${card}`}
              >
                {/* Badge: PENGADUAN */}
                <div className="flex items-center gap-3 mb-7">
                  <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Pengaduan
                  </span>
                  <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    Sampaikan keluhan atau laporan Anda di bawah ini
                  </span>
                </div>

                <div className="grid gap-5">
                  {/* Judul */}
                  <div>
                    <label className={labelBase}>
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3" />
                        Judul Laporan <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={form.judul}
                      onChange={set("judul")}
                      placeholder="Contoh: Kerusakan fasilitas toilet lantai 2"
                      className={`${inputBase} ${errors.judul ? "border-red-500/60 focus:border-red-500" : ""}`}
                      maxLength={120}
                    />
                    {errors.judul && (
                      <p className={errClass}><AlertTriangle className="w-3 h-3" />{errors.judul}</p>
                    )}
                    <p className={`text-right text-[10px] mt-1 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                      {form.judul.length}/120
                    </p>
                  </div>

                  {/* Isi Laporan */}
                  <div>
                    <label className={labelBase}>
                      <span className="flex items-center gap-1.5">
                        <AlignLeft className="w-3 h-3" />
                        Isi Laporan <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <textarea
                      value={form.isi}
                      onChange={set("isi")}
                      rows={5}
                      placeholder="Deskripsikan pengaduan Anda secara detail: apa yang terjadi, kapan, dan siapa yang terlibat..."
                      className={`${inputBase} resize-none leading-relaxed ${errors.isi ? "border-red-500/60 focus:border-red-500" : ""}`}
                      maxLength={2000}
                    />
                    {errors.isi && (
                      <p className={errClass}><AlertTriangle className="w-3 h-3" />{errors.isi}</p>
                    )}
                    <p className={`text-right text-[10px] mt-1 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                      {form.isi.length}/2000
                    </p>
                  </div>

                  {/* Tanggal & Lokasi side by side */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    {/* Tanggal */}
                    <div>
                      <label className={labelBase}>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="w-3 h-3" />
                          Tanggal Kejadian <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="date"
                        value={form.tanggal}
                        onChange={set("tanggal")}
                        max={new Date().toISOString().split("T")[0]}
                        className={`${inputBase} ${errors.tanggal ? "border-red-500/60 focus:border-red-500" : ""}`}
                      />
                      {errors.tanggal && (
                        <p className={errClass}><AlertTriangle className="w-3 h-3" />{errors.tanggal}</p>
                      )}
                    </div>

                    {/* Lokasi */}
                    <div>
                      <label className={labelBase}>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          Lokasi Kejadian <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <select
                        value={form.lokasi}
                        onChange={(e) => {
                          set("lokasi")(e);
                          if (e.target.value !== "Lokasi Lainnya")
                            setForm((p) => ({ ...p, lokasiLainnya: "" }));
                        }}
                        className={`${inputBase} appearance-none cursor-pointer ${errors.lokasi ? "border-red-500/60 focus:border-red-500" : ""}`}
                      >
                        <option value="">— Pilih lokasi kejadian —</option>
                        {LOKASI_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                      {errors.lokasi && (
                        <p className={errClass}><AlertTriangle className="w-3 h-3" />{errors.lokasi}</p>
                      )}
                      {form.lokasi === "Lokasi Lainnya" && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={form.lokasiLainnya}
                            onChange={set("lokasiLainnya")}
                            placeholder="Tuliskan lokasi kejadian secara spesifik..."
                            maxLength={120}
                            className={`${inputBase} ${errors.lokasiLainnya ? "border-red-500/60 focus:border-red-500" : ""}`}
                          />
                          {errors.lokasiLainnya && (
                            <p className={errClass}><AlertTriangle className="w-3 h-3" />{errors.lokasiLainnya}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className={labelBase}>
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        Kategori Laporan <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <select
                      value={form.kategori}
                      onChange={set("kategori")}
                      className={`${inputBase} appearance-none cursor-pointer ${errors.kategori ? "border-red-500/60 focus:border-red-500" : ""}`}
                    >
                      <option value="">— Pilih kategori —</option>
                      {KATEGORI_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    {errors.kategori && (
                      <p className={errClass}><AlertTriangle className="w-3 h-3" />{errors.kategori}</p>
                    )}
                  </div>

                  {/* Upload Lampiran */}
                  <div>
                    <label className={labelBase}>
                      <span className="flex items-center gap-1.5">
                        <Paperclip className="w-3 h-3" />
                        Lampiran <span className={`font-normal normal-case ${isDark ? "text-slate-600" : "text-slate-400"}`}>(opsional, maks 5 file · 5 MB/file)</span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed text-sm font-medium transition-all duration-200 cursor-pointer ${
                        isDark
                          ? "border-white/10 text-slate-400 hover:border-amber-500/40 hover:text-amber-400 hover:bg-amber-500/5"
                          : "border-slate-300 text-slate-400 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/60"
                      }`}
                    >
                      <Paperclip className="w-4 h-4" />
                      Klik untuk memilih file
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {files.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {files.map((f, i) => (
                          <li
                            key={i}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs ${
                              isDark ? "bg-slate-800/60 text-slate-300" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <span className="truncate flex-1">{f.name}</span>
                            <span className={`shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                              {(f.size / 1024).toFixed(0)} KB
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(i)}
                              className="shrink-0 text-red-400 hover:text-red-600 transition-colors cursor-pointer bg-transparent border-0 outline-none"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Anonim & Rahasia */}
                  <div className={`flex flex-wrap items-center gap-6 pt-1 pb-2 px-4 py-3 rounded-xl ${isDark ? "bg-slate-800/40" : "bg-slate-50"}`}>
                    <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={form.anonim}
                          onChange={setCheck("anonim")}
                          className="sr-only"
                        />
                        <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all duration-150 ${
                          form.anonim
                            ? "bg-amber-500 border-amber-500"
                            : isDark ? "border-slate-600 bg-slate-700" : "border-slate-300 bg-white"
                        }`}>
                          {form.anonim && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        <EyeOff className={`w-3.5 h-3.5 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>Anonim</span>
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={form.rahasia}
                          onChange={setCheck("rahasia")}
                          className="sr-only"
                        />
                        <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all duration-150 ${
                          form.rahasia
                            ? "bg-amber-500 border-amber-500"
                            : isDark ? "border-slate-600 bg-slate-700" : "border-slate-300 bg-white"
                        }`}>
                          {form.rahasia && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        <Eye className={`w-3.5 h-3.5 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>Rahasia</span>
                      </span>
                    </label>

                    <p className={`text-[10px] leading-relaxed ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                      Anonim: identitas disembunyikan. Rahasia: hanya dibaca admin.
                    </p>
                  </div>

                  {/* Submit */}
                  <div className="flex items-center justify-between gap-4 pt-2">
                    <p className={`text-[10px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                      <span className="text-red-500">*</span> Kolom wajib diisi
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2.5 px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-slate-950 hover:shadow-[0_0_24px_rgba(245,158,11,0.4)] hover:scale-[1.03] active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer border-0 outline-none"
                    >
                      {submitting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Mengirim...</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" />Kirim Pengaduan</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className={`text-center text-[11px] mt-10 ${isDark ? "text-slate-600" : "text-slate-400"}`}
        >
          Seluruh pengaduan yang masuk akan ditindaklanjuti sesuai ketentuan peraturan perundang-undangan yang berlaku.
        </motion.p>
      </div>
    </section>
  );
}
