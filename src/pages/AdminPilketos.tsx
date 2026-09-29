import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { CheckCircle2, ImagePlus, Loader2, Plus, Save, Trash2, Vote } from "lucide-react";
import { apiFetch } from "../utils/navigation";

type Candidate = {
  id: string;
  grade: "X" | "XI";
  candidateNo: number;
  name: string;
  photoData: string | null;
  voteCount?: number;
};

type Election = {
  id: string;
  title: string;
  academicYear: string;
  description: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  candidates: Candidate[];
};

type ParticipationStats = {
  totalVoters: number;
  totalVoted: number;
  totalCompleted: number;
  totalPending: number;
};

type Props = { theme?: "light" | "dark" };

const TOKEN_KEY = "smkn1_adm_token";

function headers() {
  return { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`, "Content-Type": "application/json" };
}

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  const originalData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    reader.readAsDataURL(file);
  });
  if (originalData.length <= 760 * 1024) return originalData;

  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    image.src = URL.createObjectURL(file);
  });
  const max = 1400;
  const scale = Math.min(1, max / Math.max(source.naturalWidth, source.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung pemrosesan foto.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(source.src);
  for (const quality of [0.92, 0.86, 0.8, 0.74, 0.68]) {
    const result = canvas.toDataURL("image/jpeg", quality);
    if (result.length <= 760 * 1024 || quality === 0.68) return result;
  }
  return canvas.toDataURL("image/jpeg", 0.68);
}

export default function AdminPilketos({ theme = "dark" }: Props) {
  const dark = theme === "dark";
  const card = dark ? "border-white/10 bg-white/[.045]" : "border-slate-200 bg-white";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const input = dark ? "border-white/10 bg-slate-950/50 text-white" : "border-slate-200 bg-white text-slate-900";
  const [election, setElection] = useState<Election | null>(null);
  const [form, setForm] = useState({ title: "Pemilihan Ketua OSIS", academicYear: "2026/2027", description: "", status: "DRAFT" });
  const [candidate, setCandidate] = useState({ grade: "XI" as "X" | "XI", candidateNo: "", name: "", photoData: "" });
  const [stats, setStats] = useState<ParticipationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await apiFetch("/api/v1/pilketos/admin", { headers: headers() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Data Pilketos tidak dapat dimuat.");
      const next = payload.data?.election as Election | null;
      setElection(next);
      setStats(payload.data?.stats || null);
      if (next) setForm({ title: next.title, academicYear: next.academicYear, description: next.description, status: next.status });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Data Pilketos tidak dapat dimuat." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function saveElection(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await apiFetch("/api/v1/pilketos/admin/election", { method: "POST", headers: headers(), body: JSON.stringify({ ...form, id: election?.id }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Pengaturan belum tersimpan.");
      setNotice({ type: "success", text: "Pengaturan pemilihan berhasil disimpan." });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Pengaturan belum tersimpan." });
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const photoData = await compressImage(file);
      setCandidate((current) => ({ ...current, photoData }));
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Foto tidak dapat diproses." });
    } finally {
      event.target.value = "";
    }
  }

  async function addCandidate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      let targetElection = election;
      if (!targetElection) {
        const electionResponse = await apiFetch("/api/v1/pilketos/admin/election", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ ...form, status: "DRAFT" }),
        });
        const electionPayload = await electionResponse.json().catch(() => ({}));
        if (!electionResponse.ok) throw new Error(electionPayload.error?.message || "Draft pemilihan belum dapat dibuat.");
        targetElection = electionPayload.data?.election as Election | null;
        if (!targetElection?.id) throw new Error("Draft pemilihan belum dapat dibuat.");
        setElection(targetElection);
      }

      const response = await apiFetch(`/api/v1/pilketos/admin/election/${targetElection.id}/candidates`, { method: "POST", headers: headers(), body: JSON.stringify({ ...candidate, candidateNo: Number(candidate.candidateNo) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Kandidat belum tersimpan.");
      setCandidate({ grade: "XI", candidateNo: "", name: "", photoData: "" });
      setNotice({ type: "success", text: election ? "Kandidat berhasil ditambahkan." : "Draft pemilihan dan kandidat pertama berhasil dibuat." });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Kandidat belum tersimpan." });
    } finally {
      setSaving(false);
    }
  }

  async function removeCandidate(id: string) {
    if (!window.confirm("Hapus kandidat ini dari draft pemilihan?")) return;
    setSaving(true);
    try {
      const response = await apiFetch(`/api/v1/pilketos/admin/candidates/${id}`, { method: "DELETE", headers: headers() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Kandidat belum dihapus.");
      setNotice({ type: "success", text: "Kandidat berhasil dihapus." });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Kandidat belum dihapus." });
    } finally {
      setSaving(false);
    }
  }

  const gradeCounts = {
    X: election?.candidates.filter((item) => item.grade === "X").length || 0,
    XI: election?.candidates.filter((item) => item.grade === "XI").length || 0,
  };
  const readyToOpen = gradeCounts.X === 4 && gradeCounts.XI === 4;

  return (
    <div className="text-left">
      <div className="flex flex-col justify-between gap-4 border-b border-current/10 pb-6 sm:flex-row sm:items-start">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-amber-500">Pemilihan Ketua OSIS</p><h2 className="mt-2 text-2xl font-black">Pilketos 2026/2027</h2><p className={`mt-1 text-sm ${muted}`}>Siapkan 4 kandidat kelas X, 4 kandidat kelas XI, foto, dan status pemilihan.</p></div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${election?.status === "OPEN" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-500" : "border-amber-400/25 bg-amber-400/10 text-amber-500"}`}><span className="h-2 w-2 rounded-full bg-current" />{election?.status || "DRAFT"}</div>
      </div>
      {notice && <div role="status" className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-600" : "border-rose-400/25 bg-rose-400/10 text-rose-600"}`}>{notice.text}</div>}
      {loading ? <div className={`mt-6 rounded-3xl border p-12 text-center ${card}`}><Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-500" /></div> : <div className="mt-6">
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total pemilih", stats?.totalVoters ?? 0, "Akun siswa aktif"],
            ["Sudah memilih", stats?.totalCompleted ?? 0, "Dua pilihan terekam"],
            ["Sudah mulai", stats?.totalVoted ?? 0, "Minimal satu pilihan"],
            ["Belum selesai", stats?.totalPending ?? 0, "Perlu menyelesaikan dua kelas"],
          ].map(([label, value, hint]) => (
            <div key={label as string} className={`rounded-2xl border p-4 ${card}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${muted}`}>{label}</p>
              <p className="mt-2 text-2xl font-black text-amber-500">{value}</p>
              <p className={`mt-1 text-[11px] ${muted}`}>{hint}</p>
            </div>
          ))}
        </div>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className={`rounded-2xl border p-4 ${card}`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-widest text-amber-500">Kelas X</span><span className={`text-sm font-black ${gradeCounts.X === 4 ? "text-emerald-500" : "text-rose-500"}`}>{gradeCounts.X}/4 kandidat</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-current/10"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.min(gradeCounts.X / 4, 1) * 100}%` }} /></div></div>
          <div className={`rounded-2xl border p-4 ${card}`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-widest text-amber-500">Kelas XI</span><span className={`text-sm font-black ${gradeCounts.XI === 4 ? "text-emerald-500" : "text-rose-500"}`}>{gradeCounts.XI}/4 kandidat</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-current/10"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.min(gradeCounts.XI / 4, 1) * 100}%` }} /></div></div>
        </div>
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <form onSubmit={saveElection} className={`rounded-3xl border p-5 sm:p-6 ${card}`}>
          <div className="flex items-center gap-3"><Vote className="h-5 w-5 text-amber-500" /><div><h3 className="font-black">Pengaturan pemilihan</h3><p className={`text-xs ${muted}`}>Informasi yang tampil pada landing page.</p></div></div>
          <label className={`mt-6 block text-xs font-bold ${muted}`}>Judul pemilihan<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={`mt-2 w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-amber-400 ${input}`} /></label>
          <label className={`mt-4 block text-xs font-bold ${muted}`}>Tahun ajaran<input required value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} className={`mt-2 w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-amber-400 ${input}`} /></label>
          <label className={`mt-4 block text-xs font-bold ${muted}`}>Deskripsi<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className={`mt-2 w-full resize-none rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-amber-400 ${input}`} placeholder="Pesan singkat untuk pemilih..." /></label>
          <label className={`mt-4 block text-xs font-bold ${muted}`}>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={`mt-2 w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-amber-400 ${input}`}><option value="DRAFT">Draft — masih menyiapkan kandidat</option><option value="OPEN">Buka pemilihan</option><option value="CLOSED">Tutup pemilihan</option></select></label>
          <button disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Menyimpan..." : "Simpan pengaturan"}</button>
          {form.status === "OPEN" && !readyToOpen && <p className="mt-3 text-xs leading-relaxed text-rose-500">Tambahkan tepat 4 kandidat kelas X dan 4 kandidat kelas XI sebelum membuka pemilihan.</p>}
        </form>
        <div className={`rounded-3xl border p-5 sm:p-6 ${card}`}>
          <div className="flex items-center justify-between gap-3"><div><h3 className="font-black">Daftar pilihan kandidat</h3><p className={`mt-1 text-xs ${muted}`}>{election?.candidates.length || 0}/8 kandidat terdaftar · masing-masing kelas wajib 4.</p></div><span className="rounded-lg bg-amber-400/15 px-2 py-1 text-xs font-black text-amber-600">Nama + foto</span></div>
          <form onSubmit={addCandidate} className="mt-6 rounded-2xl border border-dashed border-current/15 p-4">
            {!election && <p className={`mb-4 rounded-xl bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed ${muted}`}>Draft pemilihan akan dibuat otomatis saat pilihan kandidat pertama ditambahkan.</p>}
            <div className="grid gap-3 sm:grid-cols-[120px_100px_1fr]">
              <label className={`text-xs font-bold ${muted}`}>Kelas<select required value={candidate.grade} onChange={(event) => setCandidate({ ...candidate, grade: event.target.value as "X" | "XI" })} className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-amber-400 ${input}`}><option value="X">Kelas X</option><option value="XI">Kelas XI</option></select></label>
              <label className={`text-xs font-bold ${muted}`}>Nomor<input required type="number" min={1} max={99} value={candidate.candidateNo} onChange={(event) => setCandidate({ ...candidate, candidateNo: event.target.value })} className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-amber-400 ${input}`} placeholder="1" /></label>
              <label className={`text-xs font-bold ${muted}`}>Nama kandidat<input required value={candidate.name} onChange={(event) => setCandidate({ ...candidate, name: event.target.value })} className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-amber-400 ${input}`} placeholder="Nama lengkap kandidat" /></label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition hover:border-amber-400 ${input}`}><ImagePlus className="h-4 w-4 text-amber-500" />{candidate.photoData ? "Ganti foto" : "Upload foto"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPhoto} className="sr-only" /></label>
              {candidate.photoData && <img src={candidate.photoData} alt="Preview kandidat" className="h-16 w-16 rounded-xl border border-current/10 bg-white object-contain p-1" />}
              <button disabled={saving} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"><Plus className="h-4 w-4" />{saving ? "Menyimpan..." : "Tambah pilihan"}</button>
            </div>
          </form>
          <div className="mt-5 space-y-3">{election?.candidates.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-current/10 p-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-400/15 text-lg font-black text-amber-600">{item.photoData ? <img src={item.photoData} alt="" className="h-full w-full object-contain p-1" /> : item.candidateNo}</div><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Kelas {item.grade} · Nomor {item.candidateNo}</p><p className="truncate font-black">{item.name}</p>{election.status !== "DRAFT" && <p className={`text-xs ${muted}`}>{item.voteCount || 0} suara tercatat</p>}</div>{election.status === "DRAFT" ? <button onClick={() => void removeCandidate(item.id)} className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-500/10" title="Hapus kandidat"><Trash2 className="h-4 w-4" /></button> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}</div>)}{!election?.candidates.length && <div className={`rounded-2xl border border-dashed p-8 text-center text-sm ${muted}`}>Belum ada kandidat. Tambahkan 4 kandidat kelas X dan 4 kandidat kelas XI untuk membuka pemilihan.</div>}</div>
        </div>
        </div>
      </div>}
    </div>
  );
}