import { motion } from "motion/react";
import { navigate } from "../utils/navigation";
import {
  ArrowLeft, ChevronRight, MapPin, Phone, Mail, MessageSquare,
  ExternalLink, Building2, Shield, Megaphone
} from "lucide-react";

interface AduanPublikProps {
  theme: "light" | "dark";
}

const ADUAN_CHANNELS = [
  {
    id: "lapor",
    icon: Megaphone,
    color: "red",
    badge: "SP4N-LAPOR!",
    badgeSub: "Layanan Aspirasi & Pengaduan",
    title: "Sampaikan Aduan di LAPOR!",
    description:
      "Punya aspirasi, permintaan informasi, atau pengaduan mengenai layanan pendidikan kami? Sampaikan secara aman dan rahasia melalui SP4N-LAPOR!, sistem pengaduan nasional terintegrasi yang dipantau langsung oleh Kepresidenan.",
    href: "https://www.lapor.go.id/",
    btnLabel: "Sampaikan Aduan di LAPOR!",
    btnColor: "bg-red-600 hover:bg-red-700 text-white",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600",
    borderColor: "border-red-200 dark:border-red-800/40",
  },
  {
    id: "wbs",
    icon: Shield,
    color: "blue",
    badge: "WBS Wonogiri",
    badgeSub: "Whistleblowing System Daerah",
    title: "Laporkan Pelanggaran di WBS",
    description:
      "Whistleblowing System (WBS) Kabupaten Wonogiri memfasilitasi pelaporan dugaan pelanggaran hukum, korupsi, kolusi, nepotisme, dan penyimpangan prosedur kerja secara rahasia dan terlindungi penuh.",
    href: "https://wonogirikab.go.id/wbs/",
    btnLabel: "Laporkan Pelanggaran di WBS",
    btnColor: "bg-blue-600 hover:bg-blue-700 text-white",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600",
    borderColor: "border-blue-200 dark:border-blue-800/40",
  },
  {
    id: "dinas",
    icon: MessageSquare,
    color: "emerald",
    badge: "SALURAN DINAS P dan K",
    badgeSub: "Whistleblower, aduan dan kritik Dinas P dan K Wonogiri",
    title: "Layanan Aduan Dinas P dan K Wonogiri",
    description:
      'Butuh koordinasi administratif, pelaporan cepat, atau bantuan langsung dari Dinas Pendidikan dan Kebudayaan Kabupaten Wonogiri? Hubungi WhatsApp resmi "Halo Kakak" untuk mendapatkan tanggapan terpadu yang cepat dan responsif.',
    href: "https://dinaspdank.wonogirikab.go.id/halokakak",
    btnLabel: "Layanan Aduan Dinas P dan K Wonogiri",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-200 dark:border-emerald-800/40",
  },
];

const IDENTITY_INFO = [
  {
    icon: Building2,
    label: "Nama Satuan Pendidikan",
    value: "SMK NEGERI 1 WONOGIRI",
  },
  {
    icon: MapPin,
    label: "Alamat",
    value: "Jalan Arjuna VI, Wonokarto, Wonogiri, Jawa Tengah — Kode Pos 57612",
  },
  {
    icon: Phone,
    label: "No. Telp / Fax",
    value: "0273 321322",
    href: "tel:+62273321322",
  },
  {
    icon: MessageSquare,
    label: "WhatsApp",
    value: "Liliek Arief S — 081329650011",
    href: "https://wa.me/6281329650011",
  },
  {
    icon: Mail,
    label: "Alamat Email",
    value: "office@smkn1wonogiri.sch.id",
    href: "mailto:office@smkn1wonogiri.sch.id",
  },
];

export default function AduanPublik({ theme }: AduanPublikProps) {
  const isDark = theme === "dark";

  return (
    <section
      className={`min-h-screen pt-28 pb-20 relative z-10 ${isDark ? "text-white" : "text-slate-900"}`}
      id="aduan-publik-page"
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12">

        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          onClick={() => navigate("/")}
          className={`flex items-center gap-2 text-xs uppercase tracking-widest font-bold mb-10 transition-colors group cursor-pointer bg-transparent border-0 outline-none ${
            isDark ? "text-slate-400 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"
          }`}
          id="btn-back-aduan"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          Beranda
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className={isDark ? "text-amber-400" : "text-amber-600"}>Aduan Publik</span>
        </motion.button>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-center mb-12"
        >
          <span className={`text-[10px] font-mono tracking-[0.3em] uppercase font-bold mb-3 block ${
            isDark ? "text-amber-400" : "text-amber-600"
          }`}>
            Keterbukaan &amp; Akuntabilitas
          </span>
          <h1 className={`font-serif text-3xl md:text-4xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>
            Pelayanan &amp; Pengaduan Publik
          </h1>
          <p className={`text-sm leading-relaxed max-w-2xl mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Sebagai instansi pendidikan negeri, kami berkomitmen mewujudkan transparansi informasi pelayanan
            dan menampung aspirasi masyarakat secara resmi.
          </p>
          <div className="mt-6 h-[2px] w-16 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto rounded-full" />
        </motion.div>

        {/* Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className={`rounded-2xl border p-6 md:p-8 mb-10 ${
            isDark
              ? "bg-slate-900/70 border-white/10"
              : "bg-white/80 border-slate-200 shadow-md shadow-slate-100"
          }`}
          id="identitas-layanan"
        >
          <h2 className={`text-[10px] font-mono tracking-[0.25em] uppercase font-bold mb-5 ${
            isDark ? "text-amber-400" : "text-amber-600"
          }`}>
            Identitas Layanan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {IDENTITY_INFO.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isDark ? "bg-amber-500/10" : "bg-amber-50"
                  }`}>
                    <Icon className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className={`text-[10px] font-mono uppercase tracking-widest mb-0.5 ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}>{item.label}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className={`text-sm font-semibold transition-colors ${
                          isDark ? "text-slate-200 hover:text-amber-400" : "text-slate-800 hover:text-amber-600"
                        }`}
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                        {item.value}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Saluran Aduan Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mb-6"
        >
          <span className={`text-[10px] font-mono tracking-[0.25em] uppercase font-bold block mb-1 ${
            isDark ? "text-amber-400" : "text-amber-600"
          }`}>
            Saluran Informasi &amp; Pengaduan Publik
          </span>
          <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Akses portal resmi kementerian dan daerah untuk pemantauan standar layanan serta penyampaian aspirasi masyarakat.
          </p>
        </motion.div>

        {/* Three Channel Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {ADUAN_CHANNELS.map((ch, i) => {
            const Icon = ch.icon;
            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.25 + i * 0.08 }}
                className={`flex flex-col rounded-2xl border p-6 ${ch.borderColor} ${
                  isDark ? "bg-slate-900/60" : "bg-white/90 shadow-sm"
                }`}
                id={`card-aduan-${ch.id}`}
              >
                {/* Icon + badge */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ch.iconBg}`}>
                    <Icon className={`w-5 h-5 ${ch.iconColor}`} />
                  </div>
                  <div>
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-widest block ${ch.iconColor}`}>
                      {ch.badge}
                    </span>
                    <span className={`text-[9px] font-mono uppercase tracking-wide ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}>
                      {ch.badgeSub}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className={`text-xs leading-relaxed flex-1 mb-5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  {ch.description}
                </p>

                {/* CTA */}
                <a
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-200 hover:scale-[1.02] active:scale-95 ${ch.btnColor}`}
                  id={`btn-aduan-${ch.id}`}
                >
                  {ch.btnLabel}
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom note */}
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
