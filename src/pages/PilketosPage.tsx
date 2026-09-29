import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronRight, Clock3, LogIn, LogOut, ShieldCheck, Sparkles, Vote, XCircle } from "lucide-react";

type Candidate = {
  id: string;
  candidateNo: number;
  name: string;
  photoData: string | null;
};

type Election = {
  id: string;
  title: string;
  academicYear: string;
  description: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  hasVoted: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  candidates: Candidate[];
};

type StudentUser = {
  fullName: string;
  student?: { nis: string | null; nisn: string } | null;
  roles: string[];
};

const TOKEN_KEY = "smkn1_core_token";

function authHeaders() {
  const stored = localStorage.getItem(TOKEN_KEY);
  return stored ? { Authorization: `Bearer ${stored}` } : {};
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function PilketosPage() {
  const [election, setElection] = useState<Election | null>(null);
  const [user, setUser] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [loginError, setLoginError] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const isLoggedIn = Boolean(user);
  const selected = useMemo(() => election?.candidates.find((item) => item.id === selectedCandidate) || null, [election, selectedCandidate]);

  async function loadElection() {
    const response = await fetch("/api/v1/pilketos/active", { headers: authHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || "Data pemilihan tidak dapat dimuat.");
    setElection(payload.data?.election || null);
  }

  useEffect(() => {
    document.title = "PilketoS 2026/2027 — SMKN 1 Wonogiri";
    const description = "Portal resmi Pemilihan Ketua OSIS SMKN 1 Wonogiri tahun 2026/2027.";
    let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "description";
      document.head.appendChild(tag);
    }
    tag.content = description;
    void loadElection()
      .catch((error) => setFeedback({ type: "error", text: error instanceof Error ? error.message : "Data pemilihan tidak dapat dimuat." }))
      .finally(() => setLoading(false));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    setLoginBusy(true);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Login gagal.");
      if (!payload.data?.user?.roles?.includes("SISWA")) throw new Error("Akun ini bukan akun siswa.");
      localStorage.setItem(TOKEN_KEY, payload.data.token);
      setUser(payload.data.user);
      await loadElection();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login gagal.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function castVote() {
    if (!election || !selected || voteBusy) return;
    setVoteBusy(true);
    try {
      const response = await fetch("/api/v1/pilketos/vote", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ electionId: election.id, candidateId: selected.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Pilihan belum tersimpan.");
      setElection((current) => current ? { ...current, hasVoted: true } : current);
      setConfirming(false);
      setFeedback({ type: "success", text: "Pilihan Anda berhasil disimpan. Terima kasih sudah menggunakan hak suara." });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Pilihan belum tersimpan." });
    } finally {
      setVoteBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST", headers: authHeaders() }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setSelectedCandidate("");
    setFeedback(null);
  }

  return (
    <main className="pilketos-page min-h-screen overflow-hidden bg-[#08111e] text-white">
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(circle at 8% 6%, rgba(245,158,11,.2), transparent 27%), radial-gradient(circle at 92% 88%, rgba(14,165,233,.17), transparent 34%)" }} />
      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"><Vote className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-400">SMKN 1 Wonogiri</p><p className="font-bold">PilketoS 2026/2027</p></div>
          </div>
          {isLoggedIn && <button onClick={logout} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-white/65 transition hover:border-white/25 hover:text-white"><LogOut className="h-4 w-4" />Keluar</button>}
        </header>

        <section className="grid items-center gap-12 py-14 lg:grid-cols-[1fr_.85fr] lg:py-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-amber-300"><Sparkles className="h-3.5 w-3.5" /> Suara siswa, masa depan sekolah</p>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.03] tracking-tight sm:text-6xl">Pilih Ketua OSIS dengan <span className="text-amber-400">satu suara</span> terbaikmu.</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">Gunakan NIS atau NISN dan password akun siswa untuk masuk. Setiap siswa hanya dapat memberikan satu pilihan pada pemilihan yang sedang dibuka.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold text-white/65"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Aman dan tercatat</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2"><Vote className="h-4 w-4 text-amber-400" /> Satu siswa, satu suara</span></div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[40px] bg-amber-400/10 blur-3xl" />
            <div className="relative rounded-[32px] border border-white/10 bg-white/[.055] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              {loading && <div className="py-16 text-center text-sm text-white/50">Memuat pemilihan...</div>}
              {!loading && !election && <div className="py-10 text-center"><Clock3 className="mx-auto h-9 w-9 text-amber-400" /><h2 className="mt-4 text-xl font-black">Pemilihan belum dibuka</h2><p className="mt-2 text-sm leading-relaxed text-white/55">Silakan kembali saat panitia telah membuka pemilihan Ketua OSIS.</p></div>}
              {!loading && election && !isLoggedIn && <form onSubmit={login}>
                <p className="text-xs font-black uppercase tracking-[.2em] text-amber-400">Akses pemilih</p>
                <h2 className="mt-2 text-2xl font-black">Masuk untuk memilih</h2>
                <p className="mt-2 text-sm text-white/50">Pemilihan {election.academicYear} sedang dibuka.</p>
                <label className="mt-7 block text-xs font-bold text-white/70">NIS / NISN<input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20" placeholder="Masukkan NIS atau NISN" autoComplete="username" /></label>
                <label className="mt-4 block text-xs font-bold text-white/70">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3.5 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20" autoComplete="current-password" /></label>
                {loginError && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200">{loginError}</p>}
                <button disabled={loginBusy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"><LogIn className="h-4 w-4" />{loginBusy ? "Memeriksa..." : "Masuk ke halaman pemilihan"}<ChevronRight className="h-4 w-4" /></button>
              </form>}
              {!loading && election && isLoggedIn && <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-amber-400">Halo, {user?.fullName}</p>
                <h2 className="mt-2 text-2xl font-black">{election.title}</h2>
                {election.hasVoted ? <div className="mt-8 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5"><CheckCircle2 className="h-8 w-8 text-emerald-400" /><h3 className="mt-4 text-lg font-black">Suaramu sudah tercatat</h3><p className="mt-2 text-sm leading-relaxed text-white/60">Terima kasih. Sistem sudah mengunci hak pilihmu untuk pemilihan ini.</p></div> : <div className="mt-6"><p className="text-sm leading-relaxed text-white/55">Pilih satu kandidat. Pastikan pilihanmu sudah benar sebelum menekan tombol konfirmasi.</p><div className="mt-5 grid gap-3">{election.candidates.map((candidate) => <label key={candidate.id} className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${selectedCandidate === candidate.id ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-slate-950/25 hover:border-white/25"}`}><input type="radio" name="candidate" value={candidate.id} checked={selectedCandidate === candidate.id} onChange={() => setSelectedCandidate(candidate.id)} className="sr-only" />{candidate.photoData ? <img src={candidate.photoData} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-lg font-black text-amber-300">{candidate.candidateNo}</div>}<span className="flex-1"><span className="block text-[10px] font-black uppercase tracking-widest text-amber-400">Nomor {candidate.candidateNo}</span><span className="mt-1 block font-black">{candidate.name}</span></span>{selectedCandidate === candidate.id && <CheckCircle2 className="h-5 w-5 text-amber-400" />}</label>)}</div><button disabled={!selected || voteBusy} onClick={() => setConfirming(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"><Vote className="h-4 w-4" />Konfirmasi pilihan</button></div>}
              </div>}
            </div>
          </div>
        </section>

        {feedback && <div role="status" className={`fixed bottom-5 right-5 z-40 flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${feedback.type === "success" ? "border-emerald-400/25 bg-emerald-950/90 text-emerald-100" : "border-rose-400/25 bg-rose-950/90 text-rose-100"}`}><span className="mt-0.5">{feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}</span>{feedback.text}</div>}
        {confirming && selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0e1a2b] p-7 shadow-2xl"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-slate-950"><Vote className="h-5 w-5" /></div><div><p className="text-xs font-black uppercase tracking-widest text-amber-400">Konfirmasi akhir</p><h3 className="font-black">Simpan pilihanmu?</h3></div></div><p className="mt-5 text-sm leading-relaxed text-white/65">Kamu memilih <strong className="text-white">{selected.name}</strong> sebagai kandidat nomor {selected.candidateNo}. Pilihan yang sudah disimpan tidak dapat diubah.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => setConfirming(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/60 hover:text-white">Periksa lagi</button><button onClick={() => void castVote()} disabled={voteBusy} className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{voteBusy ? "Menyimpan..." : "Ya, simpan pilihan"}</button></div></div></div>}
      </div>
    </main>
  );
}