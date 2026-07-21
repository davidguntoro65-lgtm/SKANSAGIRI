import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, LogOut, Lock, Eye, EyeOff, Loader2, Plus, X, Edit2, Trash2,
  Save, RefreshCw, CheckCircle2, AlertCircle, Users, Target, Calendar,
  Zap, Camera, Trophy, MessageSquare, Info, Image, ChevronDown,
  ChevronUp, User, LayoutDashboard, Star, Clock, MapPin
} from "lucide-react";
import { navigate } from "../utils/navigation";

/* ─── Auth helpers ──────────────────────────────────────────────────── */
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("smkn1_adm_token") || "" : ""; }
async function apiGet(path: string) {
  const r = await fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}
async function apiPost(path: string, body: object) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}
async function apiPut(path: string, body: object) {
  const r = await fetch(path, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) });
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

/* ─── Image compress helper ─────────────────────────────────────────── */
async function compressImage(file: File, maxW = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(1, maxW / img.width, maxW / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ─── Types ─────────────────────────────────────────────────────────── */
interface OsisInfo { namaKabinet: string; masaBakti: string; tagline: string; visi: string; misi: string[]; sejarah: string; quoteKetua: string; namaKetua: string; jumlahProker: number; jumlahMember: number; jumlahEkskul: number; }
interface OsisPengurus { id: string; nama: string; jabatan: string; bidang: string; foto?: string; tugasPokok: string; instagram: string; email: string; urutan: number; }
interface OsisProgramKerja { id: string; nama: string; bidang: string; deskripsi: string; status: string; progress: number; targetDate: string; penanggungJawab: string; urutan: number; }
interface OsisAgenda { id: string; nama: string; tanggal: string; waktu: string; tempat: string; deskripsi: string; jenis: string; }
interface OsisEkskul { id: string; nama: string; kategori: string; deskripsi: string; jadwal: string; pembina: string; jumlahAnggota: number; foto?: string; urutan: number; }
interface OsisGaleri { id: string; judul: string; kategori: string; foto: string; createdAt: string; }
interface OsisPrestasi { id: string; judul: string; deskripsi: string; tingkat: string; tanggal: string; foto?: string; }
interface OsisAspirasi { id: string; nama: string; kelas: string; kategori: string; isi: string; anonim: boolean; status: string; balasan: string; publik: boolean; createdAt: string; updatedAt: string; }

type Tab = "info" | "pengurus" | "proker" | "agenda" | "ekskul" | "galeri" | "prestasi" | "aspirasi";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "info",     label: "Info & Visi Misi", icon: Info },
  { key: "pengurus", label: "Pengurus",          icon: Users },
  { key: "proker",   label: "Program Kerja",     icon: Target },
  { key: "agenda",   label: "Agenda & Event",    icon: Calendar },
  { key: "ekskul",   label: "Ekstrakurikuler",   icon: Zap },
  { key: "galeri",   label: "Galeri Kegiatan",   icon: Camera },
  { key: "prestasi", label: "Prestasi",          icon: Trophy },
  { key: "aspirasi", label: "Aspirasi Siswa",    icon: MessageSquare },
];

const BIDANG_PROKER = ["Ketakwaan","Bela Negara","Kepribadian","Berorganisasi","Kewirausahaan","Apresiasi Seni","Kesehatan","Prestasi"];

/* ═══════════════════════════════════════════════════════════════════════ */
export default function AdminOsis() {
  const [isAuthed, setIsAuthed] = useState(() => !!getToken());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr(""); setLoginLoading(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const d = await r.json();
      if (!r.ok) { setLoginErr(d.error || "Login gagal."); return; }
      localStorage.setItem("smkn1_adm_token", d.token);
      setIsAuthed(true);
    } catch { setLoginErr("Koneksi gagal."); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => { localStorage.removeItem("smkn1_adm_token"); setIsAuthed(false); };
  const handleUnauth = () => { setIsAuthed(false); localStorage.removeItem("smkn1_adm_token"); };

  if (!isAuthed) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-black text-white">Admin Panel OSIS</h1>
          <p className="text-slate-400 text-sm mt-1">SMKN 1 Wonogiri</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" autoComplete="username"
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none" />
          <div className="relative">
            <input value={password} onChange={e => setPassword(e.target.value)} type={showPass ? "text" : "password"} placeholder="Password" autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none pr-10" />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {loginErr && <p className="text-red-400 text-sm">{loginErr}</p>}
          <button type="submit" disabled={loginLoading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Masuk
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => navigate("/osis")} className="text-xs text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1 mx-auto">
            <ArrowLeft className="w-3 h-3" /> Kembali ke halaman OSIS
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold flex items-center gap-2 shadow-xl ${
              toast.type === "ok" ? "bg-emerald-600" : "bg-red-600"
            }`}>
            {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-40 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-none">Admin OSIS</p>
              <p className="text-slate-500 text-[10px]">SMKN 1 Wonogiri</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all ${
                  activeTab === t.key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}>
                <Icon className="w-4 h-4 shrink-0" />{t.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-1">
          <button onClick={() => navigate("/osis")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-blue-400 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Halaman OSIS Publik
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur border-b border-slate-800 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(v => !v)} className="md:hidden text-slate-400 hover:text-white">
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <h2 className="text-white font-bold text-sm md:text-base">{TABS.find(t => t.key === activeTab)?.label}</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === "info" && <TabInfo showToast={showToast} onUnauth={handleUnauth} />}
          {activeTab === "pengurus" && <TabPengurus showToast={showToast} onUnauth={handleUnauth} />}
          {activeTab === "proker" && <TabProker showToast={showToast} onUnauth={handleUnauth} />}
          {activeTab === "agenda" && <TabAgenda showToast={showToast} onUnauth={handleUnauth} />}
          {activeTab === "ekskul" && <TabEkskul showToast={showToast} onUnauth={handleUnauth} />}
          {activeTab === "galeri" && <TabGaleri showToast={showToast} onUnauth={handleUnauth} />}
          {activeTab === "prestasi" && <TabPrestasi showToast={showToast} onUnauth={handleUnauth} />}
          {activeTab === "aspirasi" && <TabAspirasi showToast={showToast} onUnauth={handleUnauth} />}
        </div>
      </main>
    </div>
  );
}

/* ─── Shared sub-components ─────────────────────────────────────────── */
function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-slate-900 border border-slate-800 rounded-2xl ${className}`}>{children}</div>;
}
function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>
      <input {...props} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-500" />
    </div>
  );
}
function TextArea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>
      <textarea {...props} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-500 resize-none" />
    </div>
  );
}
function SelectField({ label, children, ...props }: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>
      <select {...props} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none">{children}</select>
    </div>
  );
}
function SaveBtn({ loading, onClick, label = "Simpan" }: { loading: boolean; onClick?: () => void; label?: string }) {
  return (
    <button type={onClick ? "button" : "submit"} onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50 transition-colors">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {label}
    </button>
  );
}
function DeleteBtn({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors disabled:opacity-50">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Hapus
    </button>
  );
}
function ImageUpload({ label, value, onChange }: { label: string; value?: string | null; onChange: (b64: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
          {value ? <img src={value} alt="preview" className="w-full h-full object-cover" /> : <Image className="w-6 h-6 text-slate-600" />}
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors">
            Pilih Foto
          </button>
          {value && <button type="button" onClick={() => onChange(null)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Hapus</button>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={async e => {
            const f = e.target.files?.[0];
            if (f) { const b64 = await compressImage(f); onChange(b64); }
            e.target.value = "";
          }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   TAB: INFO & VISI MISI
──────────────────────────────────────────────────────────────────────── */
function TabInfo({ showToast, onUnauth }: { showToast: (m: string, t?: "ok"|"err") => void; onUnauth: () => void }) {
  const [data, setData] = useState<OsisInfo>({ namaKabinet:"OSIS SKANSAGIRI", masaBakti:"", tagline:"", visi:"", misi:[], sejarah:"", quoteKetua:"", namaKetua:"", jumlahProker:0, jumlahMember:0, jumlahEkskul:0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [misiInput, setMisiInput] = useState("");

  useEffect(() => {
    apiGet("/api/osis/info").then(d => { setData(d); }).catch(e => { if (e.message==="UNAUTHORIZED") onUnauth(); }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiPost("/api/osis/info", data);
      showToast("Info OSIS berhasil disimpan!");
    } catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal menyimpan.", "err"); }
    finally { setSaving(false); }
  };

  const addMisi = () => { if (misiInput.trim()) { setData(d => ({ ...d, misi: [...d.misi, misiInput.trim()] })); setMisiInput(""); } };
  const removeMisi = (i: number) => setData(d => ({ ...d, misi: d.misi.filter((_, idx) => idx !== i) }));

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>;

  return (
    <div className="max-w-3xl space-y-6">
      <SectionCard className="p-6">
        <h3 className="text-white font-bold mb-4">Identitas Kabinet</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField label="Nama Kabinet" value={data.namaKabinet} onChange={e => setData(d => ({ ...d, namaKabinet: e.target.value }))} />
          <InputField label="Masa Bakti" value={data.masaBakti} placeholder="mis. 2024/2025" onChange={e => setData(d => ({ ...d, masaBakti: e.target.value }))} />
          <InputField label="Tagline" value={data.tagline} className="sm:col-span-2" onChange={e => setData(d => ({ ...d, tagline: e.target.value }))} />
          <InputField label="Jumlah Program Kerja" type="number" value={data.jumlahProker} onChange={e => setData(d => ({ ...d, jumlahProker: +e.target.value }))} />
          <InputField label="Jumlah Anggota Pengurus" type="number" value={data.jumlahMember} onChange={e => setData(d => ({ ...d, jumlahMember: +e.target.value }))} />
          <InputField label="Jumlah Ekstrakurikuler" type="number" value={data.jumlahEkskul} onChange={e => setData(d => ({ ...d, jumlahEkskul: +e.target.value }))} />
        </div>
      </SectionCard>

      <SectionCard className="p-6">
        <h3 className="text-white font-bold mb-4">Sejarah & Quote Ketua</h3>
        <div className="space-y-4">
          <TextArea label="Sejarah Singkat OSIS" rows={4} value={data.sejarah} onChange={e => setData(d => ({ ...d, sejarah: e.target.value }))} />
          <TextArea label="Quote Ketua" rows={3} value={data.quoteKetua} onChange={e => setData(d => ({ ...d, quoteKetua: e.target.value }))} />
          <InputField label="Nama Ketua OSIS" value={data.namaKetua} onChange={e => setData(d => ({ ...d, namaKetua: e.target.value }))} />
        </div>
      </SectionCard>

      <SectionCard className="p-6">
        <h3 className="text-white font-bold mb-4">Visi & Misi</h3>
        <div className="space-y-4">
          <TextArea label="Visi" rows={3} value={data.visi} onChange={e => setData(d => ({ ...d, visi: e.target.value }))} />
          <div>
            <label className="block text-xs text-slate-400 mb-2 font-medium">Misi</label>
            <div className="space-y-2 mb-2">
              {data.misi.map((m, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                  <span className="text-blue-400 font-bold text-sm shrink-0 mt-0.5">{i+1}.</span>
                  <p className="text-sm text-slate-300 flex-1">{m}</p>
                  <button onClick={() => removeMisi(i)} className="text-red-400 hover:text-red-300 shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={misiInput} onChange={e => setMisiInput(e.target.value)} placeholder="Tambah poin misi..."
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMisi(); } }}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-500" />
              <button type="button" onClick={addMisi} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SaveBtn loading={saving} onClick={save} label="Simpan Semua" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   TAB: PENGURUS
──────────────────────────────────────────────────────────────────────── */
function TabPengurus({ showToast, onUnauth }: { showToast: (m: string, t?: "ok"|"err") => void; onUnauth: () => void }) {
  const [list, setList] = useState<OsisPengurus[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<OsisPengurus> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetch_ = () => {
    setLoading(true);
    apiGet("/api/osis/pengurus").then(setList).catch(e => { if (e.message==="UNAUTHORIZED") onUnauth(); }).finally(() => setLoading(false));
  };
  useEffect(fetch_, []);

  const openNew = () => setForm({ nama:"", jabatan:"", bidang:"", tugasPokok:"", instagram:"", email:"", urutan: list.length });
  const openEdit = (p: OsisPengurus) => setForm({ ...p });

  const save = async () => {
    if (!form?.nama || !form?.jabatan) { showToast("Nama dan jabatan wajib diisi.", "err"); return; }
    setSaving(true);
    try {
      if (form.id) await apiPut(`/api/osis/pengurus/${form.id}`, form);
      else await apiPost("/api/osis/pengurus", form);
      showToast("Data pengurus disimpan!"); fetch_(); setForm(null);
    } catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal menyimpan.", "err"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Hapus pengurus ini?")) return;
    setDeleting(id);
    try { await apiDelete(`/api/osis/pengurus/${id}`); showToast("Pengurus dihapus."); fetch_(); }
    catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal menghapus.", "err"); }
    finally { setDeleting(null); }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <p className="text-slate-400 text-sm">{list.length} pengurus terdaftar</p>
        <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> Tambah Pengurus
        </button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div> : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {list.sort((a,b) => a.urutan - b.urutan).map(p => (
            <SectionCard key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center overflow-hidden shrink-0">
                  {p.foto ? <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{p.nama}</p>
                  <p className="text-blue-400 text-xs">{p.jabatan}</p>
                  {p.bidang && <p className="text-slate-500 text-[10px]">{p.bidang}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <DeleteBtn onClick={() => del(p.id)} loading={deleting === p.id} />
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {/* Modal Form */}
      <AnimatePresence>
        {form && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center p-5 border-b border-slate-800">
                <h3 className="text-white font-bold">{form.id ? "Edit Pengurus" : "Tambah Pengurus"}</h3>
                <button onClick={() => setForm(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <ImageUpload label="Foto" value={form.foto} onChange={v => setForm(f => f ? ({ ...f, foto: v || undefined }) : null)} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <InputField label="Nama Lengkap *" value={form.nama||""} onChange={e => setForm(f => f ? ({...f, nama: e.target.value}) : null)} />
                  <InputField label="Jabatan *" value={form.jabatan||""} onChange={e => setForm(f => f ? ({...f, jabatan: e.target.value}) : null)} />
                  <InputField label="Bidang" value={form.bidang||""} onChange={e => setForm(f => f ? ({...f, bidang: e.target.value}) : null)} />
                  <InputField label="Urutan" type="number" value={form.urutan||0} onChange={e => setForm(f => f ? ({...f, urutan: +e.target.value}) : null)} />
                  <InputField label="Instagram (@handle)" value={form.instagram||""} onChange={e => setForm(f => f ? ({...f, instagram: e.target.value}) : null)} />
                  <InputField label="Email" value={form.email||""} onChange={e => setForm(f => f ? ({...f, email: e.target.value}) : null)} />
                </div>
                <TextArea label="Tugas Pokok" rows={3} value={form.tugasPokok||""} onChange={e => setForm(f => f ? ({...f, tugasPokok: e.target.value}) : null)} />
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
                <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 transition-colors">Batal</button>
                <SaveBtn loading={saving} onClick={save} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   TAB: PROGRAM KERJA
──────────────────────────────────────────────────────────────────────── */
function TabProker({ showToast, onUnauth }: { showToast: (m: string, t?: "ok"|"err") => void; onUnauth: () => void }) {
  const [list, setList] = useState<OsisProgramKerja[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<OsisProgramKerja> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetch_ = () => {
    setLoading(true);
    apiGet("/api/osis/proker").then(setList).catch(e => { if (e.message==="UNAUTHORIZED") onUnauth(); }).finally(() => setLoading(false));
  };
  useEffect(fetch_, []);

  const save = async () => {
    if (!form?.nama || !form?.bidang) { showToast("Nama dan bidang wajib diisi.", "err"); return; }
    setSaving(true);
    try {
      if (form.id) await apiPut(`/api/osis/proker/${form.id}`, form);
      else await apiPost("/api/osis/proker", form);
      showToast("Program kerja disimpan!"); fetch_(); setForm(null);
    } catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal menyimpan.", "err"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Hapus program kerja ini?")) return;
    setDeleting(id);
    try { await apiDelete(`/api/osis/proker/${id}`); showToast("Program kerja dihapus."); fetch_(); }
    catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal.", "err"); }
    finally { setDeleting(null); }
  };

  const STATUS_OPTS = ["DIRENCANAKAN","BERLANGSUNG","SELESAI"];

  return (
    <div className="max-w-5xl">
      <div className="flex justify-between items-center mb-4">
        <p className="text-slate-400 text-sm">{list.length} program kerja</p>
        <button onClick={() => setForm({ nama:"", bidang: BIDANG_PROKER[0], deskripsi:"", status:"DIRENCANAKAN", progress:0, targetDate:"", penanggungJawab:"", urutan:list.length })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> Tambah Program Kerja
        </button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div> : (
        <div className="space-y-2">
          {list.sort((a,b) => a.urutan - b.urutan).map(pk => {
            const statusColor = pk.status === "SELESAI" ? "text-emerald-400" : pk.status === "BERLANGSUNG" ? "text-amber-400" : "text-blue-400";
            return (
              <SectionCard key={pk.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">{pk.bidang}</span>
                      <span className={`text-[10px] font-semibold ${statusColor}`}>{pk.status}</span>
                    </div>
                    <p className="text-white text-sm font-bold">{pk.nama}</p>
                    {pk.deskripsi && <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{pk.deskripsi}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-700">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pk.progress}%` }} />
                      </div>
                      <span className="text-xs text-blue-400 font-bold">{pk.progress}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setForm({ ...pk })} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(pk.id)} disabled={deleting === pk.id} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50">
                      {deleting === pk.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {form && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center p-5 border-b border-slate-800">
                <h3 className="text-white font-bold">{form.id ? "Edit Program Kerja" : "Tambah Program Kerja"}</h3>
                <button onClick={() => setForm(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <InputField label="Nama Program Kerja *" value={form.nama||""} onChange={e => setForm(f => f ? ({...f, nama: e.target.value}) : null)} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <SelectField label="Bidang *" value={form.bidang||""} onChange={e => setForm(f => f ? ({...f, bidang: e.target.value}) : null)}>
                    {BIDANG_PROKER.map(b => <option key={b} value={b}>{b}</option>)}
                  </SelectField>
                  <SelectField label="Status" value={form.status||"DIRENCANAKAN"} onChange={e => setForm(f => f ? ({...f, status: e.target.value}) : null)}>
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </SelectField>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Progress (%)</label>
                    <input type="range" min={0} max={100} value={form.progress||0}
                      onChange={e => setForm(f => f ? ({...f, progress: +e.target.value}) : null)}
                      className="w-full accent-blue-600" />
                    <span className="text-blue-400 text-xs">{form.progress || 0}%</span>
                  </div>
                  <InputField label="Target Selesai" type="date" value={form.targetDate||""} onChange={e => setForm(f => f ? ({...f, targetDate: e.target.value}) : null)} />
                  <InputField label="Penanggung Jawab" value={form.penanggungJawab||""} onChange={e => setForm(f => f ? ({...f, penanggungJawab: e.target.value}) : null)} />
                  <InputField label="Urutan" type="number" value={form.urutan||0} onChange={e => setForm(f => f ? ({...f, urutan: +e.target.value}) : null)} />
                </div>
                <TextArea label="Deskripsi" rows={3} value={form.deskripsi||""} onChange={e => setForm(f => f ? ({...f, deskripsi: e.target.value}) : null)} />
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
                <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 transition-colors">Batal</button>
                <SaveBtn loading={saving} onClick={save} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   TAB: AGENDA
──────────────────────────────────────────────────────────────────────── */
function TabAgenda({ showToast, onUnauth }: { showToast: (m: string, t?: "ok"|"err") => void; onUnauth: () => void }) {
  const [list, setList] = useState<OsisAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<OsisAgenda> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetch_ = () => { setLoading(true); apiGet("/api/osis/agenda").then(setList).catch(e => { if (e.message==="UNAUTHORIZED") onUnauth(); }).finally(() => setLoading(false)); };
  useEffect(fetch_, []);

  const save = async () => {
    if (!form?.nama || !form?.tanggal) { showToast("Nama dan tanggal wajib diisi.", "err"); return; }
    setSaving(true);
    try {
      if (form.id) await apiPut(`/api/osis/agenda/${form.id}`, form);
      else await apiPost("/api/osis/agenda", form);
      showToast("Agenda disimpan!"); fetch_(); setForm(null);
    } catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal.", "err"); }
    finally { setSaving(false); }
  };
  const del = async (id: string) => {
    if (!confirm("Hapus agenda ini?")) return;
    setDeleting(id);
    try { await apiDelete(`/api/osis/agenda/${id}`); showToast("Agenda dihapus."); fetch_(); }
    catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal.", "err"); }
    finally { setDeleting(null); }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <p className="text-slate-400 text-sm">{list.length} agenda</p>
        <button onClick={() => setForm({ nama:"", tanggal:"", waktu:"", tempat:"", deskripsi:"", jenis:"RUTIN" })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> Tambah Agenda
        </button>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div> : (
        <div className="space-y-2">
          {list.sort((a,b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()).map(ag => (
            <SectionCard key={ag.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-12 rounded-lg bg-blue-600/20 flex flex-col items-center justify-center">
                  <span className="text-[8px] text-blue-400 font-bold uppercase">{new Date(ag.tanggal).toLocaleDateString("id-ID",{month:"short"})}</span>
                  <span className="text-base font-black text-blue-400 leading-none">{new Date(ag.tanggal).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${ag.jenis==="BESAR" ? "bg-blue-500/15 text-blue-400" : ag.jenis==="KOLABORASI" ? "bg-purple-500/15 text-purple-400" : "bg-slate-500/15 text-slate-400"}`}>{ag.jenis}</span>
                  <p className="text-white text-sm font-bold mt-0.5">{ag.nama}</p>
                  {ag.tempat && <p className="text-slate-400 text-xs"><MapPin className="inline w-3 h-3" /> {ag.tempat}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setForm({...ag})} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del(ag.id)} disabled={deleting===ag.id} className="p-2 rounded-lg bg-red-500/10 text-red-400 disabled:opacity-50 hover:bg-red-500/20 transition-colors">
                    {deleting===ag.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
      <AnimatePresence>
        {form && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center p-5 border-b border-slate-800">
                <h3 className="text-white font-bold">{form.id ? "Edit Agenda" : "Tambah Agenda"}</h3>
                <button onClick={() => setForm(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <InputField label="Nama Event *" value={form.nama||""} onChange={e => setForm(f => f ? ({...f, nama: e.target.value}) : null)} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <InputField label="Tanggal *" type="date" value={form.tanggal||""} onChange={e => setForm(f => f ? ({...f, tanggal: e.target.value}) : null)} />
                  <InputField label="Waktu" placeholder="mis. 08.00 - 12.00 WIB" value={form.waktu||""} onChange={e => setForm(f => f ? ({...f, waktu: e.target.value}) : null)} />
                  <InputField label="Tempat" value={form.tempat||""} onChange={e => setForm(f => f ? ({...f, tempat: e.target.value}) : null)} />
                  <SelectField label="Jenis" value={form.jenis||"RUTIN"} onChange={e => setForm(f => f ? ({...f, jenis: e.target.value}) : null)}>
                    <option value="RUTIN">Rutin</option>
                    <option value="BESAR">Besar</option>
                    <option value="KOLABORASI">Kolaborasi</option>
                  </SelectField>
                </div>
                <TextArea label="Deskripsi" rows={3} value={form.deskripsi||""} onChange={e => setForm(f => f ? ({...f, deskripsi: e.target.value}) : null)} />
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
                <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 transition-colors">Batal</button>
                <SaveBtn loading={saving} onClick={save} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   TAB: EKSKUL
──────────────────────────────────────────────────────────────────────── */
function TabEkskul({ showToast, onUnauth }: { showToast: (m: string, t?: "ok"|"err") => void; onUnauth: () => void }) {
  const [list, setList] = useState<OsisEkskul[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<OsisEkskul> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetch_ = () => { setLoading(true); apiGet("/api/osis/ekskul").then(setList).catch(e => { if (e.message==="UNAUTHORIZED") onUnauth(); }).finally(() => setLoading(false)); };
  useEffect(fetch_, []);

  const save = async () => {
    if (!form?.nama) { showToast("Nama ekskul wajib diisi.", "err"); return; }
    setSaving(true);
    try {
      if (form.id) await apiPut(`/api/osis/ekskul/${form.id}`, form);
      else await apiPost("/api/osis/ekskul", form);
      showToast("Ekskul disimpan!"); fetch_(); setForm(null);
    } catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal.", "err"); }
    finally { setSaving(false); }
  };
  const del = async (id: string) => {
    if (!confirm("Hapus ekskul ini?")) return;
    setDeleting(id);
    try { await apiDelete(`/api/osis/ekskul/${id}`); showToast("Ekskul dihapus."); fetch_(); }
    catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal.", "err"); }
    finally { setDeleting(null); }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <p className="text-slate-400 text-sm">{list.length} ekstrakurikuler</p>
        <button onClick={() => setForm({ nama:"", kategori:"AKADEMIK", deskripsi:"", jadwal:"", pembina:"", jumlahAnggota:0, urutan:list.length })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> Tambah Ekskul
        </button>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.sort((a,b) => a.urutan - b.urutan).map(ex => (
            <SectionCard key={ex.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 overflow-hidden flex items-center justify-center shrink-0">
                  {ex.foto ? <img src={ex.foto} alt={ex.nama} className="w-full h-full object-cover" /> : <Zap className="w-5 h-5 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold">{ex.nama}</p>
                  <p className="text-blue-400 text-xs">{ex.kategori.toLowerCase()}</p>
                  {ex.pembina && <p className="text-slate-500 text-[10px]">Pembina: {ex.pembina}</p>}
                  {ex.jumlahAnggota > 0 && <p className="text-slate-500 text-[10px]">{ex.jumlahAnggota} anggota</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setForm({...ex})} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"><Edit2 className="w-3 h-3" /> Edit</button>
                <DeleteBtn onClick={() => del(ex.id)} loading={deleting===ex.id} />
              </div>
            </SectionCard>
          ))}
        </div>
      )}
      <AnimatePresence>
        {form && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center p-5 border-b border-slate-800">
                <h3 className="text-white font-bold">{form.id ? "Edit Ekskul" : "Tambah Ekskul"}</h3>
                <button onClick={() => setForm(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <ImageUpload label="Foto Ekskul" value={form.foto} onChange={v => setForm(f => f ? ({...f, foto: v||undefined}) : null)} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <InputField label="Nama Ekskul *" value={form.nama||""} onChange={e => setForm(f => f ? ({...f, nama: e.target.value}) : null)} />
                  <SelectField label="Kategori" value={form.kategori||"AKADEMIK"} onChange={e => setForm(f => f ? ({...f, kategori: e.target.value}) : null)}>
                    {["AKADEMIK","SENI","OLAHRAGA","KEAGAMAAN","TEKNOLOGI"].map(k => <option key={k} value={k}>{k}</option>)}
                  </SelectField>
                  <InputField label="Jadwal Latihan" value={form.jadwal||""} placeholder="mis. Rabu 14.00 WIB" onChange={e => setForm(f => f ? ({...f, jadwal: e.target.value}) : null)} />
                  <InputField label="Pembina" value={form.pembina||""} onChange={e => setForm(f => f ? ({...f, pembina: e.target.value}) : null)} />
                  <InputField label="Jumlah Anggota" type="number" value={form.jumlahAnggota||0} onChange={e => setForm(f => f ? ({...f, jumlahAnggota: +e.target.value}) : null)} />
                  <InputField label="Urutan" type="number" value={form.urutan||0} onChange={e => setForm(f => f ? ({...f, urutan: +e.target.value}) : null)} />
                </div>
                <TextArea label="Deskripsi" rows={3} value={form.deskripsi||""} onChange={e => setForm(f => f ? ({...f, deskripsi: e.target.value}) : null)} />
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
                <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 transition-colors">Batal</button>
                <SaveBtn loading={saving} onClick={save} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   TAB: GALERI
──────────────────────────────────────────────────────────────────────── */
function TabGaleri({ showToast, onUnauth }: { showToast: (m: string, t?: "ok"|"err") => void; onUnauth: () => void }) {
  const [list, setList] = useState<OsisGaleri[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newJudul, setNewJudul] = useState("");
  const [newKategori, setNewKategori] = useState("KEGIATAN");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetch_ = () => { setLoading(true); apiGet("/api/osis/galeri").then(setList).catch(e => { if (e.message==="UNAUTHORIZED") onUnauth(); }).finally(() => setLoading(false)); };
  useEffect(fetch_, []);

  const upload = async (file: File) => {
    if (!newJudul.trim()) { showToast("Isi judul foto terlebih dahulu.", "err"); return; }
    setUploading(true);
    try {
      const foto = await compressImage(file, 1000, 0.8);
      await apiPost("/api/osis/galeri", { judul: newJudul.trim(), kategori: newKategori, foto });
      showToast("Foto berhasil diunggah!"); setNewJudul(""); fetch_();
    } catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal upload.", "err"); }
    finally { setUploading(false); }
  };
  const del = async (id: string) => {
    if (!confirm("Hapus foto ini?")) return;
    setDeleting(id);
    try { await apiDelete(`/api/osis/galeri/${id}`); showToast("Foto dihapus."); fetch_(); }
    catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal.", "err"); }
    finally { setDeleting(null); }
  };

  return (
    <div className="max-w-4xl">
      <SectionCard className="p-5 mb-6">
        <h3 className="text-white font-bold mb-4">Upload Foto Kegiatan</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <div className="sm:col-span-2">
            <InputField label="Judul Foto" value={newJudul} onChange={e => setNewJudul(e.target.value)} placeholder="mis. Pelantikan Pengurus OSIS 2025" />
          </div>
          <SelectField label="Kategori" value={newKategori} onChange={e => setNewKategori(e.target.value)}>
            {["KEGIATAN","PELANTIKAN","PERINGATAN","KOMPETISI","LAINNYA"].map(k => <option key={k} value={k}>{k}</option>)}
          </SelectField>
        </div>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${uploading ? "border-blue-500 bg-blue-500/5" : "border-slate-700 hover:border-blue-500 hover:bg-blue-500/5"}`}
          onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-2" /> : <Camera className="w-6 h-6 text-slate-400 mx-auto mb-2" />}
          <p className="text-sm text-slate-400">{uploading ? "Mengunggah..." : "Klik untuk pilih foto"}</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value=""; }} />
        </div>
      </SectionCard>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {list.map(g => (
            <div key={g.id} className="relative group rounded-xl overflow-hidden bg-slate-800 aspect-square">
              <img src={g.foto} alt={g.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                <p className="text-white text-xs font-semibold line-clamp-1">{g.judul}</p>
                <p className="text-slate-300 text-[10px]">{g.kategori}</p>
              </div>
              <button onClick={() => del(g.id)} disabled={deleting===g.id}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50">
                {deleting===g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   TAB: PRESTASI
──────────────────────────────────────────────────────────────────────── */
function TabPrestasi({ showToast, onUnauth }: { showToast: (m: string, t?: "ok"|"err") => void; onUnauth: () => void }) {
  const [list, setList] = useState<OsisPrestasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<OsisPrestasi> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetch_ = () => { setLoading(true); apiGet("/api/osis/prestasi").then(setList).catch(e => { if (e.message==="UNAUTHORIZED") onUnauth(); }).finally(() => setLoading(false)); };
  useEffect(fetch_, []);

  const save = async () => {
    if (!form?.judul || !form?.tanggal) { showToast("Judul dan tanggal wajib diisi.", "err"); return; }
    setSaving(true);
    try {
      if (form.id) await apiPut(`/api/osis/prestasi/${form.id}`, form);
      else await apiPost("/api/osis/prestasi", form);
      showToast("Prestasi disimpan!"); fetch_(); setForm(null);
    } catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal.", "err"); }
    finally { setSaving(false); }
  };
  const del = async (id: string) => {
    if (!confirm("Hapus prestasi ini?")) return;
    setDeleting(id);
    try { await apiDelete(`/api/osis/prestasi/${id}`); showToast("Prestasi dihapus."); fetch_(); }
    catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal.", "err"); }
    finally { setDeleting(null); }
  };

  const TINGKAT_CFG: Record<string, string> = { SEKOLAH:"bg-slate-500/15 text-slate-400", KECAMATAN:"bg-green-500/15 text-green-400", KABUPATEN:"bg-blue-500/15 text-blue-400", PROVINSI:"bg-purple-500/15 text-purple-400", NASIONAL:"bg-amber-500/15 text-amber-400" };

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <p className="text-slate-400 text-sm">{list.length} prestasi</p>
        <button onClick={() => setForm({ judul:"", deskripsi:"", tingkat:"SEKOLAH", tanggal:"" })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> Tambah Prestasi
        </button>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div> : (
        <div className="space-y-2">
          {list.sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map(p => (
            <SectionCard key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                {p.foto && <img src={p.foto} alt={p.judul} className="w-14 h-14 rounded-xl object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${TINGKAT_CFG[p.tingkat]||""}`}>{p.tingkat}</span>
                  <p className="text-white text-sm font-bold mt-0.5">{p.judul}</p>
                  {p.deskripsi && <p className="text-slate-400 text-xs line-clamp-1">{p.deskripsi}</p>}
                  <p className="text-slate-500 text-[10px] mt-0.5">{new Date(p.tanggal).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setForm({...p})} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del(p.id)} disabled={deleting===p.id} className="p-2 rounded-lg bg-red-500/10 text-red-400 disabled:opacity-50 hover:bg-red-500/20 transition-colors">
                    {deleting===p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
      <AnimatePresence>
        {form && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center p-5 border-b border-slate-800">
                <h3 className="text-white font-bold">{form.id ? "Edit Prestasi" : "Tambah Prestasi"}</h3>
                <button onClick={() => setForm(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <ImageUpload label="Foto/Sertifikat" value={form.foto} onChange={v => setForm(f => f ? ({...f, foto: v||undefined}) : null)} />
                <InputField label="Judul Prestasi *" value={form.judul||""} onChange={e => setForm(f => f ? ({...f, judul: e.target.value}) : null)} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <SelectField label="Tingkat" value={form.tingkat||"SEKOLAH"} onChange={e => setForm(f => f ? ({...f, tingkat: e.target.value}) : null)}>
                    {["SEKOLAH","KECAMATAN","KABUPATEN","PROVINSI","NASIONAL"].map(t => <option key={t} value={t}>{t}</option>)}
                  </SelectField>
                  <InputField label="Tanggal *" type="date" value={form.tanggal||""} onChange={e => setForm(f => f ? ({...f, tanggal: e.target.value}) : null)} />
                </div>
                <TextArea label="Deskripsi" rows={3} value={form.deskripsi||""} onChange={e => setForm(f => f ? ({...f, deskripsi: e.target.value}) : null)} />
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
                <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 transition-colors">Batal</button>
                <SaveBtn loading={saving} onClick={save} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   TAB: ASPIRASI
──────────────────────────────────────────────────────────────────────── */
function TabAspirasi({ showToast, onUnauth }: { showToast: (m: string, t?: "ok"|"err") => void; onUnauth: () => void }) {
  const [list, setList] = useState<OsisAspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OsisAspirasi | null>(null);
  const [balasan, setBalasan] = useState("");
  const [status, setStatus] = useState("BARU");
  const [publik, setPublik] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");

  const fetch_ = () => { setLoading(true); apiGet("/api/osis/aspirasi").then(setList).catch(e => { if (e.message==="UNAUTHORIZED") onUnauth(); }).finally(() => setLoading(false)); };
  useEffect(fetch_, []);

  const openDetail = (asp: OsisAspirasi) => { setSelected(asp); setBalasan(asp.balasan); setStatus(asp.status); setPublik(asp.publik); };

  const saveReply = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiPatch(`/api/osis/aspirasi/${selected.id}`, { balasan, status, publik });
      showToast("Balasan disimpan!"); fetch_();
      setSelected(s => s ? ({ ...s, balasan, status, publik }) : null);
    } catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal.", "err"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Hapus aspirasi ini?")) return;
    setDeleting(id);
    try { await apiDelete(`/api/osis/aspirasi/${id}`); showToast("Aspirasi dihapus."); if (selected?.id === id) setSelected(null); fetch_(); }
    catch (e: any) { if (e.message==="UNAUTHORIZED") onUnauth(); else showToast("Gagal.", "err"); }
    finally { setDeleting(null); }
  };

  const STATUS_COLOR: Record<string, string> = { BARU:"text-blue-400", DITINJAU:"text-amber-400", DIJAWAB:"text-emerald-400" };
  const filtered = filterStatus ? list.filter(a => a.status === filterStatus) : list;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <p className="text-slate-400 text-sm">{list.length} aspirasi masuk</p>
        <div className="flex gap-1.5 flex-wrap ml-auto">
          {["","BARU","DITINJAU","DIJAWAB"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterStatus === s ? "bg-blue-600 text-white" : "border border-slate-700 text-slate-400 hover:border-blue-500"}`}>
              {s || "Semua"}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${selected ? "lg:grid-cols-2" : ""}`}>
        {/* List */}
        <div className="space-y-2 overflow-y-auto max-h-[70vh]">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div> :
            filtered.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(asp => (
              <SectionCard key={asp.id} className={`p-4 cursor-pointer transition-all hover:border-blue-500/40 ${selected?.id === asp.id ? "border-blue-500/60" : ""}`}
                onClick={() => openDetail(asp)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-bold ${STATUS_COLOR[asp.status]||"text-slate-400"}`}>{asp.status}</span>
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{asp.kategori}</span>
                      {asp.publik && <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">Publik</span>}
                    </div>
                    <p className="text-white text-sm font-semibold line-clamp-1">{asp.isi}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{asp.anonim ? "Anonim" : `${asp.nama}${asp.kelas ? ` — ${asp.kelas}` : ""}`}</p>
                    <p className="text-slate-600 text-[10px]">{new Date(asp.createdAt).toLocaleDateString("id-ID")}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); del(asp.id); }} disabled={deleting===asp.id}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors shrink-0 disabled:opacity-50">
                    {deleting===asp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </SectionCard>
            ))
          }
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="sticky top-0">
            <SectionCard className="p-5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-white font-bold">Detail Aspirasi</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Pengirim</p>
                  <p className="text-white text-sm">{selected.anonim ? "Anonim" : `${selected.nama}${selected.kelas ? ` — ${selected.kelas}` : ""}`}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Kategori</p>
                  <p className="text-white text-sm">{selected.kategori}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Isi Aspirasi</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{selected.isi}</p>
                </div>
              </div>
              <div className="space-y-3">
                <SelectField label="Status" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="BARU">Baru</option>
                  <option value="DITINJAU">Ditinjau</option>
                  <option value="DIJAWAB">Dijawab</option>
                </SelectField>
                <TextArea label="Balasan OSIS" rows={4} value={balasan} onChange={e => setBalasan(e.target.value)} placeholder="Tulis balasan..." />
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={publik} onChange={e => setPublik(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-slate-400">Tampilkan di halaman publik (transparan)</span>
                </label>
                <SaveBtn loading={saving} onClick={saveReply} label="Simpan Balasan" />
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
