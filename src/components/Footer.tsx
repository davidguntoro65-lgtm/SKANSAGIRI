import { Landmark, ArrowUp, Mail, Phone, MapPin, Instagram, Youtube, Globe, Award } from "lucide-react";
import { useBranding } from "../hooks/useBranding";

export default function Footer({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const isDark = theme === "dark";
  const { getLogo } = useBranding();
  const logoUrl = getLogo(theme);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer
      className={`border-t relative z-10 transition-colors duration-500 ${
        isDark
          ? "bg-slate-950 border-white/5"
          : "bg-slate-100 border-slate-200"
      }`}
      id="footer-section"
    >
      <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent to-transparent ${
        isDark ? "via-amber-500/10" : "via-amber-500/20"
      }`} />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24" id="footer-layout-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-16">

          {/* Brand */}
          <div className="lg:col-span-4 text-left flex flex-col justify-between" id="footer-col-profile">
            <div>
              <div className="flex items-center gap-3 mb-6">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="SMKN 1 Wonogiri"
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center">
                      <Landmark className="w-5.5 h-5.5 text-slate-950 stroke-[2]" />
                    </div>
                    <div>
                      <h3 className={`font-serif tracking-widest text-base font-bold uppercase ${isDark ? "text-white" : "text-slate-900"}`}>
                        SMKN 1 WONOGIRI
                      </h3>
                      <span className="text-[9px] text-amber-500 tracking-widest font-mono font-medium uppercase block">
                        Center of Excellence
                      </span>
                    </div>
                  </>
                )}
              </div>

              <p className={`text-xs font-sans tracking-wide leading-relaxed mb-6 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                Institusi pendidikan vokasi elite yang berkomitmen mencetak tenaga profesional mandiri, berkarakter luhur, dan siap bersaing dalam era pasar industri global modern.
              </p>
            </div>

            <div className={`flex items-center gap-3 p-3.5 rounded-xl border w-fit ${
              isDark
                ? "bg-slate-900 border-white/5"
                : "bg-white border-slate-200 shadow-sm"
            }`}>
              <Award className="w-5 h-5 text-amber-500" />
              <div className="text-left">
                <span className={`text-xs font-sans font-bold block ${isDark ? "text-white" : "text-slate-900"}`}>
                  Terakreditasi Kategori A
                </span>
                <span className="text-[9px] text-emerald-500 font-mono block">
                  Unggul - BAN Sekolah/Madrasah
                </span>
              </div>
            </div>
          </div>

          {/* Spektrum Keahlian */}
          <div className="lg:col-span-3 text-left" id="footer-col-programs">
            <h4 className={`text-xs font-mono font-bold tracking-widest uppercase mb-6 flex items-center gap-2 ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Spektrum Keahlian
            </h4>
            <ul className="space-y-3.5 text-xs font-sans font-light">
              {["Akuntansi & Keuangan Lembaga (AKL)", "Manaj. Perkantoran Layanan Bisnis (MPLB)", "Bisnis Digital & Pemasaran", "Seni Kuliner & Gastronomi", "Desain Mode & Tata Busana"].map((prog) => (
                <li key={prog}>
                  <a href="#kompetensi" className={`block duration-300 ${
                    isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                  }`}>
                    {prog}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Tautan Cepat */}
          <div className="lg:col-span-2 text-left" id="footer-col-nav">
            <h4 className={`text-xs font-mono font-bold tracking-widest uppercase mb-6 flex items-center gap-2 ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Tautan Cepat
            </h4>
            <ul className="space-y-3.5 text-xs font-sans font-light">
              {[
                { label: "Profil Sekolah", href: "#about" },
                { label: "Kemitraan Industri", href: "#kemitraan" },
                { label: "Galeri Kampus", href: "#gallery" },
                { label: "Warta & Agenda", href: "#news" },
                { label: "Admisi PPDB Jateng", href: "#ppdb-cta" }
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={`block duration-300 ${
                    isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                  }`}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak */}
          <div className="lg:col-span-3 text-left" id="footer-col-contact">
            <h4 className={`text-xs font-mono font-bold tracking-widest uppercase mb-6 flex items-center gap-2 ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Kontak Utama
            </h4>

            <div className={`space-y-4 text-xs font-sans leading-relaxed font-light mb-6 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <a
                  href="https://maps.google.com/?q=SMKN+1+Wonogiri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-500 duration-300"
                >
                  Jl. Jenderal Gatot Subroto No. 34, Wonogiri, Jawa Tengah, Indonesia 57612
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <span>+62 (273) 321045</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <a href="mailto:info@smkn1wonogiri.sch.id" className="hover:text-amber-500 duration-300">
                  info@smkn1wonogiri.sch.id
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3" id="socmed-deck">
              {[
                { href: "https://instagram.com", icon: Instagram, label: "Instagram", id: "btn-instagram" },
                { href: "https://youtube.com", icon: Youtube, label: "Youtube", id: "btn-youtube" },
                { href: "https://smkn1wonogiri.sch.id", icon: Globe, label: "Website", id: "btn-global-web" }
              ].map(({ href, icon: Icon, label, id }) => (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-300 hover:text-amber-500 hover:border-amber-400/30 ${
                    isDark
                      ? "bg-slate-900 border-white/5 text-slate-400"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                  aria-label={label}
                  id={id}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`mt-16 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDark ? "border-white/5" : "border-slate-200"
        }`} id="footer-bottom-deck">
          <p className={`text-[10px] font-mono uppercase tracking-widest text-center sm:text-left ${
            isDark ? "text-slate-500" : "text-slate-400"
          }`}>
            © 2026 SMKN 1 Wonogiri. All Rights Reserved. Crafted for National Prestige.
          </p>

          <button
            onClick={scrollToTop}
            className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest transition-colors group hover:text-amber-500 ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
            aria-label="Kembali ke atas"
            id="btn-scroll-top"
          >
            <span>Kembali Ke Atas</span>
            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors group-hover:border-amber-400/40 ${
              isDark ? "bg-slate-900 border-white/5 group-hover:bg-slate-800" : "bg-white border-slate-200 group-hover:bg-slate-50"
            }`}>
              <ArrowUp className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>
    </footer>
  );
}
