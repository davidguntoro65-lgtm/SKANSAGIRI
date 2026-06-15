var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_vite = require("vite");

// src/data.ts
var INDUSTRI_PARTNERS = [
  { id: "p-1", name: "Astra International", type: "Digital & Automotive", color: "blue" },
  { id: "p-2", name: "Bank Mandiri Corp", type: "Accounting & Finance", color: "indigo" },
  { id: "p-3", name: "Shopee Southeast Asia", type: "Digital Commerce", color: "orange" },
  { id: "p-4", name: "Marriott International", type: "Modern Gastronomy", color: "amber" },
  { id: "p-5", name: "Uniqlo Asia Pac", type: "Apparel Design", color: "violet" },
  { id: "p-6", name: "Sun Premium Hotels", type: "Culinary & Guest", color: "teal" },
  { id: "p-7", name: "Toyota Astra Motor", type: "Digital Solutions", color: "emerald" },
  { id: "p-8", name: "Sritex Tex Tech", type: "Apparel Production", color: "rose" },
  { id: "p-9", name: "Akurat Indonesia", type: "Computerized Account", color: "cyan" }
];
var COMPETENCY_DATA = [
  {
    code: "AKL",
    name: "Akuntansi & Keuangan Lembaga",
    englishName: "Accounting & Institutional Finance",
    description: "Program elite yang berorientasi pada ketelitian finansial tingkat tinggi. Mempersiapkan analis keuangan masa depan kompeten dalam teknologi perpajakan digital, audit finansial korporat, dan akuntansi modern berbasis Cloud.",
    themeClass: "from-[#0d1e3d] to-[#040e21] border-[#1e2f54]/60 bg-gradient-to-br",
    badgeColor: "bg-[#1e2f54] text-[#8ea7e9] border-[#2e4375]",
    stats: [
      { label: "Lab Komputer Finansial", value: "3 Unit" },
      { label: "Sertifikasi Industri", value: "Akurat Premier" },
      { label: "Mitra Perbankan Tetap", value: "7 Bank" }
    ],
    careers: ["Corporate Accountant", "Tax Consultant Specialist", "Financial Analyst Apprentice", "Bank Administrator"],
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=700&q=80",
    curriculum: ["Sistem Akuntansi Pajak", "Auditing Korporat", "Spreadsheet Advanced Professional", "Digital Ledger Technology"]
  },
  {
    code: "MPLB",
    name: "Manajemen Perkantoran & Layanan Bisnis",
    englishName: "Office Management & Business Services",
    description: "Pusat inkubasi sekretaris profesional, asisten eksekutif, serta manajer layanan perkantoran modern. Menghasilkan lulusan terampil dalam keprotokolan bisnis Internasional, administrasi digital, dan human relations.",
    themeClass: "from-[#0c2447] to-[#031024] border-[#173e73]/60 bg-gradient-to-br",
    badgeColor: "bg-[#173e73] text-[#7eb3fa] border-[#205295]",
    stats: [
      { label: "Office Simulator", value: "Mewah & Komplet" },
      { label: "Kurikulum Khusus", value: "Standar Internasional" },
      { label: "Mitra Kemitraan", value: "BUMN & Kemenkeu" }
    ],
    careers: ["Executive Administrative Assistant", "Corporate Protocol Specialist", "Human Resource Administrator", "Front Office Leader"],
    image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=700&q=80",
    curriculum: ["Manajemen Arsip Digital", "Komunikasi Publik & Keprotokolan", "Aplikasi Otomatisasi Kantor", "English for Business"]
  },
  {
    code: "Pemasaran",
    name: "Bisnis Daring dan Pemasaran",
    englishName: "Digital Business & Marketing",
    description: "Pelopor akselerasi ekonomi digital di Wonogiri. Fokus pada riset pasar modern, manajemen konten kreatif, search engine optimization (SEO), digital advertising, serta tata kelola platform online store nasional.",
    themeClass: "from-[#112240] to-[#051121] border-[#1b3a60]/60 bg-gradient-to-br",
    badgeColor: "bg-[#1b3a60] text-[#6cbbe8] border-[#254d7e]",
    stats: [
      { label: "Digital Studio Center", value: "4K Ready" },
      { label: "Omset Unit Bisnis", value: "120M+/Thn" },
      { label: "Sertifikat Google", value: "Ads & Commerce" }
    ],
    careers: ["Social Media Specialist", "E-commerce Manager", "Digital Performance Marketer", "Creative Entrepreneur"],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=700&q=80",
    curriculum: ["Strategi SEO & SEM", "Social Media Advertising", "E-commerce Operations", "Videografi & Content Creation"]
  },
  {
    code: "Kuliner",
    name: "Kuliner",
    englishName: "Culinary Arts & Gastronomy",
    description: "Membawa warisan kuliner lokal ke kancah kuliner global. Mempelajari resep warisan, haute cuisine kontinental, seni penyajian makanan premium, layanan perhotelan bintang lima, dan tata kelola food beverage komersial.",
    themeClass: "from-[#2f2010] to-[#120a03] border-[#7d5a2d]/40 bg-gradient-to-br",
    badgeColor: "bg-[#4e361b] text-[#fcd34d] border-[#704f26]",
    stats: [
      { label: "Kitchen Suite Standard", value: "Bintang 5" },
      { label: "Restoran Praktik", value: "The Wonogiri Suite" },
      { label: "Sertifikasi BNSP", value: "Garuda Emas" }
    ],
    careers: ["Chef de Partie", "Professional Pastry Artist", "Restaurant Operations Manager", "Culinary Business Owner"],
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=700&q=80",
    curriculum: ["Seni Pastry & Bakery", "Continental Cooking Methods", "Garnish & Food Plating", "Sanitasi & Keamanan Pangan"]
  },
  {
    code: "Busana",
    name: "Desain Mode & Tata Busana",
    englishName: "Fashion Design & Apparel Construction",
    description: "Ruang kreasi bagi para desainer mode profesional masa depan. Mempelajari teknik pembuatan pola tingkat tinggi (drapping), rancang busana haute couture, ilustrasi mode digital, manajemen butik independen, dan pameran catwalk.",
    themeClass: "from-[#2c1328] to-[#140512] border-[#703063]/40 bg-gradient-to-br",
    badgeColor: "bg-[#4d2044] text-[#f472b6] border-[#6b2c5f]",
    stats: [
      { label: "Fashion Atelier", value: "Industrial" },
      { label: "Eksibisi Tahunan", value: "Wonogiri Runway" },
      { label: "Software Ilustrasi", value: "CAD Marvelous" }
    ],
    careers: ["Fashion Designer Executive", "Fashion Illustrator Consultant", "High-End Pattern Maker", "Boutique Owner & Fashion Curator"],
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80",
    curriculum: ["Konstruksi Pola Tingkat Lanjut", "Desain Busana 3D Digital", "Sejarah Mode & Tekstil", "Pemasaran Butik Mewah"]
  }
];
var TIMELINE_ACHIEVEMENTS = [
  {
    year: "2026",
    title: "Akreditasi Unggul & Sertifikasi ISO 9001:2015",
    subtitle: "Peringkat Nasional Berpredikat Sempurna",
    description: "Menerima pengakuan dari Badan Akreditasi Nasional Sekolah sebagai institusi vocasional dengan tata kelola manajemen dan lulusan berkategori Gold Standard di Indonesia.",
    category: "Infrastruktur",
    metric: "98.7 / 100"
  },
  {
    year: "2025",
    title: "Juara Umum LKS Nasional Tingkat Vokasi",
    subtitle: "Dominasi Bidang Fashion Design & Culinary Arts",
    description: "Siswa SMKN 1 Wonogiri menyapu bersih medali emas dalam Lomba Kompetensi Siswa (LKS) Nasional di Jakarta, membuktikan standar kurikulum bersaing dengan sekolah unggulan metropolitan.",
    category: "Prestasi",
    metric: "3 Medali Emas"
  },
  {
    year: "2024",
    title: "Peresmian Wonogiri High-Tech Digital Inkubator",
    subtitle: "Hub Kolaborasi Kemitraan Industri Bersama Astra",
    description: "Mendirikan pusat pelatihan pemasaran digital terpadu bernilai miliaran rupiah untuk memfasilitasi sertifikasi siswa dan meluncurkan produk startup lokal.",
    category: "Infrastruktur",
    metric: "Miliaran Investasi"
  },
  {
    year: "2023",
    title: "MoU Eksklusif International Internship Program",
    subtitle: "Penyaluran Kerja ke Jepang dan Australia",
    description: "Menandatangani kesepahaman dengan konsorsium perhotelan internasional dan agen pekerja mode di Australia untuk pengiriman lulusan berlisensi resmi.",
    category: "Kemitraan",
    metric: "45 Lulusan Pertama"
  },
  {
    year: "2022",
    title: "Penghargaan Sekolah Pusat Keunggulan (Center of Excellence)",
    subtitle: "Ditetapkan Langsung oleh Kemendikbudristek",
    description: "Memperoleh mandat istimewa sebagai sekolah rujukan nasional yang dipercaya membina sekolah vokasi lain di sekitarnya dalam implementasi transformasi digital berbasis kerja.",
    category: "Prestasi",
    metric: "Status COE"
  }
];
var CAMPUS_LIFE_GALLERY = [
  {
    id: "g1",
    title: "Seni Plating Gastronomi Tingkat Tinggi",
    category: "Kuliner",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
    aspect: "landscape",
    caption: "Kelas praktik Kuliner melatih siswa menata hidangan berkelas bintang 5 demi memenuhi estetika gastronomi dunia."
  },
  {
    id: "g2",
    title: "Produksi Busana Eksklusif - Wonogiri Runway",
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1441984969893-c5a710c48ef7?auto=format&fit=crop&w=800&q=80",
    aspect: "portrait",
    caption: "Para siswa Tata Busana di atelier konveksi sedang melakukan fitting model untuk karya tahunan Wonogiri Runway."
  },
  {
    id: "g3",
    title: "Studio Kolaborasi Bisnis & Pemasaran Digital",
    category: "Kelas",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    aspect: "landscape",
    caption: "Berbagi ide promosi global dan manajemen marketplace di dalam lab ruang kreatif modern interaktif."
  },
  {
    id: "g4",
    title: "Penyerahan Sertifikat Kompetensi Akurat",
    category: "Prestasi",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
    aspect: "landscape",
    caption: "Siswa akuntansi yang lulus ujian profesional merayakan sertifikasi industri bergengsi berlabel nasional."
  },
  {
    id: "g5",
    title: "Kunjungan Industri & Magang Kerja Asing",
    category: "Praktik Industri",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
    aspect: "portrait",
    caption: "Uji lapangan keprotokolan dan asisten administrasi bisnis langsung di kantor pusat mitra korporat Jakarta."
  },
  {
    id: "g6",
    title: "Grand Champion Desain Kreatif Nasional",
    category: "Prestasi",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
    aspect: "landscape",
    caption: "Trofi bergengsi Kejuaraan Desain Modis diletakkan di lemari display lobi kehormatan sekolah."
  }
];
var ALUMNI_TESTIMONIALS = [
  {
    name: "Ahmad Farhan, S.Tr.Ak",
    role: "Senior Budgeting Analyst",
    company: "Bank Mandiri Head Office",
    location: "Jakarta, Indonesia",
    gradYear: "2019",
    quote: "SMKN 1 Wonogiri mengajarkan saya kematangan mental dan keahlian riil. Saat kuliah dan mulai bekerja, sertifikasi software Akurat yang saya peroleh semasa SMK langsung membedakan saya dari kandidat universitas top sekalipun.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
  },
  {
    name: "Cynthia Laurentia",
    role: "Creative Fashion Designer & Illustrator",
    company: "Silk & Co Couture",
    location: "Melbourne, Australia",
    gradYear: "2021",
    quote: "Sekolah ini bukan sekadar memberikan ijazah, namun mempersiapkan portfolio desain berskala global. Berkat pameran Busana tahunan sekolah, karya saya dilirik agensi kriya mode luar negeri.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80"
  },
  {
    name: "Rendy Prasetyo",
    role: "Pastry Chef de Partie",
    company: "The Ritz-Carlton Bali Resort",
    location: "Bali, Indonesia",
    gradYear: "2020",
    quote: "Pusat Dapur standar industri di SMK ini adalah pondasi terbaik yang pernah saya rasakan. Pengetahuan sanitasi, teknik memasak continental, dan ketepatan plating menuntut saya sukses profesional di industri kuliner mewah.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
  },
  {
    name: "Viona Paramitha",
    role: "Digital Specialist Lead",
    company: "Shopee Indonesia Headquarters",
    location: "Jakarta, Indonesia",
    gradYear: "2022",
    quote: "Materi pemasaran yang diajarkan sangat visioner. Kami didorong mengelola toko online nyata dengan target omset nyata. Kelekatan dunia bisnis murni inilah rahasia melesatnya kompetensi siswa Wonogiri.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
  }
];
var NEWS_COMPILATION = [
  {
    id: "news-1",
    category: "PRESTASI NASIONAL",
    title: "Siswa SMKN 1 Wonogiri Raih Penghargaan 'The Most Outstanding Vocational Innovator' dari Kemendikbudristek",
    excerpt: "Di ajang penganugerahan bakat nasional, siswa kami berhasil mengalahkan ratusan peserta dari seluruh Indonesia lewat prototipe AI Finansial Asisten untuk industri UMKM kreatif Jateng.",
    date: "10 Juni 22026",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
    author: "Drs. Heri Widyastono",
    authorRole: "Humas & Urusan Industri"
  },
  {
    id: "news-2",
    category: "PENGEMBANGAN KAMPUS",
    title: "Peluncuran 'Symphony Gourmet' Resto: Lab Praktik Komersial Tertinggi Bidang Seni Kuliner Nusantara",
    excerpt: "Merupakan komitmen nyata peningkatan kompetensi riil, sekolah meresmikan restoran berstandar d'hotes mewah yang dapat diakses oleh masyarakat umum dengan kualitas pengolahan bintang lima.",
    date: "02 Juni 22026",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80",
    author: "Retno Palupi, M.Pd",
    authorRole: "Kepala Jurusan Kuliner"
  },
  {
    id: "news-3",
    category: "INTERNASIONALISASI",
    title: "Kelas Internasional Kolaborasi SMKN 1 Wonogiri Bersama Ritsumeikan Academy Jepang Resmi Dibuka",
    excerpt: "Sebanyak 30 siswa terbaik terpilih mengikuti program intensif lintas budaya dan akselerasi keahlian manajemen bisnis ritel modern Jepang dengan beasiswa penuh kelulusan.",
    date: "28 Mei 22026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=400&q=80",
    author: "Wahyudi Susanto, S.Pd",
    authorRole: "Koordinator Hubungan Internasional"
  },
  {
    id: "news-4",
    category: "KARYA MODE",
    title: "Busana Rancangan Siswa SMKN 1 Wonogiri Memukau Panggung Utama Jakarta Fashion Week 2026",
    excerpt: "Mengangkat khasanah tenun tradisional dengan konsep urban ready-to-wear, koleksi bertajuk 'Echo of Wonogiri' mendapat apresiasi luar biasa dan review terbaik kritikus mode nasional.",
    date: "15 Mei 22026",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80",
    author: "Endah Sulistyowati",
    authorRole: "Supervisor Studio Desain Tata Busana"
  }
];

// server.ts
var app = (0, import_express.default)();
var PORT = parseInt(process.env.PORT || "5000", 10);
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var activeSessions = /* @__PURE__ */ new Set();
var loginAttempts = /* @__PURE__ */ new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  if (now < entry.lockUntil) {
    return { allowed: false, secondsLeft: Math.ceil((entry.lockUntil - now) / 1e3) };
  }
  return { allowed: true };
}
function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) {
    entry.lockUntil = now + 6e4;
    entry.count = 0;
  }
  loginAttempts.set(ip, entry);
}
function clearAttempts(ip) {
  loginAttempts.delete(ip);
}
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: "Tidak diotorisasi. Silakan login kembali." });
  }
  next();
}
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
var filePaths = {
  competencies: import_path.default.join(DATA_DIR, "competencies.json"),
  milestones: import_path.default.join(DATA_DIR, "milestones.json"),
  gallery: import_path.default.join(DATA_DIR, "gallery.json"),
  alumni: import_path.default.join(DATA_DIR, "alumni.json"),
  news: import_path.default.join(DATA_DIR, "news.json"),
  partners: import_path.default.join(DATA_DIR, "partners.json"),
  branding: import_path.default.join(DATA_DIR, "branding.json"),
  kepalaSekolah: import_path.default.join(DATA_DIR, "kepala-sekolah.json"),
  manajemenSekolah: import_path.default.join(DATA_DIR, "manajemen-sekolah.json"),
  visiMisi: import_path.default.join(DATA_DIR, "visi-misi.json"),
  socialMedia: import_path.default.join(DATA_DIR, "social-media.json"),
  adminCredentials: import_path.default.join(DATA_DIR, "admin-credentials.json")
};
function initJsonFile(filePath, initialData) {
  if (!import_fs.default.existsSync(filePath)) {
    import_fs.default.writeFileSync(filePath, JSON.stringify(initialData, null, 2), "utf-8");
  } else {
    try {
      const content = import_fs.default.readFileSync(filePath, "utf-8");
      JSON.parse(content);
    } catch (e) {
      console.error(`Invalid JSON in ${filePath}, resetting to default.`);
      import_fs.default.writeFileSync(filePath, JSON.stringify(initialData, null, 2), "utf-8");
    }
  }
}
initJsonFile(filePaths.competencies, COMPETENCY_DATA);
initJsonFile(filePaths.milestones, TIMELINE_ACHIEVEMENTS);
initJsonFile(filePaths.gallery, CAMPUS_LIFE_GALLERY);
initJsonFile(filePaths.alumni, ALUMNI_TESTIMONIALS);
initJsonFile(filePaths.news, NEWS_COMPILATION);
initJsonFile(filePaths.partners, INDUSTRI_PARTNERS);
initJsonFile(filePaths.branding, {
  schoolLogo: null,
  schoolLogoDark: null,
  schoolLogoLight: null,
  schoolFavicon: null,
  schoolAppIcon: null
});
initJsonFile(filePaths.kepalaSekolah, {
  nama: "Drs. Gunawan, M.Pd.",
  nip: "19680324 199403 1 008",
  foto: null,
  sambutan: "Atas nama segenap keluarga besar SMKN 1 Wonogiri, saya menyambut kehadiran Anda di gerbang digital institusi terakreditasi unggul kami. Kami percaya bahwa pendidikan kejuruan mandiri tidak hanya mengajarkan metode teknis semata, namun mencetak kesiapan karakter, kepemimpinan, dan etika moral kelas dunia.\n\nSebagai Center of Excellence Nasional, kami mendesain setiap detail proses belajar mengajar dengan standar internasional paling prima. Kami mendedikasikan seluruh daya upaya guna meluncurkan lulusan yang siap mengambil peranan krusial sebagai inovator bisnis, ahli kriya, serta motor penggerak ekonomi global."
});
initJsonFile(filePaths.manajemenSekolah, [
  { id: "waka-kesiswaan", jabatan: "Waka Kesiswaan", nama: "-", foto: null },
  { id: "waka-kurikulum", jabatan: "Waka Kurikulum", nama: "-", foto: null },
  { id: "waka-sarpras", jabatan: "Waka Sarpras & Ketenagakerjaan", nama: "-", foto: null },
  { id: "waka-humas", jabatan: "Waka Humas", nama: "-", foto: null },
  { id: "kepala-tu", jabatan: "Kepala Tata Usaha", nama: "-", foto: null }
]);
var aboutPath = import_path.default.join(DATA_DIR, "about.json");
initJsonFile(aboutPath, { foto: null, fotoX: 50, fotoY: 50, fotoScale: 100 });
initJsonFile(filePaths.socialMedia, {
  instagram: "https://instagram.com/smkn1wonogiri",
  youtube: "https://youtube.com/@smkn1wonogiri",
  website: "https://smkn1wonogiri.sch.id",
  facebook: "",
  tiktok: "",
  twitter: ""
});
initJsonFile(filePaths.visiMisi, {
  visi: "Terwujudnya SMKN 1 Wonogiri sebagai lembaga pendidikan kejuruan yang unggul, berkarakter, dan berdaya saing global dalam rangka mewujudkan masyarakat yang sejahtera.",
  misi: [
    "Menyelenggarakan pendidikan dan pelatihan kejuruan berkualitas tinggi berbasis kompetensi dan standar industri nasional maupun internasional.",
    "Mengembangkan karakter peserta didik yang beriman, bertaqwa kepada Tuhan Yang Maha Esa, berakhlak mulia, dan berwawasan kebangsaan.",
    "Membangun kemitraan strategis dengan dunia usaha dan dunia industri (DUDI) untuk penguatan kompetensi lulusan.",
    "Menciptakan lingkungan belajar yang inovatif, inspiratif, dan adaptif terhadap perkembangan ilmu pengetahuan dan teknologi.",
    "Menghasilkan lulusan yang kompeten, produktif, mandiri, dan siap memasuki dunia kerja serta berwirausaha di era global."
  ]
});
app.use(import_express.default.json({ limit: "25mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use((req, res, next) => {
  const writeMethods = ["POST", "DELETE", "PUT", "PATCH"];
  if (!writeMethods.includes(req.method)) return next();
  const publicPosts = ["/api/auth/login", "/api/tracer"];
  if (publicPosts.includes(req.path)) return next();
  return requireAuth(req, res, next);
});
function getAdminCredentials() {
  try {
    if (import_fs.default.existsSync(filePaths.adminCredentials)) {
      const saved = JSON.parse(import_fs.default.readFileSync(filePaths.adminCredentials, "utf-8"));
      if (saved.username && saved.password) return saved;
    }
  } catch {
  }
  return {
    username: process.env.ADMIN_USERNAME || "jobenenterprise",
    password: process.env.ADMIN_PASSWORD || "KuraKuraNinja!0!"
  };
}
app.post("/api/auth/login", (req, res) => {
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const { allowed, secondsLeft } = checkRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({ error: `Terlalu banyak percobaan login. Coba lagi dalam ${secondsLeft} detik.` });
  }
  const { username, password } = req.body;
  const creds = getAdminCredentials();
  if (username === creds.username && password === creds.password) {
    clearAttempts(ip);
    const token = import_crypto.default.randomBytes(48).toString("hex");
    activeSessions.add(token);
    return res.json({ token });
  }
  recordFailedAttempt(ip);
  return res.status(401).json({ error: "Kombinasi User Name atau Sandi salah. Periksa kembali!" });
});
app.post("/api/auth/change-password", (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Password lama dan password baru wajib diisi." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password baru minimal 8 karakter." });
  }
  const creds = getAdminCredentials();
  if (currentPassword !== creds.password) {
    return res.status(401).json({ error: "Password saat ini salah." });
  }
  const updated = {
    username: (newUsername || "").trim() || creds.username,
    password: newPassword
  };
  try {
    import_fs.default.writeFileSync(filePaths.adminCredentials, JSON.stringify(updated, null, 2), "utf-8");
    activeSessions.clear();
    return res.json({ success: true, username: updated.username });
  } catch (err) {
    return res.status(500).json({ error: "Gagal menyimpan perubahan: " + err.message });
  }
});
app.post("/api/auth/logout", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (token) activeSessions.delete(token);
  return res.json({ success: true });
});
app.get("/api/auth/verify", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (token && activeSessions.has(token)) return res.json({ valid: true });
  return res.status(401).json({ valid: false });
});
app.get("/api/competencies", (req, res) => {
  try {
    const data = import_fs.default.readFileSync(filePaths.competencies, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read competencies: " + error.message });
  }
});
app.post("/api/competencies", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of competencies" });
    }
    import_fs.default.writeFileSync(filePaths.competencies, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to save competencies: " + error.message });
  }
});
app.get("/api/milestones", (req, res) => {
  try {
    const data = import_fs.default.readFileSync(filePaths.milestones, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read milestones: " + error.message });
  }
});
app.post("/api/milestones", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of milestones" });
    }
    import_fs.default.writeFileSync(filePaths.milestones, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to save milestones: " + error.message });
  }
});
app.get("/api/gallery", (req, res) => {
  try {
    const data = import_fs.default.readFileSync(filePaths.gallery, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read gallery: " + error.message });
  }
});
app.post("/api/gallery", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of gallery items" });
    }
    import_fs.default.writeFileSync(filePaths.gallery, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to save gallery: " + error.message });
  }
});
app.get("/api/alumni", (req, res) => {
  try {
    const data = import_fs.default.readFileSync(filePaths.alumni, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read alumni: " + error.message });
  }
});
app.post("/api/alumni", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of alumni" });
    }
    import_fs.default.writeFileSync(filePaths.alumni, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to save alumni: " + error.message });
  }
});
app.get("/api/news", (req, res) => {
  try {
    const data = import_fs.default.readFileSync(filePaths.news, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read news: " + error.message });
  }
});
app.post("/api/news", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of news items" });
    }
    import_fs.default.writeFileSync(filePaths.news, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to save news: " + error.message });
  }
});
app.get("/api/partners", (req, res) => {
  try {
    const data = import_fs.default.readFileSync(filePaths.partners, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read partners: " + error.message });
  }
});
app.post("/api/partners", (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array of partners" });
    }
    import_fs.default.writeFileSync(filePaths.partners, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true, count: data.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to save partners: " + error.message });
  }
});
app.get("/api/kepala-sekolah", (req, res) => {
  try {
    res.json(JSON.parse(import_fs.default.readFileSync(filePaths.kepalaSekolah, "utf-8")));
  } catch (e) {
    res.status(500).json({ error: "Failed to read kepala sekolah: " + e.message });
  }
});
app.post("/api/kepala-sekolah", (req, res) => {
  try {
    import_fs.default.writeFileSync(filePaths.kepalaSekolah, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save kepala sekolah: " + e.message });
  }
});
app.get("/api/manajemen-sekolah", (req, res) => {
  try {
    res.json(JSON.parse(import_fs.default.readFileSync(filePaths.manajemenSekolah, "utf-8")));
  } catch (e) {
    res.status(500).json({ error: "Failed to read manajemen sekolah: " + e.message });
  }
});
app.post("/api/manajemen-sekolah", (req, res) => {
  try {
    import_fs.default.writeFileSync(filePaths.manajemenSekolah, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save manajemen sekolah: " + e.message });
  }
});
app.get("/api/visi-misi", (req, res) => {
  try {
    res.json(JSON.parse(import_fs.default.readFileSync(filePaths.visiMisi, "utf-8")));
  } catch (e) {
    res.status(500).json({ error: "Failed to read visi misi: " + e.message });
  }
});
app.post("/api/visi-misi", (req, res) => {
  try {
    import_fs.default.writeFileSync(filePaths.visiMisi, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save visi misi: " + e.message });
  }
});
app.get("/api/social-media", (req, res) => {
  try {
    res.json(JSON.parse(import_fs.default.readFileSync(filePaths.socialMedia, "utf-8")));
  } catch (e) {
    res.status(500).json({ error: "Failed to read social media: " + e.message });
  }
});
app.post("/api/social-media", (req, res) => {
  try {
    import_fs.default.writeFileSync(filePaths.socialMedia, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save social media: " + e.message });
  }
});
app.get("/api/about", (req, res) => {
  try {
    res.json(JSON.parse(import_fs.default.readFileSync(aboutPath, "utf-8")));
  } catch (e) {
    res.status(500).json({ error: "Failed to read about: " + e.message });
  }
});
app.post("/api/about", (req, res) => {
  try {
    import_fs.default.writeFileSync(aboutPath, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save about: " + e.message });
  }
});
app.get("/api/branding", (req, res) => {
  try {
    res.json(JSON.parse(import_fs.default.readFileSync(filePaths.branding, "utf-8")));
  } catch (e) {
    res.status(500).json({ error: "Failed to read branding: " + e.message });
  }
});
app.post("/api/branding", (req, res) => {
  try {
    const data = req.body;
    import_fs.default.writeFileSync(filePaths.branding, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save branding: " + e.message });
  }
});
var tracerPath = import_path.default.join(DATA_DIR, "tracer.json");
initJsonFile(tracerPath, []);
app.get("/api/tracer", (req, res) => {
  try {
    res.json(JSON.parse(import_fs.default.readFileSync(tracerPath, "utf-8")));
  } catch (e) {
    res.status(500).json({ error: "Failed to read tracer data: " + e.message });
  }
});
app.post("/api/tracer", (req, res) => {
  try {
    const existing = JSON.parse(import_fs.default.readFileSync(tracerPath, "utf-8"));
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      ...req.body,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    existing.push(entry);
    import_fs.default.writeFileSync(tracerPath, JSON.stringify(existing, null, 2), "utf-8");
    res.json(entry);
  } catch (e) {
    res.status(500).json({ error: "Failed to save tracer entry: " + e.message });
  }
});
app.delete("/api/tracer/:id", (req, res) => {
  try {
    const existing = JSON.parse(import_fs.default.readFileSync(tracerPath, "utf-8"));
    const updated = existing.filter((e) => e.id !== req.params.id);
    if (updated.length === existing.length) {
      return res.status(404).json({ error: "Entry not found" });
    }
    import_fs.default.writeFileSync(tracerPath, JSON.stringify(updated, null, 2), "utf-8");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete tracer entry: " + e.message });
  }
});
app.post("/api/reset", (req, res) => {
  try {
    import_fs.default.writeFileSync(filePaths.competencies, JSON.stringify(COMPETENCY_DATA, null, 2), "utf-8");
    import_fs.default.writeFileSync(filePaths.milestones, JSON.stringify(TIMELINE_ACHIEVEMENTS, null, 2), "utf-8");
    import_fs.default.writeFileSync(filePaths.gallery, JSON.stringify(CAMPUS_LIFE_GALLERY, null, 2), "utf-8");
    import_fs.default.writeFileSync(filePaths.alumni, JSON.stringify(ALUMNI_TESTIMONIALS, null, 2), "utf-8");
    import_fs.default.writeFileSync(filePaths.news, JSON.stringify(NEWS_COMPILATION, null, 2), "utf-8");
    import_fs.default.writeFileSync(filePaths.partners, JSON.stringify(INDUSTRI_PARTNERS, null, 2), "utf-8");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset data: " + error.message });
  }
});
var CONTACT_FILE = import_path.default.join(DATA_DIR, "contact-messages.json");
function readContactMessages() {
  try {
    if (!import_fs.default.existsSync(CONTACT_FILE)) return [];
    return JSON.parse(import_fs.default.readFileSync(CONTACT_FILE, "utf-8"));
  } catch {
    return [];
  }
}
app.post("/api/contact", (req, res) => {
  try {
    const { nama, email, noHp, keperluan, pesan, waktu } = req.body;
    if (!nama || !email || !keperluan || !pesan) {
      return res.status(400).json({ error: "Field wajib tidak lengkap." });
    }
    if (pesan.trim().length < 20) {
      return res.status(400).json({ error: "Pesan minimal 20 karakter." });
    }
    const messages = readContactMessages();
    const newMsg = {
      id: import_crypto.default.randomUUID(),
      nama: String(nama).trim(),
      email: String(email).trim().toLowerCase(),
      noHp: String(noHp || "").trim(),
      keperluan: String(keperluan).trim(),
      pesan: String(pesan).trim(),
      waktu: waktu || (/* @__PURE__ */ new Date()).toISOString(),
      dibaca: false
    };
    messages.unshift(newMsg);
    import_fs.default.writeFileSync(CONTACT_FILE, JSON.stringify(messages, null, 2), "utf-8");
    res.json({ success: true, id: newMsg.id });
  } catch (error) {
    res.status(500).json({ error: "Gagal menyimpan pesan." });
  }
});
app.get("/api/contact", requireAuth, (req, res) => {
  res.json(readContactMessages());
});
app.patch("/api/contact/:id/baca", requireAuth, (req, res) => {
  try {
    const messages = readContactMessages();
    const idx = messages.findIndex((m) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Pesan tidak ditemukan." });
    messages[idx].dibaca = true;
    import_fs.default.writeFileSync(CONTACT_FILE, JSON.stringify(messages, null, 2), "utf-8");
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Gagal memperbarui status pesan." });
  }
});
app.delete("/api/contact/:id", requireAuth, (req, res) => {
  try {
    const messages = readContactMessages();
    const filtered = messages.filter((m) => m.id !== req.params.id);
    import_fs.default.writeFileSync(CONTACT_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Gagal menghapus pesan." });
  }
});
var SUARA_FILE = import_path.default.join(DATA_DIR, "suara-skansagiri.json");
initJsonFile(SUARA_FILE, []);
function readSuara() {
  try {
    return JSON.parse(import_fs.default.readFileSync(SUARA_FILE, "utf-8"));
  } catch {
    return [];
  }
}
function writeSuara(data) {
  import_fs.default.writeFileSync(SUARA_FILE, JSON.stringify(data, null, 2), "utf-8");
}
function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 80);
}
var KOMENTAR_FILE = import_path.default.join(DATA_DIR, "suara-komentar.json");
initJsonFile(KOMENTAR_FILE, []);
function readKomentar() {
  try {
    return JSON.parse(import_fs.default.readFileSync(KOMENTAR_FILE, "utf-8"));
  } catch {
    return [];
  }
}
function writeKomentar(data) {
  import_fs.default.writeFileSync(KOMENTAR_FILE, JSON.stringify(data, null, 2), "utf-8");
}
app.get("/api/suara", (req, res) => {
  try {
    const all = readSuara();
    const { category, search } = req.query;
    let result = all.filter((k) => k.status === "PUBLISHED");
    if (category && category !== "ALL") result = result.filter((k) => k.category === category);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (k) => k.title.toLowerCase().includes(q) || k.excerpt.toLowerCase().includes(q) || k.authorName.toLowerCase().includes(q) || k.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/suara/admin", requireAuth, (req, res) => {
  try {
    const all = readSuara();
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(all);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/suara/leaderboard", (req, res) => {
  try {
    const all = readSuara();
    const published = all.filter((k) => k.status === "PUBLISHED");
    const map = /* @__PURE__ */ new Map();
    for (const k of published) {
      const key = k.authorName.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          authorName: k.authorName,
          authorClass: k.authorClass,
          authorJurusan: k.authorJurusan,
          points: 0,
          publishedCount: 0,
          totalLikes: 0,
          totalViews: 0,
          latestTitle: "",
          latestDate: "",
          categories: /* @__PURE__ */ new Set()
        });
      }
      const e = map.get(key);
      e.publishedCount += 1;
      e.points += 10;
      e.points += Math.floor(k.likes / 5);
      e.totalLikes += k.likes;
      e.totalViews += k.views;
      e.categories.add(k.category);
      if (!e.latestDate || k.publishedAt > e.latestDate) {
        e.latestDate = k.publishedAt || k.createdAt;
        e.latestTitle = k.title;
      }
    }
    const board = [...map.values()].map((e) => ({ ...e, categories: [...e.categories] })).sort((a, b) => b.points - a.points || b.totalLikes - a.totalLikes).slice(0, 15);
    res.json(board);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/suara/komentar/admin", requireAuth, (req, res) => {
  try {
    const all = readKomentar();
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(all);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/suara/:id", (req, res) => {
  try {
    const all = readSuara();
    const karya = all.find((k) => k.id === req.params.id || k.slug === req.params.id);
    if (!karya) return res.status(404).json({ error: "Karya tidak ditemukan" });
    if (karya.status !== "PUBLISHED") {
      const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
      if (!token || !activeSessions.has(token)) return res.status(403).json({ error: "Karya belum dipublikasikan" });
    }
    res.json(karya);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/suara", (req, res) => {
  try {
    const { title, content, category, authorName, authorClass, authorJurusan, tags } = req.body;
    if (!title || !content || !category || !authorName || !authorClass)
      return res.status(400).json({ error: "Field wajib tidak lengkap." });
    if (content.trim().length < 200)
      return res.status(400).json({ error: "Konten minimal 200 karakter." });
    const validCats = ["JURNAL_VOKASI", "ESAI_INOVASI", "SASTRA", "OPINI"];
    if (!validCats.includes(category)) return res.status(400).json({ error: "Kategori tidak valid." });
    const all = readSuara();
    const baseSlug = slugify(title);
    let slug = baseSlug || `karya-${Date.now()}`;
    let counter = 1;
    while (all.some((k) => k.slug === slug)) slug = `${baseSlug}-${counter++}`;
    const excerpt = content.trim().replace(/\n+/g, " ").substring(0, 220) + (content.length > 220 ? "..." : "");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newKarya = {
      id: import_crypto.default.randomUUID(),
      title: title.trim(),
      slug,
      content: content.trim(),
      excerpt,
      category,
      status: "REVIEW",
      feedback: null,
      views: 0,
      likes: 0,
      authorName: authorName.trim(),
      authorClass: authorClass.trim(),
      authorJurusan: (authorJurusan || "").trim(),
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean) : (tags || "").split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: now,
      updatedAt: now,
      publishedAt: null
    };
    all.push(newKarya);
    writeSuara(all);
    res.json({ success: true, id: newKarya.id, slug: newKarya.slug });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.patch("/api/suara/:id/like", (req, res) => {
  try {
    const all = readSuara();
    const idx = all.findIndex((k) => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Karya tidak ditemukan" });
    all[idx].likes = (all[idx].likes || 0) + 1;
    all[idx].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    writeSuara(all);
    res.json({ likes: all[idx].likes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.patch("/api/suara/:id/view", (req, res) => {
  try {
    const all = readSuara();
    const idx = all.findIndex((k) => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Karya tidak ditemukan" });
    all[idx].views = (all[idx].views || 0) + 1;
    writeSuara(all);
    res.json({ views: all[idx].views });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.patch("/api/suara/:id/approve", requireAuth, (req, res) => {
  try {
    const all = readSuara();
    const idx = all.findIndex((k) => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Karya tidak ditemukan" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    all[idx].status = "PUBLISHED";
    all[idx].feedback = null;
    all[idx].publishedAt = all[idx].publishedAt || now;
    all[idx].updatedAt = now;
    writeSuara(all);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.patch("/api/suara/:id/reject", requireAuth, (req, res) => {
  try {
    const all = readSuara();
    const idx = all.findIndex((k) => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Karya tidak ditemukan" });
    const { feedback, action } = req.body;
    all[idx].status = action === "archive" ? "ARCHIVED" : "REVISION";
    all[idx].feedback = feedback || null;
    all[idx].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    writeSuara(all);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/suara/:id", requireAuth, (req, res) => {
  try {
    const all = readSuara();
    const filtered = all.filter((k) => k.id !== req.params.id);
    if (filtered.length === all.length) return res.status(404).json({ error: "Karya tidak ditemukan" });
    writeSuara(filtered);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/suara/:id/komentar", (req, res) => {
  try {
    const all = readKomentar();
    const approved = all.filter((k) => k.artikelId === req.params.id && k.status === "APPROVED").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(approved);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/suara/:id/komentar", (req, res) => {
  try {
    const all = readSuara();
    const karya = all.find((k) => k.id === req.params.id);
    if (!karya || karya.status !== "PUBLISHED")
      return res.status(404).json({ error: "Artikel tidak ditemukan" });
    const { authorName, authorClass, content } = req.body;
    if (!authorName?.trim() || !content?.trim())
      return res.status(400).json({ error: "Nama dan isi komentar wajib diisi." });
    if (content.trim().length < 10)
      return res.status(400).json({ error: "Komentar minimal 10 karakter." });
    if (content.trim().length > 500)
      return res.status(400).json({ error: "Komentar maksimal 500 karakter." });
    const newKomentar = {
      id: import_crypto.default.randomUUID(),
      artikelId: karya.id,
      artikelTitle: karya.title,
      authorName: authorName.trim(),
      authorClass: (authorClass || "").trim(),
      content: content.trim(),
      status: "PENDING",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const existing = readKomentar();
    existing.push(newKomentar);
    writeKomentar(existing);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.patch("/api/suara/komentar/:commentId/approve", requireAuth, (req, res) => {
  try {
    const all = readKomentar();
    const idx = all.findIndex((k) => k.id === req.params.commentId);
    if (idx === -1) return res.status(404).json({ error: "Komentar tidak ditemukan" });
    all[idx].status = "APPROVED";
    writeKomentar(all);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/suara/komentar/:commentId", requireAuth, (req, res) => {
  try {
    const all = readKomentar();
    const filtered = all.filter((k) => k.id !== req.params.commentId);
    if (filtered.length === all.length) return res.status(404).json({ error: "Komentar tidak ditemukan" });
    writeKomentar(filtered);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    const BASE = process.env.BASE_PATH || "";
    if (BASE) {
      app.use(BASE, import_express.default.static(distPath));
      app.get(BASE, (_req, res) => res.sendFile(import_path.default.join(distPath, "index.html")));
      app.get(`${BASE}/*splat`, (_req, res) => res.sendFile(import_path.default.join(distPath, "index.html")));
    } else {
      app.use(import_express.default.static(distPath));
      app.get("*all", (_req, res) => res.sendFile(import_path.default.join(distPath, "index.html")));
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
main().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
