import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Eye, FileText, LoaderCircle, RefreshCw, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { apiFetch } from "../utils/navigation";

type Theme = "light" | "dark";
type Status = "BARU" | "DITINJAU" | "SELESAI" | "DITOLAK";
type Submission = {
  id: string;
  formKey: string;
  studentNis: string;
  studentName: string;
  studentClass: string;
  guardianName: string;
  guardianRelationship: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
};
type SubmissionDetail = Submission & {
  data: Record<string, string | string[]>;
  adminNote: string | null;
  reviewedAt: string | null;
};
type Overview = {
  settings: { formIsianAbkEnabled: boolean };
  submissions: Submission[];
  total: number;
  newCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
type ApiResult<T> = { success?: boolean; data?: T; error?: { message?: string } };

const TOKEN_KEY = "smkn1_adm_token";
const statuses: { value: Status; label: string }[] = [
  { value: "BARU", label: "Baru" },
  { value: "DITINJAU", label: "Ditinjau" },
  { value: "SELESAI", label: "Selesai" },
  { value: "DITOLAK", label: "Tidak ditindaklanjuti" },
];
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—";
const titleCase = (value: string) => value
  .replace(/^profile-/, "Profil · ")
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .replace(/[-_]/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

async function requestData<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({})) as ApiResult<T>;
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
    throw new Error("Sesi admin telah berakhir. Silakan login kembali.");
  }
  if (!response.ok || !result.success || result.data === undefined) {
    throw new Error(result.error?.message || "Permintaan Pusat Form belum berhasil.");
  }
  return result.data;
}

export default function AdminPusatForm({ theme = "dark" }: { theme?: Theme }) {
  const dark = theme === "dark";
  const card = dark ? "border-white/10 bg-slate-900/70" : "border-slate-200 bg-white";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<SubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [statusDraft, setStatusDraft] = useState<Status>("BARU");
  const [noteDraft, setNoteDraft] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadOverview = useCallback(async (nextPage = page, nextSearch = search) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(nextPage), pageSize: "25" });
      if (nextSearch) params.set("search", nextSearch);
      const data = await requestData<Overview>(`/api/pusat-form/admin/overview?${params}`);
      setOverview(data);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data Pusat Form belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { void loadOverview(1, ""); }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelected(null);
    setError("");
    try {
      const detail = await requestData<SubmissionDetail>(`/api/pusat-form/admin/submissions/${id}`);
      setSelected(detail);
      setStatusDraft(detail.status);
      setNoteDraft(detail.adminNote || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detail pengajuan belum dapat dimuat.");
    } finally {
      setDetailLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!overview) return;
    setSavingSettings(true);
    setError("");
    try {
      const settings = await requestData<Overview["settings"]>("/api/pusat-form/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ formIsianAbkEnabled: !overview.settings.formIsianAbkEnabled }),
      });
      setOverview((current) => current ? { ...current, settings } : current);
      setNotice(settings.formIsianAbkEnabled ? "Form Isian ABK dibuka untuk pengisian." : "Form Isian ABK ditutup untuk pengisian baru.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pengaturan formulir belum tersimpan.");
    } finally {
      setSavingSettings(false);
    }
  };

  const saveDetail = async () => {
    if (!selected) return;
    setSavingDetail(true);
    setError("");
    try {
      const updated = await requestData<SubmissionDetail>(`/api/pusat-form/admin/submissions/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusDraft, adminNote: noteDraft }),
      });
      setSelected(updated);
      setStatusDraft(updated.status);
      setNoteDraft(updated.adminNote || "");
      setNotice("Status dan catatan pengajuan berhasil disimpan.");
      await loadOverview(page, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Perubahan pengajuan belum tersimpan.");
    } finally {
      setSavingDetail(false);
    }
  };

  const deleteSubmission = async (item: Submission) => {
    if (!window.confirm(`Hapus pengajuan ${item.studentName} (${item.studentNis})? Data jawaban akan dihapus permanen.`)) return;
    setDeletingId(item.id);
    setError("");
    try {
      await requestData<{ deleted?: boolean }>(`/api/pusat-form/admin/submissions/${item.id}`, { method: "DELETE" });
      if (selected?.id === item.id) setSelected(null);
      setNotice("Pengajuan berhasil dihapus.");
      await loadOverview(page, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pengajuan belum dapat dihapus.");
    } finally {
      setDeletingId("");
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = searchDraft.trim();
    setSearch(next);
    setPage(1);
    void loadOverview(1, next);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-amber-500">Modul Backend</p>
          <h1 className="mt-1 text-2xl font-extrabold">PUSAT FORM</h1>
          <p className={`mt-2 max-w-3xl text-sm leading-6 ${muted}`}>Atur ketersediaan formulir dan tindak lanjuti pengajuan yang tersimpan. Jawaban ABK hanya ditampilkan pada panel admin.</p>
        </div>
        <button type="button" onClick={() => void loadOverview(page, search)} disabled={loading} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold ${card} disabled:opacity-50`}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Muat ulang
        </button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{notice}<button type="button" className="ml-auto" onClick={() => setNotice("")} aria-label="Tutup pemberitahuan"><X size={15} /></button></div>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,.75fr)]">
        <article className={`rounded-2xl border p-5 sm:p-6 ${card}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500"><FileText size={19} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold">Form Isian ABK</h2>
              <p className={`mt-1 text-sm ${muted}`}>Profil dan kebutuhan dukungan peserta didik</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${overview?.settings.formIsianAbkEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"}`}>
              {overview?.settings.formIsianAbkEnabled ? "Menerima isian" : "Ditutup"}
            </span>
          </div>
          <div className="mt-5 flex flex-col gap-4 border-t border-current/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className={`max-w-xl text-xs leading-5 ${muted}`}>Menutup formulir mencegah pengajuan baru. Data yang sudah diterima tetap tersimpan dan dapat dikelola di bawah.</p>
            <button type="button" onClick={() => void saveSettings()} disabled={!overview || savingSettings} className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold disabled:opacity-50 ${overview?.settings.formIsianAbkEnabled ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500 text-white"}`}>
              {savingSettings && <LoaderCircle size={15} className="animate-spin" />}
              {overview?.settings.formIsianAbkEnabled ? "Tutup penerimaan" : "Buka penerimaan"}
            </button>
          </div>
        </article>
        <article className={`grid grid-cols-2 gap-3 rounded-2xl border p-5 sm:p-6 ${card}`}>
          <div className="col-span-2 flex items-center gap-2 text-sm font-bold"><ClipboardList size={17} className="text-amber-500" /> Ringkasan pengajuan</div>
          <div className="rounded-xl bg-current/[.04] p-4"><p className={`text-xs ${muted}`}>Jumlah hasil</p><p className="mt-1 text-2xl font-extrabold">{loading ? "…" : overview?.total ?? 0}</p></div>
          <div className="rounded-xl bg-current/[.04] p-4"><p className={`text-xs ${muted}`}>Belum ditinjau</p><p className="mt-1 text-2xl font-extrabold text-amber-500">{loading ? "…" : overview?.newCount ?? 0}</p></div>
        </article>
      </div>

      <article className={`overflow-hidden rounded-2xl border ${card}`}>
        <div className="flex flex-col gap-3 border-b border-current/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><h2 className="text-lg font-extrabold">Pengajuan masuk</h2><p className={`mt-1 text-xs ${muted}`}>Maksimal 25 baris per halaman. Buka detail untuk membaca jawaban dan memperbarui status.</p></div>
          <form onSubmit={submitSearch} className="flex gap-2">
            <label className="relative">
              <span className="sr-only">Cari nama, NIS, atau orang tua/wali</span>
              <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
              <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Cari nama, NIS, wali…" className={`min-h-10 w-full rounded-xl border bg-transparent pl-9 pr-3 text-sm outline-none focus:border-amber-500 sm:w-64 ${dark ? "border-white/10" : "border-slate-200"}`} />
            </label>
            <button className="min-h-10 rounded-xl bg-amber-500 px-4 text-sm font-extrabold text-slate-950">Cari</button>
          </form>
        </div>

        {loading ? (
          <div className={`flex min-h-40 items-center justify-center gap-2 text-sm ${muted}`}><LoaderCircle size={17} className="animate-spin" /> Memuat pengajuan…</div>
        ) : overview?.submissions.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className={`text-xs ${muted}`}><tr className="border-b border-current/10"><th className="px-5 py-3 font-bold">Peserta didik</th><th className="px-5 py-3 font-bold">Orang tua/wali</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 font-bold">Dikirim</th><th className="px-5 py-3 text-right font-bold">Aksi</th></tr></thead>
                <tbody className="divide-y divide-current/5">
                  {overview.submissions.map((item) => (
                    <tr key={item.id} className="align-middle">
                      <td className="px-5 py-4"><p className="font-bold">{item.studentName}</p><p className={`mt-1 text-xs ${muted}`}>NIS {item.studentNis || "—"}{item.studentClass ? ` · ${item.studentClass}` : ""}</p></td>
                      <td className="px-5 py-4"><p>{item.guardianName}</p><p className={`mt-1 text-xs ${muted}`}>{item.guardianRelationship || "—"}</p></td>
                      <td className="px-5 py-4"><span className="rounded-full bg-current/[.06] px-2.5 py-1 text-xs font-bold">{statuses.find((status) => status.value === item.status)?.label || item.status}</span></td>
                      <td className={`px-5 py-4 text-xs ${muted}`}>{dateTime(item.createdAt)}</td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2">
                        <button type="button" aria-label={`Lihat pengajuan ${item.studentName}`} onClick={() => void openDetail(item.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-current/10 px-3 text-xs font-bold hover:bg-current/5"><Eye size={14} /> Detail</button>
                        <button type="button" aria-label={`Hapus pengajuan ${item.studentName}`} disabled={deletingId === item.id} onClick={() => void deleteSubmission(item)} className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-500/20 px-3 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"><Trash2 size={14} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`flex flex-col gap-2 border-t border-current/10 px-5 py-4 text-xs sm:flex-row sm:items-center sm:justify-between ${muted}`}>
              <span>{overview.total} pengajuan · halaman {overview.page} dari {overview.totalPages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={overview.page <= 1} onClick={() => void loadOverview(overview.page - 1, search)} className={`inline-flex min-h-9 items-center gap-1 rounded-lg border border-current/10 px-3 font-bold disabled:opacity-40 ${dark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}><ChevronLeft size={15} /> Sebelumnya</button>
                <button type="button" disabled={overview.page >= overview.totalPages} onClick={() => void loadOverview(overview.page + 1, search)} className={`inline-flex min-h-9 items-center gap-1 rounded-lg border border-current/10 px-3 font-bold disabled:opacity-40 ${dark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>Berikutnya <ChevronRight size={15} /></button>
              </div>
            </div>
          </>
        ) : (
          <div className={`flex min-h-48 flex-col items-center justify-center p-8 text-center ${muted}`}><ClipboardList size={28} className="mb-3 opacity-50" /><p className="font-bold">{search ? "Tidak ada hasil yang cocok." : "Belum ada pengajuan."}</p><p className="mt-1 text-xs">Pengajuan yang dikirim melalui formulir publik akan tampil di sini.</p></div>
        )}
      </article>

      {(detailLoading || selected) && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-950/70 px-3 py-6 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelected(null); setDetailLoading(false); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="pusat-form-detail-title" className={`max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl ${dark ? "border-white/10 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
            {detailLoading ? <div className={`flex min-h-64 items-center justify-center gap-2 ${muted}`}><LoaderCircle size={18} className="animate-spin" /> Memuat jawaban…</div> : selected && (
              <>
                <header className="flex items-start justify-between gap-4 border-b border-current/10 p-5 sm:p-6">
                  <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-amber-500">Detail pengajuan ABK</p><h2 id="pusat-form-detail-title" className="mt-1 text-xl font-extrabold">{selected.studentName}</h2><p className={`mt-1 text-xs ${muted}`}>NIS {selected.studentNis || "—"} · {dateTime(selected.createdAt)}</p></div>
                  <button type="button" onClick={() => setSelected(null)} aria-label="Tutup detail" className="rounded-lg p-2 hover:bg-current/5"><X size={18} /></button>
                </header>
                <div className="max-h-[calc(92vh-82px)] overflow-y-auto p-5 sm:p-6">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-5">
                      {[
                        ["Peserta didik", selected.studentName, selected.studentNis, selected.studentClass],
                        ["Orang tua/wali", selected.guardianName, selected.guardianRelationship],
                      ].map(([heading, ...values]) => <section key={heading} className={`rounded-xl border p-4 ${dark ? "border-white/10 bg-white/[.02]" : "border-slate-200 bg-slate-50"}`}><h3 className="mb-2 text-sm font-extrabold">{heading}</h3>{values.filter(Boolean).map((value) => <p key={value} className={`text-sm leading-6 ${muted}`}>{value}</p>)}</section>)}
                      <section><h3 className="mb-3 text-sm font-extrabold">Jawaban formulir</h3><dl className="space-y-3">{Object.entries(selected.data || {}).map(([key, rawValue]) => {
                        if (["studentNis", "studentName", "studentClass", "guardianName", "guardianRelationship"].includes(key)) return null;
                        const value = Array.isArray(rawValue) ? rawValue.join(", ") : rawValue || "—";
                        return <div key={key} className={`grid gap-1 border-b border-current/5 pb-3 sm:grid-cols-[220px_1fr] sm:gap-4`}><dt className={`text-xs font-bold ${muted}`}>{titleCase(key)}</dt><dd className="whitespace-pre-wrap break-words text-sm leading-6">{value}</dd></div>;
                      })}</dl></section>
                    </div>
                    <aside className="h-fit space-y-4 rounded-xl border border-current/10 p-4">
                      <div className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-amber-500" /> Tindak lanjut admin</div>
                      <label className="block text-xs font-bold">Status
                        <select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as Status)} className={`mt-2 w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm ${dark ? "border-white/10" : "border-slate-200"}`}>
                          {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-bold">Catatan internal
                        <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={6} maxLength={5000} placeholder="Catatan tindak lanjut (hanya untuk admin)" className={`mt-2 w-full resize-y rounded-lg border bg-transparent px-3 py-2.5 text-sm font-normal outline-none focus:border-amber-500 ${dark ? "border-white/10" : "border-slate-200"}`} />
                      </label>
                      <button type="button" onClick={() => void saveDetail()} disabled={savingDetail} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-extrabold text-slate-950 disabled:opacity-50">{savingDetail && <LoaderCircle size={15} className="animate-spin" />} Simpan tindak lanjut</button>
                      <p className={`text-[11px] leading-5 ${muted}`}>Data ini dapat berisi informasi pribadi sensitif. Batasi akses dan jangan salin ke kanal publik.</p>
                    </aside>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
