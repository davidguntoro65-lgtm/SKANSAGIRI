import { useState, useEffect, type FormEvent, type ComponentType } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, CheckCircle2, XCircle, Archive, Trash2, Eye, Clock,
  RefreshCw, Loader2, AlertCircle, BookOpen, MessageSquare, Send,
  Filter, Search, X, User, TrendingUp, Lightbulb, Feather, Heart,
  FileText, ChevronRight, LogOut, Lock, EyeOff, LayoutDashboard, Pencil,
  Tag, Plus, GripVertical
} from "lucide-react";

interface DbCategory { key: string; label: string; }

interface KaryaSiswa {
  id: string; title: string; slug: string; content: string; excerpt: string;
  category: string;
  status: "REVIEW" | "PUBLISHED" | "REVISION" | "ARCHIVED";
  feedback: string | null; views: number; likes: number;
  authorName: string; authorClass: string; authorJurusan: string;
  tags: string[]; createdAt: string; updatedAt: string; publishedAt: string | null;
}

interface AdminSuaraProps {
  theme: "light" | "dark";
  onBack: () => void;
}

interface KomentarSuara {
  id: string; artikelId: string; artikelTitle: string;
  authorName: string; authorClass: string; content: string;
  status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string;
}

const STATUS_CFG = {
  REVIEW:    { label: "Perlu Review",  cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  PUBLISHED: { label: "Tayang",        cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  REVISION:  { label: "Perlu Revisi",  cls: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
  ARCHIVED:  { label: "Diarsipkan",    cls: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

const CAT_CFG_STYLE: Record<string, { cls: string; icon: ComponentType<{ className?: string }> }> = {
  JURNAL_VOKASI: { cls: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: TrendingUp },
  ESAI_INOVASI:  { cls: "bg-sky-500/15 text-sky-400 border-sky-500/30",         icon: Lightbulb },
  SASTRA:        { cls: "bg-violet-500/15 text-violet-400 border-violet-500/30", icon: Feather },
  OPINI:         { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: MessageSquare },
};
const CAT_CFG_DEFAULT = { cls: "bg-slate-500/15 text-slate-400 border-slate-500/30", icon: BookOpen };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
function renderContent(text: string) {
  return text.split(/\n\n+/).map((para, i) => (
    <p key={i} className="mb-3 leading-relaxed text-sm">
      {para.split(/\n/).map((line, j) => (
        <span key={j}>{line}{j < para.split(/\n/).length - 1 && <br />}</span>
      ))}
    </p>
  ));
}

export default function AdminSuaraSkansagiri({ theme, onBack }: AdminSuaraProps) {
  const isDark = true;

  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [adminView, setAdminView] = useState<"articles" | "komentar" | "categories">("articles");
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState("");
  const [newCatKey, setNewCatKey] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");

  const [articles, setArticles] = useState<KaryaSiswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "REVIEW" | "PUBLISHED" | "REVISION" | "ARCHIVED">("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<KaryaSiswa | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  const [komentarList, setKomentarList] = useState<KomentarSuara[]>([]);
  const [komentarLoading, setKomentarLoading] = useState(false);
  const [komentarFilter, setKomentarFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<string>("JURNAL_VOKASI");
  const [editTags, setEditTags] = useState("");
  const [editAuthorName, setEditAuthorName] = useState("");
  const [editAuthorClass, setEditAuthorClass] = useState("");
  const [editAuthorJurusan, setEditAuthorJurusan] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  function toast(text: string, type: "ok" | "err" = "ok") {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  }

  function getToken() { return localStorage.getItem("smkn1_adm_token") || ""; }

  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthChecking(false); return; }
    fetch("/api/auth/verify", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setIsAuthed(r.ok); setAuthChecking(false); })
      .catch(() => { setIsAuthed(false); setAuthChecking(false); });
  }, []);

  useEffect(() => {
    if (isAuthed) { loadArticles(); loadKomentar(); loadCategories(); }
  }, [isAuthed]);

  async function loadCategories() {
    try {
      const r = await fetch("/api/suara-categories");
      if (r.ok) setDbCategories(await r.json());
    } catch {}
  }

  async function saveCategories(cats: DbCategory[]) {
    setCatSaving(true); setCatError("");
    try {
      const r = await fetch("/api/suara-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(cats),
      });
      const d = await r.json();
      if (!r.ok) { setCatError(d.error || "Gagal menyimpan."); return; }
      setDbCategories(d.data);
      toast("Kategori berhasil disimpan! ✓");
    } catch { setCatError("Terjadi kesalahan jaringan."); }
    finally { setCatSaving(false); }
  }

  function addCategory() {
    const key = newCatKey.trim().toUpperCase().replace(/\s+/g, "_");
    const label = newCatLabel.trim();
    if (!key || !label) { setCatError("Key dan label wajib diisi."); return; }
    if (dbCategories.some(c => c.key === key)) { setCatError(`Key "${key}" sudah ada.`); return; }
    saveCategories([...dbCategories, { key, label }]);
    setNewCatKey(""); setNewCatLabel("");
  }

  function removeCategory(key: string) {
    saveCategories(dbCategories.filter(c => c.key !== key));
  }

  function updateCategoryLabel(key: string, label: string) {
    setDbCategories(prev => prev.map(c => c.key === key ? { ...c, label } : c));
  }

  function moveCategory(idx: number, dir: -1 | 1) {
    const next = [...dbCategories];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setDbCategories(next);
  }

  async function loadKomentar() {
    setKomentarLoading(true);
    try {
      const r = await fetch("/api/suara/komentar/admin", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (r.ok) setKomentarList(await r.json());
    } finally { setKomentarLoading(false); }
  }

  async function approveKomentar(id: string) {
    setActionLoading(id + "_approve");
    try {
      const r = await fetch(`/api/suara/komentar/${id}/approve`, {
        method: "PATCH", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (r.ok) { toast("Komentar ditampilkan."); await loadKomentar(); }
      else { const d = await r.json(); toast(d.error || "Gagal approve.", "err"); }
    } finally { setActionLoading(null); }
  }

  async function deleteKomentar(id: string) {
    setActionLoading(id + "_delete");
    try {
      const r = await fetch(`/api/suara/komentar/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (r.ok) { toast("Komentar dihapus."); await loadKomentar(); }
      else { const d = await r.json(); toast(d.error || "Gagal hapus.", "err"); }
    } finally { setActionLoading(null); }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(""); setLoginLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) { setLoginError(d.error || "Login gagal."); return; }
      localStorage.setItem("smkn1_adm_token", d.token);
      setIsAuthed(true);
    } catch { setLoginError("Terjadi kesalahan jaringan."); }
    finally { setLoginLoading(false); }
  }

  function handleLogout() {
    fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } }).catch(() => {});
    localStorage.removeItem("smkn1_adm_token"); setIsAuthed(false);
  }

  async function loadArticles() {
    setLoading(true);
    try {
      const r = await fetch("/api/suara/admin", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (r.ok) setArticles(await r.json());
    } finally { setLoading(false); }
  }

  async function doApprove(id: string) {
    setActionLoading(id + "_approve");
    try {
      const r = await fetch(`/api/suara/${id}/approve`, { method: "PATCH", headers: { Authorization: `Bearer ${getToken()}` } });
      if (r.ok) { toast("Karya berhasil dipublikasikan! ✓"); await loadArticles(); setSelected(null); }
      else toast("Gagal memublikasikan karya.", "err");
    } finally { setActionLoading(null); }
  }

  async function doReject(id: string, action: "revision" | "archive") {
    setActionLoading(id + "_" + action);
    try {
      const r = await fetch(`/api/suara/${id}/reject`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ feedback: feedbackText, action }),
      });
      if (r.ok) {
        toast(action === "archive" ? "Karya diarsipkan." : "Feedback terkirim ke penulis.");
        setFeedbackText(""); await loadArticles(); setSelected(null);
      } else toast("Aksi gagal.", "err");
    } finally { setActionLoading(null); }
  }

  function openEdit(karya: KaryaSiswa) {
    setEditTitle(karya.title);
    setEditContent(karya.content);
    setEditCategory(karya.category);
    setEditTags(karya.tags.join(", "));
    setEditAuthorName(karya.authorName);
    setEditAuthorClass(karya.authorClass);
    setEditAuthorJurusan(karya.authorJurusan || "");
    setEditError("");
    setEditMode(true);
  }

  async function doEdit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setEditError("");
    setEditSaving(true);
    try {
      const r = await fetch(`/api/suara/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          title: editTitle, content: editContent, category: editCategory,
          tags: editTags, authorName: editAuthorName,
          authorClass: editAuthorClass, authorJurusan: editAuthorJurusan,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setEditError(d.error || "Gagal menyimpan."); return; }
      toast("Karya berhasil diperbarui! ✓");
      setEditMode(false);
      await loadArticles();
      setSelected(d.data);
      setFeedbackText(d.data.feedback || "");
    } catch { setEditError("Terjadi kesalahan jaringan."); }
    finally { setEditSaving(false); }
  }

  async function doDelete(id: string) {
    if (!window.confirm("Hapus karya ini secara permanen?")) return;
    setActionLoading(id + "_delete");
    try {
      const r = await fetch(`/api/suara/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      if (r.ok) { toast("Karya dihapus."); await loadArticles(); setSelected(null); }
      else toast("Gagal menghapus.", "err");
    } finally { setActionLoading(null); }
  }

  const filtered = articles.filter(a => {
    const matchStatus = activeFilter === "ALL" || a.status === activeFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || a.title.toLowerCase().includes(q) || a.authorName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    ALL: articles.length, REVIEW: articles.filter(a => a.status === "REVIEW").length,
    PUBLISHED: articles.filter(a => a.status === "PUBLISHED").length,
    REVISION: articles.filter(a => a.status === "REVISION").length,
    ARCHIVED: articles.filter(a => a.status === "ARCHIVED").length,
  };

  const base = "min-h-screen bg-slate-950 text-slate-100 font-sans antialiased";

  if (authChecking) return (
    <div className={`${base} flex items-center justify-center`}>
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );

  if (!isAuthed) return (
    <div className={`${base} flex items-center justify-center p-6`}>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900 border border-white/8 rounded-2xl p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Admin Suara Skansagiri</h2>
            <p className="text-[10px] font-mono text-slate-500">Login sebagai kurator</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border bg-white/5 border-white/8 text-white placeholder:text-slate-600 text-sm outline-none focus:border-violet-500/50 transition-colors" />
          <div className="relative">
            <input type={showPass ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-white/5 border-white/8 text-white placeholder:text-slate-600 text-sm outline-none focus:border-violet-500/50 transition-colors pr-10" />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {loginError && <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl"><AlertCircle className="w-3.5 h-3.5" />{loginError}</div>}
          <button type="submit" disabled={loginLoading}
            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-[0_0_16px_rgba(139,92,246,0.4)] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2">
            {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Login
          </button>
        </form>
        <button onClick={onBack} className="mt-4 w-full text-center text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors flex items-center justify-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Kembali
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className={base}>
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm shadow-2xl ${
              toastMsg.type === "ok" ? "bg-emerald-900/90 border-emerald-500/30 text-emerald-300" : "bg-rose-900/90 border-rose-500/30 text-rose-300"
            }`}>
            {toastMsg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toastMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-white/6 px-6 md:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-amber-400 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </button>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-white">Redaksi Suara Skansagiri</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadArticles} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/8 text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/8 text-xs font-mono text-slate-400 hover:text-rose-400 transition-colors">
              <LogOut className="w-3 h-3" /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">

        {/* View Toggle */}
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={() => setAdminView("articles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border transition-all ${
              adminView === "articles"
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 border-transparent text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                : "bg-white/4 border-white/8 text-slate-400 hover:bg-white/6 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Karya
          </button>
          <button
            onClick={() => setAdminView("komentar")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border transition-all relative ${
              adminView === "komentar"
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 border-transparent text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                : "bg-white/4 border-white/8 text-slate-400 hover:bg-white/6 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Komentar
            {komentarList.filter(k => k.status === "PENDING").length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                {komentarList.filter(k => k.status === "PENDING").length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setAdminView("categories"); setCatError(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border transition-all ${
              adminView === "categories"
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 border-transparent text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                : "bg-white/4 border-white/8 text-slate-400 hover:bg-white/6 hover:text-slate-200"
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Kategori
          </button>
        </div>

        {adminView === "articles" && (
        <div className="articles-section">

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {(["ALL", "REVIEW", "PUBLISHED", "REVISION", "ARCHIVED"] as const).map(s => (
            <button key={s} onClick={() => setActiveFilter(s)}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${
                activeFilter === s
                  ? "bg-violet-500/15 border-violet-500/40"
                  : "bg-white/4 border-white/6 hover:bg-white/6"
              }`}>
              <div className={`text-xl font-mono font-black mb-0.5 ${activeFilter === s ? "text-violet-300" : "text-white"}`}>
                {counts[s]}
              </div>
              <div className={`text-[9px] font-mono tracking-widest uppercase ${activeFilter === s ? "text-violet-400" : "text-slate-500"}`}>
                {s === "ALL" ? "Semua" : STATUS_CFG[s]?.label}
              </div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mb-6 bg-white/4 border border-white/8 rounded-xl px-4 py-2.5 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text" placeholder="Cari judul atau penulis..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-white placeholder:text-slate-600 flex-1 font-sans"
          />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-slate-500 hover:text-white" /></button>}
        </div>

        <div className="flex gap-6">
          {/* Article List */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-mono">Tidak ada karya ditemukan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((a, i) => {
                  const cat = CAT_CFG_STYLE[a.category] || CAT_CFG_DEFAULT;
                  const CatIcon = cat.icon;
                  const isSelected = selected?.id === a.id;
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => { setSelected(a); setFeedbackText(a.feedback || ""); }}
                      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-violet-500/10 border-violet-500/30"
                          : "bg-white/3 border-white/6 hover:bg-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cat?.cls}`}>
                        {CatIcon && <CatIcon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-white line-clamp-1">{a.title}</h4>
                          <span className={`shrink-0 text-[8px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border ${STATUS_CFG[a.status]?.cls}`}>
                            {STATUS_CFG[a.status]?.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">{a.excerpt}</p>
                        <div className="flex items-center gap-3 text-[9px] font-mono text-slate-600">
                          <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{a.authorName} · {a.authorClass}</span>
                          <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{a.views}</span>
                          <span className="flex items-center gap-1"><Heart className="w-2.5 h-2.5" />{a.likes}</span>
                          <span>{formatDate(a.createdAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${isSelected ? "text-violet-400" : "text-slate-700"}`} />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <AnimatePresence>
            {selected && (
              <motion.div
                key="detail-panel"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-md shrink-0 hidden lg:flex flex-col"
              >
                <div className="sticky top-24 bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-full border ${(CAT_CFG_STYLE[selected.category] || CAT_CFG_DEFAULT).cls}`}>
                        {dbCategories.find(c => c.key === selected.category)?.label ?? selected.category}
                      </span>
                      <span className={`text-[9px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-full border ${STATUS_CFG[selected.status]?.cls}`}>
                        {STATUS_CFG[selected.status]?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(selected)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-violet-500/30 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-all"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="max-h-[60vh] overflow-y-auto p-5">
                    <h3 className="font-serif text-lg font-bold text-white mb-2">{selected.title}</h3>
                    <div className="flex items-center gap-2 mb-4 text-[10px] font-mono text-slate-500">
                      <span>{selected.authorName}</span><span>·</span>
                      <span>{selected.authorClass}</span>
                      {selected.authorJurusan && <><span>·</span><span>{selected.authorJurusan}</span></>}
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-mono text-slate-600 mb-4">
                      <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{selected.views} views</span>
                      <span className="flex items-center gap-1"><Heart className="w-2.5 h-2.5" />{selected.likes} likes</span>
                      <span><Clock className="w-2.5 h-2.5 inline mr-1" />{formatDate(selected.createdAt)}</span>
                    </div>
                    {selected.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mb-4">
                        {selected.tags.map(t => (
                          <span key={t} className="text-[8px] font-mono px-2 py-0.5 rounded-full border bg-white/4 text-slate-500 border-white/8">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="text-slate-300 leading-relaxed">{renderContent(selected.content)}</div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-white/6 p-5 space-y-3">
                    {selected.feedback && (
                      <div className="px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
                        <span className="font-mono text-[9px] uppercase tracking-widest block mb-1 text-amber-500/70">Feedback Sebelumnya</span>
                        {selected.feedback}
                      </div>
                    )}

                    <textarea
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      placeholder="Tulis catatan/feedback untuk penulis (opsional untuk approve, wajib untuk revisi)..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border bg-white/5 border-white/8 text-white placeholder:text-slate-600 text-xs outline-none focus:border-violet-500/50 transition-colors resize-none"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => doApprove(selected.id)}
                        disabled={!!actionLoading}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-[0_0_12px_rgba(16,185,129,0.35)] transition-all disabled:opacity-50"
                      >
                        {actionLoading === selected.id + "_approve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Publish
                      </button>
                      <button
                        onClick={() => doReject(selected.id, "revision")}
                        disabled={!!actionLoading}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:shadow-[0_0_12px_rgba(245,158,11,0.35)] transition-all disabled:opacity-50"
                      >
                        {actionLoading === selected.id + "_revision" ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                        Revisi
                      </button>
                      <button
                        onClick={() => doDelete(selected.id)}
                        disabled={!!actionLoading}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                      >
                        {actionLoading === selected.id + "_delete" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Hapus
                      </button>
                    </div>

                    <button
                      onClick={() => doReject(selected.id, "archive")}
                      disabled={!!actionLoading}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest text-slate-500 border border-white/6 hover:bg-white/4 hover:text-slate-300 transition-all disabled:opacity-50"
                    >
                      <Archive className="w-3 h-3" /> Arsipkan
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        </div>)}

        {/* ── KOMENTAR VIEW ───────────────────────────────────────── */}
        {adminView === "komentar" && (
          <div>
            {/* Komentar Stats + Filter */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(f => {
                const cnt = f === "ALL" ? komentarList.length : komentarList.filter(k => k.status === f).length;
                const active = komentarFilter === f;
                return (
                  <button key={f} onClick={() => setKomentarFilter(f)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-left transition-all ${
                      active ? "bg-violet-500/15 border-violet-500/40" : "bg-white/4 border-white/6 hover:bg-white/6"
                    }`}>
                    <span className={`text-lg font-mono font-black ${active ? "text-violet-300" : "text-white"}`}>{cnt}</span>
                    <span className={`text-[9px] font-mono tracking-widest uppercase ${active ? "text-violet-400" : "text-slate-500"}`}>
                      {f === "ALL" ? "Semua" : f === "PENDING" ? "Menunggu" : f === "APPROVED" ? "Ditampilkan" : "Ditolak"}
                    </span>
                  </button>
                );
              })}
              <button onClick={loadKomentar} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/8 text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {/* Komentar List */}
            {komentarLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
              </div>
            ) : (() => {
              const filtered = komentarFilter === "ALL"
                ? komentarList
                : komentarList.filter(k => k.status === komentarFilter);
              return filtered.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 font-mono">
                    {komentarFilter === "PENDING" ? "Tidak ada komentar menunggu moderasi." : "Tidak ada komentar ditemukan."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-w-3xl">
                  {filtered.map((k, i) => (
                    <motion.div
                      key={k.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`rounded-xl border p-4 ${
                        k.status === "PENDING"
                          ? "bg-amber-500/5 border-amber-500/20"
                          : k.status === "APPROVED"
                            ? "bg-emerald-500/5 border-emerald-500/15"
                            : "bg-white/3 border-white/6"
                      }`}
                    >
                      {/* Article context */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileText className="w-3 h-3 text-slate-600 shrink-0" />
                        <span className="text-[9px] font-mono text-slate-500 truncate">{k.artikelTitle}</span>
                        <span className={`ml-auto shrink-0 text-[8px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border ${
                          k.status === "PENDING"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : k.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                        }`}>
                          {k.status === "PENDING" ? "Menunggu" : k.status === "APPROVED" ? "Ditampilkan" : "Ditolak"}
                        </span>
                      </div>

                      {/* Author + content */}
                      <div className="flex gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold bg-violet-500/20 text-violet-400">
                          {k.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-white">{k.authorName}</span>
                            {k.authorClass && <span className="text-[9px] font-mono text-slate-600">{k.authorClass}</span>}
                            <span className="text-[9px] font-mono text-slate-700 ml-auto">
                              {formatDate(k.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed">{k.content}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      {k.status === "PENDING" && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => approveKomentar(k.id)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50"
                          >
                            {actionLoading === k.id + "_approve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Tampilkan
                          </button>
                          <button
                            onClick={() => deleteKomentar(k.id)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                          >
                            {actionLoading === k.id + "_delete" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            Tolak & Hapus
                          </button>
                        </div>
                      )}
                      {k.status === "APPROVED" && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => deleteKomentar(k.id)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono text-slate-500 border border-white/6 hover:text-rose-400 hover:border-rose-500/30 transition-all disabled:opacity-50"
                          >
                            {actionLoading === k.id + "_delete" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            Hapus
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── CATEGORIES MANAGEMENT VIEW ───────────────────────── */}
        {adminView === "categories" && (
          <div className="max-w-xl">
            <div className="mb-6">
              <h2 className="text-sm font-bold text-white mb-1">Kelola Kategori Artikel</h2>
              <p className="text-[11px] text-slate-500 font-mono">Tambah, ubah label, urutkan, atau hapus kategori. Perubahan langsung berlaku untuk form kirim karya dan filter.</p>
            </div>

            {catError && (
              <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 rounded-xl mb-4">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{catError}
              </div>
            )}

            {/* Existing categories */}
            <div className="space-y-2 mb-6">
              {dbCategories.map((cat, idx) => (
                <div key={cat.key} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveCategory(idx, -1)} disabled={idx === 0 || catSaving}
                      className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M6 2L10 8H2L6 2Z" fill="currentColor"/></svg>
                    </button>
                    <button
                      onClick={() => moveCategory(idx, 1)} disabled={idx === dbCategories.length - 1 || catSaving}
                      className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M6 10L10 4H2L6 10Z" fill="currentColor"/></svg>
                    </button>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded border border-white/8 shrink-0 w-36 truncate">{cat.key}</span>
                  <input
                    type="text"
                    value={cat.label}
                    onChange={e => updateCategoryLabel(cat.key, e.target.value)}
                    onBlur={() => saveCategories(dbCategories)}
                    className="flex-1 px-3 py-1.5 rounded-lg border bg-white/5 border-white/8 text-white text-xs outline-none focus:border-violet-500/50 transition-colors"
                  />
                  <button
                    onClick={() => { if (window.confirm(`Hapus kategori "${cat.label}"?`)) removeCategory(cat.key); }}
                    disabled={catSaving}
                    className="text-slate-600 hover:text-rose-400 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new category */}
            <div className="border border-white/8 rounded-xl p-4 bg-white/2">
              <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-3">Tambah Kategori Baru</p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-[9px] font-mono text-slate-600 mb-1">Key (huruf kapital, garis bawah)</label>
                  <input
                    type="text" placeholder="Contoh: CERPEN"
                    value={newCatKey} onChange={e => setNewCatKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                    className="w-full px-3 py-2 rounded-lg border bg-white/5 border-white/8 text-white text-xs outline-none focus:border-violet-500/50 transition-colors placeholder:text-slate-700 font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[9px] font-mono text-slate-600 mb-1">Label (tampil di UI)</label>
                  <input
                    type="text" placeholder="Contoh: Cerpen & Fiksi"
                    value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-white/5 border-white/8 text-white text-xs outline-none focus:border-violet-500/50 transition-colors placeholder:text-slate-700"
                  />
                </div>
              </div>
              <button
                onClick={addCategory} disabled={catSaving || !newCatKey || !newCatLabel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50"
              >
                {catSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Tambah Kategori
              </button>
            </div>

            <p className="text-[10px] text-slate-600 font-mono mt-4">
              * Mengubah atau menghapus kategori tidak mempengaruhi artikel yang sudah ada — artikel tetap menyimpan key kategori lamanya.
            </p>
          </div>
        )}

      </div>

      {/* ── EDIT MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editMode && selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setEditMode(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Pencil className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Edit Karya</h3>
                    <p className="text-[10px] font-mono text-slate-500 truncate max-w-xs">{selected.authorName} · {selected.authorClass}</p>
                  </div>
                </div>
                <button onClick={() => setEditMode(false)} className="text-slate-600 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={doEdit} className="overflow-y-auto flex-1">
                <div className="p-6 space-y-4">

                  {/* Judul */}
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-1.5">Judul</label>
                    <input
                      type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} required
                      className="w-full px-4 py-2.5 rounded-xl border bg-white/5 border-white/8 text-white text-sm outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-1.5">Kategori</label>
                    <select
                      value={editCategory} onChange={e => setEditCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border bg-slate-800 border-white/8 text-white text-sm outline-none focus:border-violet-500/50 transition-colors"
                    >
                      {dbCategories.map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Penulis (baris) */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-1.5">Nama Penulis</label>
                      <input
                        type="text" value={editAuthorName} onChange={e => setEditAuthorName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-white/5 border-white/8 text-white text-xs outline-none focus:border-violet-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-1.5">Kelas</label>
                      <input
                        type="text" value={editAuthorClass} onChange={e => setEditAuthorClass(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-white/5 border-white/8 text-white text-xs outline-none focus:border-violet-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-1.5">Jurusan</label>
                      <input
                        type="text" value={editAuthorJurusan} onChange={e => setEditAuthorJurusan(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-white/5 border-white/8 text-white text-xs outline-none focus:border-violet-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-1.5">
                      Tags <span className="normal-case text-slate-600">(pisahkan dengan koma)</span>
                    </label>
                    <input
                      type="text" value={editTags} onChange={e => setEditTags(e.target.value)}
                      placeholder="contoh: teknologi, inovasi, vokasi"
                      className="w-full px-4 py-2.5 rounded-xl border bg-white/5 border-white/8 text-white text-sm outline-none focus:border-violet-500/50 transition-colors placeholder:text-slate-700"
                    />
                  </div>

                  {/* Konten */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-mono tracking-widest uppercase text-slate-500">Konten</label>
                      <span className={`text-[9px] font-mono ${editContent.trim().length < 200 ? "text-rose-400" : "text-slate-600"}`}>
                        {editContent.trim().length} karakter {editContent.trim().length < 200 && "(min. 200)"}
                      </span>
                    </div>
                    <textarea
                      value={editContent} onChange={e => setEditContent(e.target.value)} required rows={12}
                      className="w-full px-4 py-3 rounded-xl border bg-white/5 border-white/8 text-white text-sm outline-none focus:border-violet-500/50 transition-colors resize-y leading-relaxed"
                    />
                  </div>

                  {editError && (
                    <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{editError}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 pb-6 flex items-center justify-end gap-3 border-t border-white/6 pt-4">
                  <button
                    type="button" onClick={() => setEditMode(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-400 border border-white/8 hover:bg-white/5 hover:text-white transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit" disabled={editSaving || editContent.trim().length < 200}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-[0_0_16px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50"
                  >
                    {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
