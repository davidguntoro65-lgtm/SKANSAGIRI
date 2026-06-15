import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, CheckCircle2, XCircle, Archive, Trash2, Eye, Clock,
  RefreshCw, Loader2, AlertCircle, BookOpen, MessageSquare, Send,
  Filter, Search, X, User, TrendingUp, Lightbulb, Feather, Heart,
  FileText, ChevronRight, LogOut, Lock, EyeOff, LayoutDashboard
} from "lucide-react";

interface KaryaSiswa {
  id: string; title: string; slug: string; content: string; excerpt: string;
  category: "JURNAL_VOKASI" | "ESAI_INOVASI" | "SASTRA" | "OPINI";
  status: "REVIEW" | "PUBLISHED" | "REVISION" | "ARCHIVED";
  feedback: string | null; views: number; likes: number;
  authorName: string; authorClass: string; authorJurusan: string;
  tags: string[]; createdAt: string; updatedAt: string; publishedAt: string | null;
}

interface AdminSuaraProps {
  theme: "light" | "dark";
  onBack: () => void;
}

const STATUS_CFG = {
  REVIEW:    { label: "Perlu Review",  cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  PUBLISHED: { label: "Tayang",        cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  REVISION:  { label: "Perlu Revisi",  cls: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
  ARCHIVED:  { label: "Diarsipkan",    cls: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

const CAT_CFG = {
  JURNAL_VOKASI: { label: "Jurnal Vokasi",   cls: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: TrendingUp },
  ESAI_INOVASI:  { label: "Esai & Inovasi",  cls: "bg-sky-500/15 text-sky-400 border-sky-500/30",         icon: Lightbulb },
  SASTRA:        { label: "Sastra & Kreasi", cls: "bg-violet-500/15 text-violet-400 border-violet-500/30", icon: Feather },
  OPINI:         { label: "Opini & Refleksi",cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: MessageSquare },
};

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

  const [articles, setArticles] = useState<KaryaSiswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "REVIEW" | "PUBLISHED" | "REVISION" | "ARCHIVED">("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<KaryaSiswa | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

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

  useEffect(() => { if (isAuthed) loadArticles(); }, [isAuthed]);

  async function handleLogin(e: React.FormEvent) {
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

        {/* Stats */}
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
                  const cat = CAT_CFG[a.category];
                  const CatIcon = cat?.icon;
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
                      <span className={`text-[9px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-full border ${CAT_CFG[selected.category]?.cls}`}>
                        {CAT_CFG[selected.category]?.label}
                      </span>
                      <span className={`text-[9px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-full border ${STATUS_CFG[selected.status]?.cls}`}>
                        {STATUS_CFG[selected.status]?.label}
                      </span>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
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
      </div>
    </div>
  );
}
