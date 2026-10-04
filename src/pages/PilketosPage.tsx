import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { GlobalPageBg } from "../components/BackgroundSystem";
import { useBranding } from "../hooks/useBranding";
import { apiFetch } from "../utils/navigation";

type Candidate = {
  id: string;
  grade: "X" | "XI";
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
  votedPositions: string[];
  votedCandidateIds: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  votingPhase: "DRAFT" | "SCHEDULED" | "OPEN" | "ENDED" | "CLOSED";
  serverTime: string;
  candidates: Candidate[];
};

type StudentUser = {
  fullName: string;
  student?: { nis: string | null; nisn: string } | null;
  roles: string[];
};

type View = "landing" | "login" | "vote";
type Grade = "X" | "XI";
type Position = "KETUA_UMUM" | "KETUA_1" | "KETUA_3" | "KETUA_4";

const POSITIONS: Array<{ id: Position; label: string; grade: Grade; pairedPosition: Position }> = [
  { id: "KETUA_UMUM", label: "Ketua Umum", grade: "XI", pairedPosition: "KETUA_1" },
  { id: "KETUA_1", label: "Ketua 1", grade: "XI", pairedPosition: "KETUA_UMUM" },
  { id: "KETUA_3", label: "Ketua 3", grade: "X", pairedPosition: "KETUA_4" },
  { id: "KETUA_4", label: "Ketua 4", grade: "X", pairedPosition: "KETUA_3" },
];

const EMPTY_SELECTIONS: Record<Position, string> = {
  KETUA_UMUM: "",
  KETUA_1: "",
  KETUA_3: "",
  KETUA_4: "",
};

const TOKEN_KEY = "smkn1_core_token";

function authHeaders(): HeadersInit {
  const stored = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  return stored ? { Authorization: `Bearer ${stored}` } : {};
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function phaseAt(election: Election, nowMs: number): Election["votingPhase"] {
  if (election.status === "DRAFT") return "DRAFT";
  if (election.status === "CLOSED") return "CLOSED";
  const startsAt = election.startsAt ? Date.parse(election.startsAt) : NaN;
  const endsAt = election.endsAt ? Date.parse(election.endsAt) : NaN;
  if (Number.isFinite(startsAt) && nowMs < startsAt) return "SCHEDULED";
  if (Number.isFinite(endsAt) && nowMs >= endsAt) return "ENDED";
  return "OPEN";
}

function VotingSchedule({ election, phase, nowMs }: { election: Election; phase: Election["votingPhase"]; nowMs: number }) {
  const target = phase === "SCHEDULED" ? election.startsAt : phase === "OPEN" ? election.endsAt : null;
  const heading = phase === "SCHEDULED"
    ? "Voting dimulai dalam"
    : phase === "OPEN" && target
      ? "Waktu voting tersisa"
      : phase === "OPEN"
        ? "Pemungutan suara sedang berlangsung"
        : phase === "ENDED"
          ? "Waktu pemungutan suara sudah berakhir"
          : phase === "CLOSED"
            ? "Pemilihan ditutup panitia"
            : "Pemilihan belum dibuka";
  const remaining = target ? Math.max(0, Date.parse(target) - nowMs) : 0;
  const parts = [
    { label: "Hari", value: Math.floor(remaining / 86_400_000) },
    { label: "Jam", value: Math.floor((remaining % 86_400_000) / 3_600_000) },
    { label: "Menit", value: Math.floor((remaining % 3_600_000) / 60_000) },
    { label: "Detik", value: Math.floor((remaining % 60_000) / 1_000) },
  ];
  return (
    <div role="timer" aria-live="off" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-black text-amber-900"><Clock3 className="h-4 w-4 text-amber-600" />{heading}</div>
      {target ? (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {parts.map((part) => <div key={part.label} className="rounded-xl bg-white px-2 py-3 text-center shadow-sm">
              <span className="block text-xl font-black tabular-nums text-slate-950 sm:text-2xl">{String(part.value).padStart(2, "0")}</span>
              <span className="mt-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">{part.label}</span>
            </div>)}
          </div>
          <p className="mt-3 text-xs font-medium text-amber-900">Jadwal: {formatDate(target)} WIB · waktu resmi dari server</p>
        </>
      ) : phase === "OPEN" ? (
        <p className="mt-2 text-xs leading-relaxed text-amber-900">Pemilihan berlangsung tanpa batas waktu terjadwal dan dapat ditutup oleh panitia.</p>
      ) : phase === "ENDED" ? (
        <p className="mt-2 text-xs leading-relaxed text-amber-900">Masa pemilihan berakhir pada {formatDate(election.endsAt)} WIB.</p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-amber-900">Panitia belum membuka pemilihan.</p>
      )}
    </div>
  );
}

function getStoredToken() {
  return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
}

export default function PilketosPage() {
  const { getLogo } = useBranding();
  const [view, setView] = useState<View>("landing");
  const [election, setElection] = useState<Election | null>(null);
  const [serverClock, setServerClock] = useState<{ epochMs: number; receivedAt: number } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [user, setUser] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<Position, string>>(EMPTY_SELECTIONS);
  const [loginError, setLoginError] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const logo = getLogo("light");
  const votingPhase = election ? phaseAt(election, nowMs) : null;
  const selected = useMemo(
    () => POSITIONS
      .map((position) => ({
        position,
        candidate: election?.candidates.find((item) => item.id === selectedCandidates[position.id]),
      }))
      .filter((choice): choice is { position: typeof POSITIONS[number]; candidate: Candidate } => Boolean(choice.candidate)),
    [election, selectedCandidates],
  );

  useEffect(() => {
    if (votingPhase !== "OPEN") setConfirming(false);
  }, [votingPhase]);

  const loadElection = useCallback(async () => {
    const response = await apiFetch("/api/v1/pilketos/active", { headers: authHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || "Data pemilihan tidak dapat dimuat.");
    const next = payload.data?.election as Election | null;
    setElection(next);
    const serverEpoch = next ? Date.parse(next.serverTime) : NaN;
    setServerClock(Number.isFinite(serverEpoch) ? { epochMs: serverEpoch, receivedAt: performance.now() } : null);
    return next;
  }, []);

  useEffect(() => {
    if (!serverClock) {
      setNowMs(Date.now());
      return;
    }
    const tick = () => setNowMs(serverClock.epochMs + performance.now() - serverClock.receivedAt);
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [serverClock]);

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
        const response = await apiFetch("/api/v1/auth/session", { headers: authHeaders() });
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
  }, [loadElection]);

  useEffect(() => {
    if (view === "landing") return;
    const refresh = () => {
      if (document.visibilityState === "visible") void loadElection().catch(() => {});
    };
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadElection, view]);

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
      const response = await apiFetch("/api/v1/auth/login", {
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
    if (!election || votingPhase !== "OPEN" || selected.length !== POSITIONS.length || voteBusy) return;
    setVoteBusy(true);
    try {
      const response = await apiFetch("/api/v1/pilketos/vote", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          electionId: election.id,
          votes: selected.map(({ position, candidate }) => ({
            position: position.id,
            candidateId: candidate.id,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Pilihan belum tersimpan.");
      setElection((current) => current ? { ...current, hasVoted: true, votedPositions: POSITIONS.map((position) => position.id) } : current);
      setConfirming(false);
      setFeedback({ type: "success", text: "Pilihan untuk keempat jabatan berhasil disimpan. Terima kasih sudah menggunakan hak suara." });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Pilihan belum tersimpan." });
    } finally {
      setVoteBusy(false);
    }
  }

  async function logout() {
    await apiFetch("/api/v1/auth/logout", { method: "POST", headers: authHeaders() }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setSelectedCandidates(EMPTY_SELECTIONS);
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
            {election && votingPhase && election.status === "OPEN" && <VotingSchedule election={election} phase={votingPhase} nowMs={nowMs} />}
            {election?.status === "OPEN" && votingPhase !== "ENDED" ? (
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
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800"><Clock3 className="mb-2 h-5 w-5 text-amber-600" />{votingPhase === "ENDED" ? "Masa pemungutan suara telah berakhir." : "Login pemilih akan dibuka setelah panitia mengaktifkan pemilihan."} {votingPhase !== "ENDED" && "Kandidat yang sudah disiapkan dapat dilihat di halaman utama."}</div>
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
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500">Pilih satu kandidat untuk masing-masing dari empat jabatan. Kandidat yang sama tidak dapat dipilih untuk dua jabatan pada tingkat kelas yang sama.</p>
          </section>
          {!election ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800">Pemilihan belum tersedia.</div>
          ) : election.hasVoted ? (
            <div className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-[0_18px_55px_rgba(16,185,129,.1)] sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
              <h2 className="mt-6 text-2xl font-black text-slate-950">Suaramu sudah tercatat.</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">Terima kasih telah menggunakan hak pilih. Sistem sudah mengunci suara untuk pemilihan ini.</p>
            </div>
          ) : votingPhase !== "OPEN" ? (
            <div className="mx-auto max-w-2xl">
              <VotingSchedule election={election} phase={votingPhase || "CLOSED"} nowMs={nowMs} />
            </div>
          ) : (
            <section>
              <VotingSchedule election={election} phase={votingPhase} nowMs={nowMs} />
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-xl font-black text-slate-950">Pilih empat jabatan</h2><p className="mt-1 text-sm text-slate-500">Setiap jabatan mendapat satu pilihan. Suara dikirim sekaligus dan tidak dapat diubah.</p></div><span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">{selected.length}/4 pilihan</span></div>
              {POSITIONS.map((position) => {
                const candidates = election.candidates.filter((candidate) => candidate.grade === position.grade);
                return (
                  <div key={position.id} className="mb-8 rounded-[2rem] border border-slate-200/80 bg-white/45 p-4 shadow-[0_16px_45px_rgba(15,23,42,.05)] backdrop-blur-sm sm:p-6">
                    <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-600">Pemilihan {POSITIONS.findIndex((item) => item.id === position.id) + 1} dari 4 · Kelas {position.grade}</p><h3 className="mt-1 text-lg font-black text-slate-950">{position.label}</h3></div>{selectedCandidates[position.id] && <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">Pilihan terisi</span>}</div>
                    <CandidateGrid
                      candidates={candidates}
                      selectedCandidateId={selectedCandidates[position.id]}
                      blockedCandidateId={selectedCandidates[position.pairedPosition]}
                      onSelect={(id) => setSelectedCandidates((current) => ({ ...current, [position.id]: id }))}
                    />
                  </div>
                );
              })}
              <button disabled={selected.length !== POSITIONS.length || voteBusy} onClick={() => setConfirming(true)} className="mx-auto mt-2 flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-slate-950 py-4 text-sm font-black text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><Vote className="h-4 w-4" /> Konfirmasi empat pilihan</button>
            </section>
          )}
        </div>
        {feedback && <Toast feedback={feedback} />}
         {confirming && votingPhase === "OPEN" && selected.length === POSITIONS.length && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Vote className="h-5 w-5" /></div><div><p className="text-xs font-black uppercase tracking-widest text-amber-600">Konfirmasi akhir</p><h3 className="font-black text-slate-950">Simpan empat pilihan?</h3></div></div><p className="mt-5 text-sm leading-relaxed text-slate-600">Semua pilihan akan disimpan sekaligus dan tidak dapat diubah.</p><div className="mt-4 space-y-2">{selected.map(({ position, candidate }) => <div key={position.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-amber-100 text-sm font-black text-amber-700">{candidate.photoData ? <img src={candidate.photoData} alt="" className="h-full w-full object-contain p-0.5" /> : candidate.candidateNo}</div><div><p className="text-[10px] font-black uppercase tracking-widest text-amber-600">{position.label}</p><p className="text-sm font-black text-slate-950">{candidate.name} · Kelas {candidate.grade}</p></div></div>)}</div><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => setConfirming(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 hover:text-slate-900">Periksa lagi</button><button onClick={() => void castVote()} disabled={voteBusy} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{voteBusy ? "Menyimpan..." : "Ya, simpan empat pilihan"}</button></div></div></div>}
      </main>
    );
  }

  return (
    <main className="pilketos-page relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <GlobalPageBg theme="light" />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(circle_at_10%_0%,rgba(245,158,11,.12),transparent_28%),radial-gradient(circle_at_95%_70%,rgba(59,130,246,.08),transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-slate-200/80 pb-5">
          <div className="flex items-center gap-3">
            {logo ? <img src={logo} alt="Logo SMKN 1 Wonogiri" className="h-11 w-11 rounded-2xl object-contain" /> : <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25"><Vote className="h-5 w-5" /></div>}
            <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-600">SMKN 1 Wonogiri</p><p className="mt-1 text-sm font-black tracking-tight text-slate-900">Center of Excellence</p></div>
          </div>
          <button onClick={openLogin} className="group inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-amber-500 hover:text-slate-950 sm:px-5 sm:text-xs"><Vote className="h-4 w-4" /> <span>LAKUKAN EVOTING</span><ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></button>
        </header>

        <section className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
          <div className="pilketos-fade-up">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50/80 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-700 shadow-sm"><Sparkles className="h-3.5 w-3.5" /> Pemilihan Ketua OSIS 2026/2027</p>
            <h1 className="max-w-3xl font-serif text-5xl font-bold leading-[.98] tracking-[-.04em] text-slate-950 sm:text-7xl">Satu suara untuk <span className="text-amber-500">masa depan</span> sekolah.</h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">Kenali kandidat terbaik pilihan panitia. Suaramu menjadi bagian penting dari perjalanan kepemimpinan OSIS SMKN 1 Wonogiri.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button onClick={openLogin} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-400/20 transition hover:-translate-y-0.5 hover:bg-amber-500">Mulai memilih <ArrowRight className="h-4 w-4" /></button>
              <a href="#kandidat" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/65 px-5 py-3.5 text-sm font-black text-slate-600 transition hover:border-amber-300 hover:text-amber-700">Lihat kandidat</a>
            </div>
            <div className="mt-9 flex flex-wrap gap-4 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Aman dan tercatat</span><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-amber-500" /> Satu siswa, satu suara</span></div>
          </div>
          <div className="pilketos-fade-up-delayed relative min-h-[330px] overflow-hidden rounded-[2.5rem] border border-white/90 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,.12)] backdrop-blur-xl sm:p-8">
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
           {loading ? <div className="mt-8 rounded-3xl border border-slate-200 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-sm">Memuat kandidat...</div> : election?.candidates.length ? (["XI", "X"] as Grade[]).map((grade) => <div key={grade} className="mt-8 rounded-[2rem] border border-slate-200/80 bg-white/45 p-4 shadow-[0_18px_55px_rgba(15,23,42,.06)] backdrop-blur-sm sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-600">Tingkat kandidat</p><h3 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">Kelas {grade}</h3></div><span className="rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">{election.candidates.filter((candidate) => candidate.grade === grade).length} kandidat</span></div><CandidateGrid candidates={election.candidates.filter((candidate) => candidate.grade === grade)} /></div>) : <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center"><Clock3 className="mx-auto h-8 w-8 text-amber-500" /><h3 className="mt-4 font-black text-slate-900">Kandidat sedang disiapkan</h3><p className="mt-2 text-sm text-slate-500">Panitia akan menampilkan nama dan foto kandidat di halaman ini setelah data tersedia.</p></div>}
        </section>

        <footer className="flex flex-col gap-3 border-t border-slate-200/80 py-7 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 SMKN 1 Wonogiri · E-Pilketos</span><span className="font-medium">Suara siswa, masa depan sekolah.</span></footer>
      </div>
      {feedback && <Toast feedback={feedback} />}
    </main>
  );
}

function CandidateGrid({ candidates, selectedCandidateId, blockedCandidateId, onSelect }: { candidates: Candidate[]; selectedCandidateId?: string; blockedCandidateId?: string; onSelect?: (id: string) => void }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {candidates.map((candidate, index) => {
        const selected = selectedCandidateId === candidate.id;
        const blocked = blockedCandidateId === candidate.id;
        const card = <div style={{ animationDelay: `${Math.min(index * 90, 450)}ms` }} className={`pilketos-card-reveal group relative overflow-hidden rounded-[1.75rem] border bg-white/95 shadow-[0_15px_45px_rgba(15,23,42,.08)] transition duration-500 ${blocked ? "cursor-not-allowed opacity-50" : "hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,.14)]"} ${selected ? "border-amber-400 ring-4 ring-amber-400/15" : "border-slate-200/90"}`}>
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_15%,rgba(251,191,36,.16),transparent_44%),linear-gradient(145deg,#fffdf7,#f1f5f9)] p-2 sm:p-3">{candidate.photoData ? <img src={candidate.photoData} alt={`Foto ${candidate.name}`} loading="lazy" decoding="async" className="h-full w-full object-contain drop-shadow-[0_14px_18px_rgba(15,23,42,.12)] transition duration-700 ease-out group-hover:scale-[1.025]" /> : <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 text-6xl font-black text-amber-300">{candidate.candidateNo}</div>}<div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg">{candidate.candidateNo}</div>{selected && <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-lg"><Check className="h-5 w-5" /></div>}</div>
          <div className="p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-600">Kelas {candidate.grade} · Calon nomor {candidate.candidateNo}</p><h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{candidate.name}</h3>{onSelect && <p className="mt-2 text-xs text-slate-500">{blocked ? "Sudah dipilih untuk jabatan pasangannya." : selected ? "Kandidat ini dipilih." : "Klik kartu untuk memilih kandidat ini."}</p>}</div>
        </div>;
        return onSelect ? <button type="button" key={candidate.id} disabled={blocked} onClick={() => onSelect(candidate.id)} className="block w-full text-left disabled:cursor-not-allowed">{card}</button> : <div key={`${candidate.id}-${index}`}>{card}</div>;
      })}
    </div>
  );
}

function Toast({ feedback }: { feedback: { type: "success" | "error"; text: string } }) {
  return <div role="status" className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}><span className="mt-0.5">{feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}</span>{feedback.text}</div>;
}