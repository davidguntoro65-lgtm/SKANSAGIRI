import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Clock3, ImagePlus, Loader2, Pencil, Plus, RotateCcw, Save, Trash2, Vote, X } from "lucide-react";
import { apiFetch } from "../utils/navigation";

type Candidate = {
  id: string;
  grade: "X" | "XI";
  candidateNo: number;
  name: string;
  photoData: string | null;
  voteCount?: number;
  voteCounts?: Partial<Record<Position, number>>;
};

type Election = {
  id: string;
  title: string;
  academicYear: string;
  description: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  startsAt?: string | null;
  endsAt?: string | null;
  votingPhase?: "DRAFT" | "SCHEDULED" | "OPEN" | "ENDED" | "CLOSED";
  candidates: Candidate[];
};

type ParticipationStats = {
  totalVoters: number;
  totalVoted: number;
  totalCompleted: number;
  totalPending: number;
  legacyVoterCount?: number;
};

type Props = { theme?: "light" | "dark" };
type Position = "KETUA_UMUM" | "KETUA_1" | "KETUA_3" | "KETUA_4";
type AdminSection = "dashboard" | "candidates" | "settings" | "results";

const POSITIONS: Array<{ id: Position; label: string; grade: "X" | "XI" }> = [
  { id: "KETUA_UMUM", label: "Ketua Umum", grade: "XI" },
  { id: "KETUA_1", label: "Ketua 1", grade: "XI" },
  { id: "KETUA_3", label: "Ketua 3", grade: "X" },
  { id: "KETUA_4", label: "Ketua 4", grade: "X" },
];

const TOKEN_KEY = "smkn1_adm_token";

function toJakartaInput(value?: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
}

function fromJakartaInput(value: string) {
  if (!value) return null;
  const valueWithSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  return new Date(`${valueWithSeconds}+07:00`).toISOString();
}

function serializeElectionForm(form: { title: string; academicYear: string; description: string; status: string; startsAt: string; endsAt: string }, status = form.status) {
  return {
    ...form,
    status,
    startsAt: fromJakartaInput(form.startsAt),
    endsAt: fromJakartaInput(form.endsAt),
  };
}

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
  const [form, setForm] = useState({ title: "Pemilihan Ketua OSIS", academicYear: "2026/2027", description: "", status: "DRAFT", startsAt: "", endsAt: "" });
  const [candidate, setCandidate] = useState({ grade: "XI" as "X" | "XI", candidateNo: "", name: "", photoData: "" });
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [stats, setStats] = useState<ParticipationStats | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resettingVotes, setResettingVotes] = useState(false);
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
      if (next) setForm({
        title: next.title,
        academicYear: next.academicYear,
        description: next.description,
        status: next.status,
        startsAt: toJakartaInput(next.startsAt),
        endsAt: toJakartaInput(next.endsAt),
      });
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
      const response = await apiFetch("/api/v1/pilketos/admin/election", { method: "POST", headers: headers(), body: JSON.stringify({ ...serializeElectionForm(form), id: election?.id }) });
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

  function beginEditCandidate(item: Candidate) {
    setCandidate({
      grade: item.grade,
      candidateNo: String(item.candidateNo),
      name: item.name,
      photoData: item.photoData || "",
    });
    setEditingCandidateId(item.id);
    setActiveSection("candidates");
    setNotice(null);
  }

  function cancelCandidateEdit() {
    setEditingCandidateId(null);
    setCandidate({ grade: "XI", candidateNo: "", name: "", photoData: "" });
  }

  async function saveCandidate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      let targetElection = election;
      if (!editingCandidateId && !targetElection) {
        const electionResponse = await apiFetch("/api/v1/pilketos/admin/election", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(serializeElectionForm(form, "DRAFT")),
        });
        const electionPayload = await electionResponse.json().catch(() => ({}));
        if (!electionResponse.ok) throw new Error(electionPayload.error?.message || "Draft pemilihan belum dapat dibuat.");
        targetElection = electionPayload.data?.election as Election | null;
        if (!targetElection?.id) throw new Error("Draft pemilihan belum dapat dibuat.");
        setElection(targetElection);
      }

      const editing = Boolean(editingCandidateId);
      const url = editing
        ? `/api/v1/pilketos/admin/candidates/${editingCandidateId}`
        : `/api/v1/pilketos/admin/election/${targetElection!.id}/candidates`;
      const response = await apiFetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: headers(),
        body: JSON.stringify({ ...candidate, candidateNo: Number(candidate.candidateNo) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || (editing ? "Perubahan kandidat belum tersimpan." : "Kandidat belum tersimpan."));
      cancelCandidateEdit();
      setNotice({
        type: "success",
        text: editing
          ? "Perubahan kandidat berhasil disimpan."
          : election ? "Kandidat berhasil ditambahkan." : "Draft pemilihan dan kandidat pertama berhasil dibuat.",
      });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Perubahan kandidat belum tersimpan." });
    } finally {
      setSaving(false);
    }
  }

  async function resetAllVotes(event: FormEvent) {
    event.preventDefault();
      if (!resetPassword || !election?.id || resettingVotes) return;
    setResettingVotes(true);
    try {
      const response = await apiFetch("/api/v1/pilketos/admin/reset-votes", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ password: resetPassword, electionId: election.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Reset suara belum berhasil.");
      const deletedCount = Number(payload.data?.deletedCount || 0);
      setResetDialogOpen(false);
      setResetPassword("");
      setResetError("");
      setNotice({
        type: "success",
        text: `${deletedCount} suara pada pemilihan yang sedang dikelola berhasil direset. Data siswa, kandidat, pengaturan, dan suara periode lain tetap tersimpan.`,
      });
      await load();
    } catch (error) {
      setResetPassword("");
      setResetError(error instanceof Error ? error.message : "Reset suara belum berhasil.");
    } finally {
      setResettingVotes(false);
    }
  }

  function closeResetDialog() {
    if (resettingVotes) return;
    setResetDialogOpen(false);
    setResetPassword("");
    setResetError("");
  }

  async function removeCandidate(item: Candidate) {
    if (!window.confirm(`Hapus kandidat ${item.name} (kelas ${item.grade}, nomor ${item.candidateNo}) dari pemilihan?`)) return;
    setSaving(true);
    try {
      const response = await apiFetch(`/api/v1/pilketos/admin/candidates/${item.id}`, { method: "DELETE", headers: headers() });
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
        <div className={`mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${card}`}>
          <div><p className={`text-xs font-black uppercase tracking-widest ${muted}`}>Menu Pilketos</p><p className="mt-1 text-sm font-bold">Pilih halaman pengelolaan</p></div>
          <select
            aria-label="Menu Pilketos"
            value={activeSection}
            onChange={(event) => setActiveSection(event.target.value as AdminSection)}
            className={`w-full rounded-xl border px-3.5 py-3 text-sm font-bold outline-none focus:border-amber-400 sm:max-w-xs ${input}`}
          >
            <option value="dashboard">Dashboard Pilketos</option>
            <option value="candidates">Input data kandidat</option>
            <option value="settings">Pengaturan pemilihan</option>
            <option value="results">Rekap hasil — skor per jabatan</option>
          </select>
        </div>
        {activeSection === "dashboard" && <>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total pemilih", stats?.totalVoters ?? 0, "Akun siswa aktif"],
            ["Surat suara lengkap", stats?.totalCompleted ?? 0, "Empat pilihan atau suara lama lengkap"],
            ["Ada catatan suara", stats?.totalVoted ?? 0, "Termasuk pemilih format sebelumnya"],
            ["Belum lengkap", stats?.totalPending ?? 0, "Catatan suara lama belum lengkap"],
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
        {!!stats?.legacyVoterCount && <div role="status" className={`mb-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm ${muted}`}>{stats.legacyVoterCount} pemilih memiliki catatan dari format pemilihan sebelumnya. Data lama tetap disimpan, tetapi tidak digabungkan ke skor empat jabatan.</div>}
        <section className={`rounded-3xl border border-rose-400/20 bg-rose-400/[.06] p-5 sm:p-6 ${card}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-black text-rose-500">Reset suara pemilihan ini</h3>
              <p className={`mt-1 max-w-2xl text-sm leading-relaxed ${muted}`}>Menghapus catatan suara untuk pemilihan yang sedang dikelola agar siswa dapat memilih kembali. Data siswa, kandidat, pengaturan, dan suara periode lain tidak akan dihapus. Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <button
              type="button"
              disabled={!election}
              onClick={() => { setResetPassword(""); setResetError(""); setResetDialogOpen(true); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-400/40 px-4 py-3 text-sm font-black text-rose-500 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" /> Reset suara
            </button>
          </div>
        </section>
        </>}
        {activeSection === "results" && <section className={`rounded-3xl border p-5 sm:p-6 ${card}`}>
          <div><h3 className="font-black">Rekap skor per jabatan</h3><p className={`mt-1 text-xs ${muted}`}>Setiap kandidat memiliki skor terpisah untuk jabatan yang dipilih.</p></div>
          {election ? <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {POSITIONS.map((position) => {
              const candidates = election.candidates.filter((item) => item.grade === position.grade);
              const total = candidates.reduce((sum, item) => sum + (item.voteCounts?.[position.id] || 0), 0);
              return <div key={position.id} className="rounded-2xl border border-current/10 p-4">
                <div className="flex items-center justify-between gap-3"><h4 className="font-black">{position.label}</h4><span className={`text-xs font-bold ${muted}`}>Kelas {position.grade} · {total} suara</span></div>
                <div className="mt-3 divide-y divide-current/10">
                  {candidates.map((item) => <div key={item.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-sm font-black text-amber-500">{item.candidateNo}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{item.name}</span>
                    <span className="rounded-full bg-amber-400/15 px-3 py-1 text-sm font-black text-amber-600">{item.voteCounts?.[position.id] || 0}</span>
                  </div>)}
                  {!candidates.length && <p className={`py-4 text-sm ${muted}`}>Belum ada kandidat.</p>}
                </div>
              </div>;
            })}
          </div> : <div className={`mt-5 rounded-2xl border border-dashed border-current/15 p-8 text-center text-sm ${muted}`}>Belum ada data pemilihan untuk ditampilkan.</div>}
        </section>}
        {activeSection === "settings" && <form onSubmit={saveElection} className={`rounded-3xl border p-5 sm:p-6 ${card}`}>
          <div className="flex items-center gap-3"><Vote className="h-5 w-5 text-amber-500" /><div><h3 className="font-black">Pengaturan pemilihan</h3><p className={`text-xs ${muted}`}>Informasi yang tampil pada landing page.</p></div></div>
          <label className={`mt-6 block text-xs font-bold ${muted}`}>Judul pemilihan<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={`mt-2 w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-amber-400 ${input}`} /></label>
          <label className={`mt-4 block text-xs font-bold ${muted}`}>Tahun ajaran<input required value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} className={`mt-2 w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-amber-400 ${input}`} /></label>
          <label className={`mt-4 block text-xs font-bold ${muted}`}>Deskripsi<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className={`mt-2 w-full resize-none rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-amber-400 ${input}`} placeholder="Pesan singkat untuk pemilih..." /></label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className={`block text-xs font-bold ${muted}`}>Mulai voting (WIB, sampai detik)<input type="datetime-local" step={1} required={Boolean(form.startsAt || form.endsAt)} value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-amber-400 ${input}`} /></label>
            <label className={`block text-xs font-bold ${muted}`}>Akhir voting (WIB, sampai detik)<input type="datetime-local" step={1} min={form.startsAt || undefined} required={Boolean(form.startsAt || form.endsAt)} value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-amber-400 ${input}`} /></label>
          </div>
          <p className={`mt-2 text-xs leading-relaxed ${muted}`}>Jadwal memakai WIB dengan presisi hingga HH:MM:SS. Isi tanggal mulai dan akhir untuk jadwal otomatis; kosongkan keduanya untuk mode manual. Waktu tetap ditegakkan oleh server.</p>
          <label className={`mt-4 block text-xs font-bold ${muted}`}>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={`mt-2 w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-amber-400 ${input}`}><option value="DRAFT">Draft — masih menyiapkan kandidat</option><option value="OPEN">Buka pemilihan</option><option value="CLOSED">Tutup pemilihan</option></select></label>
          {election?.status === "OPEN" && <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className={muted}>Status waktu: <strong className="text-amber-500">{({ SCHEDULED: "Terjadwal", OPEN: "Sedang berlangsung", ENDED: "Waktu voting selesai", CLOSED: "Ditutup", DRAFT: "Draft" } as Record<string, string>)[election.votingPhase || election.status]}</strong>{election.startsAt && election.endsAt && <span className="mt-1 block">WIB: {toJakartaInput(election.startsAt).replace("T", " ")}–{toJakartaInput(election.endsAt).replace("T", " ")}</span>}</p>
          </div>}
          <button disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Menyimpan..." : "Simpan pengaturan"}</button>
          {form.status === "OPEN" && !readyToOpen && <p className="mt-3 text-xs leading-relaxed text-rose-500">Tambahkan tepat 4 kandidat kelas X dan 4 kandidat kelas XI sebelum membuka pemilihan.</p>}
        </form>}
        {activeSection === "candidates" && <div className={`rounded-3xl border p-5 sm:p-6 ${card}`}>
          <div className="flex items-center justify-between gap-3"><div><h3 className="font-black">Daftar pilihan kandidat</h3><p className={`mt-1 text-xs ${muted}`}>{election?.candidates.length || 0}/8 kandidat terdaftar · masing-masing kelas wajib 4.</p></div><span className="rounded-lg bg-amber-400/15 px-2 py-1 text-xs font-black text-amber-600">Nama + foto</span></div>
          {election && election.status !== "DRAFT" && <p className={`mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed ${muted}`}>Data kandidat terkunci karena pemilihan sudah dibuka atau ditutup. Ubah status pemilihan menjadi Draft terlebih dahulu. Kandidat yang sudah menerima suara tetap tidak dapat diedit atau dihapus.</p>}
          <form onSubmit={saveCandidate} className="mt-6 rounded-2xl border border-dashed border-current/15 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h4 className="font-black">{editingCandidateId ? "Edit data kandidat" : "Tambah kandidat"}</h4>
              {editingCandidateId && <button type="button" onClick={cancelCandidateEdit} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${muted}`}><X className="h-3.5 w-3.5" /> Batal edit</button>}
            </div>
            {!election && <p className={`mb-4 rounded-xl bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed ${muted}`}>Draft pemilihan akan dibuat otomatis saat pilihan kandidat pertama ditambahkan.</p>}
            <div className="grid gap-3 sm:grid-cols-[120px_100px_1fr]">
              <label className={`text-xs font-bold ${muted}`}>Kelas<select required disabled={saving || Boolean(election && election.status !== "DRAFT")} value={candidate.grade} onChange={(event) => setCandidate({ ...candidate, grade: event.target.value as "X" | "XI" })} className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-amber-400 disabled:opacity-50 ${input}`}><option value="X">Kelas X</option><option value="XI">Kelas XI</option></select></label>
              <label className={`text-xs font-bold ${muted}`}>Nomor<input required disabled={saving || Boolean(election && election.status !== "DRAFT")} type="number" min={1} max={99} value={candidate.candidateNo} onChange={(event) => setCandidate({ ...candidate, candidateNo: event.target.value })} className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-amber-400 disabled:opacity-50 ${input}`} placeholder="1" /></label>
              <label className={`text-xs font-bold ${muted}`}>Nama kandidat<input required disabled={saving || Boolean(election && election.status !== "DRAFT")} value={candidate.name} onChange={(event) => setCandidate({ ...candidate, name: event.target.value })} className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-amber-400 disabled:opacity-50 ${input}`} placeholder="Nama lengkap kandidat" /></label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition hover:border-amber-400 ${input}`}><ImagePlus className="h-4 w-4 text-amber-500" />{candidate.photoData ? "Ganti foto" : "Upload foto"}<input disabled={saving || Boolean(election && election.status !== "DRAFT")} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPhoto} className="sr-only" /></label>
              {candidate.photoData && <img src={candidate.photoData} alt="Preview kandidat" className="h-16 w-16 rounded-xl border border-current/10 bg-white object-contain p-1" />}
              <button disabled={saving || Boolean(election && election.status !== "DRAFT")} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingCandidateId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{saving ? "Menyimpan..." : editingCandidateId ? "Simpan perubahan" : "Tambah pilihan"}</button>
            </div>
          </form>
          <div className="mt-5 space-y-3">{election?.candidates.map((item) => {
            const canManageCandidate = election.status === "DRAFT" && !saving;
            return <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-current/10 p-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-400/15 text-lg font-black text-amber-600">{item.photoData ? <img src={item.photoData} alt="" className="h-full w-full object-contain p-1" /> : item.candidateNo}</div>
              <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Kelas {item.grade} · Nomor {item.candidateNo}</p><p className="truncate font-black">{item.name}</p></div>
              <button type="button" disabled={!canManageCandidate} onClick={() => beginEditCandidate(item)} className="rounded-lg p-2 text-amber-500 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-35" title={canManageCandidate ? `Edit ${item.name}` : "Kandidat terkunci selama pemilihan berlangsung"} aria-label={`Edit kandidat ${item.name}`}><Pencil className="h-4 w-4" /></button>
              <button type="button" disabled={!canManageCandidate} onClick={() => void removeCandidate(item)} className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-35" title={canManageCandidate ? `Hapus ${item.name}` : "Kandidat terkunci selama pemilihan berlangsung"} aria-label={`Hapus kandidat ${item.name}`}><Trash2 className="h-4 w-4" /></button>
            </div>;
          })}{!election?.candidates.length && <div className={`rounded-2xl border border-dashed p-8 text-center text-sm ${muted}`}>Belum ada kandidat. Tambahkan 4 kandidat kelas X dan 4 kandidat kelas XI untuk membuka pemilihan.</div>}</div>
        </div>
        }
      </div>}
      {resetDialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="pilketos-reset-title" className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${card} ${dark ? "bg-slate-900" : "bg-white"}`}>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-widest text-rose-500">Konfirmasi tindakan</p><h3 id="pilketos-reset-title" className="mt-2 text-xl font-black">Reset suara pemilihan ini?</h3></div>
            <button type="button" onClick={closeResetDialog} disabled={resettingVotes} aria-label="Tutup konfirmasi" className={`rounded-lg p-2 ${muted}`}><X className="h-5 w-5" /></button>
          </div>
          <p className={`mt-4 text-sm leading-relaxed ${muted}`}>Semua suara pada pemilihan yang sedang dikelola akan dihapus. Suara periode lain, data siswa, kandidat, dan pengaturan tetap aman. Masukkan kata sandi admin untuk melanjutkan.</p>
          {resetError && <p role="alert" className="mt-4 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-500">{resetError}</p>}
          <form onSubmit={resetAllVotes} className="mt-5">
            <label htmlFor="pilketos-reset-password" className={`block text-xs font-bold ${muted}`}>Kata sandi admin</label>
            <input
              id="pilketos-reset-password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              disabled={resettingVotes}
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              className={`mt-2 w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-rose-400 disabled:opacity-50 ${input}`}
              placeholder="Masukkan kata sandi admin"
            />
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeResetDialog} disabled={resettingVotes} className={`rounded-xl border border-current/15 px-4 py-3 text-sm font-bold disabled:opacity-50 ${muted}`}>Batal</button>
              <button type="submit" disabled={resettingVotes || !resetPassword} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50">
                {resettingVotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {resettingVotes ? "Memproses reset..." : "Konfirmasi reset"}
              </button>
            </div>
          </form>
        </section>
      </div>}
    </div>
  );
}