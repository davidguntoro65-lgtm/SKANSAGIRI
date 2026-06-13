import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart3, Briefcase, GraduationCap, Store, Users, Search, Trash2,
  ChevronDown, ChevronUp, Download, RefreshCw, LogOut, KeyRound,
  Lock, ArrowLeft, Filter, X, CheckCircle2, AlertCircle, Clock,
  Phone, Mail, MapPin, Building2, BookOpen, TrendingUp, Eye, EyeOff,
  FileSpreadsheet, FileText, Printer, LayoutDashboard, Table2,
  PieChart, PackageOpen, ChevronLeft, ChevronRight, CheckSquare,
  Square, Banknote, Target, Settings, ShieldCheck
} from "lucide-react";

/* ─── Data Types ─────────────────────────────────────────────────── */
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

/* ─── Lookup Maps ─────────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, string> = {
  bekerja: "Bekerja", kuliah: "Kuliah", wirausaha: "Wirausaha", belum_bekerja: "Belum Bekerja",
};
const STATUS_COLORS: Record<string, string> = {
  bekerja: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  kuliah: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  wirausaha: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  belum_bekerja: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};
const STATUS_HEX: Record<string, string> = {
  bekerja: "#10b981", kuliah: "#3b82f6", wirausaha: "#8b5cf6", belum_bekerja: "#94a3b8",
};
const GAJI_LABELS: Record<string, string> = {
  lt2: "< Rp 2 Juta", "2-4": "Rp 2–4 Juta", "4-6": "Rp 4–6 Juta", gt6: "> Rp 6 Juta",
};
const GAJI_ORDER = ["lt2", "2-4", "4-6", "gt6"];
const RELEVANCE_LABELS: Record<string, string> = {
  sangat_relevan: "Sangat Relevan", relevan: "Relevan",
  cukup_relevan: "Cukup Relevan", tidak_relevan: "Tidak Relevan",
};
const RELEVANCE_HEX: Record<string, string> = {
  sangat_relevan: "#10b981", relevan: "#3b82f6", cukup_relevan: "#f59e0b", tidak_relevan: "#ef4444",
};

/* ─── Helpers ─────────────────────────────────────────────────────── */
function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}
function formatDateFull(iso: string) {
  try { return new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  catch { return iso; }
}
function pct(n: number, total: number) { return total ? Math.round((n / total) * 100) : 0; }
const PAGE_SIZE = 20;

/* ═══════════════════════════════════════════════════════════════════ */
export default function AdminTracerStudi({ theme = "dark", onBack }: { theme?: "light" | "dark"; onBack: () => void }) {
  const isDark = theme === "dark";

  /* ── Auth ─────────────────────────────────────────────────────── */
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    typeof window !== "undefined" && !!localStorage.getItem("smkn1_adm_token")
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  /* ── Data ─────────────────────────────────────────────────────── */
  const [entries, setEntries] = useState<TracerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  /* ── UI State ─────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<"overview" | "data" | "analytics" | "export">("overview");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJurusan, setFilterJurusan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterKota, setFilterKota] = useState("");
  const [filterGaji, setFilterGaji] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [exportingPdf, setExportingPdf] = useState(false);

  /* ── Change Password Modal ────────────────────────────────────── */
  const [showChangePass, setShowChangePass] = useState(false);
  const [cpCurrentPass, setCpCurrentPass] = useState("");
  const [cpNewUser, setCpNewUser] = useState("");
  const [cpNewPass, setCpNewPass] = useState("");
  const [cpConfirmPass, setCpConfirmPass] = useState("");
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");

  const openChangePass = () => {
    setCpCurrentPass(""); setCpNewUser(""); setCpNewPass(""); setCpConfirmPass("");
    setCpError(""); setShowChangePass(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpError("");
    if (cpNewPass !== cpConfirmPass) { setCpError("Konfirmasi password baru tidak cocok."); return; }
    if (cpNewPass.length < 8) { setCpError("Password baru minimal 8 karakter."); return; }
    setCpLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword: cpCurrentPass, newUsername: cpNewUser, newPassword: cpNewPass }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowChangePass(false);
        showFeedback("Password berhasil diubah! Silakan login kembali.");
        setTimeout(() => { localStorage.removeItem("smkn1_adm_token"); setIsLoggedIn(false); }, 2000);
      } else {
        setCpError(data.error || "Gagal mengubah password.");
      }
    } catch { setCpError("Gagal menghubungi server."); }
    setCpLoading(false);
  };

  /* ── Theme helpers ─────────────────────────────────────────────── */
  const bg = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const card = isDark ? "bg-slate-900 border-white/8" : "bg-white border-slate-200";
  const input = isDark
    ? "bg-slate-800 border-white/10 text-white placeholder-slate-500 focus:border-amber-500/40"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const divider = isDark ? "border-white/5" : "border-slate-100";

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("smkn1_adm_token") || "";
    return { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) };
  };

  /* ── Verify token on mount ─────────────────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem("smkn1_adm_token");
    if (!token) return;
    fetch("/api/auth/verify", { headers: { "Authorization": `Bearer ${token}` } })
      .then(res => { if (!res.ok) { localStorage.removeItem("smkn1_adm_token"); setIsLoggedIn(false); } })
      .catch(() => {});
  }, []);

  useEffect(() => { if (isLoggedIn) loadEntries(); }, [isLoggedIn]);

  /* ── Feedback ──────────────────────────────────────────────────── */
  const showFeedback = (msg: string, type: "success" | "error" = "success") => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  /* ── Data loading ──────────────────────────────────────────────── */
  const loadEntries = () => {
    setLoading(true);
    fetch("/api/tracer")
      .then(r => r.json())
      .then((d: TracerEntry[]) => { setEntries(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { showFeedback("Gagal memuat data!", "error"); setLoading(false); });
  };

  /* ── Auth handlers ─────────────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(""); setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) { localStorage.setItem("smkn1_adm_token", data.token); setIsLoggedIn(true); }
      else setLoginError(data.error || "Kombinasi User Name atau Sandi salah.");
    } catch { setLoginError("Gagal menghubungi server. Periksa koneksi Anda."); }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("smkn1_adm_token") || "";
      await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } });
    } catch { /* best-effort */ }
    localStorage.removeItem("smkn1_adm_token");
    setIsLoggedIn(false);
  };

  /* ── Delete handlers ───────────────────────────────────────────── */
  const handleDelete = async (id: string, nama: string) => {
    if (!window.confirm(`Hapus data alumni "${nama}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tracer/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) { setEntries(prev => prev.filter(e => e.id !== id)); if (expandedId === id) setExpandedId(null); showFeedback(`Data "${nama}" berhasil dihapus.`); }
      else showFeedback("Gagal menghapus data.", "error");
    } catch { showFeedback("Gagal menghapus data.", "error"); }
    setDeletingId(null);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Hapus ${selected.size} data alumni yang dipilih? Tindakan ini tidak dapat dibatalkan.`)) return;
    setBulkDeleting(true);
    let deleted = 0;
    for (const id of Array.from(selected)) {
      try {
        const res = await fetch(`/api/tracer/${id}`, { method: "DELETE", headers: getAuthHeaders() });
        if (res.ok) { deleted++; setEntries(prev => prev.filter(e => e.id !== id)); }
      } catch { /* continue */ }
    }
    setSelected(new Set());
    setBulkDeleting(false);
    showFeedback(`${deleted} data berhasil dihapus.`);
  };

  /* ── Derived data ──────────────────────────────────────────────── */
  const allJurusan = useMemo(() => [...new Set(entries.map(e => e.jurusan))].sort(), [entries]);
  const allTahun = useMemo(() => [...new Set(entries.map(e => e.tahunLulus))].sort((a, b) => Number(b) - Number(a)), [entries]);
  const allKota = useMemo(() => [...new Set(entries.map(e => e.kota).filter(Boolean) as string[])].sort(), [entries]);

  const filtered = useMemo(() => {
    let r = [...entries];
    if (filterStatus) r = r.filter(e => e.status === filterStatus);
    if (filterJurusan) r = r.filter(e => e.jurusan === filterJurusan);
    if (filterTahun) r = r.filter(e => e.tahunLulus === filterTahun);
    if (filterKota) r = r.filter(e => e.kota === filterKota);
    if (filterGaji) r = r.filter(e => e.rentangGaji === filterGaji);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(e =>
        e.nama.toLowerCase().includes(q) || e.jurusan.toLowerCase().includes(q) ||
        (e.namaPerusahaan ?? "").toLowerCase().includes(q) ||
        (e.universitas ?? "").toLowerCase().includes(q) ||
        (e.namaUsaha ?? "").toLowerCase().includes(q) ||
        (e.kota ?? "").toLowerCase().includes(q)
      );
    }
    return r.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [entries, filterStatus, filterJurusan, filterTahun, filterKota, filterGaji, search]);

  const hasFilters = search || filterStatus || filterJurusan || filterTahun || filterKota || filterGaji;

  const clearFilters = () => {
    setSearch(""); setFilterStatus(""); setFilterJurusan(""); setFilterTahun(""); setFilterKota(""); setFilterGaji("");
    setPage(1);
  };

  /* Reset page on filter change */
  useEffect(() => { setPage(1); }, [filterStatus, filterJurusan, filterTahun, filterKota, filterGaji, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const total = entries.length;
    const bekerja = entries.filter(e => e.status === "bekerja").length;
    const kuliah = entries.filter(e => e.status === "kuliah").length;
    const wirausaha = entries.filter(e => e.status === "wirausaha").length;
    const belum_bekerja = entries.filter(e => e.status === "belum_bekerja").length;
    const productive = bekerja + kuliah + wirausaha;
    return { total, bekerja, kuliah, wirausaha, belum_bekerja, productive };
  }, [entries]);

  const analytics = useMemo(() => {
    const statusRows = [
      { label: "Bekerja", value: stats.bekerja, hex: STATUS_HEX.bekerja },
      { label: "Kuliah", value: stats.kuliah, hex: STATUS_HEX.kuliah },
      { label: "Wirausaha", value: stats.wirausaha, hex: STATUS_HEX.wirausaha },
      { label: "Belum Bekerja", value: stats.belum_bekerja, hex: STATUS_HEX.belum_bekerja },
    ].filter(r => r.value > 0);

    const jurusanMap: Record<string, number> = {};
    entries.forEach(e => { jurusanMap[e.jurusan] = (jurusanMap[e.jurusan] ?? 0) + 1; });
    const jurusanRows = Object.entries(jurusanMap).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    const tahunMap: Record<string, number> = {};
    entries.forEach(e => { tahunMap[e.tahunLulus] = (tahunMap[e.tahunLulus] ?? 0) + 1; });
    const tahunRows = Object.entries(tahunMap).map(([label, value]) => ({ label, value })).sort((a, b) => Number(a.label) - Number(b.label));

    const gajiMap: Record<string, number> = {};
    entries.filter(e => e.status === "bekerja" && e.rentangGaji).forEach(e => {
      const k = e.rentangGaji!; gajiMap[k] = (gajiMap[k] ?? 0) + 1;
    });
    const gajiRows = GAJI_ORDER.filter(k => gajiMap[k]).map(k => ({ label: GAJI_LABELS[k], value: gajiMap[k], hex: "#f59e0b" }));

    const relMap: Record<string, number> = {};
    entries.filter(e => e.status === "bekerja" && e.relevansiJurusan).forEach(e => {
      const k = e.relevansiJurusan!; relMap[k] = (relMap[k] ?? 0) + 1;
    });
    const relevansiRows = Object.entries(relMap).map(([k, v]) => ({ label: RELEVANCE_LABELS[k] ?? k, value: v, hex: RELEVANCE_HEX[k] ?? "#94a3b8" }));

    const kotaMap: Record<string, number> = {};
    entries.filter(e => e.kota).forEach(e => { kotaMap[e.kota!] = (kotaMap[e.kota!] ?? 0) + 1; });
    const kotaRows = Object.entries(kotaMap).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    const jalurMap: Record<string, number> = {};
    entries.filter(e => e.status === "kuliah" && e.jalurMasuk).forEach(e => {
      jalurMap[e.jalurMasuk!] = (jalurMap[e.jalurMasuk!] ?? 0) + 1;
    });
    const jalurRows = Object.entries(jalurMap).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    return { statusRows, jurusanRows, tahunRows, gajiRows, relevansiRows, kotaRows, jalurRows };
  }, [entries, stats]);

  /* ─── EXPORT: CSV ───────────────────────────────────────────────── */
  const exportCSV = () => {
    const headers = ["No","Nama","Jurusan","Tahun Lulus","Status","Perusahaan/Univ/Usaha","Posisi/Prodi/Bidang","Kota","Relevansi Jurusan","Rentang Gaji","Jalur Masuk","Tahun Berdiri","Alasan","WhatsApp","Email","Tanggal Isi"];
    const rows = filtered.map((e, i) => [
      i + 1, e.nama, e.jurusan, e.tahunLulus, STATUS_LABELS[e.status] ?? e.status,
      e.namaPerusahaan ?? e.universitas ?? e.namaUsaha ?? "",
      e.posisi ?? e.programStudi ?? e.bidangUsaha ?? "",
      e.kota ?? "", RELEVANCE_LABELS[e.relevansiJurusan ?? ""] ?? "",
      GAJI_LABELS[e.rentangGaji ?? ""] ?? "", e.jalurMasuk ?? "", e.tahunBerdiri ?? "",
      e.alasanBelumBekerja ?? "", e.whatsapp ?? "", e.email ?? "", formatDate(e.createdAt),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `tracer-studi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showFeedback(`${filtered.length} data berhasil diekspor ke CSV.`);
  };

  /* ─── EXPORT: EXCEL ─────────────────────────────────────────────── */
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    /* Sheet 1 — Ringkasan */
    const summaryData: (string | number)[][] = [
      ["LAPORAN TRACER STUDI", "", ""],
      ["SMKN 1 Wonogiri", "", ""],
      ["", "", ""],
      [`Tanggal Cetak: ${dateStr}`, "", ""],
      [`Jumlah Data (terfilter): ${filtered.length} dari ${entries.length} responden`, "", ""],
      ["", "", ""],
      ["RINGKASAN STATISTIK", "", ""],
      ["Kategori", "Jumlah", "Persentase (%)"],
      ["Total Responden", stats.total, 100],
      ["Bekerja", stats.bekerja, pct(stats.bekerja, stats.total)],
      ["Kuliah", stats.kuliah, pct(stats.kuliah, stats.total)],
      ["Wirausaha", stats.wirausaha, pct(stats.wirausaha, stats.total)],
      ["Belum Bekerja", stats.belum_bekerja, pct(stats.belum_bekerja, stats.total)],
      ["Produktif (Bekerja+Kuliah+Wirausaha)", stats.productive, pct(stats.productive, stats.total)],
      ["", "", ""],
      ["SEBARAN PER JURUSAN", "", ""],
      ["Jurusan", "Jumlah", "Persentase (%)"],
      ...analytics.jurusanRows.map(r => [r.label, r.value, pct(r.value, stats.total)]),
      ["", "", ""],
      ["SEBARAN PER TAHUN LULUS", "", ""],
      ["Tahun Lulus", "Jumlah", "Persentase (%)"],
      ...analytics.tahunRows.map(r => [r.label, r.value, pct(r.value, stats.total)]),
      ["", "", ""],
      ["RENTANG GAJI (Lulusan Bekerja)", "", ""],
      ["Rentang Gaji", "Jumlah", "Persentase Pekerja (%)"],
      ...analytics.gajiRows.map(r => [r.label, r.value, pct(r.value, stats.bekerja)]),
      ["", "", ""],
      ["RELEVANSI JURUSAN (Lulusan Bekerja)", "", ""],
      ["Relevansi", "Jumlah", "Persentase Pekerja (%)"],
      ...analytics.relevansiRows.map(r => [r.label, r.value, pct(r.value, stats.bekerja)]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 45 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan");

    /* Sheet 2 — Data Lengkap */
    const dataHeaders = ["No","Nama","Jurusan","Tahun Lulus","Status","Perusahaan/Univ/Usaha","Posisi/Prodi/Bidang Usaha","Kota","Relevansi Jurusan","Rentang Gaji","Universitas","Program Studi","Jalur Masuk","Nama Usaha","Bidang Usaha","Tahun Berdiri Usaha","Alasan Belum Bekerja","WhatsApp","Email","Tanggal Mengisi"];
    const dataRows = filtered.map((e, i) => [
      i + 1, e.nama, e.jurusan, e.tahunLulus, STATUS_LABELS[e.status] ?? e.status,
      e.namaPerusahaan ?? e.universitas ?? e.namaUsaha ?? "",
      e.posisi ?? e.programStudi ?? e.bidangUsaha ?? "",
      e.kota ?? "", RELEVANCE_LABELS[e.relevansiJurusan ?? ""] ?? (e.relevansiJurusan ?? ""),
      GAJI_LABELS[e.rentangGaji ?? ""] ?? (e.rentangGaji ?? ""),
      e.universitas ?? "", e.programStudi ?? "", e.jalurMasuk ?? "",
      e.namaUsaha ?? "", e.bidangUsaha ?? "", e.tahunBerdiri ?? "",
      e.alasanBelumBekerja ?? "", e.whatsapp ?? "", e.email ?? "",
      formatDate(e.createdAt),
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([dataHeaders, ...dataRows]);
    ws2["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 28 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 22 }, { wch: 18 }, { wch: 25 }, { wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 28 }, { wch: 18 }];
    ws2["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws2, "Data Responden");

    /* Sheet 3 — Per Jurusan × Status */
    const jurusanCrossHeaders = ["Jurusan", "Total", "Bekerja", "%Bekerja", "Kuliah", "%Kuliah", "Wirausaha", "%Wirausaha", "Belum Bekerja", "%Belum Bekerja"];
    const jurusanCrossRows = allJurusan.map(j => {
      const group = entries.filter(e => e.jurusan === j);
      const tot = group.length;
      const bk = group.filter(e => e.status === "bekerja").length;
      const ku = group.filter(e => e.status === "kuliah").length;
      const wi = group.filter(e => e.status === "wirausaha").length;
      const bb = group.filter(e => e.status === "belum_bekerja").length;
      return [j, tot, bk, `${pct(bk, tot)}%`, ku, `${pct(ku, tot)}%`, wi, `${pct(wi, tot)}%`, bb, `${pct(bb, tot)}%`];
    });
    const ws3 = XLSX.utils.aoa_to_sheet([jurusanCrossHeaders, ...jurusanCrossRows]);
    ws3["!cols"] = [{ wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Per Jurusan");

    XLSX.writeFile(wb, `tracer-studi-smkn1wonogiri-${now.toISOString().slice(0, 10)}.xlsx`);
    showFeedback(`Excel berhasil diekspor (${filtered.length} data, 3 sheet).`);
  };

  /* ─── EXPORT: PDF ────────────────────────────────────────────────── */
  const exportPDF = () => {
    setExportingPdf(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const now = new Date();
        const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        const amber: [number, number, number] = [245, 158, 11];
        const dark: [number, number, number] = [15, 23, 42];
        const slate: [number, number, number] = [100, 116, 139];
        const white: [number, number, number] = [255, 255, 255];
        const lightGray: [number, number, number] = [248, 250, 252];

        const addFooter = (pageNum: number, total: number) => {
          doc.setFontSize(7); doc.setTextColor(...slate);
          doc.text(`Halaman ${pageNum} dari ${total}`, pageW / 2, pageH - 5, { align: "center" });
          doc.text("SMKN 1 Wonogiri — Laporan Tracer Studi", 10, pageH - 5);
          doc.text(`Dicetak: ${dateStr}`, pageW - 10, pageH - 5, { align: "right" });
          doc.setDrawColor(...slate); doc.setLineWidth(0.2);
          doc.line(10, pageH - 8, pageW - 10, pageH - 8);
        };

        /* ── Page 1: Cover + Summary ──────────────────────────────── */
        // Header bar
        doc.setFillColor(...amber); doc.rect(0, 0, pageW, 22, "F");
        doc.setFillColor(...dark); doc.rect(0, 20, pageW, 2, "F");

        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...dark);
        doc.text("LAPORAN TRACER STUDI", pageW / 2, 11, { align: "center" });
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text("SMK NEGERI 1 WONOGIRI", pageW / 2, 17, { align: "center" });

        // Sub-header info
        doc.setFontSize(8); doc.setTextColor(...slate);
        doc.text(`Tanggal Cetak: ${dateStr}`, 12, 30);
        doc.text(`Total Responden: ${stats.total}`, 12, 36);
        if (hasFilters) doc.text(`Filter aktif — data yang ditampilkan: ${filtered.length} responden`, 12, 42);

        // KPI boxes
        const kpis = [
          { label: "Total Responden", val: String(stats.total), color: [245, 158, 11] as [number,number,number] },
          { label: "Bekerja", val: `${stats.bekerja} (${pct(stats.bekerja, stats.total)}%)`, color: [16, 185, 129] as [number,number,number] },
          { label: "Kuliah", val: `${stats.kuliah} (${pct(stats.kuliah, stats.total)}%)`, color: [59, 130, 246] as [number,number,number] },
          { label: "Wirausaha", val: `${stats.wirausaha} (${pct(stats.wirausaha, stats.total)}%)`, color: [139, 92, 246] as [number,number,number] },
          { label: "Belum Bekerja", val: `${stats.belum_bekerja} (${pct(stats.belum_bekerja, stats.total)}%)`, color: [148, 163, 184] as [number,number,number] },
          { label: "Tingkat Produktif", val: `${pct(stats.productive, stats.total)}%`, color: [245, 158, 11] as [number,number,number] },
        ];
        const boxW = (pageW - 24) / 3, boxH = 16, startX = 12, startY = 47;
        kpis.forEach((k, i) => {
          const col = i % 3, row = Math.floor(i / 3);
          const x = startX + col * (boxW + 2), y = startY + row * (boxH + 2);
          doc.setFillColor(...lightGray); doc.roundedRect(x, y, boxW, boxH, 2, 2, "F");
          doc.setFillColor(...k.color); doc.rect(x, y, 2, boxH, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...dark);
          doc.text(k.val, x + 5, y + 7);
          doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...slate);
          doc.text(k.label, x + 5, y + 12.5);
        });

        // Stats tables side-by-side
        const tY = startY + 2 * (boxH + 2) + 5;
        autoTable(doc, {
          startY: tY, margin: { left: 12, right: pageW / 2 + 2 },
          head: [["Jurusan", "Total", "%"]],
          body: analytics.jurusanRows.map(r => [r.label, r.value, `${pct(r.value, stats.total)}%`]),
          theme: "striped",
          headStyles: { fillColor: dark, textColor: white, fontSize: 7, fontStyle: "bold", cellPadding: 2 },
          bodyStyles: { fontSize: 7, cellPadding: 2 },
          alternateRowStyles: { fillColor: lightGray },
          columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 14, halign: "center" }, 2: { cellWidth: 12, halign: "center" } },
        });
        autoTable(doc, {
          startY: tY, margin: { left: pageW / 2 + 2, right: 12 },
          head: [["Tahun Lulus", "Total", "%"]],
          body: analytics.tahunRows.map(r => [r.label, r.value, `${pct(r.value, stats.total)}%`]),
          theme: "striped",
          headStyles: { fillColor: dark, textColor: white, fontSize: 7, fontStyle: "bold", cellPadding: 2 },
          bodyStyles: { fontSize: 7, cellPadding: 2 },
          alternateRowStyles: { fillColor: lightGray },
          columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 14, halign: "center" }, 2: { cellWidth: 12, halign: "center" } },
        });

        addFooter(1, 3);

        /* ── Page 2: Analytics ────────────────────────────────────── */
        doc.addPage();
        doc.setFillColor(...amber); doc.rect(0, 0, pageW, 12, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...dark);
        doc.text("ANALITIK LANJUTAN", pageW / 2, 8, { align: "center" });

        const midX = pageW / 2;
        autoTable(doc, {
          startY: 18, margin: { left: 12, right: midX + 2 },
          head: [["Rentang Gaji (Lulusan Bekerja)", "Jml", "%"]],
          body: analytics.gajiRows.length > 0
            ? analytics.gajiRows.map(r => [r.label, r.value, `${pct(r.value, stats.bekerja)}%`])
            : [["Belum ada data", "", ""]],
          theme: "grid",
          headStyles: { fillColor: [16, 185, 129], textColor: white, fontSize: 7.5, cellPadding: 2 },
          bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
        });
        autoTable(doc, {
          startY: 18, margin: { left: midX + 2, right: 12 },
          head: [["Relevansi Jurusan (Bekerja)", "Jml", "%"]],
          body: analytics.relevansiRows.length > 0
            ? analytics.relevansiRows.map(r => [r.label, r.value, `${pct(r.value, stats.bekerja)}%`])
            : [["Belum ada data", "", ""]],
          theme: "grid",
          headStyles: { fillColor: [139, 92, 246], textColor: white, fontSize: 7.5, cellPadding: 2 },
          bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
        });

        const lastY1 = Math.max((doc as any).lastAutoTable?.finalY ?? 50, 50) + 6;
        autoTable(doc, {
          startY: lastY1, margin: { left: 12, right: midX + 2 },
          head: [["Kota Kerja (Top 8)", "Jml"]],
          body: analytics.kotaRows.length > 0
            ? analytics.kotaRows.map(r => [r.label, r.value])
            : [["Belum ada data", ""]],
          theme: "grid",
          headStyles: { fillColor: [245, 158, 11], textColor: dark, fontSize: 7.5, cellPadding: 2 },
          bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
        });
        autoTable(doc, {
          startY: lastY1, margin: { left: midX + 2, right: 12 },
          head: [["Jalur Masuk Kuliah", "Jml"]],
          body: analytics.jalurRows.length > 0
            ? analytics.jalurRows.map(r => [r.label, r.value])
            : [["Belum ada data", ""]],
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246], textColor: white, fontSize: 7.5, cellPadding: 2 },
          bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
        });

        addFooter(2, 3);

        /* ── Page 3: Full Data Table ──────────────────────────────── */
        doc.addPage();
        doc.setFillColor(...amber); doc.rect(0, 0, pageW, 12, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...dark);
        doc.text(`DATA RESPONDEN ${hasFilters ? `(${filtered.length} data — terfilter)` : `(${entries.length} data — semua)`}`, pageW / 2, 8, { align: "center" });

        autoTable(doc, {
          startY: 16, margin: { left: 8, right: 8 },
          head: [["No", "Nama", "Jurusan", "Lulus", "Status", "Perusahaan/Univ/Usaha", "Posisi/Prodi", "Kota", "Gaji/Relevansi", "Kontak", "Tgl Isi"]],
          body: filtered.map((e, i) => [
            i + 1,
            e.nama,
            e.jurusan,
            e.tahunLulus,
            STATUS_LABELS[e.status] ?? e.status,
            e.namaPerusahaan ?? e.universitas ?? e.namaUsaha ?? "-",
            e.posisi ?? e.programStudi ?? e.bidangUsaha ?? "-",
            e.kota ?? "-",
            e.status === "bekerja"
              ? (e.rentangGaji ? GAJI_LABELS[e.rentangGaji] : "-") + (e.relevansiJurusan ? `\n${(RELEVANCE_LABELS[e.relevansiJurusan] ?? e.relevansiJurusan).replace(" ", "\n")}` : "")
              : (e.jalurMasuk ?? e.tahunBerdiri ?? "-"),
            (e.whatsapp ? `WA: ${e.whatsapp}` : "") + (e.email ? `\n${e.email}` : "") || "-",
            formatDate(e.createdAt),
          ]),
          theme: "striped",
          headStyles: { fillColor: dark, textColor: white, fontSize: 6.5, fontStyle: "bold", cellPadding: 2, halign: "center" },
          bodyStyles: { fontSize: 6, cellPadding: 1.8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 7, halign: "center" },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 12, halign: "center" },
            4: { cellWidth: 20, halign: "center" },
            5: { cellWidth: 35 },
            6: { cellWidth: 28 },
            7: { cellWidth: 20 },
            8: { cellWidth: 22 },
            9: { cellWidth: 28 },
            10: { cellWidth: 16 },
          },
          didDrawPage: (d) => {
            const pn = (doc as any).internal.getCurrentPageInfo().pageNumber;
            addFooter(pn, 3);
          },
        });

        doc.save(`tracer-studi-smkn1wonogiri-${now.toISOString().slice(0, 10)}.pdf`);
        showFeedback(`PDF berhasil diekspor (${filtered.length} data, 3 halaman).`);
      } catch (err) {
        console.error("PDF export error:", err);
        showFeedback("Gagal membuat PDF. Coba lagi.", "error");
      }
      setExportingPdf(false);
    }, 100);
  };

  /* ── Print ──────────────────────────────────────────────────────── */
  const handlePrint = () => { window.print(); };

  /* ── Selection helpers ──────────────────────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const selectAll = () => setSelected(new Set(paginated.map(e => e.id)));
  const clearSelect = () => setSelected(new Set());
  const allPageSelected = paginated.length > 0 && paginated.every(e => selected.has(e.id));

  /* ══════════════════════════════════════════════════════════════════
     LOGIN FORM
  ══════════════════════════════════════════════════════════════════ */
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg} relative z-10`}>
        <div className="w-full max-w-sm mx-4">
          <div className={`rounded-3xl border p-8 shadow-xl ${card}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-amber-500/15" : "bg-amber-50"}`}>
                <KeyRound className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-xs font-bold font-mono uppercase tracking-widest text-amber-500">Admin Access</div>
                <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Tracer Studi Dashboard</div>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${muted}`}>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${input}`}
                  autoComplete="username" />
              </div>
              <div>
                <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${muted}`}>Password</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition-colors ${input}`}
                    autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} hover:text-amber-500 transition-colors`}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {loginError}
                </div>
              )}
              <button type="submit" disabled={loginLoading || !username || !password}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold tracking-wider transition-colors">
                {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {loginLoading ? "Memverifikasi..." : "Masuk"}
              </button>
            </form>
            <button onClick={onBack}
              className={`mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-mono uppercase tracking-widest transition-colors ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     MAIN DASHBOARD
  ══════════════════════════════════════════════════════════════════ */
  const TABS = [
    { id: "overview", label: "Ikhtisar", icon: LayoutDashboard },
    { id: "data", label: "Data Responden", icon: Table2 },
    { id: "analytics", label: "Analitik", icon: PieChart },
    { id: "export", label: "Ekspor", icon: PackageOpen },
  ] as const;

  return (
    <div className={`min-h-screen relative z-10 ${bg}`}>

      {/* Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${feedback.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
            {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showChangePass && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) setShowChangePass(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className={`w-full max-w-md rounded-3xl border shadow-2xl p-7 ${card}`}>

              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-amber-500/15" : "bg-amber-50"}`}>
                    <ShieldCheck className="w-4.5 h-4.5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">Keamanan Akun</div>
                    <div className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Ganti Username & Password</div>
                  </div>
                </div>
                <button onClick={() => setShowChangePass(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/8 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current password */}
                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${muted}`}>Password Saat Ini *</label>
                  <div className="relative">
                    <input type={cpShowCurrent ? "text" : "password"} value={cpCurrentPass} onChange={e => setCpCurrentPass(e.target.value)} required
                      className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none transition-colors ${input}`}
                      placeholder="Masukkan password saat ini" />
                    <button type="button" onClick={() => setCpShowCurrent(!cpShowCurrent)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} hover:text-amber-500 transition-colors`}>
                      {cpShowCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className={`h-px ${isDark ? "bg-white/6" : "bg-slate-100"}`} />

                {/* New username (optional) */}
                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${muted}`}>Username Baru <span className="normal-case">(kosongkan = tidak berubah)</span></label>
                  <input type="text" value={cpNewUser} onChange={e => setCpNewUser(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${input}`}
                    placeholder="Username baru (opsional)" autoComplete="username" />
                </div>

                {/* New password */}
                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${muted}`}>Password Baru * <span className="normal-case">(min. 8 karakter)</span></label>
                  <div className="relative">
                    <input type={cpShowNew ? "text" : "password"} value={cpNewPass} onChange={e => setCpNewPass(e.target.value)} required
                      className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none transition-colors ${input}`}
                      placeholder="Buat password baru yang kuat" autoComplete="new-password" />
                    <button type="button" onClick={() => setCpShowNew(!cpShowNew)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} hover:text-amber-500 transition-colors`}>
                      {cpShowNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {cpNewPass.length > 0 && (
                    <div className="mt-1.5 flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          cpNewPass.length >= i * 3
                            ? cpNewPass.length >= 12 ? "bg-emerald-500" : cpNewPass.length >= 9 ? "bg-amber-500" : "bg-red-400"
                            : isDark ? "bg-slate-700" : "bg-slate-200"
                        }`} />
                      ))}
                      <span className={`text-[9px] font-mono ml-1 ${muted}`}>
                        {cpNewPass.length >= 12 ? "Kuat" : cpNewPass.length >= 8 ? "Cukup" : "Lemah"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${muted}`}>Konfirmasi Password Baru *</label>
                  <input type="password" value={cpConfirmPass} onChange={e => setCpConfirmPass(e.target.value)} required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${input} ${cpConfirmPass && cpConfirmPass !== cpNewPass ? "border-red-500/50" : cpConfirmPass && cpConfirmPass === cpNewPass ? "border-emerald-500/50" : ""}`}
                    placeholder="Ulangi password baru" autoComplete="new-password" />
                  {cpConfirmPass && cpConfirmPass === cpNewPass && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-mono">
                      <CheckCircle2 className="w-3 h-3" /> Password cocok
                    </div>
                  )}
                </div>

                {/* Error */}
                {cpError && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {cpError}
                  </div>
                )}

                {/* Info */}
                <div className={`flex items-start gap-2 text-[10px] font-mono rounded-xl px-3 py-2.5 ${isDark ? "bg-amber-500/8 text-amber-400/80 border border-amber-500/15" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  Setelah disimpan, semua sesi aktif akan diakhiri dan Anda perlu login ulang dengan kredensial baru.
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowChangePass(false)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-mono uppercase tracking-widest transition-colors ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                    Batal
                  </button>
                  <button type="submit" disabled={cpLoading || !cpCurrentPass || !cpNewPass || !cpConfirmPass}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold tracking-wider transition-colors">
                    {cpLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {cpLoading ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={`sticky top-0 z-50 border-b backdrop-blur-xl ${isDark ? "bg-slate-950/90 border-white/8" : "bg-white/90 border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${isDark ? "text-slate-500 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"}`}>
              <ArrowLeft className="w-3.5 h-3.5" /> Beranda
            </button>
            <div className={`w-px h-4 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Tracer Studi</span>
              <span className={`hidden md:block text-[10px] font-mono uppercase tracking-widest ${muted}`}>— Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden md:block text-[10px] font-mono uppercase tracking-widest ${muted}`}>{stats.total} responden</span>
            <button onClick={loadEntries} disabled={loading}
              className={`flex items-center gap-1.5 p-2 rounded-lg border text-[10px] transition-colors ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={openChangePass} title="Ganti Password"
              className={`flex items-center gap-1.5 p-2 rounded-lg border text-[10px] transition-colors ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5 hover:text-amber-400" : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-600"}`}>
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleLogout}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-widest transition-colors ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <LogOut className="w-3 h-3" /> Keluar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`max-w-7xl mx-auto px-5 md:px-10 flex gap-1 border-t ${isDark ? "border-white/5" : "border-slate-100"}`}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-amber-500 text-amber-500"
                  : `border-transparent ${isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-700"}`
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-10 py-8">

        {/* ── TAB: IKHTISAR ─────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { icon: Users,          label: "Total Responden",   count: stats.total,         color: "text-amber-500",   cbg: isDark ? "bg-amber-500/10" : "bg-amber-50",   extra: "" },
                { icon: Briefcase,      label: "Bekerja",           count: stats.bekerja,       color: "text-emerald-500", cbg: isDark ? "bg-emerald-500/10" : "bg-emerald-50", extra: `${pct(stats.bekerja, stats.total)}%` },
                { icon: GraduationCap,  label: "Kuliah",            count: stats.kuliah,        color: "text-blue-500",    cbg: isDark ? "bg-blue-500/10" : "bg-blue-50",       extra: `${pct(stats.kuliah, stats.total)}%` },
                { icon: Store,          label: "Wirausaha",         count: stats.wirausaha,     color: "text-violet-500",  cbg: isDark ? "bg-violet-500/10" : "bg-violet-50",   extra: `${pct(stats.wirausaha, stats.total)}%` },
                { icon: Clock,          label: "Belum Bekerja",     count: stats.belum_bekerja, color: "text-slate-400",   cbg: isDark ? "bg-slate-500/10" : "bg-slate-100",    extra: `${pct(stats.belum_bekerja, stats.total)}%` },
                { icon: TrendingUp,     label: "Tingkat Produktif", count: `${pct(stats.productive, stats.total)}%`, color: "text-amber-500", cbg: isDark ? "bg-amber-500/10" : "bg-amber-50", extra: `${stats.productive} alumni` },
              ].map(({ icon: Icon, label, count, color, cbg, extra }) => (
                <div key={label} className={`rounded-2xl border p-4 ${card}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${cbg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className={`text-2xl font-bold font-serif ${color}`}>{count}</div>
                  <div className={`text-[9px] font-mono uppercase tracking-widest leading-tight mt-0.5 ${muted}`}>{label}</div>
                  {extra && <div className={`text-[9px] font-mono mt-0.5 ${color} opacity-70`}>{extra}</div>}
                </div>
              ))}
            </div>

            {/* Overview charts 3-col */}
            {entries.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`rounded-2xl border p-5 ${card}`}>
                  <div className={`text-[10px] font-mono uppercase tracking-widest mb-4 ${muted}`}>Status Alumni</div>
                  <div className="flex items-center gap-4">
                    <DonutChart data={analytics.statusRows} total={stats.total} isDark={isDark} />
                    <div className="space-y-2 flex-1">
                      {analytics.statusRows.map(r => (
                        <div key={r.label} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.hex }} />
                          <span className={`text-[10px] font-mono flex-1 truncate ${muted}`}>{r.label}</span>
                          <span className={`text-[11px] font-bold tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{r.value}</span>
                          <span className={`text-[9px] font-mono w-7 text-right ${muted}`}>{pct(r.value, stats.total)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={`rounded-2xl border p-5 ${card}`}>
                  <div className={`text-[10px] font-mono uppercase tracking-widest mb-4 ${muted}`}>Sebaran per Jurusan</div>
                  {analytics.jurusanRows.length === 0 ? <EmptyChart muted={muted} /> : <HBarChart rows={analytics.jurusanRows} isDark={isDark} muted={muted} accent="#f59e0b" />}
                </div>
                <div className={`rounded-2xl border p-5 ${card}`}>
                  <div className={`text-[10px] font-mono uppercase tracking-widest mb-4 ${muted}`}>Sebaran per Tahun Lulus</div>
                  {analytics.tahunRows.length === 0 ? <EmptyChart muted={muted} /> : <VBarChart rows={analytics.tahunRows} isDark={isDark} muted={muted} />}
                </div>
              </div>
            )}

            {/* Insights */}
            {entries.length > 0 && (
              <div className={`rounded-2xl border p-5 ${card}`}>
                <div className={`text-[10px] font-mono uppercase tracking-widest mb-4 ${muted}`}>Insight Cepat</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Jurusan Terbanyak", value: analytics.jurusanRows[0]?.label ?? "-", sub: analytics.jurusanRows[0] ? `${analytics.jurusanRows[0].value} alumni` : "" },
                    { label: "Tahun Lulus Terbanyak", value: analytics.tahunRows.sort((a,b) => b.value - a.value)[0]?.label ?? "-", sub: "" },
                    { label: "Gaji Dominan", value: analytics.gajiRows[0]?.label ?? "-", sub: analytics.gajiRows[0] ? `${pct(analytics.gajiRows[0].value, stats.bekerja)}% pekerja` : "data belum ada" },
                    { label: "Relevansi Dominan", value: analytics.relevansiRows[0]?.label ?? "-", sub: analytics.relevansiRows[0] ? `${pct(analytics.relevansiRows[0].value, stats.bekerja)}% pekerja` : "data belum ada" },
                  ].map(it => (
                    <div key={it.label} className={`rounded-xl p-3 ${isDark ? "bg-slate-800/50" : "bg-slate-50"}`}>
                      <div className={`text-[9px] font-mono uppercase tracking-widest ${muted}`}>{it.label}</div>
                      <div className={`text-sm font-bold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>{it.value}</div>
                      {it.sub && <div className={`text-[10px] font-mono mt-0.5 text-amber-500`}>{it.sub}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entries.length === 0 && !loading && (
              <div className={`rounded-2xl border py-20 text-center ${card}`}>
                <Users className={`w-12 h-12 mx-auto mb-3 ${muted}`} />
                <div className={`text-base font-semibold mb-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>Belum ada data responden</div>
                <div className={`text-sm ${muted}`}>Data akan muncul setelah alumni mengisi formulir Tracer Studi.</div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: DATA ─────────────────────────────────────────────── */}
        {activeTab === "data" && (
          <div className="space-y-4">
            {/* Filters bar */}
            <div className={`rounded-2xl border p-4 ${card}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${muted}`} />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cari nama, perusahaan, universitas, kota…"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${input}`} />
                  {search && <button onClick={() => setSearch("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} hover:text-red-400`}><X className="w-3.5 h-3.5" /></button>}
                </div>
                {[
                  { value: filterStatus, set: setFilterStatus, options: [["","Semua Status"],["bekerja","Bekerja"],["kuliah","Kuliah"],["wirausaha","Wirausaha"],["belum_bekerja","Belum Bekerja"]], placeholder: "Status" },
                  { value: filterJurusan, set: setFilterJurusan, options: [["","Semua Jurusan"], ...allJurusan.map(j => [j,j])], placeholder: "Jurusan" },
                  { value: filterTahun, set: setFilterTahun, options: [["","Semua Tahun"], ...allTahun.map(t => [t,t])], placeholder: "Tahun" },
                  { value: filterKota, set: setFilterKota, options: [["","Semua Kota"], ...allKota.map(k => [k,k])], placeholder: "Kota" },
                  { value: filterGaji, set: setFilterGaji, options: [["","Semua Gaji"], ...GAJI_ORDER.map(k => [k, GAJI_LABELS[k]])], placeholder: "Gaji" },
                ].map((f, i) => (
                  <div key={i} className="relative">
                    <select value={f.value} onChange={e => { f.set(e.target.value); setPage(1); }}
                      className={`appearance-none pl-3 pr-7 py-2.5 rounded-xl border text-[10px] font-mono uppercase tracking-widest outline-none cursor-pointer ${input} max-w-[130px]`}>
                      {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${muted}`} />
                  </div>
                ))}
                {hasFilters && (
                  <button onClick={clearFilters} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-colors ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                    <X className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
              <div className={`mt-3 pt-3 border-t flex items-center justify-between text-[10px] font-mono ${isDark ? "border-white/5 text-slate-500" : "border-slate-100 text-slate-400"}`}>
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3" />
                  <span>Menampilkan <span className="text-amber-500 font-bold">{filtered.length}</span> dari <span className="font-bold">{entries.length}</span> data</span>
                  {hasFilters && <span className="text-amber-500/70">— difilter</span>}
                </div>
                {selected.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-bold">{selected.size} dipilih</span>
                    <button onClick={handleBulkDelete} disabled={bulkDeleting}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                      {bulkDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Hapus {selected.size} data
                    </button>
                    <button onClick={clearSelect} className="px-2 py-1 rounded-lg text-slate-400 hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-24"><RefreshCw className="w-6 h-6 text-amber-500 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className={`rounded-2xl border py-16 text-center ${card}`}>
                <Users className={`w-10 h-10 mx-auto mb-3 ${muted}`} />
                <div className={`text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {entries.length === 0 ? "Belum ada data responden" : "Tidak ada data yang sesuai filter"}
                </div>
                <div className={`text-xs ${muted}`}>{entries.length === 0 ? "Data akan muncul setelah alumni mengisi Tracer Studi." : "Coba ubah filter atau kata kunci pencarian."}</div>
              </div>
            ) : (
              <>
                {/* Select-all row */}
                <div className={`rounded-xl border px-4 py-2 flex items-center gap-3 text-[10px] font-mono ${card} ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  <button onClick={allPageSelected ? clearSelect : selectAll} className="flex items-center gap-2 hover:text-amber-500 transition-colors">
                    {allPageSelected ? <CheckSquare className="w-3.5 h-3.5 text-amber-500" /> : <Square className="w-3.5 h-3.5" />}
                    <span className="uppercase tracking-widest">{allPageSelected ? "Batal Pilih" : `Pilih ${paginated.length} di halaman ini`}</span>
                  </button>
                  {selected.size > 0 && <span className="text-amber-500 font-bold ml-auto">{selected.size} dipilih total</span>}
                </div>

                <div className="space-y-1.5">
                  {paginated.map((entry, idx) => (
                    <motion.div key={entry.id} initial={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                      className={`rounded-2xl border overflow-hidden transition-colors ${card} ${selected.has(entry.id) ? (isDark ? "border-amber-500/30 bg-amber-500/5" : "border-amber-300 bg-amber-50/50") : ""}`}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button onClick={() => toggleSelect(entry.id)} className={`shrink-0 transition-colors ${muted} hover:text-amber-500`}>
                          {selected.has(entry.id) ? <CheckSquare className="w-4 h-4 text-amber-500" /> : <Square className="w-4 h-4" />}
                        </button>
                        <div className={`w-5 text-center text-[10px] font-mono shrink-0 ${muted}`}>{(page - 1) * PAGE_SIZE + idx + 1}</div>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.status === "bekerja" ? "bg-emerald-500" : entry.status === "kuliah" ? "bg-blue-500" : entry.status === "wirausaha" ? "bg-violet-500" : "bg-slate-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>{entry.nama}</span>
                            <span className={`text-[9px] font-mono uppercase tracking-widest border rounded-full px-2 py-0.5 ${STATUS_COLORS[entry.status]}`}>{STATUS_LABELS[entry.status]}</span>
                          </div>
                          <div className={`text-[10px] font-mono mt-0.5 ${muted}`}>
                            {entry.jurusan} · Lulus {entry.tahunLulus}
                            {entry.namaPerusahaan && ` · ${entry.namaPerusahaan}`}
                            {entry.universitas && ` · ${entry.universitas}`}
                            {entry.namaUsaha && ` · ${entry.namaUsaha}`}
                            {entry.kota && ` · ${entry.kota}`}
                          </div>
                        </div>
                        <div className={`hidden md:block text-[10px] font-mono shrink-0 ${muted}`}>{formatDate(entry.createdAt)}</div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/8 text-slate-400" : "hover:bg-slate-100 text-slate-400"}`}>
                            {expandedId === entry.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleDelete(entry.id, entry.nama)} disabled={deletingId === entry.id}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                            {deletingId === entry.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {expandedId === entry.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className={`px-4 pb-4 pt-2 border-t ${divider}`}>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4 pt-2">
                                <DetailField label="Jurusan" value={entry.jurusan} icon={BookOpen} isDark={isDark} muted={muted} />
                                <DetailField label="Tahun Lulus" value={entry.tahunLulus} icon={GraduationCap} isDark={isDark} muted={muted} />
                                <DetailField label="Status" value={STATUS_LABELS[entry.status]} icon={TrendingUp} isDark={isDark} muted={muted} />
                                <DetailField label="Tgl. Mengisi" value={formatDateFull(entry.createdAt)} icon={Clock} isDark={isDark} muted={muted} />
                                {entry.status === "bekerja" && <>
                                  {entry.namaPerusahaan && <DetailField label="Perusahaan" value={entry.namaPerusahaan} icon={Building2} isDark={isDark} muted={muted} />}
                                  {entry.posisi && <DetailField label="Posisi / Jabatan" value={entry.posisi} icon={Briefcase} isDark={isDark} muted={muted} />}
                                  {entry.kota && <DetailField label="Kota Kerja" value={entry.kota} icon={MapPin} isDark={isDark} muted={muted} />}
                                  {entry.relevansiJurusan && <DetailField label="Relevansi Jurusan" value={RELEVANCE_LABELS[entry.relevansiJurusan] ?? entry.relevansiJurusan} icon={Target} isDark={isDark} muted={muted} />}
                                  {entry.rentangGaji && <DetailField label="Rentang Gaji" value={GAJI_LABELS[entry.rentangGaji] ?? entry.rentangGaji} icon={Banknote} isDark={isDark} muted={muted} />}
                                </>}
                                {entry.status === "kuliah" && <>
                                  {entry.universitas && <DetailField label="Universitas" value={entry.universitas} icon={GraduationCap} isDark={isDark} muted={muted} />}
                                  {entry.programStudi && <DetailField label="Program Studi" value={entry.programStudi} icon={BookOpen} isDark={isDark} muted={muted} />}
                                  {entry.jalurMasuk && <DetailField label="Jalur Masuk" value={entry.jalurMasuk} icon={CheckCircle2} isDark={isDark} muted={muted} />}
                                </>}
                                {entry.status === "wirausaha" && <>
                                  {entry.namaUsaha && <DetailField label="Nama Usaha" value={entry.namaUsaha} icon={Store} isDark={isDark} muted={muted} />}
                                  {entry.bidangUsaha && <DetailField label="Bidang Usaha" value={entry.bidangUsaha} icon={Briefcase} isDark={isDark} muted={muted} />}
                                  {entry.tahunBerdiri && <DetailField label="Tahun Berdiri" value={entry.tahunBerdiri} icon={Clock} isDark={isDark} muted={muted} />}
                                </>}
                                {entry.status === "belum_bekerja" && entry.alasanBelumBekerja && (
                                  <DetailField label="Alasan" value={entry.alasanBelumBekerja} icon={AlertCircle} isDark={isDark} muted={muted} />
                                )}
                                {entry.whatsapp && <DetailField label="WhatsApp" value={entry.whatsapp} icon={Phone} isDark={isDark} muted={muted} />}
                                {entry.email && <DetailField label="Email" value={entry.email} icon={Mail} isDark={isDark} muted={muted} />}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <div className={`text-[10px] font-mono ${muted}`}>
                      Halaman {page} dari {totalPages} · {filtered.length} total
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(1)} disabled={page === 1} className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${isDark ? "text-slate-400 hover:bg-white/8" : "text-slate-500 hover:bg-slate-100"}`}>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                        return start + i;
                      }).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded-lg text-[10px] font-bold font-mono transition-colors ${p === page ? "bg-amber-500 text-slate-950" : isDark ? "text-slate-400 hover:bg-white/8" : "text-slate-500 hover:bg-slate-100"}`}>
                          {p}
                        </button>
                      ))}
                      <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${isDark ? "text-slate-400 hover:bg-white/8" : "text-slate-500 hover:bg-slate-100"}`}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TAB: ANALITIK ─────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          entries.length === 0 ? (
            <div className={`rounded-2xl border py-20 text-center ${card}`}>
              <BarChart3 className={`w-12 h-12 mx-auto mb-3 ${muted}`} />
              <div className={`text-base font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Belum ada data untuk dianalisis</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Status */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${muted}`}>Distribusi Status Alumni</div>
                <div className={`text-xs font-medium mb-4 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{stats.total} responden total</div>
                <div className="flex items-center gap-5">
                  <DonutChart data={analytics.statusRows} total={stats.total} isDark={isDark} size={100} />
                  <div className="space-y-2.5 flex-1">
                    {analytics.statusRows.map(r => (
                      <div key={r.label}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.hex }} />
                          <span className={`text-xs font-medium flex-1 ${isDark ? "text-slate-200" : "text-slate-700"}`}>{r.label}</span>
                          <span className={`text-xs font-bold tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{r.value}</span>
                          <span className={`text-[10px] font-mono w-8 text-right ${muted}`}>{pct(r.value, stats.total)}%</span>
                        </div>
                        <div className={`h-1.5 rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                          <div className="h-full rounded-full" style={{ width: `${pct(r.value, stats.total)}%`, background: r.hex }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gaji */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${muted}`}>Rentang Gaji Lulusan Bekerja</div>
                <div className={`text-xs font-medium mb-4 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{stats.bekerja} responden bekerja</div>
                {analytics.gajiRows.length === 0 ? <EmptyChart muted={muted} /> : <HBarChart rows={analytics.gajiRows} isDark={isDark} muted={muted} accent="#10b981" showPct total={stats.bekerja} />}
              </div>

              {/* Jurusan */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${muted}`}>Sebaran per Program Keahlian</div>
                <div className={`text-xs font-medium mb-4 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{analytics.jurusanRows.length} program keahlian</div>
                {analytics.jurusanRows.length === 0 ? <EmptyChart muted={muted} /> : <HBarChart rows={analytics.jurusanRows} isDark={isDark} muted={muted} accent="#f59e0b" showPct total={stats.total} />}
              </div>

              {/* Relevansi */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${muted}`}>Relevansi Pekerjaan dengan Jurusan</div>
                <div className={`text-xs font-medium mb-4 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{stats.bekerja} responden bekerja</div>
                {analytics.relevansiRows.length === 0 ? <EmptyChart muted={muted} /> : (
                  <div className="space-y-2.5">
                    {analytics.relevansiRows.map(r => (
                      <div key={r.label}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium flex-1 ${isDark ? "text-slate-200" : "text-slate-700"}`}>{r.label}</span>
                          <span className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{r.value}</span>
                          <span className={`text-[10px] font-mono w-8 text-right ${muted}`}>{pct(r.value, stats.bekerja)}%</span>
                        </div>
                        <div className={`h-1.5 rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                          <div className="h-full rounded-full" style={{ width: `${pct(r.value, stats.bekerja)}%`, background: r.hex }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tahun */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${muted}`}>Sebaran per Tahun Lulus</div>
                <div className={`text-xs font-medium mb-4 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{analytics.tahunRows.length} angkatan</div>
                {analytics.tahunRows.length === 0 ? <EmptyChart muted={muted} /> : <VBarChart rows={analytics.tahunRows} isDark={isDark} muted={muted} />}
              </div>

              {/* Kota */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${muted}`}>Top 8 Kota Domisili / Kerja</div>
                <div className={`text-xs font-medium mb-4 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{analytics.kotaRows.length} kota teratas</div>
                {analytics.kotaRows.length === 0 ? <EmptyChart muted={muted} /> : <HBarChart rows={analytics.kotaRows} isDark={isDark} muted={muted} accent="#8b5cf6" showPct total={stats.total} />}
              </div>

              {/* Jalur Masuk Kuliah */}
              {analytics.jalurRows.length > 0 && (
                <div className={`rounded-2xl border p-5 ${card}`}>
                  <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${muted}`}>Jalur Masuk Perguruan Tinggi</div>
                  <div className={`text-xs font-medium mb-4 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{stats.kuliah} responden kuliah</div>
                  <HBarChart rows={analytics.jalurRows} isDark={isDark} muted={muted} accent="#3b82f6" showPct total={stats.kuliah} />
                </div>
              )}

            </div>
          )
        )}

        {/* ── TAB: EKSPOR ───────────────────────────────────────────── */}
        {activeTab === "export" && (
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Filter info banner */}
            {hasFilters && (
              <div className={`rounded-xl border px-4 py-3 flex items-center gap-2.5 text-sm ${isDark ? "bg-amber-500/8 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                <Filter className="w-4 h-4 shrink-0" />
                <span>Filter aktif — semua ekspor akan menggunakan <strong>{filtered.length} data</strong> yang terfilter (dari {entries.length} total).</span>
                <button onClick={clearFilters} className="ml-auto shrink-0 underline text-xs">Hapus filter</button>
              </div>
            )}

            {/* Export cards */}
            {[
              {
                icon: FileSpreadsheet, color: "text-emerald-500", cbg: isDark ? "bg-emerald-500/10" : "bg-emerald-50",
                title: "Export Excel (.xlsx)",
                desc: "File Excel profesional dengan 3 sheet: Ringkasan Statistik, Data Responden Lengkap, dan Sebaran per Jurusan.",
                tags: ["3 Sheet", "Auto-width kolom", "Statistik lengkap"],
                action: exportExcel, label: "Download Excel",
                disabled: filtered.length === 0,
              },
              {
                icon: FileText, color: "text-red-400", cbg: isDark ? "bg-red-500/10" : "bg-red-50",
                title: "Export PDF Laporan (.pdf)",
                desc: "Laporan PDF 3 halaman: Cover + KPI, Analitik Lanjutan, dan Tabel Data Lengkap. Siap cetak dan presentasi.",
                tags: ["3 Halaman", "Letterhead sekolah", "Siap cetak"],
                action: exportPDF, label: exportingPdf ? "Memproses..." : "Download PDF",
                disabled: filtered.length === 0 || exportingPdf,
                loading: exportingPdf,
              },
              {
                icon: Download, color: "text-blue-400", cbg: isDark ? "bg-blue-500/10" : "bg-blue-50",
                title: "Export CSV (.csv)",
                desc: "Format CSV universal dengan BOM UTF-8. Kompatibel dengan Excel, Google Sheets, dan aplikasi analisis data.",
                tags: ["UTF-8 BOM", "Semua kolom", "Universal"],
                action: exportCSV, label: "Download CSV",
                disabled: filtered.length === 0,
              },
              {
                icon: Printer, color: "text-amber-500", cbg: isDark ? "bg-amber-500/10" : "bg-amber-50",
                title: "Cetak / Print",
                desc: "Buka dialog cetak browser untuk mencetak halaman ini atau menyimpan sebagai PDF melalui printer virtual.",
                tags: ["Browser print", "Tanpa instalasi", "Cepat"],
                action: handlePrint, label: "Cetak Sekarang",
                disabled: false,
              },
            ].map((item) => (
              <div key={item.title} className={`rounded-2xl border p-5 flex items-start gap-4 ${card}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.cbg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>{item.title}</div>
                  <div className={`text-xs mb-3 leading-relaxed ${muted}`}>{item.desc}</div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.tags.map(t => (
                      <span key={t} className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{t}</span>
                    ))}
                  </div>
                  <button onClick={item.action} disabled={item.disabled}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      item.color.includes("emerald") ? "bg-emerald-500 hover:bg-emerald-400 text-white" :
                      item.color.includes("red") ? "bg-red-500 hover:bg-red-400 text-white" :
                      item.color.includes("blue") ? "bg-blue-500 hover:bg-blue-400 text-white" :
                      "bg-amber-500 hover:bg-amber-400 text-slate-950"
                    }`}>
                    {(item as any).loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <item.icon className="w-3.5 h-3.5" />}
                    {item.label}
                    {!item.disabled && filtered.length > 0 && <span className="opacity-70">({filtered.length})</span>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════════════════════ */

function DetailField({ label, value, icon: Icon, isDark, muted }: {
  label: string; value: string; icon: React.ElementType; isDark: boolean; muted: string;
}) {
  return (
    <div>
      <div className={`flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest mb-0.5 ${muted}`}>
        <Icon className="w-2.5 h-2.5" /> {label}
      </div>
      <div className={`text-xs font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>{value}</div>
    </div>
  );
}

function EmptyChart({ muted }: { muted: string }) {
  return <div className={`flex items-center justify-center h-20 text-[10px] font-mono ${muted}`}>Belum ada data</div>;
}

function DonutChart({ data, total, isDark, size = 90 }: {
  data: { label: string; value: number; hex: string }[];
  total: number; isDark: boolean; size?: number;
}) {
  if (total === 0 || data.length === 0) return <EmptyChart muted={isDark ? "text-slate-500" : "text-slate-400"} />;
  const cx = 56, cy = 56, outerR = 50, innerR = 32;
  let cumulative = 0;
  function arc(startAng: number, endAng: number): string {
    const toRad = (a: number) => (a - 90) * (Math.PI / 180);
    const s = toRad(startAng), e = toRad(endAng);
    const x1 = cx + outerR * Math.cos(s), y1 = cy + outerR * Math.sin(s);
    const x2 = cx + outerR * Math.cos(e), y2 = cy + outerR * Math.sin(e);
    const x3 = cx + innerR * Math.cos(e), y3 = cy + innerR * Math.sin(e);
    const x4 = cx + innerR * Math.cos(s), y4 = cy + innerR * Math.sin(s);
    const large = endAng - startAng > 180 ? 1 : 0;
    return `M${x1},${y1} A${outerR},${outerR} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${large} 0 ${x4},${y4} Z`;
  }
  const slices = data.map(d => {
    const startDeg = (cumulative / total) * 360;
    cumulative += d.value;
    return { ...d, startDeg, endDeg: (cumulative / total) * 360 };
  });
  return (
    <svg viewBox="0 0 112 112" width={size} height={size} className="shrink-0">
      {slices.map(s => <path key={s.label} d={arc(s.startDeg, s.endDeg)} fill={s.hex} opacity={0.9} />)}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="14" fontWeight="700" fill={isDark ? "#f1f5f9" : "#0f172a"} fontFamily="Georgia, serif">{total}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill={isDark ? "#64748b" : "#94a3b8"} fontFamily="monospace" letterSpacing="0.05em">TOTAL</text>
    </svg>
  );
}

function HBarChart({ rows, isDark, muted, accent = "#f59e0b", showPct = false, total = 0 }: {
  rows: { label: string; value: number; hex?: string }[];
  isDark: boolean; muted: string; accent?: string; showPct?: boolean; total?: number;
}) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div className="space-y-2.5">
      {rows.map(r => (
        <div key={r.label}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-mono leading-tight truncate max-w-[180px] ${muted}`} title={r.label}>{r.label}</span>
            <div className="flex items-center gap-2 ml-2 shrink-0">
              <span className={`text-[11px] font-bold tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{r.value}</span>
              {showPct && total > 0 && <span className={`text-[9px] font-mono w-7 text-right ${muted}`}>{pct(r.value, total)}%</span>}
            </div>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(r.value / max) * 100}%`, background: r.hex ?? accent }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function VBarChart({ rows, isDark, muted }: { rows: { label: string; value: number }[]; isDark: boolean; muted: string }) {
  const max = Math.max(...rows.map(r => r.value), 1);
  const barH = 100;
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-2 min-w-0" style={{ height: barH + 30 }}>
        {rows.map(r => {
          const h = Math.max(4, Math.round((r.value / max) * barH));
          return (
            <div key={r.label} className="flex flex-col items-center flex-1 min-w-[28px] max-w-[52px]">
              <span className={`text-[9px] font-bold tabular-nums mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>{r.value}</span>
              <div className="w-full rounded-t-md bg-amber-500 transition-all duration-700" style={{ height: h }} />
              <span className={`text-[9px] font-mono mt-1.5 text-center leading-tight ${muted}`}
                style={{ writingMode: rows.length > 5 ? "vertical-rl" : "horizontal-tb", transform: rows.length > 5 ? "rotate(180deg)" : undefined }}>
                {r.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
