import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, ChevronRight, MapPin, Phone, Mail, Clock,
  Send, CheckCircle2, AlertCircle, Instagram, Youtube,
  Globe, MessageSquare, Building2, ExternalLink, Loader2,
  PhoneCall, MailOpen
} from "lucide-react";

interface ContactForm {
  nama: string;
  email: string;
  noHp: string;
  keperluan: string;
  pesan: string;
}

const KEPERLUAN_OPTIONS = [
  "Informasi Pendaftaran PPDB",
  "Informasi Jurusan / Program Keahlian",
  "Informasi Biaya Sekolah",
  "Kerjasama & Kemitraan Industri",
  "Magang / PKL Siswa",
  "Alumni & Bursa Kerja (BKK)",
  "Permohonan Dokumen / Surat",
  "Kunjungan / Studi Banding",
  "Pengaduan & Saran",
  "Lainnya",
];

const CONTACT_INFO = [
  {
    icon: MapPin,
    label: "Alamat Sekolah",
    value: "Jl. Arjuna VI, Wonokarto, Wonogiri, Jawa Tengah 57613",
    sub: "Lihat di Google Maps →",
    href: "https://maps.google.com/?q=SMK+Negeri+1+Wonogiri",
    color: "amber",
  },
  {
    icon: Phone,
    label: "Telepon / Fax",
    value: "(0273) 321322",
    sub: "Senin – Sabtu, 07.00 – 14.30 WIB",
    href: "tel:+62273321322",
    color: "emerald",
  },
  {
    icon: Mail,
    label: "Surel Resmi",
    value: "info@smkn1wonogiri.sch.id",
    sub: "Balasan dalam 1×24 jam kerja",
    href: "mailto:info@smkn1wonogiri.sch.id",
    color: "blue",
  },
  {
    icon: Clock,
    label: "Jam Operasional",
    value: "Senin – Sabtu",
    sub: "07.00 – 14.30 WIB (Hari kerja)",
    href: null,
    color: "violet",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; dot: string }> = {
  amber: {
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    icon: "text-amber-500",
    dot: "bg-amber-500",
  },
  emerald: {
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/20",
    icon: "text-emerald-500",
    dot: "bg-emerald-500",
  },
  blue: {
    bg: "bg-blue-500/8",
    border: "border-blue-500/20",
    icon: "text-blue-500",
    dot: "bg-blue-500",
  },
  violet: {
    bg: "bg-violet-500/8",
    border: "border-violet-500/20",
    icon: "text-violet-500",
    dot: "bg-violet-500",
  },
};

const COLOR_MAP_LIGHT: Record<string, { bg: string; border: string; icon: string }> = {
  amber: { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-600" },
  blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-600" },
  violet: { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-600" },
};

type SubmitStatus = "idle" | "loading" | "success" | "error";

export default function HubungiKami({ theme = "light" }: { theme?: "light" | "dark" }) {
  const isDark = theme === "dark";

  const [form, setForm] = useState<ContactForm>({
    nama: "", email: "", noHp: "", keperluan: "", pesan: "",
  });
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof ContactForm, boolean>>>({});

  const validate = () => {
    const errors: string[] = [];
    if (!form.nama.trim()) errors.push("Nama lengkap wajib diisi");
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.push("Format email tidak valid");
    if (!form.keperluan) errors.push("Pilih keperluan pesan");
    if (!form.pesan.trim() || form.pesan.trim().length < 20)
      errors.push("Pesan minimal 20 karakter");
    return errors;
  };

  const fieldError = (field: keyof ContactForm): string | null => {
    if (!touched[field]) return null;
    if (field === "nama" && !form.nama.trim()) return "Wajib diisi";
    if (field === "email" && (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)))
      return "Format email tidak valid";
    if (field === "keperluan" && !form.keperluan) return "Pilih salah satu";
    if (field === "pesan" && form.pesan.trim().length < 20)
      return form.pesan.trim().length === 0 ? "Wajib diisi" : `Minimal 20 karakter (${form.pesan.trim().length}/20)`;
    return null;
  };

  const handleChange = (field: keyof ContactForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nama: true, email: true, keperluan: true, pesan: true });
    const errors = validate();
    if (errors.length > 0) {
      setErrorMsg(errors[0]);
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, waktu: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Server error");
      setStatus("success");
      setForm({ nama: "", email: "", noHp: "", keperluan: "", pesan: "" });
      setTouched({});
    } catch {
      setStatus("error");
      setErrorMsg("Gagal mengirim pesan. Silakan coba lagi atau hubungi kami langsung.");
    }
  };

  const inputBase = `w-full rounded-xl px-4 py-3 text-sm font-sans outline-none transition-all duration-200 border`;
  const inputClass = (field: keyof ContactForm) => {
    const hasErr = !!fieldError(field);
    if (isDark) {
      return `${inputBase} bg-slate-900 ${hasErr ? "border-red-500/60 focus:border-red-500" : "border-white/8 focus:border-amber-500/60"} text-slate-100 placeholder:text-slate-600`;
    }
    return `${inputBase} bg-white ${hasErr ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} text-slate-900 placeholder:text-slate-400 shadow-sm`;
  };

  const labelClass = `block text-xs font-mono uppercase tracking-widest font-semibold mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`;

  return (
    <section
      className={`relative z-10 min-h-screen pt-32 pb-32 transition-colors duration-500 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
      }`}
      id="hubungi-kami-page"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* ── Breadcrumb ─────────────────────────────────── */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-12 text-[10px] font-mono uppercase tracking-widest"
        >
          <button
            onClick={() => { window.history.pushState({}, "", "/"); window.dispatchEvent(new Event("popstate")); }}
            className={`flex items-center gap-1 transition-colors ${isDark ? "text-slate-500 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"}`}
          >
            <ArrowLeft className="w-3 h-3" />
            Beranda
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-amber-500 font-bold">Hubungi Kami</span>
        </motion.nav>

        {/* ── Page Header ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mb-16"
        >
          <span className={`text-xs font-mono tracking-[0.3em] uppercase block mb-3 font-semibold ${isDark ? "text-amber-500" : "text-amber-600"}`}>
            CONTACT & INFORMATION
          </span>
          <h1 className={`text-3xl md:text-5xl font-serif font-bold tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-950"}`}>
            Hubungi <span className={`italic font-light ${isDark ? "text-amber-400" : "text-amber-600"}`}>Kami</span>
          </h1>
          <p className={`mt-4 text-sm md:text-base leading-relaxed max-w-xl ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Kami siap membantu Anda. Sampaikan pertanyaan, keperluan, atau saran Anda dan tim kami akan merespons dalam waktu 1×24 jam kerja.
          </p>
          <div className="h-[1.5px] w-16 mt-6 bg-amber-500" />
        </motion.div>

        {/* ── Contact Info Cards ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-16">
          {CONTACT_INFO.map((item, i) => {
            const Icon = item.icon;
            const c = isDark ? COLOR_MAP[item.color] : COLOR_MAP_LIGHT[item.color];
            const card = (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className={`relative rounded-2xl p-6 border overflow-hidden transition-all duration-300 group ${
                  isDark
                    ? `${c.bg} ${c.border} hover:border-opacity-50`
                    : `${c.bg} ${c.border}`
                }`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${COLOR_MAP[item.color].dot}`} />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                  isDark ? "bg-white/5" : "bg-white shadow-sm"
                }`}>
                  <Icon className={`w-5 h-5 ${isDark ? COLOR_MAP[item.color].icon : c.icon}`} />
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-widest block mb-1.5 font-bold ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}>{item.label}</span>
                <p className={`text-sm font-semibold mb-1 leading-snug ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  {item.value}
                </p>
                {item.href ? (
                  <a
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className={`text-xs transition-colors ${isDark ? `${COLOR_MAP[item.color].icon} hover:opacity-80` : `${c.icon} hover:opacity-70`}`}
                  >
                    {item.sub}
                  </a>
                ) : (
                  <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{item.sub}</span>
                )}
              </motion.div>
            );
            return card;
          })}
        </div>

        {/* ── Main Grid: Map + Form ───────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-10 xl:gap-14 mb-16">

          {/* LEFT: Map + Extra Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="xl:col-span-2 flex flex-col gap-6"
          >
            {/* Google Maps */}
            <div className={`rounded-2xl overflow-hidden border ${isDark ? "border-white/8" : "border-slate-200"}`}>
              <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
                isDark ? "bg-slate-900 border-white/8" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <span className={`text-xs font-mono font-bold uppercase tracking-widest ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    Lokasi Sekolah
                  </span>
                </div>
                <a
                  href="https://maps.google.com/?q=SMK+Negeri+1+Wonogiri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-widest"
                >
                  Buka Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative aspect-[4/3] w-full">
                <iframe
                  title="Lokasi SMK Negeri 1 Wonogiri"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3953.9!2d110.9219!3d-7.8150!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e7a6e4e4b0e0001%3A0x0!2sSMK%20Negeri%201%20Wonogiri!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: "block" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>

            {/* Office Info */}
            <div className={`rounded-2xl border p-6 ${
              isDark ? "bg-slate-900/60 border-white/8" : "bg-slate-50 border-slate-200"
            }`}>
              <div className={`flex items-center gap-2.5 mb-5`}>
                <Building2 className="w-4 h-4 text-amber-500" />
                <span className={`text-xs font-mono font-bold uppercase tracking-widest ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  Tata Usaha
                </span>
              </div>
              <div className="space-y-4">
                {[
                  { icon: PhoneCall, text: "(0273) 321322", label: "Telepon Kantor" },
                  { icon: MailOpen, text: "info@smkn1wonogiri.sch.id", label: "Email Resmi" },
                  { icon: Clock, text: "Senin – Sabtu, 07.00 – 14.30 WIB", label: "Jam Layanan" },
                ].map(({ icon: Icon, text, label }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isDark ? "bg-amber-500/10" : "bg-amber-100"
                    }`}>
                      <Icon className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div>
                      <span className={`text-[10px] font-mono uppercase tracking-wider block mb-0.5 ${
                        isDark ? "text-slate-600" : "text-slate-400"
                      }`}>{label}</span>
                      <span className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-700"}`}>{text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Media */}
            <div className={`rounded-2xl border p-6 ${
              isDark ? "bg-slate-900/60 border-white/8" : "bg-slate-50 border-slate-200"
            }`}>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-widest block mb-4 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}>Media Sosial Resmi</span>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Instagram, label: "Instagram", href: "https://instagram.com/smkn1wonogiri", color: "from-pink-500 to-rose-500" },
                  { icon: Youtube, label: "YouTube", href: "https://youtube.com/@smkn1wonogiri", color: "from-red-500 to-red-600" },
                  { icon: Globe, label: "Website", href: "https://smkn1wonogiri.sch.id", color: "from-blue-500 to-blue-600" },
                ].map(({ icon: Icon, label, href, color }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-xs font-semibold bg-gradient-to-r ${color} hover:opacity-90 transition-opacity shadow-sm`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="xl:col-span-3"
          >
            <div className={`relative rounded-3xl border overflow-hidden ${
              isDark
                ? "bg-slate-900 border-white/8"
                : "bg-white border-slate-200 shadow-sm"
            }`}>
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

              <div className="p-8 md:p-10">
                {/* Form header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-amber-500/10" : "bg-amber-50"
                  }`}>
                    <MessageSquare className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-serif font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                      Kirim Pesan
                    </h2>
                    <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Semua field bertanda <span className="text-red-400">*</span> wajib diisi
                    </p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {status === "success" ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center py-20 text-center gap-5"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className={`text-xl font-serif font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                          Pesan Berhasil Dikirim
                        </h3>
                        <p className={`text-sm max-w-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          Terima kasih! Tim kami akan merespons ke email Anda dalam 1×24 jam kerja.
                        </p>
                      </div>
                      <button
                        onClick={() => { setStatus("idle"); setErrorMsg(""); }}
                        className="mt-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                      >
                        Kirim Pesan Lain
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-5"
                      noValidate
                    >
                      {/* Row 1: Nama + Email */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className={labelClass}>
                            Nama Lengkap <span className="text-red-400 normal-case">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Budi Santoso"
                            value={form.nama}
                            onChange={(e) => handleChange("nama", e.target.value)}
                            onBlur={() => setTouched((p) => ({ ...p, nama: true }))}
                            className={inputClass("nama")}
                          />
                          {fieldError("nama") && (
                            <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {fieldError("nama")}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>
                            Alamat Email <span className="text-red-400 normal-case">*</span>
                          </label>
                          <input
                            type="email"
                            placeholder="nama@email.com"
                            value={form.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                            className={inputClass("email")}
                          />
                          {fieldError("email") && (
                            <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {fieldError("email")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Row 2: No HP + Keperluan */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className={labelClass}>No. WhatsApp / HP</label>
                          <input
                            type="tel"
                            placeholder="08xx-xxxx-xxxx"
                            value={form.noHp}
                            onChange={(e) => handleChange("noHp", e.target.value)}
                            className={inputClass("noHp")}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            Keperluan <span className="text-red-400 normal-case">*</span>
                          </label>
                          <select
                            value={form.keperluan}
                            onChange={(e) => handleChange("keperluan", e.target.value)}
                            onBlur={() => setTouched((p) => ({ ...p, keperluan: true }))}
                            className={`${inputClass("keperluan")} ${!form.keperluan ? (isDark ? "text-slate-600" : "text-slate-400") : ""}`}
                          >
                            <option value="" disabled>Pilih keperluan…</option>
                            {KEPERLUAN_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}
                                className={isDark ? "bg-slate-800 text-slate-100" : "bg-white text-slate-900"}
                              >
                                {opt}
                              </option>
                            ))}
                          </select>
                          {fieldError("keperluan") && (
                            <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {fieldError("keperluan")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Pesan */}
                      <div>
                        <label className={labelClass}>
                          Isi Pesan <span className="text-red-400 normal-case">*</span>
                        </label>
                        <textarea
                          rows={6}
                          placeholder="Tuliskan pesan, pertanyaan, atau informasi yang ingin Anda sampaikan secara jelas dan lengkap…"
                          value={form.pesan}
                          onChange={(e) => handleChange("pesan", e.target.value)}
                          onBlur={() => setTouched((p) => ({ ...p, pesan: true }))}
                          className={`${inputClass("pesan")} resize-none leading-relaxed`}
                        />
                        <div className="flex items-start justify-between mt-1.5">
                          {fieldError("pesan") ? (
                            <p className="text-[11px] text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {fieldError("pesan")}
                            </p>
                          ) : (
                            <span />
                          )}
                          <span className={`text-[10px] font-mono ml-auto ${
                            form.pesan.trim().length >= 20
                              ? "text-emerald-500"
                              : isDark ? "text-slate-600" : "text-slate-400"
                          }`}>
                            {form.pesan.trim().length} karakter
                          </span>
                        </div>
                      </div>

                      {/* Global error */}
                      <AnimatePresence>
                        {status === "error" && errorMsg && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`flex items-center gap-2.5 p-3.5 rounded-xl text-sm border ${
                              isDark
                                ? "bg-red-500/8 border-red-500/20 text-red-400"
                                : "bg-red-50 border-red-200 text-red-600"
                            }`}
                          >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {errorMsg}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Privacy note */}
                      <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                        Dengan mengirim formulir ini, Anda menyetujui bahwa data Anda akan digunakan semata-mata untuk keperluan komunikasi dan tidak akan dibagikan kepada pihak ketiga.
                      </p>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={status === "loading"}
                        className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-sm font-bold font-sans uppercase tracking-widest transition-all duration-300 ${
                          status === "loading"
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:scale-[1.01] active:scale-[0.99]"
                        } bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20`}
                      >
                        {status === "loading" ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Mengirim…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Kirim Pesan
                          </>
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── FAQ Strip ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <div className={`rounded-3xl border overflow-hidden ${
            isDark ? "bg-slate-900/60 border-white/8" : "bg-slate-50 border-slate-200"
          }`}>
            <div className={`px-8 py-6 border-b ${isDark ? "border-white/8" : "border-slate-200"}`}>
              <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}>Pertanyaan Umum</span>
              <h3 className={`text-lg font-serif font-bold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                Yang Sering Ditanyakan
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/8">
              {[
                {
                  q: "Bagaimana cara mendaftar PPDB SMKN 1 Wonogiri?",
                  a: "Pendaftaran dilakukan secara online melalui halaman Admisi PPDB di website ini. Siapkan dokumen: ijazah/SKL SMP, KK, KTP orang tua, dan pas foto.",
                },
                {
                  q: "Jurusan apa saja yang tersedia?",
                  a: "Lima program keahlian: Akuntansi & Keuangan Lembaga (AKL), Manajemen Perkantoran (MPLB), Bisnis Daring & Pemasaran, Kuliner/Tata Boga, dan Tata Busana.",
                },
                {
                  q: "Apakah ada program beasiswa di sekolah ini?",
                  a: "Ya. Tersedia program beasiswa KIP (Kartu Indonesia Pintar), beasiswa prestasi akademik, dan bantuan sosial bagi siswa yang memenuhi kriteria.",
                },
                {
                  q: "Bagaimana prosedur PKL/Magang untuk siswa?",
                  a: "PKL dilaksanakan pada semester tertentu sesuai program keahlian. Sekolah bekerja sama dengan 50+ mitra industri nasional dan internasional untuk penempatan siswa.",
                },
              ].map(({ q, a }, i) => (
                <div key={i} className={`p-6 md:p-8 ${i >= 2 ? (isDark ? "border-t border-white/8" : "border-t border-slate-200") : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isDark ? "bg-amber-500/15" : "bg-amber-100"
                    }`}>
                      <span className="text-[10px] font-black text-amber-500">Q</span>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold leading-snug mb-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}>{q}</p>
                      <p className={`text-xs leading-relaxed ${isDark ? "text-slate-500" : "text-slate-500"}`}>{a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
