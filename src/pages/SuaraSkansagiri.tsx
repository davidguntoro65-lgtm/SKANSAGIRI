import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PenLine, Heart, Eye, BookOpen, Lightbulb, Feather, MessageCircle,
  ArrowLeft, X, Send, CheckCircle2, AlertCircle, Loader2, Search,
  Clock, ChevronRight, Sparkles, TrendingUp, Users, FileText, Star,
  Trophy, Crown, Medal, Award, Zap, BarChart2
} from "lucide-react";

interface KaryaSiswa {
  id: string; title: string; slug: string; content: string; excerpt: string;
  category: "JURNAL_VOKASI" | "ESAI_INOVASI" | "SASTRA" | "OPINI";
  status: string; feedback: string | null; views: number; likes: number;
  authorName: string; authorClass: string; authorJurusan: string;
  tags: string[]; createdAt: string; updatedAt: string; publishedAt: string | null;
}

interface TopWriter {
  authorName: string; authorClass: string; authorJurusan: string;
  points: number; publishedCount: number; totalLikes: number; totalViews: number;
  latestTitle: string; latestDate: string; categories: string[];
}

interface KomentarSuara {
  id: string; artikelId: string; artikelTitle: string;
  authorName: string; authorClass: string; content: string;
  status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string;
}

interface SuaraSkansagiriProps { theme: "light" | "dark"; }

const CATEGORIES = {
  ALL:          { label: "Semua Karya",       icon: BookOpen,      color: "amber",   hex: "#f59e0b" },
  JURNAL_VOKASI:{ label: "Jurnal Vokasi",     icon: TrendingUp,    color: "orange",  hex: "#f97316" },
  ESAI_INOVASI: { label: "Esai & Inovasi",    icon: Lightbulb,     color: "sky",     hex: "#0ea5e9" },
  SASTRA:       { label: "Sastra & Kreasi",   icon: Feather,       color: "violet",  hex: "#8b5cf6" },
  OPINI:        { label: "Opini & Refleksi",  icon: MessageCircle, color: "emerald", hex: "#10b981" },
} as const;

type CatKey = keyof typeof CATEGORIES;

const CAT_BADGE: Record<CatKey, string> = {
  ALL:           "bg-amber-500/15 text-amber-600 border-amber-400/30",
  JURNAL_VOKASI: "bg-orange-500/15 text-orange-600 border-orange-400/30",
  ESAI_INOVASI:  "bg-sky-500/15 text-sky-600 border-sky-400/30",
  SASTRA:        "bg-violet-500/15 text-violet-600 border-violet-400/30",
  OPINI:         "bg-emerald-500/15 text-emerald-600 border-emerald-400/30",
};
const CAT_BADGE_DARK: Record<CatKey, string> = {
  ALL:           "bg-amber-500/15 text-amber-400 border-amber-500/30",
  JURNAL_VOKASI: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  ESAI_INOVASI:  "bg-sky-500/15 text-sky-400 border-sky-500/30",
  SASTRA:        "bg-violet-500/15 text-violet-400 border-violet-500/30",
  OPINI:         "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};
const CAT_TOP: Record<CatKey, string> = {
  ALL:           "from-amber-400 to-yellow-500",
  JURNAL_VOKASI: "from-orange-400 to-amber-500",
  ESAI_INOVASI:  "from-sky-400 to-blue-500",
  SASTRA:        "from-violet-400 to-purple-500",
  OPINI:         "from-emerald-400 to-teal-500",
};

const JURUSAN_OPTIONS = [
  "Rekayasa Perangkat Lunak (RPL)", "Akuntansi & Keuangan Lembaga (AKL)",
  "Otomatisasi Tata Kelola Perkantoran (OTKP)", "Bisnis Daring & Pemasaran (BDP)",
  "Kuliner / Tata Boga", "Desain Komunikasi Visual (DKV)",
  "Perhotelan & Pariwisata", "Lainnya",
];

function readTime(text: string) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
function renderContent(text: string) {
  return text.split(/\n\n+/).map((para, i) => (
    <p key={i} className="mb-4 leading-relaxed">
      {para.split(/\n/).map((line, j) => (
        <span key={j}>{line}{j < para.split(/\n/).length - 1 && <br />}</span>
      ))}
    </p>
  ));
}

const INIT_FORM = { title: "", authorName: "", authorClass: "", authorJurusan: "", category: "" as CatKey | "", content: "", tags: "" };

export default function SuaraSkansagiri({ theme }: SuaraSkansagiriProps) {
  const isDark = theme === "dark";
  const [articles, setArticles] = useState<KaryaSiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CatKey>("ALL");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<KaryaSiswa | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("suara_liked") || "[]")); } catch { return new Set(); }
  });
  const [form, setForm] = useState(INIT_FORM);
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [mainView, setMainView] = useState<"feed" | "leaderboard">("feed");
  const [leaderboard, setLeaderboard] = useState<TopWriter[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<KomentarSuara[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentForm, setCommentForm] = useState({ authorName: "", authorClass: "", content: "" });
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => { loadArticles(); }, [activeCategory, search]);

  useEffect(() => {
    if (selected) {
      setComments([]);
      setCommentSuccess(false);
      setCommentError("");
      setCommentForm({ authorName: "", authorClass: "", content: "" });
      loadComments(selected.id);
    }
  }, [selected?.id]);

  async function loadComments(artikelId: string) {
    setCommentsLoading(true);
    try {
      const r = await fetch(`/api/suara/${artikelId}/komentar`);
      if (r.ok) setComments(await r.json());
    } finally { setCommentsLoading(false); }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCommentError("");
    if (!commentForm.authorName.trim()) { setCommentError("Nama wajib diisi."); return; }
    if (!commentForm.content.trim()) { setCommentError("Isi komentar tidak boleh kosong."); return; }
    if (commentForm.content.trim().length < 10) { setCommentError("Komentar minimal 10 karakter."); return; }
    if (!selected) return;
    setCommentSubmitting(true);
    try {
      const r = await fetch(`/api/suara/${selected.id}/komentar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentForm),
      });
      const d = await r.json();
      if (!r.ok) { setCommentError(d.error || "Gagal mengirim komentar."); return; }
      setCommentSuccess(true);
    } catch { setCommentError("Terjadi kesalahan jaringan."); }
    finally { setCommentSubmitting(false); }
  }

  async function loadLeaderboard() {
    setLbLoading(true);
    try {
      const r = await fetch("/api/suara/leaderboard");
      if (r.ok) setLeaderboard(await r.json());
    } finally { setLbLoading(false); }
  }

  function switchView(v: "feed" | "leaderboard") {
    setMainView(v);
    if (v === "leaderboard" && leaderboard.length === 0) loadLeaderboard();
  }

  async function loadArticles() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "ALL") params.set("category", activeCategory);
      if (search) params.set("search", search);
      const res = await fetch(`/api/suara?${params}`);
      if (res.ok) setArticles(await res.json());
    } finally { setLoading(false); }
  }

  async function handleArticleClick(a: KaryaSiswa) {
    setSelected(a);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const r = await fetch(`/api/suara/${a.id}/view`, { method: "PATCH" });
      if (r.ok) { const d = await r.json(); setArticles(prev => prev.map(x => x.id === a.id ? { ...x, views: d.views } : x)); }
    } catch {}
  }

  async function handleLike(id: string) {
    if (likedIds.has(id)) return;
    try {
      const r = await fetch(`/api/suara/${id}/like`, { method: "PATCH" });
      if (r.ok) {
        const d = await r.json();
        setArticles(prev => prev.map(x => x.id === id ? { ...x, likes: d.likes } : x));
        if (selected?.id === id) setSelected(prev => prev ? { ...prev, likes: d.likes } : prev);
        const newSet = new Set(likedIds); newSet.add(id); setLikedIds(newSet);
        localStorage.setItem("suara_liked", JSON.stringify([...newSet]));
      }
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim() || !form.authorName.trim() || !form.authorClass.trim() || !form.category || !form.content.trim()) {
      setFormError("Harap lengkapi semua field yang wajib diisi."); return;
    }
    if (form.content.trim().length < 200) {
      setFormError("Konten minimal 200 karakter."); return;
    }
    setFormSubmitting(true);
    try {
      const r = await fetch("/api/suara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags: form.tags }),
      });
      const d = await r.json();
      if (!r.ok) { setFormError(d.error || "Gagal mengirim."); return; }
      setFormSuccess(true);
      setForm(INIT_FORM);
      setCharCount(0);
    } catch { setFormError("Terjadi kesalahan jaringan."); }
    finally { setFormSubmitting(false); }
  }

  const stats = {
    total: articles.length,
    writers: new Set(articles.map(a => a.authorName)).size,
    totalLikes: articles.reduce((s, a) => s + a.likes, 0),
    totalViews: articles.reduce((s, a) => s + a.views, 0),
  };

  const card = (isDark: boolean) => `group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
    isDark ? "bg-slate-900/60 border-white/6 hover:border-white/12 hover:bg-slate-900/80" : "bg-white border-slate-200 hover:border-slate-300"
  }`;

  return (
    <div className="relative z-10 min-h-screen">

      {/* ── ARTICLE DETAIL VIEW ─────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="pt-28 pb-24 px-6 md:px-12"
            ref={detailRef}
          >
            <div className="max-w-3xl mx-auto">
              <button
                onClick={() => setSelected(null)}
                className={`flex items-center gap-2 mb-8 text-xs font-mono tracking-widest uppercase transition-colors ${
                  isDark ? "text-slate-500 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Feed
              </button>

              {/* Category + Status */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className={`text-[10px] font-mono tracking-widest uppercase px-3 py-1 rounded-full border ${
                  isDark ? CAT_BADGE_DARK[selected.category as CatKey] : CAT_BADGE[selected.category as CatKey]
                }`}>
                  {CATEGORIES[selected.category as CatKey]?.label}
                </span>
                {selected.tags.slice(0, 3).map(t => (
                  <span key={t} className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border ${
                    isDark ? "bg-white/5 text-slate-400 border-white/10" : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>{t}</span>
                ))}
              </div>

              {/* Title */}
              <h1 className={`font-serif text-3xl md:text-4xl font-bold leading-tight mb-5 ${isDark ? "text-white" : "text-slate-950"}`}>
                {selected.title}
              </h1>

              {/* Author + Meta */}
              <div className={`flex items-center justify-between gap-4 py-4 border-y mb-8 flex-wrap ${
                isDark ? "border-white/8" : "border-slate-100"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"
                  }`}>
                    {selected.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{selected.authorName}</div>
                    <div className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {selected.authorClass} {selected.authorJurusan ? `· ${selected.authorJurusan}` : ""}
                    </div>
                  </div>
                </div>
                <div className={`flex items-center gap-4 text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{readTime(selected.content)} mnt baca</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{selected.views.toLocaleString()}</span>
                  <span>{formatDate(selected.publishedAt || selected.createdAt)}</span>
                </div>
              </div>

              {/* Content */}
              <div className={`text-sm md:text-base leading-relaxed mb-10 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                {renderContent(selected.content)}
              </div>

              {/* Like + Actions */}
              <div className={`flex items-center justify-between pt-6 border-t ${isDark ? "border-white/8" : "border-slate-100"}`}>
                <button
                  onClick={() => handleLike(selected.id)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all duration-200 text-sm font-medium
                    ${likedIds.has(selected.id)
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-500"
                      : isDark
                        ? "bg-white/5 border-white/10 text-slate-300 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500"
                    }`}
                >
                  <Heart className={`w-4 h-4 ${likedIds.has(selected.id) ? "fill-rose-500" : ""}`} />
                  <span>{selected.likes + (likedIds.has(selected.id) ? 0 : 0)} Apresiasi</span>
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className={`text-xs font-mono tracking-widest uppercase flex items-center gap-1 transition-colors ${
                    isDark ? "text-slate-500 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </button>
              </div>

              {/* ── COMMENTS SECTION ─────────────────────────────── */}
              <div className="mt-12">
                <div className={`border-t pt-10 ${isDark ? "border-white/6" : "border-slate-100"}`}>

                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xs font-mono tracking-widest uppercase font-bold flex items-center gap-2 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      <MessageCircle className="w-4 h-4" />
                      Komentar {comments.length > 0 && `(${comments.length})`}
                    </h3>
                  </div>

                  {/* Comments List */}
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="space-y-4 mb-10">
                      {comments.map((c) => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-3 p-4 rounded-xl border ${
                            isDark ? "bg-white/3 border-white/6" : "bg-slate-50 border-slate-100"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                            isDark ? "bg-violet-500/20 text-violet-400" : "bg-violet-100 text-violet-700"
                          }`}>
                            {c.authorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                {c.authorName}
                              </span>
                              {c.authorClass && (
                                <span className={`text-[9px] font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                  {c.authorClass}
                                </span>
                              )}
                              <span className={`text-[9px] font-mono ml-auto ${isDark ? "text-slate-700" : "text-slate-400"}`}>
                                {new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                            <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                              {c.content}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className={`flex items-center gap-3 py-6 mb-8 text-sm ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                      <MessageCircle className="w-4 h-4" />
                      <span>Belum ada komentar. Jadilah yang pertama!</span>
                    </div>
                  )}

                  {/* Comment Form */}
                  <div className={`rounded-2xl border p-5 ${isDark ? "bg-white/3 border-white/8" : "bg-slate-50 border-slate-200"}`}>
                    <h4 className={`text-xs font-mono tracking-widest uppercase font-bold mb-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Tulis Komentar
                    </h4>

                    {commentSuccess ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-start gap-3 p-4 rounded-xl border ${
                          isDark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold mb-0.5">Komentar terkirim!</div>
                          <div className={`text-xs ${isDark ? "text-emerald-500/80" : "text-emerald-600"}`}>
                            Komentar kamu sedang direview oleh kurator sebelum ditampilkan.
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleCommentSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Nama kamu *"
                            value={commentForm.authorName}
                            onChange={e => setCommentForm(p => ({ ...p, authorName: e.target.value }))}
                            className={`px-3 py-2 rounded-xl border text-sm outline-none transition-colors ${
                              isDark
                                ? "bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-violet-500/50"
                                : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400"
                            }`}
                          />
                          <input
                            type="text"
                            placeholder="Kelas (opsional)"
                            value={commentForm.authorClass}
                            onChange={e => setCommentForm(p => ({ ...p, authorClass: e.target.value }))}
                            className={`px-3 py-2 rounded-xl border text-sm outline-none transition-colors ${
                              isDark
                                ? "bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-violet-500/50"
                                : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400"
                            }`}
                          />
                        </div>
                        <textarea
                          placeholder="Tulis komentarmu... (min. 10 karakter, maks. 500)"
                          value={commentForm.content}
                          onChange={e => setCommentForm(p => ({ ...p, content: e.target.value }))}
                          rows={3}
                          maxLength={500}
                          className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-colors resize-none ${
                            isDark
                              ? "bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-violet-500/50"
                              : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400"
                          }`}
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            {commentError && (
                              <div className={`flex items-center gap-1.5 text-xs ${isDark ? "text-rose-400" : "text-rose-600"}`}>
                                <AlertCircle className="w-3 h-3" />{commentError}
                              </div>
                            )}
                            <span className={`text-[9px] font-mono ${isDark ? "text-slate-700" : "text-slate-400"}`}>
                              Komentar akan ditampilkan setelah moderasi kurator.
                            </span>
                          </div>
                          <button
                            type="submit"
                            disabled={commentSubmitting}
                            className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-[0_0_12px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50"
                          >
                            {commentSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Kirim
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN FEED ─────────────────────────────────────────────── */}
      {!selected && (
        <>
          {/* Hero */}
          <div className={`relative pt-28 pb-16 px-6 md:px-12 overflow-hidden ${isDark ? "bg-gradient-to-b from-slate-950 via-slate-900/80 to-transparent" : "bg-gradient-to-b from-slate-50 via-white to-transparent"}`}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-violet-500/8 blur-3xl" />
              <div className="absolute top-10 right-1/4 w-96 h-96 rounded-full bg-amber-500/6 blur-3xl" />
            </div>
            <div className="relative max-w-7xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5 text-xs font-mono tracking-widest uppercase ${
                  isDark ? "bg-violet-500/10 border-violet-500/25 text-violet-400" : "bg-violet-50 border-violet-200 text-violet-600"
                }`}>
                  <Sparkles className="w-3.5 h-3.5" /> Platform Literasi Digital Siswa
                </div>
                <h1 className={`font-serif text-4xl md:text-5xl font-bold mb-4 leading-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                  Suara{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-400 to-pink-500">
                    Skansagiri
                  </span>
                </h1>
                <p className={`text-base max-w-xl leading-relaxed mb-8 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Ruang ekspresi, gagasan, dan karya tulis siswa SMKN 1 Wonogiri. Dari jurnal vokasi, esai inovasi, hingga puisi — semua suara berharga.
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mb-8">
                  {[
                    { icon: FileText, val: stats.total, label: "Karya Tayang" },
                    { icon: Users,    val: stats.writers, label: "Penulis Aktif" },
                    { icon: Heart,    val: stats.totalLikes, label: "Apresiasi" },
                    { icon: Eye,      val: stats.totalViews, label: "Total Baca" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <s.icon className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                      <span className={`font-mono text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{s.val.toLocaleString()}</span>
                      <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* View Toggle */}
                <div className={`inline-flex items-center gap-1 p-1 rounded-full border mb-5 ${isDark ? "bg-white/4 border-white/8" : "bg-slate-100 border-slate-200"}`}>
                  <button
                    onClick={() => switchView("feed")}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest uppercase transition-all duration-200 ${
                      mainView === "feed"
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md"
                        : isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <BookOpen className="w-3 h-3" /> Feed Karya
                  </button>
                  <button
                    onClick={() => switchView("leaderboard")}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest uppercase transition-all duration-200 ${
                      mainView === "leaderboard"
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                        : isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Trophy className="w-3 h-3" /> Top Writer
                  </button>
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => { setShowSubmit(true); setFormSuccess(false); setFormError(""); }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full font-sans text-xs uppercase tracking-widest font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    <PenLine className="w-3.5 h-3.5" /> Tulis Karya
                  </button>
                  {mainView === "feed" && (
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs ${
                      isDark ? "bg-white/5 border-white/10 text-slate-300" : "bg-white border-slate-200 text-slate-600"
                    }`}>
                      <Search className="w-3.5 h-3.5 shrink-0" />
                      <input
                        type="text"
                        placeholder="Cari karya, penulis, tag..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") setSearch(searchInput); }}
                        className="bg-transparent outline-none w-40 md:w-56 font-mono text-xs placeholder:opacity-50"
                      />
                      {searchInput && (
                        <button onClick={() => { setSearchInput(""); setSearch(""); }} className="opacity-50 hover:opacity-100">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                  {search && mainView === "feed" && (
                    <button onClick={() => { setSearchInput(""); setSearch(""); }} className="text-xs text-amber-500 hover:text-amber-400 font-mono">
                      × Hapus filter
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* ── LEADERBOARD VIEW ──────────────────────────────────── */}
          <AnimatePresence mode="wait">
          {mainView === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="px-6 md:px-12 pb-24"
            >
              <div className="max-w-4xl mx-auto">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Top Writer Skansagiri</h2>
                    <p className={`text-[10px] font-mono tracking-widest uppercase ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Semester ini · Berdasarkan Poin Publikasi
                    </p>
                  </div>
                  <button onClick={loadLeaderboard} className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono tracking-widest uppercase transition-colors ${isDark ? "border-white/8 text-slate-500 hover:text-white hover:bg-white/5" : "border-slate-200 text-slate-400 hover:text-slate-700"}`}>
                    <Sparkles className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {/* Scoring legend */}
                <div className={`flex flex-wrap gap-3 mb-8 p-4 rounded-2xl border ${isDark ? "bg-white/3 border-white/6" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center"><Zap className="w-3 h-3 text-amber-500" /></div>
                    <span className={`font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}><strong className={isDark ? "text-amber-400" : "text-amber-600"}>+10 poin</strong> per karya dipublikasikan</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center"><Heart className="w-3 h-3 text-rose-400" /></div>
                    <span className={`font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}><strong className={isDark ? "text-rose-400" : "text-rose-500"}>+1 poin</strong> per 5 apresiasi</span>
                  </div>
                  <div className={`ml-auto text-[9px] font-mono tracking-widest uppercase ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                    Diperbarui otomatis
                  </div>
                </div>

                {lbLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-20">
                    <Trophy className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-slate-700" : "text-slate-200"}`} />
                    <p className={`text-sm font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                      Belum ada karya yang dipublikasikan.<br/>Jadilah penulis pertama di Suara Skansagiri!
                    </p>
                    <button onClick={() => { setShowSubmit(true); setFormSuccess(false); setFormError(""); }}
                      className="mt-5 px-5 py-2 rounded-full text-xs font-mono uppercase tracking-widest bg-amber-500/15 text-amber-500 border border-amber-500/25 hover:bg-amber-500/25 transition-colors">
                      Tulis Karya Sekarang
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Top 3 Podium */}
                    {leaderboard.length >= 1 && (
                      <div className="mb-8">
                        <div className="flex items-end justify-center gap-3 md:gap-5">
                          {/* 2nd place */}
                          {leaderboard[1] && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                              className={`flex-1 max-w-[220px] rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900/60 border-white/8" : "bg-white border-slate-200"}`}>
                              <div className="h-1.5 bg-gradient-to-r from-slate-400 to-slate-500" />
                              <div className="p-5 text-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black mx-auto mb-3 border-2 ${isDark ? "bg-slate-700 border-slate-500 text-white" : "bg-slate-100 border-slate-300 text-slate-700"}`}>
                                  {leaderboard[1].authorName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Medal className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-[9px] font-mono text-slate-400 tracking-widest uppercase">2nd Place</span>
                                </div>
                                <div className={`text-sm font-bold mb-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>{leaderboard[1].authorName}</div>
                                <div className={`text-[9px] font-mono mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{leaderboard[1].authorClass}</div>
                                <div className={`text-2xl font-black font-mono ${isDark ? "text-slate-300" : "text-slate-700"}`}>{leaderboard[1].points}</div>
                                <div className={`text-[8px] font-mono uppercase tracking-widest mb-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>poin</div>
                                <div className={`flex justify-center gap-3 text-[9px] font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                  <span><FileText className="w-2.5 h-2.5 inline mr-0.5" />{leaderboard[1].publishedCount}</span>
                                  <span><Heart className="w-2.5 h-2.5 inline mr-0.5" />{leaderboard[1].totalLikes}</span>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* 1st place */}
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                            className={`flex-1 max-w-[260px] rounded-2xl border overflow-hidden shadow-xl ${isDark ? "bg-slate-900/80 border-amber-500/30" : "bg-white border-amber-300"}`}>
                            <div className="h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400" />
                            <div className="p-6 text-center relative">
                              <div className="absolute top-3 right-3">
                                <Crown className="w-5 h-5 text-amber-400" />
                              </div>
                              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                                {leaderboard[0].authorName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[9px] font-mono text-amber-400 tracking-widest uppercase">Top Writer</span>
                              </div>
                              <div className={`text-base font-bold mb-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>{leaderboard[0].authorName}</div>
                              <div className={`text-[9px] font-mono mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                {leaderboard[0].authorClass}
                                {leaderboard[0].authorJurusan && ` · ${leaderboard[0].authorJurusan.split("(")[0].trim()}`}
                              </div>
                              <div className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-0.5">{leaderboard[0].points}</div>
                              <div className={`text-[8px] font-mono uppercase tracking-widest mb-3 ${isDark ? "text-slate-600" : "text-slate-400"}`}>poin</div>
                              <div className={`flex justify-center gap-4 text-[9px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                <span className="flex items-center gap-1"><FileText className="w-2.5 h-2.5" />{leaderboard[0].publishedCount} karya</span>
                                <span className="flex items-center gap-1"><Heart className="w-2.5 h-2.5" />{leaderboard[0].totalLikes} apresiasi</span>
                                <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{leaderboard[0].totalViews}</span>
                              </div>
                            </div>
                          </motion.div>

                          {/* 3rd place */}
                          {leaderboard[2] && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                              className={`flex-1 max-w-[220px] rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900/60 border-white/8" : "bg-white border-slate-200"}`}>
                              <div className="h-1.5 bg-gradient-to-r from-amber-700 to-orange-800" />
                              <div className="p-5 text-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black mx-auto mb-3 border-2 ${isDark ? "bg-amber-900/40 border-amber-700/40 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                  {leaderboard[2].authorName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Award className="w-3.5 h-3.5 text-amber-700" />
                                  <span className={`text-[9px] font-mono tracking-widest uppercase ${isDark ? "text-amber-700" : "text-amber-600"}`}>3rd Place</span>
                                </div>
                                <div className={`text-sm font-bold mb-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>{leaderboard[2].authorName}</div>
                                <div className={`text-[9px] font-mono mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{leaderboard[2].authorClass}</div>
                                <div className={`text-2xl font-black font-mono ${isDark ? "text-amber-600" : "text-amber-700"}`}>{leaderboard[2].points}</div>
                                <div className={`text-[8px] font-mono uppercase tracking-widest mb-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>poin</div>
                                <div className={`flex justify-center gap-3 text-[9px] font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                  <span><FileText className="w-2.5 h-2.5 inline mr-0.5" />{leaderboard[2].publishedCount}</span>
                                  <span><Heart className="w-2.5 h-2.5 inline mr-0.5" />{leaderboard[2].totalLikes}</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rankings 4+ */}
                    {leaderboard.length > 3 && (
                      <div>
                        <div className={`text-[9px] font-mono tracking-widest uppercase mb-3 flex items-center gap-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                          <BarChart2 className="w-3 h-3" /> Peringkat Berikutnya
                        </div>
                        <div className="space-y-2">
                          {leaderboard.slice(3).map((w, idx) => (
                            <motion.div
                              key={w.authorName}
                              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * idx }}
                              className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${isDark ? "bg-white/3 border-white/6 hover:bg-white/5" : "bg-white border-slate-100 hover:bg-slate-50"} transition-colors`}
                            >
                              <span className={`w-7 text-center text-xs font-black font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>{idx + 4}</span>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isDark ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                                {w.authorName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>{w.authorName}</div>
                                <div className={`text-[9px] font-mono truncate ${isDark ? "text-slate-600" : "text-slate-400"}`}>{w.authorClass}</div>
                              </div>
                              <div className="hidden sm:flex items-center gap-3 text-[9px] font-mono">
                                <span className={isDark ? "text-slate-600" : "text-slate-400"}>
                                  <FileText className="w-2.5 h-2.5 inline mr-0.5" />{w.publishedCount}
                                </span>
                                <span className={isDark ? "text-slate-600" : "text-slate-400"}>
                                  <Heart className="w-2.5 h-2.5 inline mr-0.5" />{w.totalLikes}
                                </span>
                              </div>
                              <div className={`text-right shrink-0`}>
                                <div className={`text-base font-black font-mono ${isDark ? "text-white" : "text-slate-800"}`}>{w.points}</div>
                                <div className={`text-[8px] font-mono uppercase tracking-widest ${isDark ? "text-slate-600" : "text-slate-400"}`}>poin</div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Category Filter — feed view only */}
          {mainView === "feed" && (
          <div className="px-6 md:px-12 mb-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(CATEGORIES) as CatKey[]).map(k => {
                  const c = CATEGORIES[k]; const Icon = c.icon;
                  const isActive = activeCategory === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setActiveCategory(k)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-mono tracking-widest uppercase border transition-all duration-200 ${
                        isActive
                          ? `bg-gradient-to-r ${CAT_TOP[k]} text-white border-transparent shadow-lg`
                          : isDark
                            ? "bg-white/4 border-white/8 text-slate-400 hover:bg-white/8 hover:text-white"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-3 h-3" /> {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          {/* Articles Grid — feed view only */}
          {mainView === "feed" && <div className="px-6 md:px-12 pb-24">
            <div className="max-w-7xl mx-auto">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                </div>
              ) : articles.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                    <BookOpen className={`w-7 h-7 ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                  </div>
                  <p className={`text-sm font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                    {search ? "Tidak ada karya yang cocok dengan pencarian." : "Belum ada karya yang tayang. Jadilah yang pertama menulis!"}
                  </p>
                  {!search && (
                    <button
                      onClick={() => setShowSubmit(true)}
                      className="mt-5 px-5 py-2 rounded-full text-xs font-mono tracking-widest uppercase bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25 transition-colors"
                    >
                      Tulis Karya Pertama
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {articles.map((a, i) => {
                    const cat = a.category as CatKey;
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                        className={card(isDark)}
                        onClick={() => handleArticleClick(a)}
                      >
                        {/* Top color bar */}
                        <div className={`h-[3px] bg-gradient-to-r ${CAT_TOP[cat]} opacity-70 group-hover:opacity-100 transition-opacity`} />

                        <div className="p-5 flex flex-col gap-3 flex-1">
                          {/* Category + read time */}
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full border ${isDark ? CAT_BADGE_DARK[cat] : CAT_BADGE[cat]}`}>
                              {CATEGORIES[cat]?.label}
                            </span>
                            <span className={`text-[9px] font-mono flex items-center gap-1 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                              <Clock className="w-2.5 h-2.5" />{readTime(a.content)} mnt
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className={`font-serif text-base font-bold leading-snug line-clamp-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                            {a.title}
                          </h3>

                          {/* Excerpt */}
                          <p className={`text-xs leading-relaxed line-clamp-3 flex-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {a.excerpt}
                          </p>

                          {/* Tags */}
                          {a.tags.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {a.tags.slice(0, 2).map(t => (
                                <span key={t} className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${
                                  isDark ? "bg-white/4 text-slate-500 border-white/8" : "bg-slate-50 text-slate-400 border-slate-200"
                                }`}>{t}</span>
                              ))}
                            </div>
                          )}

                          {/* Author */}
                          <div className={`flex items-center gap-2 pt-2 border-t ${isDark ? "border-white/5" : "border-slate-100"}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                              {a.authorName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-semibold truncate ${isDark ? "text-slate-300" : "text-slate-700"}`}>{a.authorName}</div>
                              <div className={`text-[9px] font-mono truncate ${isDark ? "text-slate-600" : "text-slate-400"}`}>{a.authorClass}</div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className={`flex items-center justify-between text-[9px] font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{a.views}</span>
                              <span className={`flex items-center gap-1 ${likedIds.has(a.id) ? "text-rose-500" : ""}`}>
                                <Heart className={`w-2.5 h-2.5 ${likedIds.has(a.id) ? "fill-rose-500" : ""}`} />{a.likes}
                              </span>
                            </div>
                            <span>{formatDate(a.publishedAt || a.createdAt)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>}
        </>
      )}

      {/* ── SUBMIT MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showSubmit && (
          <motion.div
            key="submit-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSubmit(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.25 }}
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${
                isDark ? "bg-slate-900 border-white/8" : "bg-white border-slate-200"
              }`}
            >
              {/* Modal Header */}
              <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${isDark ? "bg-slate-900 border-white/8" : "bg-white border-slate-100"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <PenLine className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Kirim Karya Tulis</h3>
                    <p className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>Karya akan direview kurator sebelum tayang</p>
                  </div>
                </div>
                <button onClick={() => setShowSubmit(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/8 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formSuccess ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h4 className={`font-serif text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Karya Berhasil Dikirim!</h4>
                  <p className={`text-sm max-w-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Karyamu sudah masuk ke antrian review. Kurator akan memeriksa dan memberikan keputusan segera. Terima kasih telah berbagi!
                  </p>
                  <div className={`mt-2 px-4 py-2 rounded-full text-xs font-mono border ${isDark ? "bg-white/5 border-white/10 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                    Status: MENUNGGU REVIEW
                  </div>
                  <button
                    onClick={() => { setShowSubmit(false); setFormSuccess(false); }}
                    className="mt-2 px-6 py-2.5 rounded-full text-xs font-mono tracking-widest uppercase bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Category Selector */}
                  <div>
                    <label className={`block text-xs font-mono tracking-widest uppercase mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Kategori Karya <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["JURNAL_VOKASI", "ESAI_INOVASI", "SASTRA", "OPINI"] as const).map(k => {
                        const c = CATEGORIES[k]; const Icon = c.icon;
                        return (
                          <button
                            key={k} type="button"
                            onClick={() => setForm(f => ({ ...f, category: k }))}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              form.category === k
                                ? `bg-gradient-to-r ${CAT_TOP[k]} text-white border-transparent shadow-md`
                                : isDark
                                  ? "bg-white/4 border-white/8 text-slate-400 hover:bg-white/8"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-xs font-semibold">{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className={`block text-xs font-mono tracking-widest uppercase mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Judul Karya <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text" maxLength={120}
                      value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Tulis judul yang menarik dan deskriptif..."
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                        isDark
                          ? "bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-violet-500/50"
                          : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400"
                      }`}
                    />
                  </div>

                  {/* Author Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-mono tracking-widest uppercase mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Nama Lengkap <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.authorName} onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
                        placeholder="Nama kamu"
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                          isDark ? "bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-violet-500/50" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-mono tracking-widest uppercase mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Kelas <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.authorClass} onChange={e => setForm(f => ({ ...f, authorClass: e.target.value }))}
                        placeholder="Contoh: XII RPL 1"
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                          isDark ? "bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-violet-500/50" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Jurusan */}
                  <div>
                    <label className={`block text-xs font-mono tracking-widest uppercase mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Program Keahlian
                    </label>
                    <select
                      value={form.authorJurusan} onChange={e => setForm(f => ({ ...f, authorJurusan: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                        isDark ? "bg-slate-800 border-white/8 text-white focus:border-violet-500/50" : "bg-white border-slate-200 text-slate-900 focus:border-violet-400"
                      }`}
                    >
                      <option value="">Pilih Jurusan (opsional)</option>
                      {JURUSAN_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-xs font-mono tracking-widest uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Isi Karya <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[9px] font-mono ${charCount < 200 ? "text-rose-400" : isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {charCount} / min. 200 karakter
                      </span>
                    </div>
                    <textarea
                      rows={10}
                      value={form.content}
                      onChange={e => { setForm(f => ({ ...f, content: e.target.value })); setCharCount(e.target.value.length); }}
                      placeholder="Tuliskan karya terbaikmu di sini. Tulis dengan hati, bagikan dengan bangga.&#10;&#10;Kamu bisa menulis artikel, esai, puisi, cerpen, opini, atau apa saja yang ingin kamu sampaikan kepada sesama warga SMKN 1 Wonogiri.&#10;&#10;Minimal 200 karakter."
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors resize-none leading-relaxed ${
                        isDark ? "bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-violet-500/50" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400"
                      }`}
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className={`block text-xs font-mono tracking-widest uppercase mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Tags <span className={`normal-case font-sans ${isDark ? "text-slate-600" : "text-slate-400"}`}>(pisah dengan koma)</span>
                    </label>
                    <input
                      type="text"
                      value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                      placeholder="Contoh: IoT, AI, Kuliner, PKL"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                        isDark ? "bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-violet-500/50" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400"
                      }`}
                    />
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                    </div>
                  )}

                  <div className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${isDark ? "bg-amber-500/5 border-amber-500/15 text-amber-400/70" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    <Star className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Karyamu akan masuk ke antrian review kurator. Setelah disetujui, akan tayang di feed Suara Skansagiri dan kamu mendapat <strong>poin penulis</strong>!</span>
                  </div>

                  <button
                    type="submit" disabled={formSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-sans text-sm uppercase tracking-widest font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {formSubmitting ? "Mengirim..." : "Kirim Karya"}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
