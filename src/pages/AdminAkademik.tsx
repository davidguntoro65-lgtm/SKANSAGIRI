import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft, BookOpen, Check, CheckCircle2, ChevronDown, ClipboardList, Download,
  FileSpreadsheet, GraduationCap, History, LayoutDashboard, Loader2, LogIn, Plus,
  RefreshCw, Search, ShieldCheck, Sparkles, Upload, Users, X, XCircle,
} from "lucide-react";

type Theme = "light" | "dark";
type ImportType = "tahun-ajaran" | "jurusan" | "mapel" | "kelas" | "guru" | "siswa" | "assignment-guru" | "enrollment-siswa";
type CoreTab = "dashboard" | "master" | "import" | "requests" | "audit";
type MasterKey = "academicYears" | "departments" | "subjects" | "classes" | "teachers" | "students";
type PreviewRow = { row: number; values: Record<string, unknown>; status: string; errors: string[] };
type Overview = { academicYear: { code: string; name: string } | null; totals: { teachers: number; students: number; subjects: number; classes: number }; pendingRequests: number; lastImport: { fileName: string; status: string; errorRows: number; successRows: number } | null };
type MasterData = Record<MasterKey, any[]>;
type FormState = { code: string; name: string; grade: string; academicYearId: string; departmentId: string; isActive: boolean; status: string };

const IMPORTS: { type: ImportType; label: string; description: string }[] = [
  { type: "tahun-ajaran", label: "Tahun ajaran", description: "Periode akademik dan konteks aktif" },
  { type: "jurusan", label: "Jurusan", description: "Program keahlian sekolah" },
  { type: "mapel", label: "Mata pelajaran", description: "Master mapel dan jurusan opsional" },
  { type: "kelas", label: "Kelas", description: "Kelas, tingkat, tahun, dan jurusan" },
  { type: "guru", label: "Guru", description: "Profil guru dan akun undangan" },
  { type: "siswa", label: "Siswa", description: "Profil siswa serta enrollment awal" },
  { type: "assignment-guru", label: "Assignment guru", description: "Akses resmi guru ke kelas" },
  { type: "enrollment-siswa", label: "Enrollment siswa", description: "Penempatan siswa per periode" },
];
const MASTER_META: { key: MasterKey; label: string; code: string; icon: typeof BookOpen; manual: boolean }[] = [
  { key: "academicYears", label: "Tahun ajaran", code: "code", icon: ClipboardList, manual: true },
  { key: "departments", label: "Jurusan", code: "code", icon: GraduationCap, manual: true },
  { key: "subjects", label: "Mata pelajaran", code: "code", icon: BookOpen, manual: true },
  { key: "classes", label: "Kelas", code: "code", icon: Users, manual: true },
  { key: "teachers", label: "Guru", code: "nip", icon: GraduationCap, manual: false },
  { key: "students", label: "Siswa", code: "nisn", icon: Users, manual: false },
];
const EMPTY_FORM: FormState = { code: "", name: "", grade: "X", academicYearId: "", departmentId: "", isActive: false, status: "ACTIVE" };

function token() { return localStorage.getItem("smkn1_adm_token") || ""; }
function authHeaders(json = false) { return { Authorization: `Bearer ${token()}`, ...(json ? { "Content-Type": "application/json" } : {}) }; }
function dateLabel(value: string | Date) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function downloadTemplate(type: ImportType) { window.open(`/api/v1/akademik/import/templates/${type}`, "_blank"); }
function badgeClass(status: string) {
  if (["ACTIVE", "COMMITTED", "APPROVED", "VALID"].includes(status)) return "bg-emerald-500/12 text-emerald-600";
  if (["SUBMITTED", "PREVIEWED", "NEEDS_REVISION"].includes(status)) return "bg-amber-500/15 text-amber-700";
  if (["ERROR", "DUPLICATE", "REJECTED", "FAILED"].includes(status)) return "bg-rose-500/12 text-rose-600";
  return "bg-slate-500/10 text-slate-600";
}

export default function AdminAkademik({ theme = "light", onBack }: { theme?: Theme; onBack: () => void }) {
  const dark = theme === "dark";
  const [loggedIn, setLoggedIn] = useState(() => Boolean(token()));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<CoreTab>("dashboard");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [master, setMaster] = useState<MasterData>({ academicYears: [], departments: [], subjects: [], classes: [], teachers: [], students: [] });
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [masterKey, setMasterKey] = useState<MasterKey>("academicYears");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [importType, setImportType] = useState<ImportType>("guru");
  const [file, setFile] = useState<{ name: string; base64: string } | null>(null);
  const [preview, setPreview] = useState<{ jobId: string; rows: PreviewRow[]; totalRows: number; validRows: number; errorRows: number } | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [expandedJob, setExpandedJob] = useState<any | null>(null);

  const request = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, { ...options, headers: { ...authHeaders(Boolean(options?.body)), ...(options?.headers || {}) } });
    if (response.status === 401) { localStorage.removeItem("smkn1_adm_token"); setLoggedIn(false); throw new Error("Session berakhir. Silakan login kembali."); }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || payload.error || "Permintaan gagal diproses.");
    return payload.data;
  };

  const load = async () => {
    if (!loggedIn) return;
    setLoading(true);
    try {
      const [nextOverview, nextMaster, nextRequests] = await Promise.all([
        request("/api/v1/akademik/overview"),
        request(`/api/v1/akademik/master?search=${encodeURIComponent(search)}&pageSize=50`),
        request("/api/v1/akademik/teacher-requests"),
      ]);
      setOverview(nextOverview); setMaster(nextMaster); setRequests(nextRequests || []);
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Data gagal dimuat." }); }
    finally { setLoading(false); }
  };
  const loadActivity = async () => {
    try {
      const [nextJobs, nextAudit] = await Promise.all([request("/api/v1/akademik/import/jobs?pageSize=12"), request("/api/v1/akademik/audit?pageSize=12")]);
      setJobs(nextJobs?.items || []); setAudit(nextAudit?.items || []); setAuditTotal(nextAudit?.total || 0);
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Aktivitas gagal dimuat." }); }
  };
  useEffect(() => { load(); }, [loggedIn]);
  useEffect(() => { if (loggedIn && (tab === "import" || tab === "audit")) loadActivity(); }, [tab, loggedIn]);

  const login = async (event: FormEvent) => {
    event.preventDefault(); setLoginError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login gagal.");
      localStorage.setItem("smkn1_adm_token", data.token); setLoggedIn(true);
    } catch (error) { setLoginError(error instanceof Error ? error.message : "Login gagal."); }
  };
  const readFile = (selected?: File) => {
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) { setNotice({ type: "error", text: "File melebihi batas 10 MB." }); return; }
    const reader = new FileReader();
    reader.onload = () => { setFile({ name: selected.name, base64: String(reader.result) }); setPreview(null); setNotice(null); };
    reader.readAsDataURL(selected);
  };
  const previewImport = async () => {
    if (!file) return;
    setImportBusy(true);
    try {
      const data = await request(`/api/v1/akademik/import/${importType}/preview`, { method: "POST", body: JSON.stringify({ fileName: file.name, fileBase64: file.base64 }) });
      setPreview(data); setNotice({ type: data.errorRows ? "error" : "success", text: data.errorRows ? `${data.errorRows} baris perlu diperbaiki sebelum commit.` : "Preview valid. Import siap disimpan." });
      await loadActivity();
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Preview gagal." }); }
    finally { setImportBusy(false); }
  };
  const commitImport = async () => {
    if (!file || !preview || preview.errorRows > 0) return;
    setImportBusy(true);
    try {
      const data = await request(`/api/v1/akademik/import/${importType}/commit`, { method: "POST", body: JSON.stringify({ jobId: preview.jobId, fileBase64: file.base64 }) });
      setNotice({ type: "success", text: `${data.successRows} baris berhasil disimpan dalam satu transaksi.` });
      setFile(null); setPreview(null); await Promise.all([load(), loadActivity()]);
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Commit gagal." }); }
    finally { setImportBusy(false); }
  };
  const openCreate = () => { setEditingId(null); setForm({ ...EMPTY_FORM, academicYearId: master.academicYears[0]?.id || "" }); setShowForm(true); };
  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({ code: item.code || "", name: item.name || "", grade: item.grade || "X", academicYearId: item.academicYearId || "", departmentId: item.departmentId || "", isActive: Boolean(item.isActive), status: item.status || "ACTIVE" });
    setShowForm(true);
  };
  const saveMaster = async (event: FormEvent) => {
    event.preventDefault();
    const endpoint = masterKey === "academicYears" ? "tahun-ajaran" : masterKey === "departments" ? "jurusan" : masterKey === "subjects" ? "mapel" : "kelas";
    const payload = masterKey === "academicYears"
      ? { code: form.code, name: form.name, isActive: form.isActive, status: form.status }
      : masterKey === "departments"
        ? { code: form.code, name: form.name, status: form.status }
        : masterKey === "subjects"
          ? { code: form.code, name: form.name, departmentId: form.departmentId || null, status: form.status }
          : { code: form.code, name: form.name, grade: form.grade, academicYearId: form.academicYearId, departmentId: form.departmentId || null, status: form.status };
    try {
      await request(`/api/v1/akademik/${endpoint}${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setShowForm(false); setNotice({ type: "success", text: `${MASTER_META.find((item) => item.key === masterKey)?.label} berhasil ${editingId ? "diperbarui" : "ditambahkan"}.` }); await load();
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Data gagal disimpan." }); }
  };
  const reviewRequest = async (item: any, status: "APPROVED" | "REJECTED" | "NEEDS_REVISION") => {
    const reviewNote = status === "APPROVED" ? "" : window.prompt("Catatan untuk guru (wajib untuk penolakan/revisi):", "") || "";
    if (status !== "APPROVED" && !reviewNote.trim()) return;
    try { await request(`/api/v1/akademik/teacher-requests/${item.id}/review`, { method: "PATCH", body: JSON.stringify({ status, reviewNote }) }); setNotice({ type: "success", text: "Pengajuan berhasil diperbarui." }); await Promise.all([load(), loadActivity()]); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Review gagal." }); }
  };
  const filteredMaster = useMemo(() => {
    const items = master[masterKey] || [];
    if (!search.trim()) return items;
    const needle = search.toLowerCase();
    return items.filter((item) => Object.values(item).some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }, [master, masterKey, search]);

  if (!loggedIn) return (
    <main className={`min-h-screen flex items-center justify-center p-5 ${dark ? "bg-[#07111f] text-white" : "bg-[#f5f7fb] text-slate-900"}`}>
      <div className="fixed inset-0 pointer-events-none opacity-60" style={{ background: "radial-gradient(circle at 20% 20%, rgba(245,158,11,.14), transparent 30%), radial-gradient(circle at 80% 80%, rgba(14,165,233,.12), transparent 30%)" }} />
      <form onSubmit={login} className={`relative w-full max-w-md rounded-[28px] p-8 sm:p-10 border shadow-2xl ${dark ? "bg-slate-900/90 border-white/10" : "bg-white border-slate-200"}`}>
        <div className="flex items-center gap-3 mb-8"><div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-slate-950" /></div><div><p className="text-[10px] uppercase tracking-[.22em] text-amber-600 font-black">SMKN 1 Wonogiri</p><p className="font-bold">Core Platform</p></div></div>
        <p className="text-xs uppercase tracking-[.24em] text-amber-600 font-black">Area terlindungi</p><h1 className="text-3xl font-black mt-2 tracking-tight">Masuk ke data akademik</h1><p className="text-sm opacity-60 mt-3 mb-8 leading-relaxed">Kelola data sekolah, import terverifikasi, dan akses guru dari satu tempat.</p>
        <label className="block text-xs font-bold mb-2">Username admin<input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 bg-transparent outline-none focus:ring-2 focus:ring-amber-400" /></label>
        <label className="block text-xs font-bold mt-4 mb-2">Password<input required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-2 w-full rounded-xl border px-4 py-3 bg-transparent outline-none focus:ring-2 focus:ring-amber-400" /></label>
        {loginError && <p role="alert" className="mt-4 text-sm text-rose-500">{loginError}</p>}
        <button className="w-full mt-6 rounded-xl bg-slate-950 text-white dark:bg-amber-400 dark:text-slate-950 py-3.5 font-black flex items-center justify-center gap-2 hover:translate-y-[-1px] transition"><LogIn className="w-4 h-4" /> Masuk aman</button>
        <button type="button" onClick={onBack} className="w-full mt-3 py-3 text-sm opacity-60 hover:opacity-100">Kembali ke admin panel</button>
      </form>
    </main>
  );

  const shell = dark ? "bg-[#07111f] text-slate-100" : "bg-[#f5f7fb] text-slate-900";
  const card = dark ? "bg-white/[.045] border-white/10" : "bg-white border-slate-200/80";
  const tabs: { id: CoreTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Ringkasan", icon: LayoutDashboard }, { id: "master", label: "Master data", icon: BookOpen }, { id: "import", label: "Import XLS", icon: FileSpreadsheet }, { id: "requests", label: "Permintaan guru", icon: Users }, { id: "audit", label: "Aktivitas", icon: History },
  ];
  return (
    <main className={`relative z-10 min-h-screen ${shell}`}>
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${dark ? "bg-[#07111f]/90 border-white/10" : "bg-white/90 border-slate-200"}`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 shrink-0 rounded-xl bg-amber-400 flex items-center justify-center"><GraduationCap className="text-slate-950" /></div><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.2em] text-amber-600 font-black truncate">SMKN 1 Wonogiri</p><h1 className="font-black truncate">Core Platform</h1></div></div>
          <div className="flex items-center gap-2"><button aria-label="Muat ulang" onClick={load} className="p-2.5 rounded-xl border border-current/10 opacity-70 hover:opacity-100"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button><button onClick={onBack} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-current/10 text-sm font-bold"><ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Admin panel</span></button></div>
        </div>
      </header>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-7 sm:py-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-7"><div><div className="flex items-center gap-2 text-amber-600 text-xs uppercase tracking-[.24em] font-black"><Sparkles className="w-3.5 h-3.5" /> Fondasi sistem sekolah</div><h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2">Data akademik terpusat</h2><p className="opacity-60 mt-2 max-w-2xl text-sm sm:text-base">Satu sumber kebenaran untuk tahun ajaran, master akademik, identitas, assignment, dan enrollment.</p></div><div className={`rounded-2xl border px-4 py-3 ${card}`}><p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Konteks aktif</p><p className="font-black mt-1">{overview?.academicYear?.name || "Belum ditetapkan"}</p></div></div>
        <nav aria-label="Navigasi Core Platform" className={`flex gap-1 p-1 rounded-2xl border mb-7 overflow-x-auto ${card}`}>{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${tab === id ? "bg-amber-400 text-slate-950 shadow-sm" : "opacity-60 hover:opacity-100"}`}><Icon className="w-4 h-4" />{label}{id === "requests" && overview?.pendingRequests ? <span className="rounded-full bg-rose-500 text-white text-[10px] px-1.5 py-0.5">{overview.pendingRequests}</span> : null}</button>)}</nav>
        {notice && <div role="status" className={`mb-5 rounded-2xl border px-4 py-3 flex items-start gap-3 text-sm ${notice.type === "error" ? "border-rose-500/30 bg-rose-500/10 text-rose-700" : notice.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-amber-500/30 bg-amber-500/10 text-amber-700"}`}><div className="flex-1">{notice.text}</div><button aria-label="Tutup notifikasi" onClick={() => setNotice(null)}><X className="w-4 h-4" /></button></div>}

        {tab === "dashboard" && <section>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">{[["Tahun aktif", overview?.academicYear?.name || "Belum ada", "Konteks periode"], ["Guru aktif", overview?.totals.teachers || 0, "Profil terdaftar"], ["Siswa aktif", overview?.totals.students || 0, "Profil terdaftar"], ["Mata pelajaran", overview?.totals.subjects || 0, "Master aktif"], ["Kelas aktif", overview?.totals.classes || 0, "Semua periode"]].map(([label, value, note]) => <div key={String(label)} className={`rounded-2xl border p-4 sm:p-5 ${card}`}><p className="text-xs opacity-55">{label}</p><p className="text-xl sm:text-2xl font-black mt-2 truncate">{value}</p><p className="text-[11px] opacity-50 mt-2">{note}</p></div>)}</div>
          <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-4 sm:gap-5 mt-5"><div className={`rounded-2xl border p-5 sm:p-6 ${card}`}><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Setup terarah</p><h3 className="font-black text-lg mt-2">Urutan data yang direkomendasikan</h3><p className="text-sm opacity-60 mt-1">Import mengikuti dependency supaya setiap relasi dapat divalidasi.</p></div><ClipboardList className="text-amber-500 shrink-0" /></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">{["Tahun ajaran", "Jurusan", "Mapel", "Kelas", "Guru", "Siswa", "Assignment", "Enrollment"].map((item, index) => <div key={item} className="flex items-center gap-2 text-xs sm:text-sm"><span className="w-7 h-7 shrink-0 rounded-lg bg-amber-400/20 text-amber-700 flex items-center justify-center font-black">{index + 1}</span>{item}</div>)}</div></div><div className={`rounded-2xl border p-5 sm:p-6 ${card}`}><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Kontrol akses</p><h3 className="font-black text-xl mt-2">Assignment guru</h3><p className="text-sm opacity-60 mt-2 leading-relaxed">Pilihan guru tetap menjadi pengajuan sampai operator menyetujui dan mengaktifkannya.</p><button onClick={() => setTab("requests")} className="mt-5 text-sm font-black text-amber-600 hover:underline">Tinjau {overview?.pendingRequests || 0} pengajuan →</button></div></div>
        </section>}

        {tab === "master" && <section><div className={`rounded-2xl border ${card} overflow-hidden`}><div className="p-4 sm:p-6 border-b border-current/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Referensi canonical</p><h3 className="font-black text-xl mt-1">Master data sekolah</h3><p className="text-sm opacity-60 mt-1">Gunakan kode stabil untuk menjaga relasi dan idempotency.</p></div><div className="flex flex-col sm:flex-row gap-2"><label className="relative"><Search className="w-4 h-4 absolute left-3 top-3 opacity-40" /><input aria-label="Cari master data" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode atau nama..." className="w-full sm:w-56 rounded-xl border pl-9 pr-3 py-2.5 bg-transparent text-sm outline-none focus:ring-2 focus:ring-amber-400" /></label>{MASTER_META.find((item) => item.key === masterKey)?.manual && <button onClick={openCreate} className="rounded-xl bg-slate-950 text-white dark:bg-amber-400 dark:text-slate-950 px-4 py-2.5 text-sm font-black flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Tambah data</button>}</div></div><div className="flex overflow-x-auto gap-2 px-4 sm:px-6 py-3 border-b border-current/10">{MASTER_META.map(({ key, label }) => <button key={key} onClick={() => { setMasterKey(key); setSearch(""); }} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${masterKey === key ? "bg-amber-400 text-slate-950" : "bg-current/5 opacity-70 hover:opacity-100"}`}>{label}<span className="ml-1.5 opacity-60">{master[key]?.length || 0}</span></button>)}</div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wider opacity-50 border-b border-current/10"><th className="px-5 py-3">Identifier</th><th className="px-5 py-3">Nama / detail</th><th className="px-5 py-3">Konteks</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody>{filteredMaster.map((item: any) => <tr key={item.id} className="border-b border-current/5 hover:bg-current/[.025]"><td className="px-5 py-3.5 font-mono text-xs">{item.code || item.nip || item.nisn}</td><td className="px-5 py-3.5 font-bold">{item.name || item.fullName}<p className="text-xs opacity-50 font-normal mt-0.5">{item.email || item.grade || ""}</p></td><td className="px-5 py-3.5 text-xs opacity-65">{item.academicYear?.name || item.department?.name || (item.departmentId ? "Jurusan terhubung" : "Umum")}</td><td className="px-5 py-3.5"><span className={`rounded-lg px-2 py-1 text-[10px] font-black ${badgeClass(item.status || (item.isActive ? "ACTIVE" : "INACTIVE"))}`}>{item.isActive ? "AKTIF" : item.status || "ACTIVE"}</span></td><td className="px-5 py-3.5 text-right">{MASTER_META.find((meta) => meta.key === masterKey)?.manual && <button onClick={() => openEdit(item)} className="text-xs font-black text-amber-600 hover:underline">Edit</button>}</td></tr>)}</tbody></table>{!filteredMaster.length && <div className="py-16 text-center opacity-50"><BookOpen className="w-9 h-9 mx-auto mb-3" /><p className="font-bold">Belum ada data</p><p className="text-sm mt-1">{search ? "Coba kata kunci lain." : "Mulai dengan menambah atau mengimport data."}</p></div>}</div></div></section>}

        {tab === "import" && <section className="space-y-5"><div className="grid lg:grid-cols-[.72fr_1.28fr] gap-5"><div className={`rounded-2xl border p-5 sm:p-6 ${card}`}><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Preview-first</p><h3 className="font-black text-xl mt-1">Import master data</h3><p className="text-sm opacity-60 mt-2">Upload tidak menulis database sebelum semua error diperbaiki dan Anda menekan commit.</p></div><FileSpreadsheet className="text-amber-500" /></div><label className="block text-xs font-black mt-7 mb-2">Pilih template</label><select value={importType} onChange={(event) => { setImportType(event.target.value as ImportType); setFile(null); setPreview(null); setNotice(null); }} className="w-full rounded-xl border p-3 bg-transparent text-sm">{IMPORTS.map((item) => <option value={item.type} key={item.type}>{item.label}</option>)}</select><p className="text-xs opacity-50 mt-2">{IMPORTS.find((item) => item.type === importType)?.description}</p><button onClick={() => downloadTemplate(importType)} className="w-full mt-4 py-3 rounded-xl border border-amber-500/40 text-amber-600 font-black flex items-center justify-center gap-2 text-sm"><Download className="w-4 h-4" /> Download template resmi</button><label className={`mt-4 rounded-2xl border-2 border-dashed p-6 flex flex-col items-center text-center cursor-pointer transition ${dark ? "border-white/15 hover:border-amber-400" : "border-slate-300 hover:border-amber-500"}`}><Upload className="w-7 h-7 text-amber-500 mb-2" /><span className="font-bold text-sm break-all">{file?.name || "Pilih file .xlsx atau .xls"}</span><span className="text-xs opacity-50 mt-1">Maksimal 10 MB · sheet pertama digunakan</span><input type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => readFile(event.target.files?.[0])} /></label><button disabled={!file || importBusy} onClick={previewImport} className="w-full mt-4 py-3.5 rounded-xl bg-slate-950 text-white dark:bg-amber-400 dark:text-slate-950 font-black disabled:opacity-40 flex items-center justify-center gap-2">{importBusy && <Loader2 className="w-4 h-4 animate-spin" />} Validasi & preview</button></div><div className={`rounded-2xl border ${card} overflow-hidden`}><div className="p-5 sm:p-6 border-b border-current/10 flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Hasil validasi</p><h3 className="font-black text-xl mt-1">{preview ? `${preview.totalRows} baris diperiksa` : "Belum ada preview"}</h3></div>{preview && <div className="text-right text-xs"><span className="text-emerald-600 font-black">{preview.validRows} valid</span><span className="mx-1 opacity-30">·</span><span className={preview.errorRows ? "text-rose-600 font-black" : "opacity-60"}>{preview.errorRows} error</span></div>}</div>{preview ? <div className="overflow-auto max-h-[520px]"><table className="w-full min-w-[600px] text-sm"><thead className="sticky top-0 bg-inherit"><tr className="text-left opacity-50 border-b border-current/10 text-xs"><th className="px-5 py-3">Baris</th><th className="px-5 py-3">Identifier</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Keterangan</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.row} className="border-b border-current/5 align-top"><td className="px-5 py-3">{row.row}</td><td className="px-5 py-3 font-medium max-w-[220px] truncate">{String(row.values.nip || row.values.nisn || row.values.code || row.values.name || "-")}</td><td className="px-5 py-3"><span className={`text-[10px] font-black px-2 py-1 rounded-lg ${badgeClass(row.status)}`}>{row.status}</span></td><td className="px-5 py-3 text-xs text-rose-600">{row.errors.join(" ") || <span className="text-emerald-600">Siap disimpan</span>}</td></tr>)}</tbody></table></div> : <div className="min-h-[360px] flex flex-col items-center justify-center text-center opacity-50 p-6"><FileSpreadsheet className="w-12 h-12 mb-3" /><p className="font-bold">Preview akan muncul di sini</p><p className="text-sm mt-1 max-w-xs">Periksa nomor baris dan referensi sebelum commit.</p></div>}{preview && <div className="p-4 border-t border-current/10 flex justify-end"><button disabled={importBusy || preview.errorRows > 0} onClick={commitImport} className="px-5 py-3 rounded-xl bg-emerald-500 text-white font-black text-sm disabled:opacity-40 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Commit transaksi</button></div>}</div></div><div className={`rounded-2xl border ${card} overflow-hidden`}><div className="p-5 border-b border-current/10 flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Riwayat</p><h3 className="font-black text-lg mt-1">Import terbaru</h3></div><History className="w-5 h-5 opacity-40" /></div><div className="divide-y divide-current/10">{jobs.length ? jobs.map((job) => <div key={job.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="min-w-0"><p className="font-bold truncate">{job.fileName}</p><p className="text-xs opacity-50 mt-1">{dateLabel(job.createdAt)} · {job.successRows} berhasil · {job.errorRows} error</p></div><div className="flex items-center gap-2"><span className={`rounded-lg px-2 py-1 text-[10px] font-black ${badgeClass(job.status)}`}>{job.status}</span>{job.errorRows > 0 && <button onClick={async () => setExpandedJob(await request(`/api/v1/akademik/import/jobs/${job.id}/errors`))} className="text-xs font-black text-amber-600">Lihat error</button>}</div></div>) : <p className="p-8 text-sm opacity-50 text-center">Belum ada riwayat import.</p>}</div></div></section>}

        {tab === "requests" && <section className={`rounded-2xl border ${card} overflow-hidden`}><div className="p-5 sm:p-6 border-b border-current/10"><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Persetujuan akses</p><h3 className="font-black text-xl mt-1">Permintaan assignment guru</h3><p className="text-sm opacity-60 mt-1">Persetujuan membuat assignment aktif dalam satu transaksi. Menolak atau meminta revisi tidak membuka akses.</p></div>{requests.length ? <div className="divide-y divide-current/10">{requests.map((item: any) => <div className="p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5" key={item.id}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-black">{item.teacher.fullName}</span><span className="text-xs opacity-50 font-mono">{item.teacher.nip}</span><span className={`text-[10px] px-2 py-1 rounded-lg font-black ${badgeClass(item.status)}`}>{item.status}</span></div><p className="text-sm opacity-60 mt-2">{item.academicYear.name} · dikirim {item.submittedAt ? dateLabel(item.submittedAt) : "belum dikirim"}</p><div className="flex flex-wrap gap-2 mt-3">{item.items.map((choice: any) => <span key={choice.id} className="text-xs rounded-lg border border-current/10 px-2 py-1">{choice.subject.name} · {choice.class.name}</span>)}</div>{item.reviewNote && <p className="text-xs mt-3 opacity-70"><strong>Catatan:</strong> {item.reviewNote}</p>}</div>{item.status === "SUBMITTED" && <div className="flex flex-wrap gap-2 shrink-0"><button onClick={() => reviewRequest(item, "NEEDS_REVISION")} className="px-3 py-2 rounded-xl border text-xs font-black">Minta revisi</button><button onClick={() => reviewRequest(item, "REJECTED")} className="px-3 py-2 rounded-xl border border-rose-500/30 text-rose-600 text-xs font-black"><XCircle className="w-3.5 h-3.5 inline mr-1" />Tolak</button><button onClick={() => reviewRequest(item, "APPROVED")} className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black"><Check className="w-3.5 h-3.5 inline mr-1" />Setujui</button></div>}</div>)}</div> : <div className="p-16 text-center opacity-50"><Users className="w-10 h-10 mx-auto mb-3" /><p className="font-bold">Belum ada pengajuan assignment.</p><p className="text-sm mt-1">Pengajuan dari guru akan muncul di sini.</p></div>}</section>}

        {tab === "audit" && <section className={`rounded-2xl border ${card} overflow-hidden`}><div className="p-5 sm:p-6 border-b border-current/10 flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Traceability</p><h3 className="font-black text-xl mt-1">Aktivitas teraudit</h3><p className="text-sm opacity-60 mt-1">{auditTotal} event tercatat · perubahan penting tidak dapat diedit dari UI.</p></div><History className="w-6 h-6 text-amber-500" /></div>{audit.length ? <div className="divide-y divide-current/10">{audit.map((item) => <div key={item.id} className="p-4 sm:p-5 flex gap-3"><div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-700 flex items-center justify-center shrink-0"><History className="w-4 h-4" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-black text-sm">{item.action}</span><span className="text-xs opacity-50">{item.entity}</span></div><p className="text-xs opacity-55 mt-1">{dateLabel(item.createdAt)} · actor {item.actor}</p>{item.metadata && <pre className="text-[10px] opacity-50 mt-2 whitespace-pre-wrap break-all">{JSON.stringify(item.metadata)}</pre>}</div></div>)}</div> : <div className="p-16 text-center opacity-50"><History className="w-10 h-10 mx-auto mb-3" /><p className="font-bold">Belum ada aktivitas.</p></div>}</section>}
      </div>

      {showForm && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-slate-950/50 backdrop-blur-sm"><form onSubmit={saveMaster} className={`w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border p-5 sm:p-7 shadow-2xl ${dark ? "bg-[#0b1729] border-white/10" : "bg-white border-slate-200"}`}><div className="flex items-start justify-between mb-6"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-black">{editingId ? "Edit" : "Tambah"} {MASTER_META.find((item) => item.key === masterKey)?.label}</p><h3 className="text-2xl font-black mt-1">Simpan referensi</h3></div><button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-current/5"><X className="w-5 h-5" /></button></div><div className="space-y-4"><label className="block text-xs font-black">Kode stabil<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="mt-2 w-full rounded-xl border px-3 py-3 bg-transparent" placeholder="Contoh: PPLG / 2026/2027" /></label><label className="block text-xs font-black">Nama tampilan<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border px-3 py-3 bg-transparent" placeholder="Nama lengkap" /></label>{masterKey === "classes" && <><label className="block text-xs font-black">Tingkat<select required value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })} className="mt-2 w-full rounded-xl border px-3 py-3 bg-transparent"><option>X</option><option>XI</option><option>XII</option></select></label><label className="block text-xs font-black">Tahun ajaran<select required value={form.academicYearId} onChange={(event) => setForm({ ...form, academicYearId: event.target.value })} className="mt-2 w-full rounded-xl border px-3 py-3 bg-transparent"><option value="">Pilih tahun ajaran</option>{master.academicYears.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label></>}{["subjects", "classes"].includes(masterKey) && <label className="block text-xs font-black">Jurusan <span className="font-normal opacity-50">(opsional)</span><select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })} className="mt-2 w-full rounded-xl border px-3 py-3 bg-transparent"><option value="">Umum / tanpa jurusan</option>{master.departments.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>}{masterKey === "academicYears" && <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="accent-amber-500 w-4 h-4" /> Jadikan tahun ajaran aktif</label>}</div><div className="flex gap-2 mt-7"><button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border py-3 font-bold">Batal</button><button className="flex-1 rounded-xl bg-slate-950 text-white dark:bg-amber-400 dark:text-slate-950 py-3 font-black">{editingId ? "Simpan perubahan" : "Tambah data"}</button></div></form></div>}
      {expandedJob && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"><div className={`w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl border p-5 ${card}`}><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-black">Error report</p><h3 className="font-black text-xl mt-1">{expandedJob.fileName}</h3></div><button onClick={() => setExpandedJob(null)} className="p-2"><X /></button></div><div className="mt-5 space-y-3">{Array.isArray(expandedJob.errors) && expandedJob.errors.map((error: any, index: number) => <div key={index} className="rounded-xl bg-rose-500/10 border border-rose-500/15 p-3 text-sm"><span className="font-black">Baris {error.row}</span><p className="text-xs mt-1">{Array.isArray(error.errors) ? error.errors.join(" ") : JSON.stringify(error)}</p></div>)}</div><button onClick={() => { const blob = new Blob([JSON.stringify(expandedJob.errors || [], null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `error-report-${expandedJob.id}.json`; link.click(); URL.revokeObjectURL(url); }} className="mt-5 w-full rounded-xl border py-3 font-black flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download error report</button></div></div>}
    </main>
  );
}