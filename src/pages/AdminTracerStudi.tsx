import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3, Briefcase, GraduationCap, Store, Users, Search, Trash2,
  ChevronDown, ChevronUp, Download, RefreshCw, LogOut, KeyRound,
  Lock, ArrowLeft, Filter, X, CheckCircle2, AlertCircle, Clock,
  Phone, Mail, MapPin, Building2, BookOpen, TrendingUp, Eye, EyeOff,
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

const STATUS_LABELS: Record<string, string> = {
  bekerja: "Bekerja",
  kuliah: "Kuliah",
  wirausaha: "Wirausaha",
  belum_bekerja: "Belum Bekerja",
};

const STATUS_COLORS: Record<string, string> = {
  bekerja: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  kuliah: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  wirausaha: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  belum_bekerja: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

const GAJI_LABELS: Record<string, string> = {
  lt2: "< Rp2 Juta",
  "2-4": "Rp2 – 4 Juta",
  "4-6": "Rp4 – 6 Juta",
  gt6: "> Rp6 Juta",
};

const RELEVANCE_LABELS: Record<string, string> = {
  sangat_relevan: "Sangat Relevan",
  relevan: "Relevan",
  cukup_relevan: "Cukup Relevan",
  tidak_relevan: "Tidak Relevan",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

export default function AdminTracerStudi({ theme = "dark", onBack }: {
  theme?: "light" | "dark";
  onBack: () => void;
}) {
  const isDark = theme === "dark";

  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    typeof window !== "undefined" && !!localStorage.getItem("smkn1_adm_token")
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [entries, setEntries] = useState<TracerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJurusan, setFilterJurusan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showFeedback = (msg: string, type: "success" | "error" = "success") => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const loadEntries = () => {
    setLoading(true);
    fetch("/api/tracer")
      .then((r) => r.json())
      .then((d: TracerEntry[]) => { setEntries(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { showFeedback("Gagal memuat data!", "error"); setLoading(false); });
  };

  useEffect(() => {
    if (isLoggedIn) loadEntries();
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    setTimeout(() => {
      if (username === "superadmin" && password === "wonogiri-unggul") {
        localStorage.setItem("smkn1_adm_token", "superadmin_active_session_token_wonogiri");
        setIsLoggedIn(true);
      } else {
        setLoginError("Kombinasi User Name atau Sandi salah.");
      }
      setLoginLoading(false);
    }, 700);
  };

  const handleLogout = () => {
    localStorage.removeItem("smkn1_adm_token");
    setIsLoggedIn(false);
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!window.confirm(`Hapus data alumni "${nama}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tracer/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        if (expandedId === id) setExpandedId(null);
        showFeedback(`Data "${nama}" berhasil dihapus.`);
      } else {
        showFeedback("Gagal menghapus data.", "error");
      }
    } catch {
      showFeedback("Gagal menghapus data.", "error");
    }
    setDeletingId(null);
  };

  const allJurusan = useMemo(() => [...new Set(entries.map((e) => e.jurusan))].sort(), [entries]);
  const allTahun = useMemo(() => [...new Set(entries.map((e) => e.tahunLulus))].sort((a, b) => Number(b) - Number(a)), [entries]);

  const filtered = useMemo(() => {
    let r = [...entries];
    if (filterStatus) r = r.filter((e) => e.status === filterStatus);
    if (filterJurusan) r = r.filter((e) => e.jurusan === filterJurusan);
    if (filterTahun) r = r.filter((e) => e.tahunLulus === filterTahun);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((e) =>
        e.nama.toLowerCase().includes(q) ||
        e.jurusan.toLowerCase().includes(q) ||
        (e.namaPerusahaan ?? "").toLowerCase().includes(q) ||
        (e.universitas ?? "").toLowerCase().includes(q) ||
        (e.namaUsaha ?? "").toLowerCase().includes(q)
      );
    }
    return r.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [entries, filterStatus, filterJurusan, filterTahun, search]);

  const stats = useMemo(() => {
    const total = entries.length;
    return {
      total,
      bekerja: entries.filter((e) => e.status === "bekerja").length,
      kuliah: entries.filter((e) => e.status === "kuliah").length,
      wirausaha: entries.filter((e) => e.status === "wirausaha").length,
      belum_bekerja: entries.filter((e) => e.status === "belum_bekerja").length,
    };
  }, [entries]);

  const exportCSV = () => {
    const headers = [
      "ID", "Nama", "Jurusan", "Tahun Lulus", "Status",
      "Perusahaan/Universitas/Usaha", "Posisi/Prodi/Bidang", "Kota", "Relevansi",
      "Gaji", "Jalur Masuk", "Tahun Berdiri", "Alasan", "WhatsApp", "Email", "Tanggal Isi",
    ];
    const rows = filtered.map((e) => [
      e.id, e.nama, e.jurusan, e.tahunLulus, STATUS_LABELS[e.status] ?? e.status,
      e.namaPerusahaan ?? e.universitas ?? e.namaUsaha ?? "",
      e.posisi ?? e.programStudi ?? e.bidangUsaha ?? "",
      e.kota ?? "", RELEVANCE_LABELS[e.relevansiJurusan ?? ""] ?? "",
      GAJI_LABELS[e.rentangGaji ?? ""] ?? "",
      e.jalurMasuk ?? "", e.tahunBerdiri ?? "",
      e.alasanBelumBekerja ?? "",
      e.whatsapp ?? "", e.email ?? "",
      formatDate(e.createdAt),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracer-studi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback(`${filtered.length} data berhasil diekspor ke CSV.`);
  };

  const clearFilters = () => {
    setSearch(""); setFilterStatus(""); setFilterJurusan(""); setFilterTahun("");
  };
  const hasFilters = search || filterStatus || filterJurusan || filterTahun;

  const bg = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const card = isDark ? "bg-slate-900 border-white/8" : "bg-white border-slate-200";
  const input = isDark
    ? "bg-slate-800 border-white/10 text-white placeholder-slate-500 focus:border-amber-500/40"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const isDarkTheme = isDark;

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
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="superadmin"
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${input}`}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${muted}`}>Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition-colors ${input}`}
                    autoComplete="current-password"
                  />
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

  return (
    <div className={`min-h-screen relative z-10 ${bg}`}>
      {/* Feedback toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
              feedback.type === "success"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={`sticky top-0 z-50 border-b backdrop-blur-xl ${isDark ? "bg-slate-950/90 border-white/8" : "bg-white/90 border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${isDark ? "text-slate-500 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"}`}>
              <ArrowLeft className="w-3.5 h-3.5" /> Beranda
            </button>
            <div className={`w-px h-4 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Tracer Studi</span>
              <span className={`text-[10px] font-mono uppercase tracking-widest ${muted}`}>— Dashboard Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`hidden md:block text-[10px] font-mono uppercase tracking-widest ${muted}`}>superadmin</span>
            <button onClick={handleLogout}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-widest transition-colors ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <LogOut className="w-3 h-3" /> Keluar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-10 py-10">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { icon: Users, label: "Total Responden", count: stats.total, color: "text-amber-500", cbg: isDark ? "bg-amber-500/10" : "bg-amber-50" },
            { icon: Briefcase, label: "Bekerja", count: stats.bekerja, color: "text-emerald-500", cbg: isDark ? "bg-emerald-500/10" : "bg-emerald-50" },
            { icon: GraduationCap, label: "Kuliah", count: stats.kuliah, color: "text-blue-500", cbg: isDark ? "bg-blue-500/10" : "bg-blue-50" },
            { icon: Store, label: "Wirausaha", count: stats.wirausaha, color: "text-violet-500", cbg: isDark ? "bg-violet-500/10" : "bg-violet-50" },
            { icon: Clock, label: "Belum Bekerja", count: stats.belum_bekerja, color: "text-slate-400", cbg: isDark ? "bg-slate-500/10" : "bg-slate-100" },
          ].map(({ icon: Icon, label, count, color, cbg }) => (
            <div key={label} className={`rounded-2xl border p-4 flex items-center gap-3 ${card}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cbg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <div className={`text-xl font-bold font-serif ${color}`}>{count}</div>
                <div className={`text-[9px] font-mono uppercase tracking-widest leading-tight ${muted}`}>{label}</div>
                {stats.total > 0 && count > 0 && (
                  <div className={`text-[9px] font-mono ${color} opacity-70`}>{pct(count, stats.total)}%</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Filters + Actions Bar */}
        <div className={`rounded-2xl border p-4 mb-5 ${card}`}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${muted}`} />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, perusahaan, universitas…"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${input}`}
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-xs font-mono uppercase tracking-widest outline-none transition-colors cursor-pointer ${input}`}>
                <option value="">Semua Status</option>
                <option value="bekerja">Bekerja</option>
                <option value="kuliah">Kuliah</option>
                <option value="wirausaha">Wirausaha</option>
                <option value="belum_bekerja">Belum Bekerja</option>
              </select>
              <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${muted}`} />
            </div>

            {/* Jurusan filter */}
            <div className="relative">
              <select value={filterJurusan} onChange={(e) => setFilterJurusan(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-xs font-mono uppercase tracking-widest outline-none transition-colors cursor-pointer ${input} max-w-[160px]`}>
                <option value="">Semua Jurusan</option>
                {allJurusan.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
              <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${muted}`} />
            </div>

            {/* Tahun filter */}
            <div className="relative">
              <select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-xs font-mono uppercase tracking-widest outline-none transition-colors cursor-pointer ${input}`}>
                <option value="">Semua Tahun</option>
                {allTahun.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${muted}`} />
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-colors ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                <X className="w-3 h-3" /> Reset
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button onClick={loadEntries} disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-colors ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
              <button onClick={exportCSV} disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-[10px] font-bold font-mono uppercase tracking-widest transition-colors">
                <Download className="w-3 h-3" /> Export CSV
              </button>
            </div>
          </div>

          {/* Filter summary */}
          <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-[10px] font-mono ${isDark ? "border-white/5 text-slate-500" : "border-slate-100 text-slate-400"}`}>
            <Filter className="w-3 h-3" />
            Menampilkan <span className="text-amber-500 font-bold">{filtered.length}</span> dari <span className="font-bold">{entries.length}</span> data
            {hasFilters && <span className="text-amber-500/70">— difilter</span>}
          </div>
        </div>

        {/* Table / Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`rounded-2xl border py-16 text-center ${card}`}>
            <Users className={`w-10 h-10 mx-auto mb-3 ${muted}`} />
            <div className={`text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              {entries.length === 0 ? "Belum ada data responden" : "Tidak ada data yang sesuai filter"}
            </div>
            <div className={`text-xs ${muted}`}>
              {entries.length === 0 ? "Data akan muncul setelah alumni mengisi Tracer Studi." : "Coba ubah filter atau kata kunci pencarian."}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className={`rounded-2xl border overflow-hidden ${card}`}
              >
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  {/* Number */}
                  <div className={`w-6 text-center text-[10px] font-mono shrink-0 ${muted}`}>{idx + 1}</div>

                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    entry.status === "bekerja" ? "bg-emerald-500" :
                    entry.status === "kuliah" ? "bg-blue-500" :
                    entry.status === "wirausaha" ? "bg-violet-500" : "bg-slate-400"
                  }`} />

                  {/* Name + info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm truncate ${isDark ? "text-white" : "text-slate-900"}`}>{entry.nama}</span>
                      <span className={`text-[9px] font-mono uppercase tracking-widest border rounded-full px-2 py-0.5 ${STATUS_COLORS[entry.status]}`}>
                        {STATUS_LABELS[entry.status]}
                      </span>
                    </div>
                    <div className={`text-[10px] font-mono mt-0.5 truncate ${muted}`}>
                      {entry.jurusan} · Lulus {entry.tahunLulus}
                      {entry.namaPerusahaan && ` · ${entry.namaPerusahaan}`}
                      {entry.universitas && ` · ${entry.universitas}`}
                      {entry.namaUsaha && ` · ${entry.namaUsaha}`}
                    </div>
                  </div>

                  {/* Date */}
                  <div className={`hidden md:block text-[10px] font-mono shrink-0 ${muted}`}>
                    {formatDate(entry.createdAt)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/8 text-slate-400" : "hover:bg-slate-100 text-slate-400"}`}
                      title="Lihat detail"
                    >
                      {expandedId === entry.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id, entry.nama)}
                      disabled={deletingId === entry.id}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      title="Hapus"
                    >
                      {deletingId === entry.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedId === entry.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-4 pb-4 pt-1 border-t ${isDark ? "border-white/5" : "border-slate-100"}`}>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 pt-3">

                          {/* Always-present fields */}
                          <DetailField label="Jurusan" value={entry.jurusan} icon={BookOpen} isDark={isDark} muted={muted} />
                          <DetailField label="Tahun Lulus" value={entry.tahunLulus} icon={GraduationCap} isDark={isDark} muted={muted} />
                          <DetailField label="Status" value={STATUS_LABELS[entry.status]} icon={TrendingUp} isDark={isDark} muted={muted} />
                          <DetailField label="Tgl. Mengisi" value={formatDate(entry.createdAt)} icon={Clock} isDark={isDark} muted={muted} />

                          {/* Bekerja */}
                          {entry.status === "bekerja" && <>
                            {entry.namaPerusahaan && <DetailField label="Perusahaan" value={entry.namaPerusahaan} icon={Building2} isDark={isDark} muted={muted} />}
                            {entry.posisi && <DetailField label="Posisi / Jabatan" value={entry.posisi} icon={Briefcase} isDark={isDark} muted={muted} />}
                            {entry.kota && <DetailField label="Kota Kerja" value={entry.kota} icon={MapPin} isDark={isDark} muted={muted} />}
                            {entry.relevansiJurusan && <DetailField label="Relevansi Jurusan" value={RELEVANCE_LABELS[entry.relevansiJurusan] ?? entry.relevansiJurusan} icon={CheckCircle2} isDark={isDark} muted={muted} />}
                            {entry.rentangGaji && <DetailField label="Rentang Gaji" value={GAJI_LABELS[entry.rentangGaji] ?? entry.rentangGaji} icon={TrendingUp} isDark={isDark} muted={muted} />}
                          </>}

                          {/* Kuliah */}
                          {entry.status === "kuliah" && <>
                            {entry.universitas && <DetailField label="Universitas" value={entry.universitas} icon={GraduationCap} isDark={isDark} muted={muted} />}
                            {entry.programStudi && <DetailField label="Program Studi" value={entry.programStudi} icon={BookOpen} isDark={isDark} muted={muted} />}
                            {entry.jalurMasuk && <DetailField label="Jalur Masuk" value={entry.jalurMasuk} icon={CheckCircle2} isDark={isDark} muted={muted} />}
                          </>}

                          {/* Wirausaha */}
                          {entry.status === "wirausaha" && <>
                            {entry.namaUsaha && <DetailField label="Nama Usaha" value={entry.namaUsaha} icon={Store} isDark={isDark} muted={muted} />}
                            {entry.bidangUsaha && <DetailField label="Bidang Usaha" value={entry.bidangUsaha} icon={Briefcase} isDark={isDark} muted={muted} />}
                            {entry.tahunBerdiri && <DetailField label="Tahun Berdiri" value={entry.tahunBerdiri} icon={Clock} isDark={isDark} muted={muted} />}
                          </>}

                          {/* Belum bekerja */}
                          {entry.status === "belum_bekerja" && entry.alasanBelumBekerja && (
                            <DetailField label="Alasan" value={entry.alasanBelumBekerja} icon={AlertCircle} isDark={isDark} muted={muted} />
                          )}

                          {/* Contact */}
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
        )}
      </div>
    </div>
  );
}

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
