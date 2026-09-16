import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Download, FileSpreadsheet,
  GraduationCap, LayoutDashboard, Loader2, LogIn, RefreshCw, ShieldCheck,
  Upload, Users, XCircle,
} from "lucide-react";

type Theme = "light" | "dark";
type ImportType = "tahun-ajaran" | "jurusan" | "mapel" | "kelas" | "guru" | "siswa" | "assignment-guru" | "enrollment-siswa";
type PreviewRow = { row: number; values: Record<string, unknown>; status: string; errors: string[] };
type Overview = { academicYear: { code: string; name: string } | null; totals: { teachers: number; students: number; subjects: number; classes: number }; pendingRequests: number; lastImport: { fileName: string; status: string; errorRows: number } | null };
type CoreTab = "dashboard" | "master" | "import" | "requests";
type CoreTabItem = { id: CoreTab; icon: typeof LayoutDashboard; label: string };
const CORE_TABS: CoreTabItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Ringkasan" },
  { id: "master", icon: BookOpen, label: "Master Data" },
  { id: "import", icon: FileSpreadsheet, label: "Import XLS" },
  { id: "requests", icon: Users, label: "Permintaan Guru" },
];

const IMPORT_LABELS: Record<ImportType, string> = {
  "tahun-ajaran": "Tahun Ajaran", jurusan: "Jurusan", mapel: "Mata Pelajaran",
  kelas: "Kelas", guru: "Guru", siswa: "Siswa", "assignment-guru": "Assignment Guru", "enrollment-siswa": "Enrollment Siswa",
};

function token() { return localStorage.getItem("smkn1_adm_token") || ""; }
function headers() { return { Authorization: `Bearer ${token()}` }; }
function downloadTemplate(type: ImportType) { window.open(`/api/v1/akademik/import/templates/${type}`, "_blank"); }

export default function AdminAkademik({ theme = "light", onBack }: { theme?: Theme; onBack: () => void }) {
  const dark = theme === "dark";
  const [loggedIn, setLoggedIn] = useState(() => Boolean(token()));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<CoreTab>("dashboard");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [master, setMaster] = useState<any>({});
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState<ImportType>("guru");
  const [file, setFile] = useState<{ name: string; base64: string } | null>(null);
  const [preview, setPreview] = useState<{ jobId: string; rows: PreviewRow[]; totalRows: number; validRows: number; errorRows: number } | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [importBusy, setImportBusy] = useState(false);

  const load = async () => {
    if (!loggedIn) return;
    setLoading(true);
    try {
      const [overviewRes, masterRes, requestsRes] = await Promise.all([
        fetch("/api/v1/akademik/overview", { headers: headers() }),
        fetch("/api/v1/akademik/master", { headers: headers() }),
        fetch("/api/v1/akademik/teacher-requests", { headers: headers() }),
      ]);
      if ([overviewRes, masterRes, requestsRes].some((res) => res.status === 401)) {
        localStorage.removeItem("smkn1_adm_token"); setLoggedIn(false); return;
      }
      const [overviewJson, masterJson, requestsJson] = await Promise.all([overviewRes.json(), masterRes.json(), requestsRes.json()]);
      setOverview(overviewJson.data); setMaster(masterJson.data || {}); setRequests(requestsJson.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [loggedIn]);

  const login = async (event: FormEvent) => {
    event.preventDefault(); setLoginError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const data = await response.json();
    if (!response.ok) { setLoginError(data.error || "Login gagal."); return; }
    localStorage.setItem("smkn1_adm_token", data.token); setLoggedIn(true);
  };

  const readFile = (selected: File | undefined) => {
    if (!selected) return;
    const reader = new FileReader();
    reader.onload = () => setFile({ name: selected.name, base64: String(reader.result) });
    reader.readAsDataURL(selected);
    setPreview(null); setImportMessage("");
  };

  const previewImport = async () => {
    if (!file) return;
    setImportBusy(true); setImportMessage("");
    try {
      const response = await fetch(`/api/v1/akademik/import/${importType}/preview`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, fileBase64: file.base64 }) });
      const data = await response.json();
      if (!response.ok) { setImportMessage(data.error?.message || "Preview gagal."); return; }
      setPreview(data.data); setImportMessage("Preview siap. Periksa error sebelum commit.");
    } finally { setImportBusy(false); }
  };

  const commitImport = async () => {
    if (!file || !preview) return;
    setImportBusy(true);
    try {
      const response = await fetch(`/api/v1/akademik/import/${importType}/commit`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ jobId: preview.jobId, fileBase64: file.base64 }) });
      const data = await response.json();
      if (!response.ok) { setImportMessage(data.error?.message || "Commit gagal."); return; }
      setImportMessage(`Import selesai: ${data.data.successRows} baris berhasil disimpan dalam satu transaksi.`);
      setFile(null); setPreview(null); await load();
    } finally { setImportBusy(false); }
  };

  const reviewRequest = async (id: string, status: "APPROVED" | "REJECTED" | "NEEDS_REVISION") => {
    await fetch(`/api/v1/akademik/teacher-requests/${id}/review`, { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  };

  const classesByYear = useMemo<Record<string, number>>(() => (master.classes || []).reduce((acc: Record<string, number>, item: any) => { acc[item.academicYear?.code || "-"] = (acc[item.academicYear?.code || "-"] || 0) + 1; return acc; }, {}), [master.classes]);

  if (!loggedIn) return (
    <main className={`min-h-screen flex items-center justify-center p-6 ${dark ? "bg-slate-950 text-white" : "bg-[#f7f8fb] text-slate-900"}`}>
      <form onSubmit={login} className={`w-full max-w-md rounded-3xl p-8 border shadow-xl ${dark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}>
        <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center mb-6"><ShieldCheck className="w-6 h-6 text-slate-950" /></div>
        <p className="text-xs uppercase tracking-[0.24em] text-amber-600 font-bold">Core Platform</p>
        <h1 className="text-2xl font-black mt-2">Masuk ke Data Akademik</h1>
        <p className="text-sm opacity-60 mt-2 mb-7">Gunakan akun admin/operator untuk mengelola master data sekolah.</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username admin" className="w-full rounded-xl border p-3 mb-3 bg-transparent" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full rounded-xl border p-3 mb-3 bg-transparent" />
        {loginError && <p className="text-sm text-red-500 mb-3">{loginError}</p>}
        <button className="w-full rounded-xl bg-slate-950 text-white dark:bg-amber-400 dark:text-slate-950 py-3 font-bold flex items-center justify-center gap-2"><LogIn className="w-4 h-4" /> Masuk</button>
        <button type="button" onClick={onBack} className="w-full mt-3 py-3 text-sm opacity-60">Kembali ke admin panel</button>
      </form>
    </main>
  );

  const shell = dark ? "bg-[#07111f] text-slate-100" : "bg-[#f7f8fb] text-slate-900";
  const card = dark ? "bg-white/[.04] border-white/10" : "bg-white border-slate-200";
  return (
    <main className={`min-h-screen ${shell}`}>
      <header className={`sticky top-0 z-20 border-b backdrop-blur-xl ${dark ? "bg-[#07111f]/90 border-white/10" : "bg-white/90 border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center"><GraduationCap className="text-slate-950" /></div><div><p className="text-[10px] uppercase tracking-[.22em] text-amber-600 font-bold">SMKN 1 Wonogiri</p><h1 className="font-black">Core Platform</h1></div></div>
          <div className="flex gap-2"><button onClick={load} className="p-2.5 rounded-xl border border-current/10 opacity-70 hover:opacity-100"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button><button onClick={onBack} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-current/10 text-sm font-bold"><ArrowLeft className="w-4 h-4" /> Admin Panel</button></div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">
        <div className="mb-8"><p className="text-xs uppercase tracking-[.24em] text-amber-600 font-bold">Wave 1 · Fondasi Sistem</p><h2 className="text-3xl lg:text-4xl font-black mt-2">Data akademik terpusat</h2><p className="opacity-60 max-w-2xl mt-2">Siapkan tahun ajaran, jurusan, mapel, kelas, guru, siswa, dan assignment sebelum portal LMS dibuka.</p></div>
        <nav className={`flex gap-1 p-1 rounded-2xl border mb-8 overflow-x-auto ${card}`}>
          {CORE_TABS.map(({ id, icon: Icon, label }) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${tab === id ? "bg-amber-400 text-slate-950" : "opacity-60 hover:opacity-100"}`}><Icon className="w-4 h-4" />{label}</button>)}
        </nav>

        {tab === "dashboard" && <section>
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              ["Tahun aktif", overview?.academicYear?.name || "Belum ada", "Urutan pertama"],
              ["Guru aktif", overview?.totals.teachers || 0, "Profil terdaftar"],
              ["Siswa aktif", overview?.totals.students || 0, "Maks. 100 terbaru di tabel"],
              ["Mata pelajaran", overview?.totals.subjects || 0, "Master aktif"],
              ["Kelas", overview?.totals.classes || 0, "Tahun ajaran aktif"],
            ].map(([label, value, note]) => <div key={String(label)} className={`rounded-2xl border p-5 ${card}`}><p className="text-xs opacity-60">{label}</p><p className="text-2xl font-black mt-2 truncate">{value}</p><p className="text-xs opacity-50 mt-2">{note}</p></div>)}
          </div>
          <div className="grid lg:grid-cols-[1.25fr_.75fr] gap-5 mt-5">
            <div className={`rounded-2xl border p-6 ${card}`}><div className="flex items-center justify-between"><div><h3 className="font-black">Urutan setup yang direkomendasikan</h3><p className="text-sm opacity-60 mt-1">Jangan import guru/siswa sebelum referensinya tersedia.</p></div><ChevronRight className="opacity-40" /></div><div className="grid sm:grid-cols-4 gap-3 mt-6">{["Tahun Ajaran", "Jurusan", "Mapel", "Kelas", "Guru", "Siswa", "Assignment", "Enrollment"].map((item, i) => <div key={item} className="flex items-center gap-2 text-sm"><span className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-600 flex items-center justify-center font-black">{i + 1}</span>{item}</div>)}</div></div>
            <div className={`rounded-2xl border p-6 ${card}`}><p className="text-xs uppercase tracking-widest text-amber-600 font-bold">Kontrol akses</p><h3 className="font-black text-xl mt-2">Assignment guru</h3><p className="text-sm opacity-60 mt-2">Guru hanya mendapat akses kelas setelah assignment resmi aktif atau pengajuan disetujui.</p><button onClick={() => setTab("requests")} className="mt-5 text-sm font-bold text-amber-600">Lihat {overview?.pendingRequests || 0} pengajuan menunggu →</button></div>
          </div>
        </section>}

        {tab === "master" && <section className="space-y-5">
          <div className="grid md:grid-cols-3 gap-4">{[["Tahun Ajaran", master.academicYears, "code"], ["Jurusan", master.departments, "code"], ["Mapel", master.subjects, "code"], ["Kelas", master.classes, "code"], ["Guru", master.teachers, "nip"], ["Siswa", master.students, "nisn"]].map(([label, items, key]) => <div key={String(label)} className={`rounded-2xl border p-5 ${card}`}><div className="flex justify-between"><h3 className="font-black">{label}</h3><span className="text-xs opacity-50">{(items as any[] || []).length}</span></div><div className="mt-4 space-y-2 max-h-44 overflow-auto">{((items as any[]) || []).slice(0, 8).map((item: any) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{item.name || item.fullName}</span><code className="text-xs opacity-50">{item[key as string]}</code></div>)}{!(items as any[])?.length && <p className="text-sm opacity-50">Belum ada data.</p>}</div></div>)}</div>
          <div className={`rounded-2xl border p-6 ${card}`}><h3 className="font-black">Distribusi kelas per tahun ajaran</h3><div className="flex flex-wrap gap-3 mt-4">{(Object.entries(classesByYear) as [string, number][]).map(([year, count]) => <span key={year} className="rounded-xl bg-amber-400/15 text-amber-700 px-3 py-2 text-sm font-bold">{year}: {count} kelas</span>)}</div></div>
        </section>}

        {tab === "import" && <section className="grid lg:grid-cols-[.8fr_1.2fr] gap-5">
          <div className={`rounded-2xl border p-6 ${card}`}><div className="flex items-start justify-between gap-4"><div><h3 className="font-black text-lg">Import master data</h3><p className="text-sm opacity-60 mt-1">Upload → validasi → preview → commit transaksi.</p></div><FileSpreadsheet className="text-amber-500" /></div><label className="block text-sm font-bold mt-7 mb-2">Jenis template</label><select value={importType} onChange={(e) => { setImportType(e.target.value as ImportType); setFile(null); setPreview(null); setImportMessage(""); }} className="w-full rounded-xl border p-3 bg-transparent">{Object.entries(IMPORT_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button onClick={() => downloadTemplate(importType)} className="w-full mt-3 py-3 rounded-xl border border-amber-500/40 text-amber-600 font-bold flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download template resmi</button><label className={`mt-5 rounded-2xl border-2 border-dashed p-6 flex flex-col items-center text-center cursor-pointer ${dark ? "border-white/15 hover:border-amber-400" : "border-slate-300 hover:border-amber-500"}`}><Upload className="w-7 h-7 text-amber-500 mb-2" /><span className="font-bold text-sm">{file?.name || "Pilih file .xlsx"}</span><span className="text-xs opacity-50 mt-1">Maksimal 10 MB</span><input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} /></label><button disabled={!file || importBusy} onClick={previewImport} className="w-full mt-4 py-3 rounded-xl bg-slate-950 text-white dark:bg-amber-400 dark:text-slate-950 font-bold disabled:opacity-40 flex items-center justify-center gap-2">{importBusy && <Loader2 className="w-4 h-4 animate-spin" />} Preview data</button>{importMessage && <p className="text-sm mt-4 text-amber-600">{importMessage}</p>}</div>
          <div className={`rounded-2xl border p-6 ${card}`}><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-amber-600 font-bold">Preview</p><h3 className="font-black text-xl mt-1">{preview ? `${preview.totalRows} baris · ${preview.validRows} valid · ${preview.errorRows} error` : "Belum ada file dipreview"}</h3></div>{preview && preview.errorRows === 0 && <button disabled={importBusy} onClick={commitImport} className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Commit import</button>}</div>{preview ? <div className="mt-5 overflow-auto max-h-[530px]"><table className="w-full text-sm"><thead><tr className="text-left opacity-50 border-b border-current/10"><th className="py-3 pr-3">Baris</th><th className="py-3 pr-3">Data kunci</th><th className="py-3 pr-3">Status</th><th className="py-3">Keterangan</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.row} className="border-b border-current/5 align-top"><td className="py-3 pr-3">{row.row}</td><td className="py-3 pr-3 font-medium max-w-[220px] truncate">{String(row.values.nip || row.values.nisn || row.values.code || row.values.name || "-")}</td><td className="py-3 pr-3"><span className={`text-xs font-bold px-2 py-1 rounded-lg ${row.status === "VALID" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"}`}>{row.status}</span></td><td className="py-3 text-xs text-red-500">{row.errors.join(" ") || "Siap disimpan"}</td></tr>)}</tbody></table></div> : <div className="min-h-[360px] flex flex-col items-center justify-center text-center opacity-50"><FileSpreadsheet className="w-12 h-12 mb-3" /><p className="font-bold">Pilih template dan upload XLSX</p><p className="text-sm mt-1">Data tidak masuk database sebelum commit.</p></div>}</div>
        </section>}

        {tab === "requests" && <section className={`rounded-2xl border ${card} overflow-hidden`}><div className="p-6 border-b border-current/10"><h3 className="font-black text-xl">Permintaan assignment guru</h3><p className="text-sm opacity-60 mt-1">Pilihan guru menjadi pengajuan, bukan akses langsung.</p></div>{requests.length ? <div className="divide-y divide-current/10">{requests.map((request: any) => <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5" key={request.id}><div><div className="flex items-center gap-2"><span className="font-black">{request.teacher.fullName}</span><span className="text-xs px-2 py-1 rounded-lg bg-amber-400/15 text-amber-700">{request.status}</span></div><p className="text-sm opacity-60 mt-2">{request.academicYear.name} · {request.items.length} pilihan assignment</p><div className="flex flex-wrap gap-2 mt-3">{request.items.map((item: any) => <span key={item.id} className="text-xs rounded-lg border border-current/10 px-2 py-1">{item.subject.name} · {item.class.name}</span>)}</div></div>{request.status === "SUBMITTED" && <div className="flex gap-2"><button onClick={() => reviewRequest(request.id, "NEEDS_REVISION")} className="px-3 py-2 rounded-xl border text-xs font-bold">Minta revisi</button><button onClick={() => reviewRequest(request.id, "REJECTED")} className="px-3 py-2 rounded-xl border border-red-500/30 text-red-600 text-xs font-bold"><XCircle className="w-3.5 h-3.5 inline mr-1" />Tolak</button><button onClick={() => reviewRequest(request.id, "APPROVED")} className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Setujui</button></div>}</div>)}</div> : <div className="p-16 text-center opacity-50"><Users className="w-10 h-10 mx-auto mb-3" /><p className="font-bold">Belum ada pengajuan assignment.</p></div>}</section>}
      </div>
    </main>
  );
}