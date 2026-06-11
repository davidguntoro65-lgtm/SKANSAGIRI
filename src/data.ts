export interface Competency {
  code: string;
  name: string;
  englishName: string;
  description: string;
  themeClass: string;
  badgeColor: string;
  stats: { label: string; value: string }[];
  careers: string[];
  image: string;
  curriculum: string[];
}

export interface Milestone {
  year: string;
  title: string;
  subtitle: string;
  description: string;
  category: "Prestasi" | "Infrastruktur" | "Kemitraan";
  metric?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: "Kuliner" | "Fashion" | "Kelas" | "Praktik Industri" | "Prestasi";
  image: string;
  aspect: "portrait" | "landscape";
  caption: string;
}

export interface Alumnus {
  name: string;
  role: string;
  company: string;
  location: string;
  gradYear: string;
  quote: string;
  avatar: string;
}

export interface NewsArticle {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image: string;
  author: string;
  authorRole: string;
}

export const COMPETENCY_DATA: Competency[] = [
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
    name: "Bisnis Digital & Pemasaran",
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
    name: "Seni Kuliner & Gastronomi",
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

export const TIMELINE_ACHIEVEMENTS: Milestone[] = [
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

export const CAMPUS_LIFE_GALLERY: GalleryItem[] = [
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

export const ALUMNI_TESTIMONIALS: Alumnus[] = [
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

export const NEWS_COMPILATION: NewsArticle[] = [
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
