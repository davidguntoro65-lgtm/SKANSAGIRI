import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, GraduationCap, KeyRound, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { navigate } from "../utils/navigation";

type Student = {
  id: string;
  nis: string | null;
  nisn: string;
  fullName: string;
  email: string | null;
  phone: string | null;
};

type CoreUser = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  student: Student | null;
};

const TOKEN_KEY = "smkn1_core_token";

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function inputClass() {
  return "mt-2 w-full rounded-xl border border-white/10 bg-white/[.06] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20";
}

export default function SiswaPortal() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(token()));
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<CoreUser | null>(null);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPasswordOffer, setShowPasswordOffer] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const session = async () => {
    const response = await fetch("/api/v1/auth/session", { headers: { Authorization: `Bearer ${token()}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      localStorage.removeItem(TOKEN_KEY);
      setLoggedIn(false);
      return;
    }
    const nextUser = payload.data?.user as CoreUser;
    if (!nextUser.roles?.includes("SISWA")) {
      localStorage.removeItem(TOKEN_KEY);
      setLoggedIn(false);
      setLoginError("Akun ini bukan akun siswa.");
      return;
    }
    setUser(nextUser);
  };

  useEffect(() => {
    if (loggedIn) void session();
  }, [loggedIn]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setLoading(true);
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
      setLoggedIn(true);
      setShowPasswordOffer(Boolean(payload.data.passwordChangeOffer));
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setNotice({ type: "error", text: "Password baru minimal 8 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ type: "error", text: "Konfirmasi password belum sama." });
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password, newPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Password gagal diubah.");
      setPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordOffer(false);
      setNotice({ type: "success", text: "Password berhasil diubah. Gunakan password baru pada login berikutnya." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Password gagal diubah." });
    } finally {
      setPasswordBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token()}` } }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setLoggedIn(false);
    setShowPasswordOffer(false);
  };

  if (!loggedIn || !user) {
    return (
      <main className="min-h-screen bg-[#07111f] px-5 py-12 text-white">
        <div className="pointer-events-none fixed inset-0 opacity-70" style={{ background: "radial-gradient(circle at 15% 15%, rgba(245,158,11,.17), transparent 32%), radial-gradient(circle at 85% 80%, rgba(14,165,233,.15), transparent 35%)" }} />
        <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center">
          <form onSubmit={login} className="w-full rounded-[30px] border border-white/10 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="mb-9 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400"><GraduationCap className="h-6 w-6 text-slate-950" /></div>
              <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-400">SMKN 1 Wonogiri</p><p className="font-bold">Portal Siswa</p></div>
            </div>
            <p className="text-xs font-black uppercase tracking-[.24em] text-amber-400">Core identity</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Masuk ke ruang belajar</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/55">Gunakan NIS, NISN, atau email yang diberikan sekolah.</p>
            <label className="mt-8 block text-xs font-bold text-white/75">NIS / NISN / Email<input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className={inputClass()} autoComplete="username" placeholder="Contoh: 12345 atau 0098765432" /></label>
            <label className="mt-4 block text-xs font-bold text-white/75">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass()} autoComplete="current-password" /></label>
            {loginError && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200">{loginError}</p>}
            <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"><LogIn className="h-4 w-4" />{loading ? "Memeriksa..." : "Masuk ke portal"}</button>
            <button type="button" onClick={() => navigate("/")} className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-white/50 transition hover:text-white">Kembali ke portal publik <ArrowRight className="h-4 w-4" /></button>
          </form>
        </div>
      </main>
    );
  }

  const student = user.student;
  return (
    <main className="min-h-screen bg-[#07111f] px-5 py-7 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400"><GraduationCap className="h-5 w-5 text-slate-950" /></div><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-400">SMKN 1 Wonogiri</p><h1 className="font-black">Portal Siswa</h1></div></div>
          <button onClick={logout} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-white/70 transition hover:text-white"><LogOut className="h-4 w-4" />Keluar</button>
        </header>
        {notice && <div role="status" className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-rose-400/20 bg-rose-400/10 text-rose-200" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"}`}>{notice.text}</div>}
        <section className="mt-9 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[.045] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[.22em] text-amber-400">Selamat datang</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{student?.fullName || user.fullName}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">Akun siswa Anda sudah aktif. Modul dan aktivitas belajar yang tersedia akan muncul di ruang belajar ini sesuai enrollment sekolah.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="text-[10px] uppercase tracking-widest text-white/40">NIS</p><p className="mt-1 font-bold">{student?.nis || "-"}</p></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="text-[10px] uppercase tracking-widest text-white/40">NISN</p><p className="mt-1 font-bold">{student?.nisn || "-"}</p></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="text-[10px] uppercase tracking-widest text-white/40">No. telepon</p><p className="mt-1 font-bold">{student?.phone || "-"}</p></div>
            </div>
          </div>
          <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/[.08] p-6 sm:p-8">
            <ShieldCheck className="h-7 w-7 text-amber-400" />
            <h3 className="mt-4 text-xl font-black">Akun terlindungi</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">Jangan bagikan password kepada orang lain. Anda dapat menggantinya kapan saja dari panel keamanan.</p>
            <button onClick={() => setShowPasswordOffer(true)} className="mt-5 flex items-center gap-2 text-sm font-black text-amber-400 hover:text-amber-300">Ubah password <ArrowRight className="h-4 w-4" /></button>
          </div>
        </section>
        {showPasswordOffer && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-5 backdrop-blur-sm">
          <form onSubmit={changePassword} className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0d1829] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400"><KeyRound className="h-5 w-5 text-slate-950" /></div><div><h3 className="font-black">Ganti password?</h3><p className="text-xs text-white/50">Disarankan saat login pertama</p></div></div>
            <p className="mt-5 text-sm leading-relaxed text-white/65">Password awal diberikan sekolah. Anda boleh menggantinya sekarang atau melewati langkah ini.</p>
            <label className="mt-5 block text-xs font-bold text-white/75">Password baru<input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass()} autoComplete="new-password" /></label>
            <label className="mt-4 block text-xs font-bold text-white/75">Konfirmasi password<input required minLength={8} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass()} autoComplete="new-password" /></label>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowPasswordOffer(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/60 hover:text-white">Lewati</button><button disabled={passwordBusy} className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{passwordBusy ? "Menyimpan..." : "Ubah password"} <CheckCircle2 className="h-4 w-4" /></button></div>
          </form>
        </div>}
        <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[.035] p-6 sm:p-8">
          <div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-amber-400" /><div><h3 className="font-black">Ruang belajar</h3><p className="text-sm text-white/45">Belum ada modul belajar yang dipublikasikan untuk akun ini.</p></div></div>
        </section>
      </div>
    </main>
  );
}