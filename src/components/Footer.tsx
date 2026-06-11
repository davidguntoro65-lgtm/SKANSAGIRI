import { Landmark, ArrowUp, Mail, Phone, MapPin, Instagram, Youtube, Globe, Award, ShieldCheck } from "lucide-react";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-slate-950 border-t border-white/5 relative z-10" id="footer-section">
      {/* Visual top highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />

      {/* Main 4-column Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24" id="footer-layout-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Column 1 (lg:col-span-4): BRAND PROFILE */}
          <div className="lg:col-span-4 text-left flex flex-col justify-between" id="footer-col-profile">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center">
                  <Landmark className="w-5.5 h-5.5 text-slate-950 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-white font-serif tracking-widest text-base font-bold uppercase">
                    SMKN 1 WONOGIRI
                  </h3>
                  <span className="text-[9px] text-amber-500 tracking-widest font-mono font-medium uppercase block">
                    Center of Excellence
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-sans tracking-wide leading-relaxed mb-6">
                Institusi pendidikan vokasi elite yang berkomitmen mencetak tenaga profesional mandiri, berkarakter luhur, dan siap bersaing dalam era pasar industri global modern.
              </p>
            </div>

            {/* Accreditation Badge */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-white/5 w-fit">
              <Award className="w-5 h-5 text-amber-500" />
              <div className="text-left">
                <span className="text-white text-xs font-sans font-bold block">
                  Terakreditasi Kategori A
                </span>
                <span className="text-[9px] text-emerald-400 font-mono block">
                  Unggul - BAN Sekolah/Madrasah
                </span>
              </div>
            </div>
          </div>

          {/* Column 2 (lg:col-span-3): JURUSAN SPEKTRUM */}
          <div className="lg:col-span-3 text-left" id="footer-col-programs">
            <h4 className="text-white text-xs font-mono font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Spektrum Keahlian
            </h4>
            
            <ul className="space-y-3.5 text-xs font-sans font-light">
              <li>
                <a href="#kompetensi" className="text-slate-400 hover:text-white duration-300 block">
                  Akuntansi & Keuangan Lembaga (AKL)
                </a>
              </li>
              <li>
                <a href="#kompetensi" className="text-slate-400 hover:text-white duration-300 block">
                  Manaj. Perkantoran Layanan Bisnis (MPLB)
                </a>
              </li>
              <li>
                <a href="#kompetensi" className="text-slate-400 hover:text-white duration-300 block">
                  Bisnis Digital & Pemasaran
                </a>
              </li>
              <li>
                <a href="#kompetensi" className="text-slate-400 hover:text-white duration-300 block">
                  Seni Kuliner & Gastronomi
                </a>
              </li>
              <li>
                <a href="#kompetensi" className="text-slate-400 hover:text-white duration-300 block">
                  Desain Mode & Tata Busana
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 (lg:col-span-2): NAVIGASI PORTAL */}
          <div className="lg:col-span-2 text-left" id="footer-col-nav">
            <h4 className="text-white text-xs font-mono font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Tautan Cepat
            </h4>
            
            <ul className="space-y-3.5 text-xs font-sans font-light">
              <li>
                <a href="#about" className="text-slate-400 hover:text-white duration-300 block">
                  Profil Sekolah
                </a>
              </li>
              <li>
                <a href="#kemitraan" className="text-slate-400 hover:text-white duration-300 block">
                  Kemitraan Industri
                </a>
              </li>
              <li>
                <a href="#gallery" className="text-slate-400 hover:text-white duration-300 block">
                  Galeri Kampus
                </a>
              </li>
              <li>
                <a href="#news" className="text-slate-400 hover:text-white duration-300 block">
                  Warta & Agenda
                </a>
              </li>
              <li>
                <a href="#ppdb-cta" className="text-slate-400 hover:text-white duration-300 block">
                  Admisi PPDB Jateng
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 (lg:col-span-3): CONTACT & SOCMED */}
          <div className="lg:col-span-3 text-left" id="footer-col-contact">
            <h4 className="text-white text-xs font-mono font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Kontak Utama
            </h4>
            
            <div className="space-y-4 text-xs font-sans text-slate-400 leading-relaxed font-light mb-6">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <a 
                  href="https://maps.google.com/?q=SMKN+1+Wonogiri" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 duration-300"
                >
                  Jl. Jenderal Gatot Subroto No. 34, Wonogiri, Jawa Tengah, Indonesia 57612
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="hover:text-amber-400 duration-300">+62 (273) 321045</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <a href="mailto:info@smkn1wonogiri.sch.id" className="hover:text-amber-400 duration-300">
                  info@smkn1wonogiri.sch.id
                </a>
              </div>
            </div>

            {/* Social Media Links with Magnetic Accent shapes */}
            <div className="flex items-center gap-3" id="socmed-deck">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-400/30 transition-all duration-300"
                aria-label="Instagram Link"
                id="btn-instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>

              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-400/30 transition-all duration-300"
                aria-label="Youtube Link"
                id="btn-youtube"
              >
                <Youtube className="w-4 h-4" />
              </a>

              <a 
                href="https://smkn1wonogiri.sch.id" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-400/30 transition-all duration-300"
                aria-label="Official Website Link"
                id="btn-global-web"
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Footer Base bar (Accords, copyrights, page controller) */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4" id="footer-bottom-deck">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest text-center sm:text-left">
            © 2026 SMKN 1 Wonogiri. All Rights Reserved. Crafted for National Prestige.
          </p>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 text-slate-500 hover:text-amber-400 text-[10px] font-mono uppercase tracking-widest transition-colors group"
            aria-label="Kembalikan Ke Atas"
            id="btn-scroll-top"
          >
            <span>Kembali Ke Atas</span>
            <div className="w-6 h-6 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
              <ArrowUp className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

      </div>
    </footer>
  );
}
