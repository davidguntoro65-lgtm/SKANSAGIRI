import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, LogOut, Lock, Eye, EyeOff, Search, Filter, X,
  Trash2, RefreshCw, Loader2, CheckCircle2, AlertCircle, Clock,
  User, Phone, MapPin, Tag, Calendar, FileText, AlignLeft,
  ChevronDown, ChevronUp, Download, ShieldCheck, Inbox,
  CheckSquare, Square, LayoutDashboard, List, TrendingUp,
  AlertTriangle, Archive
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────── */
type AduanStatus = "BARU" | "DIPROSES" | "SELESAI" | "DITOLAK";

interface AduanEntry {
  id: string;
  namaLengkap: string;
  noHp: string;
  alamat: string;
  judul: string;
  isi: string;
  tanggal: string;
  lokasi: string;
  kategori: string;
  anonim: boolean;
  rahasia: boolean;
  status: AduanStatus;
  catatan: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminAduanProps {
  theme?: "light" | "dark";
  onBack: () => void;
}

/* ─── Config ──────────────────────────────────────────────────────── */
const STATUS_CFG: Record<AduanStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  BARU:      { label: "Baru",      cls: "bg-blue-500/15 text-blue-400 border border-blue-500/30",     icon: Inbox },
  DIPROSES:  { label: "Diproses",  cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30",  icon: Clock },
  SELESAI:   { label: "Selesai",   cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30", icon: CheckCircle2 },
  DITOLAK:   { label: "Ditolak",   cls: "bg-red-500/15 text-red-400 border border-red-500/30",        icon: AlertCircle },
};

const STATUS_OPTIONS: AduanStatus[] = ["BARU", "DIPROSES", "SELESAI", "DITOLAK"];

const KATEGORI_OPTIONS = [
  "Pelayanan Administrasi", "Fasilitas & Sarana Prasarana", "Kegiatan Belajar Mengajar",
  "Perilaku Tenaga Pendidik", "Perilaku Tenaga Kependidikan", "Keamanan & Ketertiban Sekolah",
  "Pungutan Tidak Resmi", "Transparansi Informasi", "Topik Lainnya",
];

/* ─── Helpers ─────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}
function fmtDateFull(iso: string) {
  try { return new Date(iso).toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("smkn1_adm_token") || "" : ""; }

async function apiGet(path: string) {
  const r = await fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}
async function apiPatch(path: string, body: object) {
  const r = await fetch(path, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}
async function apiDelete(path: string) {
  const r = await fetch(path, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}
async function apiPost(path: string, body: object) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}

const PAGE_SIZE = 15;

/* ═══════════════════════════════════════════════════════════════════ */
export default function AdminAduanPublik({ onBack }: AdminAduanProps) {
  /* ── Auth ───────────────────────────────────────────────────────── */
  const [isAuthed, setIsAuthed] = useState(() => !!getToken());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  /* ── Data ───────────────────────────────────────────────────────── */
  const [list, setList] = useState<AduanEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  /* ── UI ─────────────────────────────────────────────────────────── */
  const [tab, setTab] = useState<"list" | "stats">("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | AduanStatus>("");
  const [filterKategori, setFilterKategori] = useState("");
  const [selected, setSelected] = useState<AduanEntry | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  /* Detail panel state */
  const [editStatus, setEditStatus] = useState<AduanStatus>("BARU");
  const [editCatatan, setEditCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* ── Toast helper ───────────────────────────────────────────────── */
  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch ──────────────────────────────────────────────────────── */
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/api/aduan");
      setList(data);
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") { setIsAuthed(false); localStorage.removeItem("smkn1_adm_token"); }
      showToast("Gagal memuat data.", "err");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isAuthed) fetchData(); }, [isAuthed]);

  /* ── Login ──────────────────────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr("");
    setLoginLoading(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await r.json();
      if (!r.ok) { setLoginErr(data.error || "Login gagal."); return; }
      localStorage.setItem("smkn1_adm_token", data.token);
      setIsAuthed(true);
    } catch { setLoginErr("Koneksi gagal."); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("smkn1_adm_token");
    setIsAuthed(false);
    setList([]);
    setSelected(null);
  };

  /* ── Filtered / paged data ─────────────────────────────────────── */
  const filtered = useMemo(() => {
    let out = [...list];
    if (filterStatus) out = out.filter(a => a.status === filterStatus);
    if (filterKategori) out = out.filter(a => a.kategori === filterKategori);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(a =>
        a.judul.toLowerCase().includes(q) ||
        a.namaLengkap.toLowerCase().includes(q) ||
        a.isi.toLowerCase().includes(q) ||
        a.kategori.toLowerCase().includes(q)
      );
    }
    return out;
  }, [list, filterStatus, filterKategori, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Select all on page ─────────────────────────────────────────── */
  const allOnPageChecked = paged.length > 0 && paged.every(a => checkedIds.has(a.id));
  const togglePageAll = () => {
    if (allOnPageChecked) {
      setCheckedIds(prev => { const s = new Set(prev); paged.forEach(a => s.delete(a.id)); return s; });
    } else {
      setCheckedIds(prev => { const s = new Set(prev); paged.forEach(a => s.add(a.id)); return s; });
    }
  };

  /* ── Actions ────────────────────────────────────────────────────── */
  const openDetail = (a: AduanEntry) => {
    setSelected(a);
    setEditStatus(a.status as AduanStatus);
    setEditCatatan(a.catatan || "");
  };

  const handleSaveStatus = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiPatch(`/api/aduan/${selected.id}/status`, { status: editStatus, catatan: editCatatan });
      setList(prev => prev.map(a => a.id === selected.id ? { ...a, status: editStatus, catatan: editCatatan, updatedAt: new Date().toISOString() } : a));
      setSelected(prev => prev ? { ...prev, status: editStatus, catatan: editCatatan } : null);
      showToast("Status berhasil diperbarui.");
    } catch { showToast("Gagal memperbarui status.", "err"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus aduan ini?")) return;
    setDeleting(id);
    try {
      await apiDelete(`/api/aduan/${id}`);
      setList(prev => prev.filter(a => a.id !== id));
      if (selected?.id === id) setSelected(null);
      showToast("Aduan dihapus.");
    } catch { showToast("Gagal menghapus.", "err"); }
    finally { setDeleting(null); }
  };

  const handleBulkDelete = async () => {
    if (!checkedIds.size || !confirm(`Hapus ${checkedIds.size} aduan yang dipilih?`)) return;
    setBulkDeleting(true);
    try {
      await apiPost("/api/aduan/bulk-delete", { ids: Array.from(checkedIds) });
      setList(prev => prev.filter(a => !checkedIds.has(a.id)));
      if (selected && checkedIds.has(selected.id)) setSelected(null);
      setCheckedIds(new Set());
      showToast(`${checkedIds.size} aduan dihapus.`);
    } catch { showToast("Gagal menghapus.", "err"); }
    finally { setBulkDeleting(false); }
  };

  /* ── Export CSV ─────────────────────────────────────────────────── */
  const handleExport = () => {
    const rows = [
      ["ID", "Nama", "No HP", "Alamat", "Judul", "Isi", "Tanggal Kejadian", "Lokasi", "Kategori", "Anonim", "Rahasia", "Status", "Catatan", "Dikirim Pada"],
      ...filtered.map(a => [
        a.id, a.namaLengkap, a.noHp, a.alamat, a.judul,
        `"${a.isi.replace(/"/g, '""')}"`,
        a.tanggal, a.lokasi, a.kategori,
        a.anonim ? "Ya" : "Tidak", a.rahasia ? "Ya" : "Tidak",
        a.status, a.catatan, fmtDate(a.createdAt)
      ])
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `aduan-publik-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Stats ──────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = list.length;
    const byStatus = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: list.filter(a => a.status === s).length }), {} as Record<string, number>);
    const byKategori = KATEGORI_OPTIONS.reduce((acc, k) => ({ ...acc, [k]: list.filter(a => a.kategori === k).length }), {} as Record<string, number>);
    return { total, byStatus, byKategori };
  }, [list]);

  /* ═══════════════════ LOGIN SCREEN ═════════════════════════════════ */
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <ShieldCheck className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-serif font-bold text-white mb-1">Admin Aduan Publik</h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">SMK Negeri 1 Wonogiri</p>
          </div>

          <form onSubmit={handleLogin} className="bg-slate-900 border border-white/8 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Username</label>
              <input
                value={username} onChange={e => setUsername(e.target.value)} autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 transition-all"
                placeholder="Username admin"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  placeholder="Password"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-0">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {loginErr && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{loginErr}
              </div>
            )}
            <button
              type="submit" disabled={loginLoading}
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer border-0"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Masuk"}
            </button>
          </form>

          <button onClick={onBack} className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-0">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Beranda
          </button>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════ MAIN ADMIN UI ════════════════════════════════ */
  const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-800/70 border border-white/10 text-white text-sm outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder-slate-600";

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className={`fixed top-4 right-4 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl ${toast.type === "ok" ? "bg-emerald-900/90 border border-emerald-500/30 text-emerald-300" : "bg-red-900/90 border border-red-500/30 text-red-300"}`}
          >
            {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer border-0 text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-serif font-bold text-base text-white">Admin — Aduan Publik</h1>
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">SMK Negeri 1 Wonogiri</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-all cursor-pointer border-0 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-all cursor-pointer border-0">
            <Download className="w-3.5 h-3.5" />Export CSV
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 text-xs transition-all cursor-pointer border-0">
            <LogOut className="w-3.5 h-3.5" />Keluar
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-slate-900 rounded-xl w-fit border border-white/8">
          {([["list", List, "Daftar Aduan"], ["stats", TrendingUp, "Statistik"]] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key as "list" | "stats")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer border-0 ${tab === key ? "bg-amber-500 text-slate-950" : "text-slate-500 hover:text-slate-300"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* ── STATS TAB ───────────────────────────────────────────── */}
        {tab === "stats" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="col-span-2 md:col-span-1 bg-slate-900 border border-white/8 rounded-2xl p-5 flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Total Aduan</span>
                <span className="text-3xl font-serif font-bold text-white">{stats.total}</span>
              </div>
              {STATUS_OPTIONS.map(s => {
                const cfg = STATUS_CFG[s];
                const Icon = cfg.icon;
                return (
                  <div key={s} className="bg-slate-900 border border-white/8 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{cfg.label}</span>
                    </div>
                    <span className="text-2xl font-serif font-bold text-white">{(stats.byStatus as Record<string,number>)[s] ?? 0}</span>
                  </div>
                );
              })}
            </div>

            {/* By kategori */}
            <div className="bg-slate-900 border border-white/8 rounded-2xl p-6">
              <h3 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-4">Aduan per Kategori</h3>
              <div className="space-y-3">
                {KATEGORI_OPTIONS.map(k => {
                  const count = (stats.byKategori as Record<string,number>)[k] ?? 0;
                  const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={k}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{k}</span>
                        <span className="text-slate-500 font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800">
                        <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LIST TAB ────────────────────────────────────────────── */}
        {tab === "list" && (
          <div className="flex gap-6">
            {/* Left: list panel */}
            <div className="flex-1 min-w-0">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Cari aduan, nama, kategori..."
                    className={`${inputCls} pl-8`} />
                </div>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as any); setPage(1); }}
                  className={`${inputCls} w-auto cursor-pointer`}>
                  <option value="">Semua Status</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                </select>
                <select value={filterKategori} onChange={e => { setFilterKategori(e.target.value); setPage(1); }}
                  className={`${inputCls} w-auto cursor-pointer`}>
                  <option value="">Semua Kategori</option>
                  {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                {(search || filterStatus || filterKategori) && (
                  <button onClick={() => { setSearch(""); setFilterStatus(""); setFilterKategori(""); setPage(1); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer border-0">
                    <X className="w-3 h-3" />Reset
                  </button>
                )}
              </div>

              {/* Bulk action bar */}
              {checkedIds.size > 0 && (
                <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="text-xs text-amber-400 font-bold">{checkedIds.size} dipilih</span>
                  <button onClick={handleBulkDelete} disabled={bulkDeleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-400 text-xs font-bold transition-all cursor-pointer border-0 disabled:opacity-50">
                    {bulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Hapus Dipilih
                  </button>
                  <button onClick={() => setCheckedIds(new Set())} className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-0">Batal</button>
                </div>
              )}

              {/* Summary row */}
              <div className="flex items-center justify-between mb-2 text-[11px] text-slate-500 font-mono">
                <span>{filtered.length} aduan {filterStatus || filterKategori || search ? "(difilter)" : ""}</span>
                <span>Halaman {page}/{totalPages}</span>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />Memuat data...
                </div>
              ) : paged.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <Archive className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Tidak ada aduan ditemukan.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[32px_1fr_120px_100px_80px] gap-3 px-4 py-2.5 border-b border-white/8 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    <button onClick={togglePageAll} className="cursor-pointer bg-transparent border-0 text-slate-500 hover:text-white transition-colors flex items-center">
                      {allOnPageChecked ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}
                    </button>
                    <span>Aduan</span>
                    <span>Kategori</span>
                    <span>Status</span>
                    <span>Tanggal</span>
                  </div>
                  {/* Rows */}
                  {paged.map(a => {
                    const cfg = STATUS_CFG[a.status as AduanStatus] ?? STATUS_CFG.BARU;
                    const isActive = selected?.id === a.id;
                    return (
                      <div
                        key={a.id}
                        onClick={() => openDetail(a)}
                        className={`grid grid-cols-[32px_1fr_120px_100px_80px] gap-3 px-4 py-3 border-b border-white/5 cursor-pointer transition-colors ${isActive ? "bg-amber-500/8" : "hover:bg-white/3"}`}
                      >
                        <div onClick={e => e.stopPropagation()} className="flex items-center">
                          <button onClick={() => setCheckedIds(prev => { const s = new Set(prev); s.has(a.id) ? s.delete(a.id) : s.add(a.id); return s; })}
                            className="cursor-pointer bg-transparent border-0 text-slate-500 hover:text-white transition-colors">
                            {checkedIds.has(a.id) ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{a.judul}</p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {a.anonim ? "Anonim" : a.namaLengkap || "—"}
                            {a.rahasia && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-slate-700 text-slate-400">Rahasia</span>}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span className="text-[10px] text-slate-400 truncate">{a.kategori}</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.cls}`}>{cfg.label}</span>
                        </div>
                        <div className="flex items-center text-[11px] text-slate-500 font-mono">
                          {fmtDate(a.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700 hover:text-white transition-all disabled:opacity-30 cursor-pointer border-0">
                    ‹ Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const n = Math.max(1, Math.min(page - 3, totalPages - 6)) + i;
                    return (
                      <button key={n} onClick={() => setPage(n)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${n === page ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"}`}>
                        {n}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700 hover:text-white transition-all disabled:opacity-30 cursor-pointer border-0">
                    Next ›
                  </button>
                </div>
              )}
            </div>

            {/* Right: detail panel */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.22 }}
                  className="w-96 shrink-0 bg-slate-900 border border-white/8 rounded-2xl overflow-hidden flex flex-col max-h-[calc(100vh-120px)] sticky top-24"
                >
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
                    <span className="text-xs font-bold text-white uppercase tracking-widest">Detail Aduan</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(selected.id)}
                        disabled={!!deleting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs transition-all cursor-pointer border-0 disabled:opacity-50"
                      >
                        {deleting === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Hapus
                      </button>
                      <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer border-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Panel body */}
                  <div className="overflow-y-auto flex-1 p-5 space-y-4 text-sm">
                    {/* Title */}
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-0.5">Judul Laporan</p>
                      <p className="font-semibold text-white">{selected.judul}</p>
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow icon={User} label="Pelapor" value={selected.anonim ? "Anonim" : (selected.namaLengkap || "—")} />
                      <InfoRow icon={Phone} label="No HP/WA" value={selected.anonim ? "—" : (selected.noHp || "—")} />
                      <InfoRow icon={MapPin} label="Alamat" value={selected.anonim ? "—" : (selected.alamat || "—")} cls="col-span-2" />
                      <InfoRow icon={Calendar} label="Tgl Kejadian" value={selected.tanggal} />
                      <InfoRow icon={MapPin} label="Lokasi" value={selected.lokasi} />
                      <InfoRow icon={Tag} label="Kategori" value={selected.kategori} cls="col-span-2" />
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2 flex-wrap">
                      {selected.anonim && <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-300 border border-white/10">Anonim</span>}
                      {selected.rahasia && <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-300 border border-white/10">Rahasia</span>}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CFG[selected.status as AduanStatus]?.cls}`}>
                        {STATUS_CFG[selected.status as AduanStatus]?.label}
                      </span>
                    </div>

                    {/* Isi */}
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Isi Laporan</p>
                      <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.isi}</div>
                    </div>

                    {/* Timestamps */}
                    <div className="text-[10px] text-slate-600 font-mono space-y-0.5">
                      <p>Dikirim: {fmtDateFull(selected.createdAt)}</p>
                      <p>Diperbarui: {fmtDateFull(selected.updatedAt)}</p>
                    </div>

                    {/* ── Status update form ── */}
                    <div className="border-t border-white/8 pt-4 space-y-3">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Perbarui Status</p>
                      <select value={editStatus} onChange={e => setEditStatus(e.target.value as AduanStatus)}
                        className={`${inputCls} cursor-pointer`}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                      </select>
                      <textarea value={editCatatan} onChange={e => setEditCatatan(e.target.value)} rows={3}
                        placeholder="Catatan admin (opsional)..."
                        className={`${inputCls} resize-none text-xs leading-relaxed`} />
                      <button onClick={handleSaveStatus} disabled={saving}
                        className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer border-0 flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Simpan Status
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Small helper component ──────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, cls = "" }: { icon: React.ElementType; label: string; value: string; cls?: string }) {
  return (
    <div className={cls}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-0.5 flex items-center gap-1">
        <Icon className="w-2.5 h-2.5" />{label}
      </p>
      <p className="text-xs text-slate-300 break-words">{value || "—"}</p>
    </div>
  );
}
