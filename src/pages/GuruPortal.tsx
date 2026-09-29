import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Archive, ArrowLeft, BookOpen, CheckCircle2, FileText, GraduationCap,
  LayoutDashboard, Loader2, LogIn, Plus, RefreshCw, Send, ShieldCheck,
  Sparkles, X,
} from "lucide-react";
import { navigate } from "../utils/navigation";

type ModuleStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
type Module = {
  id: string;
  title: string;
  description: string;
  phase: string;
  element: string;
  status: ModuleStatus;
  updatedAt: string;
  subject: { id: string; code: string; name: string };
  academicYear: { id: string; code: string; name: string };
  _count?: { assets: number };
};
type Assignment = {
  subject: { id: string; code: string; name: string };
  academicYear: { id: string; code: string; name: string };
  class: { id: string; code: string; name: string };
};
type FormState = {
  title: string;
  description: string;
  phase: string;
  element: string;
  subjectId: string;
  academicYearId: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  phase: "E",
  element: "",
  subjectId: "",
  academicYearId: "",
};

function token() {
  return localStorage.getItem("smkn1_core_token") || "";
}

function statusLabel(status: ModuleStatus) {
  return { DRAFT: "Draft", REVIEW: "Review", PUBLISHED: "Terbit", ARCHIVED: "Arsip" }[status];
}

function statusClass(status: ModuleStatus) {
  return {
    DRAFT: "bg-slate-500/10 text-slate-600",
    REVIEW: "bg-amber-500/15 text-amber-700",
    PUBLISHED: "bg-emerald-500/12 text-emerald-700",
    ARCHIVED: "bg-rose-500/10 text-rose-600",
  }[status];
}

export default function GuruPortal() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(token()));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [tab, setTab] = useState<"dashboard" | "modules">("dashboard");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Module | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const request = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${token()}`, ...(options?.body ? { "Content-Type": "application/json" } : {}), ...(options?.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      localStorage.removeItem("smkn1_core_token");
      setLoggedIn(false);
    }
    if (!response.ok) throw new Error(payload.error?.message || "Permintaan gagal diproses.");
    return payload.data;
  };

  const load = async () => {
    if (!token()) return;
    setLoading(true);
    try {
      const [session, context, nextOverview, nextModules] = await Promise.all([
        request("/api/v1/auth/session"),
        request("/api/v1/lms/guru/context"),
        request("/api/v1/lms/guru/dashboard"),
        request(`/api/v1/lms/guru/modul${search ? `?search=${encodeURIComponent(search)}` : ""}`),
      ]);
      setUser(session.user);
      setAssignments(context.assignments || []);
      setYears(context.years || []);
      setOverview(nextOverview);
      setModules(nextModules.items || []);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Data guru gagal dimuat." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (loggedIn) load(); }, [loggedIn]);
  useEffect(() => {
    if (!loggedIn) return;
    const timer = window.setTimeout(() => { load(); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const assignmentOptions = useMemo(() => {
    const seen = new Set<string>();
    return assignments.filter((item) => {
      const key = `${item.subject.id}:${item.academicYear.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [assignments]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Login gagal.");
      localStorage.setItem("smkn1_core_token", payload.data.token);
      setUser(payload.data.user);
      setLoggedIn(true);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login gagal.");
    }
  };

  const openCreate = () => {
    const first = assignmentOptions[0];
    setEditing(null);
    setForm({ ...EMPTY_FORM, subjectId: first?.subject.id || "", academicYearId: first?.academicYear.id || "" });
    setShowForm(true);
  };

  const openEdit = (item: Module) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      phase: item.phase,
      element: item.element,
      subjectId: item.subject.id,
      academicYearId: item.academicYear.id,
    });
    setShowForm(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const endpoint = editing ? `/api/v1/lms/guru/modul/${editing.id}` : "/api/v1/lms/guru/modul";
      await request(endpoint, { method: editing ? "PATCH" : "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setNotice({ type: "success", text: editing ? "Modul berhasil diperbarui." : "Modul draft berhasil dibuat." });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Modul gagal disimpan." });
    }
  };

  const action = async (item: Module, endpoint: "submit-review" | "publish" | "archive") => {
    setBusyId(item.id);
    try {
      await request(`/api/v1/lms/guru/modul/${item.id}/${endpoint}`, { method: "POST" });
      setNotice({ type: "success", text: endpoint === "submit-review" ? "Modul dikirim untuk review." : endpoint === "publish" ? "Modul berhasil diterbitkan." : "Modul diarsipkan." });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Status modul gagal diperbarui." });
    } finally {
      setBusyId(null);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token()}` } }).catch(() => {});
    localStorage.removeItem("smkn1_core_token");
    setLoggedIn(false);
    navigate("/");
  };

  if (!loggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center p-5 bg-[#07111f] text-white">
        <div className="fixed inset-0 pointer-events-none opacity-70" style={{ background: "radial-gradient(circle at 15% 20%, rgba(245,158,11,.18), transparent 30%), radial-gradient(circle at 85% 75%, rgba(14,165,233,.16), transparent 35%)" }} />
        <form onSubmit={login} className="relative w-full max-w-md rounded-[30px] p-8 sm:p-10 border border-white/10 bg-slate-900/90 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center"><GraduationCap className="w-6 h-6 text-slate-950" /></div>
            <div><p className="text-[10px] uppercase tracking-[.22em] text-amber-400 font-black">SMKN 1 Wonogiri</p><p className="font-bold">Portal Guru</p></div>
          </div>
          <p className="text-xs uppercase tracking-[.24em] text-amber-400 font-black">Core identity</p>
          <h1 className="text-3xl font-black mt-2 tracking-tight">Ruang kerja guru</h1>
          <p className="text-sm text-white/60 mt-3 mb-8 leading-relaxed">Kelola modul kurikulum dari akun sekolah yang terhubung dengan assignment Anda.</p>
          <label className="block text-xs font-bold mb-2">Email sekolah
            <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 px-4 py-3 bg-white/5 outline-none focus:ring-2 focus:ring-amber-400" />
          </label>
          <label className="block text-xs font-bold mt-4 mb-2">Password
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 px-4 py-3 bg-white/5 outline-none focus:ring-2 focus:ring-amber-400" />
          </label>
          {loginError && <p role="alert" className="mt-4 text-sm text-rose-300">{loginError}</p>}
          <button className="w-full mt-6 rounded-xl bg-amber-400 text-slate-950 py-3.5 font-black flex items-center justify-center gap-2 hover:-translate-y-0.5 transition"><LogIn className="w-4 h-4" /> Masuk ke portal</button>
          <button type="button" onClick={() => navigate("/")} className="w-full mt-3 py-3 text-sm text-white/50 hover:text-white">Kembali ke portal publik</button>
        </form>
      </main>
    );
  }

  const totals = overview?.totals || { total: 0, drafts: 0, reviews: 0, published: 0, archived: 0 };
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center"><GraduationCap className="text-slate-950" /></div><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.2em] text-amber-600 font-black">Portal Guru</p><h1 className="font-black truncate">{user?.fullName || "Ruang kerja guru"}</h1></div></div>
          <div className="flex items-center gap-2"><button aria-label="Muat ulang" onClick={load} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button><button onClick={logout} className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold">Keluar</button></div>
        </div>
      </header>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-7 sm:py-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-7"><div><div className="flex items-center gap-2 text-amber-600 text-xs uppercase tracking-[.24em] font-black"><Sparkles className="w-3.5 h-3.5" /> Wave 2 · Sprint 5</div><h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2">Modul kurikulum</h2><p className="opacity-60 mt-2 max-w-2xl text-sm sm:text-base">Bangun modul yang terhubung ke mapel, tahun ajaran, dan assignment guru Anda.</p></div><button onClick={openCreate} className="rounded-xl bg-slate-950 text-white px-4 py-3 font-black flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Modul baru</button></div>
        <nav className="flex gap-1 p-1 rounded-2xl border border-slate-200 bg-white mb-7 overflow-x-auto">
          <button onClick={() => setTab("dashboard")} className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${tab === "dashboard" ? "bg-amber-400 text-slate-950" : "text-slate-500"}`}><LayoutDashboard className="w-4 h-4" /> Ringkasan</button>
          <button onClick={() => setTab("modules")} className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${tab === "modules" ? "bg-amber-400 text-slate-950" : "text-slate-500"}`}><BookOpen className="w-4 h-4" /> Modul saya <span className="opacity-60">{totals.total}</span></button>
        </nav>
        {notice && <div role="status" className={`mb-5 rounded-2xl border px-4 py-3 flex items-center justify-between text-sm ${notice.type === "error" ? "border-rose-500/30 bg-rose-500/10 text-rose-700" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"}`}>{notice.text}<button onClick={() => setNotice(null)}><X className="w-4 h-4" /></button></div>}
        {tab === "dashboard" && <section>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{[
            ["Total modul", totals.total, "semua status"], ["Draft", totals.drafts, "masih diedit"], ["Review", totals.reviews, "menunggu review"], ["Terbit", totals.published, "aktif untuk siswa"], ["Arsip", totals.archived, "tidak aktif"],
          ].map(([label, value, note]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-black mt-2">{value}</p><p className="text-[11px] text-slate-400 mt-2">{note}</p></div>)}</div>
          <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-5 mt-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Assignment aktif</p><h3 className="font-black text-xl mt-1">Konteks mengajar</h3><p className="text-sm text-slate-500 mt-2">Modul hanya dapat dibuat pada mapel dan tahun ajaran yang diberikan operator.</p><div className="mt-5 space-y-2">{assignments.slice(0, 6).map((item, index) => <div key={`${item.subject.id}-${item.class.id}-${index}`} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 flex items-center justify-between gap-3 text-sm"><span className="font-bold">{item.subject.name}</span><span className="text-xs text-slate-500">{item.class.name} · {item.academicYear.code}</span></div>)}{!assignments.length && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">Belum ada assignment aktif. Hubungi operator untuk mengaktifkan scope mengajar.</p>}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-950 text-white p-5 sm:p-6"><ShieldCheck className="text-amber-400" /><h3 className="font-black text-xl mt-4">Workflow aman</h3><p className="text-sm text-white/60 mt-2 leading-relaxed">Draft tidak terlihat siswa. Setiap perubahan status dicatat pada audit log. Upload dokumen dan parser AI masuk pada sprint berikutnya setelah fondasi modul stabil.</p><button onClick={() => setTab("modules")} className="mt-5 text-sm font-black text-amber-400">Buka modul saya →</button></div>
          </div>
        </section>}
        {tab === "modules" && <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Kurikulum</p><h3 className="font-black text-xl mt-1">Modul saya</h3></div><input aria-label="Cari modul" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul, fase, elemen..." className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-64" /></div>
          <div className="divide-y divide-slate-100">{modules.map((item) => <article key={item.id} className="p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-lg px-2 py-1 text-[10px] font-black ${statusClass(item.status)}`}>{statusLabel(item.status)}</span><span className="text-xs text-slate-500">{item.subject.code} · {item.academicYear.code}</span></div><h4 className="font-black text-lg mt-3">{item.title}</h4><p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.description || "Belum ada deskripsi modul."}</p><p className="text-xs text-slate-400 mt-3">Fase {item.phase} · {item.element} · diperbarui {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.updatedAt))}</p></div><div className="flex flex-wrap gap-2 shrink-0">{["DRAFT", "REVIEW"].includes(item.status) && <button onClick={() => openEdit(item)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-black">Edit</button>}{item.status === "DRAFT" && <button disabled={busyId === item.id} onClick={() => action(item, "submit-review")} className="px-3 py-2 rounded-xl border border-amber-500/40 text-amber-700 text-xs font-black flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Review</button>}{["DRAFT", "REVIEW"].includes(item.status) && <button disabled={busyId === item.id} onClick={() => action(item, "publish")} className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Terbitkan</button>}{item.status !== "ARCHIVED" && <button disabled={busyId === item.id} onClick={() => action(item, "archive")} className="p-2 rounded-xl border border-slate-200 text-slate-500" aria-label="Arsipkan modul"><Archive className="w-4 h-4" /></button>}</div></article>)}{!modules.length && <div className="p-16 text-center text-slate-400"><FileText className="w-10 h-10 mx-auto mb-3" /><p className="font-bold">Belum ada modul</p><p className="text-sm mt-1">Buat modul pertama dari assignment aktif Anda.</p></div>}</div>
        </section>}
      </div>
      {showForm && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-slate-950/50 backdrop-blur-sm"><form onSubmit={save} className="w-full sm:max-w-xl rounded-t-[28px] sm:rounded-[28px] border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl"><div className="flex items-start justify-between mb-6"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-black">{editing ? "Edit modul" : "Modul baru"}</p><h3 className="text-2xl font-black mt-1">Detail kurikulum</h3></div><button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><div className="space-y-4"><label className="block text-xs font-black">Judul modul<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:ring-2 focus:ring-amber-400" placeholder="Contoh: Dasar algoritma dan pemrograman" /></label><div className="grid sm:grid-cols-2 gap-4"><label className="block text-xs font-black">Mapel<select disabled={Boolean(editing)} required value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 bg-white"><option value="">Pilih mapel</option>{assignmentOptions.map((item) => <option key={`${item.subject.id}-${item.academicYear.id}`} value={item.subject.id}>{item.subject.code} · {item.subject.name}</option>)}</select></label><label className="block text-xs font-black">Tahun ajaran<select disabled={Boolean(editing)} required value={form.academicYearId} onChange={(event) => setForm({ ...form, academicYearId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 bg-white"><option value="">Pilih tahun</option>{years.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label></div><div className="grid sm:grid-cols-2 gap-4"><label className="block text-xs font-black">Fase<input required value={form.phase} onChange={(event) => setForm({ ...form, phase: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="E / F" /></label><label className="block text-xs font-black">Elemen<input required value={form.element} onChange={(event) => setForm({ ...form, element: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Contoh: Algoritma" /></label></div><label className="block text-xs font-black">Deskripsi<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 resize-y" placeholder="Tujuan dan ringkasan modul..." /></label></div><div className="flex gap-2 mt-7"><button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold">Batal</button><button disabled={loading} className="flex-1 rounded-xl bg-slate-950 text-white py-3 font-black flex items-center justify-center gap-2">{loading && <Loader2 className="w-4 h-4 animate-spin" />} Simpan draft</button></div></form></div>}
    </main>
  );
}