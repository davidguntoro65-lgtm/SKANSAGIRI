import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  LogOut,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
  Vote,
  XCircle,
} from "lucide-react";
import { useBranding } from "../hooks/useBranding";

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

type View = "landing" | "login" | "vote";

const TOKEN_KEY = "smkn1_core_token";

function authHeaders(): HeadersInit {
  const stored = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  return stored ? { Authorization: `Bearer ${stored}` } : {};
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getStoredToken() {
  return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
}

export default function PilketosPage() {
  const { getLogo } = useBranding();
  const [view, setView] = useState<View>("landing");
  const [election, setElection] = useState<Election | null>(null);
  const [user, setUser] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [loginError, setLoginError] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const logo = getLogo("light");
  const selected = useMemo(
    () => election?.candidates.find((item) => item.id === selectedCandidate) || null,
    [election, selectedCandidate],
  );

  async function loadElection() {
    const response = await fetch("/api/v1/pilketos/active", { headers: authHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || "Data pemilihan tidak dapat dimuat.");
    setElection(payload.data?.election || null);
    return payload.data?.election as Election | null;
  }

  useEffect(() => {
    document.title = "E-Pilketos 2026/2027 — SMKN 1 Wonogiri";
    const description = "Portal resmi Pemilihan Ketua OSIS SMKN 1 Wonogiri tahun 2026/2027.";
    let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "description";
      document.head.appendChild(tag);
    }
    tag.content = description;

    const restoreSession = async () => {
      try {
        await loadElection();
        if (!getStoredToken()) return;
        const response = await fetch("/api/v1/auth/session", { headers: authHeaders() });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.data?.user?.roles?.includes("SISWA")) {
          localStorage.removeItem(TOKEN_KEY);
          return;
        }
        setUser(payload.data.user);
        setView("vote");
      } catch (error) {
        setFeedback({ type: "error", text: error instanceof Error ? error.message : "Data pemilihan tidak dapat dimuat." });
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();
  }, []);

  function openLogin() {
    setLoginError("");
    setFeedback(null);
    setView("login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToLanding() {
    setLoginError("");
    setFeedback(null);
    setView("landing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    setLoginBusy(true);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Login gagal.");
      if (!payload.data?.user?.roles?.includes("SISWA")) throw new Error("Akun ini bukan akun siswa.");
      localStorage.setItem(TOKEN_KEY, payload.data.token);
      setUser(payload.data.user);
      await loadElection();
      setPassword("");
      setView("vote");
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
    setView("landing");
  }

  if (view === "login") {
    return (
      <main className="pilketos-page min-h-screen bg-[#f7f5ef] text-slate-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pilketos-orb absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-200/45 blur-3xl" />
          <div className="pilketos-orb-delayed absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-orange-200/45 blur-3xl" />
        </div>
        <div className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-8 sm:px-8">
          <button onClick={returnToLanding} className="mb-8 inline-flex w-fit items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-slate-500 transition hover:text-amber-600">
            <ArrowLeft className="h-4 w-4" /> Kembali ke halaman utama
          </button>
          <section className="pilketos-fade-up rounded-[2rem] border border-slate-200/90 bg-white/90 p-6 shadow-[0_24px_80px_rgba(88,66,25,.12)] backdrop-blur-xl sm:p-10">
            <div className="flex items-center gap-3">
              {logo ? <img src={logo} alt="Logo SMKN 1 Wonogiri" className="h-12 w-12 rounded-2xl object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950"><Vote className="h-5 w-5" /></div>}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-600">SMKN 1 Wonogiri</p>
                <p className="mt-1 text-sm font-bold text-slate-800">E-Pilketos 2026/2027</p>
              </div>
            </div>
            <div className="mt-10">
              <p className="text-xs font-black uppercase tracking-[.2em] text-amber-600">Portal pemilih</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Masuk untuk memberikan suara.</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">Gunakan NIS atau NISN dan password akun siswa. Halaman ini khusus untuk autentikasi pemilih.</p>
            </div>
            {election ? (
              <form onSubmit={login} className="mt-8">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                  NIS / NISN
                  <span className="relative mt-2 block">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15" placeholder="Masukkan NIS atau NISN" autoComplete="username" />
                  </span>
                </label>
                <label className="mt-4 block text-xs font-black uppercase tracking-wider text-slate-600">
                  Password
                  <span className="relative mt-2 block">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15" placeholder="Masukkan password" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-slate-700" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </span>
                </label>
                {loginError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{loginError}</p>}
                <button disabled={loginBusy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-amber-500 hover:text-slate-950 disabled:cursor-wait disabled:opacity-50">
                  {loginBusy ? "Memeriksa data..." : "Masuk ke halaman voting"} <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800"><Clock3 className="mb-2 h-5 w-5 text-amber-600" />Pemilihan belum dibuka oleh panitia. Silakan kembali ke halaman utama.</div>
            )}
          </section>
          <p className="mt-6 text-center text-xs font-medium text-slate-400">Satu siswa, satu suara · Sistem pemilihan resmi SMKN 1 Wonogiri</p>
        </div>
      </main>
    );
  }

  if (view === "vote") {
    return (
      <main className="pilketos-page min-h-screen bg-[#f7f5ef] text-slate-900">
        <div className="relative mx-auto min-h-screen max-w-6xl px-5 py-6 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between border-b border-slate-200/80 pb-5">
            <button onClick={returnToLanding} className="flex items-center gap-3 text-left">
              {logo ? <img src={logo} alt="Logo SMKN 1 Wonogiri" className="h-10 w-10 rounded-xl object-contain" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400"><Vote className="h-4 w-4" /></div>}
              <span><span className="block text-[9px] font-black uppercase tracking-[.2em] text-amber-600">SMKN 1 Wonogiri</span><span className="block text-sm font-black text-slate-900">E-Pilketos 2026/2027</span></span>
            </button>
            <button onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 transition hover:border-rose-200 hover:text-rose-600"><LogOut className="h-4 w-4" /> Keluar</button>
          </header>
          <section className="pilketos-fade-up py-12 sm:py-16">
            <p className="text-xs font-black uppercase tracking-[.2em] text-amber-600">Halaman pemilihan</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Halo, {user?.fullName || "Pemilih"}.</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500">Pilih satu kandidat terbaik untuk memimpin OSIS SMKN 1 Wonogiri. Periksa kembali sebelum mengunci pilihan.</p>
          </section>
          {!election ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800">Pemilihan belum tersedia.</div>
          ) : election.hasVoted ? (
            <div className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-[0_18px_55px_rgba(16,185,129,.1)] sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
              <h2 className="mt-6 text-2xl font-black text-slate-950">Suaramu sudah tercatat.</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">Terima kasih telah menggunakan hak pilih. Sistem sudah mengunci suara untuk pemilihan ini.</p>
            </div>
          ) : (
            <section>
              <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-black text-slate-950">Pilih kandidat</h2><span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">{election.candidates.length} pilihan</span></div>
              <CandidateGrid candidates={election.candidates} selectedCandidate={selectedCandidate} onSelect={setSelectedCandidate} />
              <button disabled={!selected || voteBusy} onClick={() => setConfirming(true)} className="mx-auto mt-8 flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-slate-950 py-4 text-sm font-black text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><Vote className="h-4 w-4" /> Konfirmasi pilihan</button>
            </section>
          )}
        </div>
        {feedback && <Toast feedback={feedback} />}
        {confirming && selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Vote className="h-5 w-5" /></div><div><p className="text-xs font-black uppercase tracking-widest text-amber-600">Konfirmasi akhir</p><h3 className="font-black text-slate-950">Simpan pilihanmu?</h3></div></div><p className="mt-5 text-sm leading-relaxed text-slate-600">Kamu memilih <strong className="text-slate-950">{selected.name}</strong> sebagai kandidat nomor {selected.candidateNo}. Pilihan yang sudah disimpan tidak dapat diubah.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => setConfirming(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 hover:text-slate-900">Periksa lagi</button><button onClick={() => void castVote()} disabled={voteBusy} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{voteBusy ? "Menyimpan..." : "Ya, simpan pilihan"}</button></div></div></div>}
      </main>
    );
  }

  return (
    <main className="pilketos-page min-h-screen overflow-hidden bg-[#f7f5ef] text-slate-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(245,158,11,.13),transparent_30%),radial-gradient(circle_at_95%_70%,rgba(251,146,60,.1),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-slate-200/80 pb-5">
          <div className="flex items-center gap-3">
            {logo ? <img src={logo} alt="Logo SMKN 1 Wonogiri" className="h-11 w-11 rounded-2xl object-contain" /> : <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25"><Vote className="h-5 w-5" /></div>}
            <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-600">SMKN 1 Wonogiri</p><p className="mt-1 text-sm font-black tracking-tight text-slate-900">Center of Excellence</p></div>
          </div>
          <button onClick={openLogin} className="group inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-amber-500 hover:text-slate-950 sm:px-5 sm:text-xs"><Vote className="h-4 w-4" /> <span>LAKUKAN EVOTING</span><ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></button>
        </header>

        <section className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
          <div className="pilketos-fade-up">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-700"><Sparkles className="h-3.5 w-3.5" /> Pemilihan Ketua OSIS 2026/2027</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.05em] text-slate-950 sm:text-7xl">Satu suara untuk <span className="text-amber-500">masa depan</span> sekolah.</h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">Kenali kandidat terbaik pilihan panitia. Suaramu menjadi bagian penting dari perjalanan kepemimpinan OSIS SMKN 1 Wonogiri.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button onClick={openLogin} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-400/20 transition hover:-translate-y-0.5 hover:bg-amber-500">Mulai memilih <ArrowRight className="h-4 w-4" /></button>
              <a href="#kandidat" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/65 px-5 py-3.5 text-sm font-black text-slate-600 transition hover:border-amber-300 hover:text-amber-700">Lihat kandidat</a>
            </div>
            <div className="mt-9 flex flex-wrap gap-4 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Aman dan tercatat</span><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-amber-500" /> Satu siswa, satu suara</span></div>
          </div>
          <div className="pilketos-fade-up-delayed relative min-h-[330px] overflow-hidden rounded-[2.5rem] border border-white bg-white/70 p-6 shadow-[0_24px_80px_rgba(88,66,25,.12)] backdrop-blur-xl sm:p-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-200/70 blur-2xl" />
            <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-orange-100 blur-2xl" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between"><span className="rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-white">Official election</span><Vote className="h-6 w-6 text-amber-500" /></div>
              <div className="py-10"><p className="text-sm font-bold text-amber-600">SMKN 1 WONOGIRI</p><h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-950">Pilih dengan<br /><span className="text-amber-500">bijak.</span></h2><p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">{election?.description || "Kepemimpinan baru, semangat baru, dan suara siswa untuk sekolah yang lebih baik."}</p></div>
              <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-amber-500" /> Tahun ajaran {election?.academicYear || "2026/2027"}</span>{election?.endsAt && <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-500" /> Sampai {formatDate(election.endsAt)}</span>}</div>
            </div>
          </div>
        </section>

        <section id="kandidat" className="scroll-mt-8 border-t border-slate-200/80 py-14 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-amber-600">Kenali pilihannya</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Kandidat Ketua OSIS</h2></div><p className="max-w-sm text-sm leading-relaxed text-slate-500">Pilihan kandidat resmi yang telah disiapkan oleh panitia E-Pilketos.</p></div>
          {loading ? <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Memuat kandidat...</div> : election?.candidates.length ? <CandidateGrid candidates={election.candidates} /> : <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center"><Clock3 className="mx-auto h-8 w-8 text-amber-500" /><h3 className="mt-4 font-black text-slate-900">Kandidat sedang disiapkan</h3><p className="mt-2 text-sm text-slate-500">Panitia akan menampilkan nama dan foto kandidat di halaman ini setelah pemilihan dibuka.</p></div>}
        </section>

        <footer className="flex flex-col gap-3 border-t border-slate-200/80 py-7 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 SMKN 1 Wonogiri · E-Pilketos</span><span className="font-medium">Suara siswa, masa depan sekolah.</span></footer>
      </div>
      {feedback && <Toast feedback={feedback} />}
    </main>
  );
}

function CandidateGrid({ candidates, selectedCandidate, onSelect }: { candidates: Candidate[]; selectedCandidate?: string; onSelect?: (id: string) => void }) {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2">
      {candidates.map((candidate, index) => {
        const selected = selectedCandidate === candidate.id;
        const card = <div className={`group relative overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_15px_45px_rgba(88,66,25,.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(88,66,25,.14)] ${selected ? "border-amber-400 ring-4 ring-amber-400/15" : "border-slate-200/90"}`}>
          <div className="relative aspect-[1.55/1] overflow-hidden bg-slate-100">{candidate.photoData ? <img src={candidate.photoData} alt={`Foto ${candidate.name}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-50 text-6xl font-black text-amber-300">{candidate.candidateNo}</div>}<div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg">0{candidate.candidateNo}</div>{selected && <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-lg"><Check className="h-5 w-5" /></div>}</div>
          <div className="p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-600">Calon nomor {candidate.candidateNo}</p><h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{candidate.name}</h3>{onSelect && <p className="mt-2 text-xs text-slate-500">{selected ? "Kandidat ini dipilih." : "Klik kartu untuk memilih kandidat ini."}</p>}</div>
        </div>;
        return onSelect ? <button type="button" key={candidate.id} onClick={() => onSelect(candidate.id)} className="block w-full text-left">{card}</button> : <div key={`${candidate.id}-${index}`}>{card}</div>;
      })}
    </div>
  );
}

function Toast({ feedback }: { feedback: { type: "success" | "error"; text: string } }) {
  return <div role="status" className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}><span className="mt-0.5">{feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}</span>{feedback.text}</div>;
}