import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown,
  ChevronLeft, ClipboardList, FileText, FolderArchive, GraduationCap, Landmark, Menu, Search,
  Send, ShieldCheck, Upload, X,
} from "lucide-react";
import { apiFetch, apiPath, getAppPath, navigate } from "../utils/navigation";
import { useBranding } from "../hooks/useBranding";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type DocumentType = "MATERIAL" | "LKPD";
type Training = {
  id: string; title: string; slug: string; summary: string; description: string; category?: string | null;
  period?: string | null; year?: number | string | null; status: Status; acceptsSubmissions: boolean;
  archiveVisible: boolean; sortOrder: number; counts: { materials: number; lkpd: number; taskTypes: number; submissions: number };
  photos?: Array<{ id: string; sortOrder: number; fileName: string; mimeType: string; sizeBytes: number; url: string }>;
  coverPhotoUrl?: string | null;
  createdAt: string; updatedAt: string;
};
type DocumentItem = {
  id: string; trainingId: string; type: DocumentType; title: string; description?: string | null;
  category?: string | null; driveFileName: string; mimeType?: string | null; sizeBytes?: number | null;
  downloadUrl?: string | null; sortOrder: number; status: Status; createdAt: string;
};
type TaskType = {
  id: string; trainingId: string; name: string; description?: string | null; sortOrder: number;
  active: boolean; deadline?: string | null; maxFileSizeMb?: number | null; allowedMimeTypes?: string[] | null;
};
type SubmissionReceipt = {
  reference: string; trainingName: string; taskName: string; fullName: string; nip?: string | null;
  institution: string; fileName: string; submittedAt: string; status: string; driveUrl?: string | null;
  secureFileUrl?: string | null; fileAccess: "PRIVATE" | "LINK"; duplicate?: boolean;
};
type Envelope<T> = { success: boolean; data?: T; error?: { message?: string } };
type PageData<T> = { items: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
type DocumentFilters = { trainings: Array<{ id: string; title: string }>; categories: string[] };

const root = "/pusat-diklat";
const PAGE_SIZE = 6;
const fmtDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "";
const formatBytes = (bytes?: number | null) => {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};
const newIdempotencyKey = () => typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function requestData<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(url, init);
  const payload = await response.json().catch(() => ({})) as Envelope<T>;
  if (!response.ok || payload.success === false) throw new Error(payload.error?.message || "Permintaan belum dapat diproses. Silakan coba kembali.");
  if (!payload.data) throw new Error("Data dari server belum tersedia.");
  return payload.data;
}

function useLocation() {
  const [path, setPath] = useState(() => getAppPath());
  useEffect(() => {
    const sync = () => setPath(getAppPath());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return path;
}

function Pill({ children, tint = "slate" }: { children: React.ReactNode; tint?: "slate" | "blue" | "green" | "gold" }) {
  const colors = {
    slate: "bg-[#e9edf2] text-[#526174]", blue: "bg-[#e4edf6] text-[#264f78]",
    green: "bg-[#e5f1eb] text-[#31684a]", gold: "bg-[#f4eddc] text-[#80622b]",
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${colors[tint]}`}>{children}</span>;
}

function PublicHeader({ active }: { active: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { getLogo } = useBranding();
  const logoUrl = getLogo("light");
  const links = [
    { label: "Beranda", href: root, id: "home" },
    { label: "Materi & LKPD", href: `${root}?tab=materi`, id: "materials" },
    { label: "Arsip diklat", href: `${root}/arsip`, id: "archive" },
  ];
  return <header className="relative z-20 border-b border-[#d7e6f4]/80 bg-white/80 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
      <button onClick={() => navigate(root)} className="group flex items-center gap-3 text-left" aria-label="Kembali ke beranda Pusat Diklat">
        {logoUrl ? (
          <>
            <img
              src={logoUrl}
              alt="SMKN 1 Wonogiri"
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105 md:h-12"
            />
            <span className="text-sm font-extrabold tracking-tight text-[#153651]">Pusat Diklat</span>
          </>
        ) : (
          <>
            <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/10 transition-transform duration-300 group-hover:scale-105">
              <Landmark className="h-5.5 w-5.5 text-slate-950" strokeWidth={2} />
              <span className="absolute inset-0 rounded-lg border border-white/30" />
            </span>
            <span className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[.19em] text-[#59758f]">SMKN 1 Wonogiri</span>
              <span className="mt-0.5 text-sm font-extrabold tracking-tight text-[#153651]">Pusat Diklat</span>
            </span>
          </>
        )}
      </button>
      <button className="inline-flex items-center justify-center rounded-xl p-2 text-[#24445e] md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? "Tutup menu" : "Buka menu"}>
        {menuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
      <nav className={`${menuOpen ? "absolute left-0 right-0 top-full flex flex-col border-b border-[#d7e6f4] bg-white/95 p-4 shadow-lg backdrop-blur-xl" : "hidden"} gap-1 md:static md:flex md:flex-row md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none`} aria-label="Navigasi utama">
        {links.map(link => <button key={link.id} onClick={() => { navigate(link.href); setMenuOpen(false); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active === link.id ? "bg-[#e1efff] text-[#194f80]" : "text-[#526b82] hover:bg-[#edf6ff] hover:text-[#194f80]"}`}>{link.label}</button>)}
        <button onClick={() => { navigate(`${root}?tab=jelajahi`); setMenuOpen(false); }} className="diklat-nav-cta ml-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2868a3] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d568b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2868a3]">Jelajahi diklat <ArrowRight size={15} /></button>
      </nav>
    </div>
  </header>;
}

function LoadingRows() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Memuat data" aria-busy="true">
    {[0, 1, 2].map(item => <div key={item} className="animate-pulse rounded-2xl border border-[#e2e7e9] bg-white p-6">
      <div className="h-3 w-24 rounded bg-[#e8edf0]" /><div className="mt-5 h-5 w-4/5 rounded bg-[#e8edf0]" /><div className="mt-3 h-3 w-full rounded bg-[#edf1f3]" /><div className="mt-2 h-3 w-3/4 rounded bg-[#edf1f3]" /><div className="mt-7 h-9 w-28 rounded-lg bg-[#e8edf0]" />
    </div>)}
  </div>;
}

function Notice({ title, message, retry }: { title: string; message: string; retry?: () => void }) {
  return <div className="rounded-2xl border border-[#e6d8bd] bg-[#fbf6eb] p-5 text-[#604e32]" role="alert">
    <p className="font-bold">{title}</p><p className="mt-1 text-sm leading-6">{message}</p>
    {retry && <button onClick={retry} className="mt-3 text-sm font-bold underline underline-offset-4">Coba muat kembali</button>}
  </div>;
}

function TrainingCard({ item, archive = false }: { item: Training; archive?: boolean }) {
  return <article className="group flex min-h-[245px] flex-col rounded-[20px] border border-[#dfe5e7] bg-[#fffefa] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#b8c7d0] hover:shadow-[0_16px_34px_-24px_rgba(26,53,74,.35)] sm:p-6">
    <div className="flex items-start justify-between gap-3"><Pill tint={archive ? "slate" : item.category ? "blue" : "gold"}>{archive ? "Arsip" : item.category || "Program diklat"}</Pill>
      {item.period && <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#7b8790]"><CalendarDays size={13} />{item.period}</span>}</div>
    {item.coverPhotoUrl && <div className="mt-4 aspect-[16/8] overflow-hidden rounded-xl bg-[#edf2f2]"><img src={apiPath(item.coverPhotoUrl)} alt={`Banner ${item.title}`} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /></div>}
    <h3 className="mt-5 text-lg font-extrabold leading-snug tracking-[-.02em] text-[#183650]">{item.title}</h3>
    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#667582]">{item.summary || item.description || "Informasi dan bahan pembelajaran kegiatan diklat."}</p>
    <div className="mt-auto flex items-center justify-between border-t border-[#edf0f0] pt-4">
      <span className="text-xs font-medium text-[#77858e]">{[item.year, item.counts?.materials ? `${item.counts.materials} materi` : null, item.counts?.lkpd ? `${item.counts.lkpd} LKPD` : null].filter(Boolean).join(" · ")}</span>
      <button onClick={() => navigate(`${root}/diklat/${encodeURIComponent(item.slug)}`)} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#315b78] transition group-hover:text-[#a47a2d]">Lihat detail <ArrowRight size={15} /></button>
    </div>
  </article>;
}

function DocumentRow({ item }: { item: DocumentItem }) {
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloadError("");
    if (!item.downloadUrl) { setDownloadError("Tautan unduhan belum tersedia untuk dokumen ini."); return; }
    setDownloading(true);
    try {
      const response = await apiFetch(apiPath(item.downloadUrl));
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as Envelope<unknown>;
        throw new Error(payload.error?.message || "Dokumen belum dapat diunduh.");
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = item.driveFileName || item.title;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Dokumen belum dapat diunduh.");
    } finally {
      setDownloading(false);
    }
  };
  return <article className="flex flex-col gap-4 border-b border-[#e7ebea] py-5 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center">
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.type === "LKPD" ? "bg-[#f2ecd9] text-[#856a30]" : "bg-[#e5edf1] text-[#365d78]"}`}><FileText size={19} /></span>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#203c53]">{item.title}</h3><Pill tint={item.type === "LKPD" ? "gold" : "blue"}>{item.type === "LKPD" ? "LKPD" : "Materi"}</Pill></div>
      {item.description && <p className="mt-1 text-sm leading-6 text-[#71808b]">{item.description}</p>}
      <p className="mt-1 text-xs text-[#89939a]">{[item.category, item.driveFileName, formatBytes(item.sizeBytes)].filter(Boolean).join(" · ")}</p>
      {downloadError && <p role="alert" className="mt-2 text-xs text-[#9b493d]">{downloadError}</p>}
    </div>
    <button disabled={downloading} onClick={() => void download()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#dce4e6] px-4 py-2.5 text-sm font-bold text-[#315b78] transition hover:border-[#315b78] hover:bg-[#f2f6f7] disabled:cursor-wait disabled:opacity-60"><ArrowDownToLine size={16} /> {downloading ? "Menyiapkan…" : "Unduh"}</button>
  </article>;
}

export default function PusatDiklat() {
  const path = useLocation();
  const [overview, setOverview] = useState<{ settings: { title: string; description: string; archiveVisible: boolean; submissionsEnabled: boolean }; stats: { publishedTrainings: number; materials: number; lkpd: number; submissions: number }; featured: Training[] } | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [trainingPage, setTrainingPage] = useState<PageData<Training>["pagination"] | null>(null);
  const [trainingsLoading, setTrainingsLoading] = useState(false);
  const [trainingsError, setTrainingsError] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentPage, setDocumentPage] = useState<PageData<DocumentItem>["pagination"] | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");
  const [training, setTraining] = useState<(Training & { documents: DocumentItem[]; taskTypes: TaskType[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRetryKey, setDetailRetryKey] = useState(0);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [documentTrainingId, setDocumentTrainingId] = useState("");
  const [documentCategory, setDocumentCategory] = useState("");
  const [documentFilters, setDocumentFilters] = useState<DocumentFilters>({ trainings: [], categories: [] });
  const [documentFiltersError, setDocumentFiltersError] = useState("");
  const [listPage, setListPage] = useState(1);
  const [docListPage, setDocListPage] = useState(1);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [submissionForm, setSubmissionForm] = useState({ fullName: "", nip: "", institution: "" });
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [submissionError, setSubmissionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const currentUrl = useMemo(() => new URL(window.location.href), [path]);
  const currentPath = useMemo(() => getAppPath(), [path]);
  const isArchive = currentPath === `${root}/arsip`;
  const detailSlug = currentPath.startsWith(`${root}/diklat/`) ? decodeURIComponent(currentPath.slice(`${root}/diklat/`.length)) : "";
  const activeTab = currentUrl.searchParams.get("tab") || "";
  const isDocumentPage = activeTab === "materi" || activeTab === "lkpd";
  const showTrainingList = activeTab === "jelajahi" || isArchive;
  const showingSubmission = currentUrl.searchParams.get("kirim") === "1";
  const trainingStatus = isArchive ? "ARCHIVED" : "PUBLISHED";

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true); setOverviewError("");
    try { setOverview(await requestData("/api/v1/diklat/public/overview")); }
    catch (error) { setOverviewError(error instanceof Error ? error.message : "Ringkasan portal tidak dapat dimuat."); }
    finally { setOverviewLoading(false); }
  }, []);
  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const loadTrainings = useCallback(async () => {
    if (!showTrainingList) return;
    setTrainingsLoading(true); setTrainingsError("");
    const params = new URLSearchParams({ status: trainingStatus, q: search, year, page: String(listPage), pageSize: String(PAGE_SIZE) });
    try {
      const data = await requestData<PageData<Training>>(`/api/v1/diklat/public/trainings?${params}`);
      setTrainings(data.items || []); setTrainingPage(data.pagination);
    } catch (error) { setTrainingsError(error instanceof Error ? error.message : "Daftar diklat tidak dapat dimuat."); }
    finally { setTrainingsLoading(false); }
  }, [listPage, search, showTrainingList, trainingStatus, year]);
  useEffect(() => { void loadTrainings(); }, [loadTrainings]);

  const loadDocuments = useCallback(async () => {
    if (!isDocumentPage) return;
    setDocsLoading(true); setDocsError("");
    const params = new URLSearchParams({ type: activeTab === "lkpd" ? "LKPD" : "MATERIAL", q: docQuery, page: String(docListPage), pageSize: "8" });
    if (documentTrainingId) params.set("trainingId", documentTrainingId);
    if (documentCategory) params.set("category", documentCategory);
    try {
      const data = await requestData<PageData<DocumentItem>>(`/api/v1/diklat/public/documents?${params}`);
      setDocuments(data.items || []); setDocumentPage(data.pagination);
    } catch (error) { setDocsError(error instanceof Error ? error.message : "Dokumen tidak dapat dimuat."); }
    finally { setDocsLoading(false); }
  }, [activeTab, docListPage, docQuery, documentCategory, documentTrainingId, isDocumentPage]);
  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  useEffect(() => {
    if (!isDocumentPage) return;
    let alive = true;
    setDocumentFiltersError("");
    requestData<DocumentFilters>("/api/v1/diklat/public/documents/filters")
      .then(data => { if (alive) setDocumentFilters(data); })
      .catch(error => {
        if (alive) setDocumentFiltersError(error instanceof Error ? error.message : "Pilihan filter dokumen tidak dapat dimuat.");
      });
    return () => { alive = false; };
  }, [isDocumentPage]);

  useEffect(() => {
    if (!detailSlug) { setTraining(null); setDetailError(""); return; }
    let alive = true;
    setDetailLoading(true); setDetailError(""); setTraining(null); setReceipt(null);
    requestData<{ training: Training & { documents: DocumentItem[]; taskTypes: TaskType[] } }>(`/api/v1/diklat/public/trainings/${encodeURIComponent(detailSlug)}`)
      .then(data => { if (alive) setTraining(data.training); })
      .catch(error => { if (alive) setDetailError(error instanceof Error ? error.message : "Detail diklat tidak dapat dimuat."); })
      .finally(() => { if (alive) setDetailLoading(false); });
    return () => { alive = false; };
  }, [detailSlug, detailRetryKey]);

  useEffect(() => {
    const description = "Akses materi pembelajaran, unduh LKPD, dan kirim tugas diklat melalui Pusat Diklat SMKN 1 Wonogiri.";
    document.title = detailSlug && training?.title
      ? `${training.title} | Pusat Diklat SMKN 1 Wonogiri`
      : "Pusat Diklat SMKN 1 Wonogiri";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [detailSlug, training?.title]);

  useEffect(() => {
    if (training?.taskTypes?.length && !selectedTaskId) {
      const first = training.taskTypes.find(item => item.active);
      if (first) setSelectedTaskId(first.id);
    }
  }, [training, selectedTaskId]);

  const openSubmission = (slug?: string) => {
    if (!slug) { navigate(`${root}?tab=jelajahi`); return; }
    navigate(`${root}/diklat/${encodeURIComponent(slug)}?kirim=1`);
  };
  const submitWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!training || !selectedTaskId || !submissionFile || submitting) return;
    setSubmitting(true); setSubmissionError(""); setReceipt(null);
    const body = new FormData();
    body.append("trainingId", training.id);
    body.append("taskTypeId", selectedTaskId);
    body.append("fullName", submissionForm.fullName.trim());
    if (submissionForm.nip.trim()) body.append("nip", submissionForm.nip.trim());
    body.append("institution", submissionForm.institution.trim());
    body.append("file", submissionFile);
    body.append("idempotencyKey", idempotencyKey);
    try {
      const data = await requestData<{ submission: SubmissionReceipt }>("/api/v1/diklat/public/submissions", { method: "POST", body });
      setReceipt(data.submission);
    } catch (error) { setSubmissionError(error instanceof Error ? error.message : "Pengiriman belum berhasil. Silakan coba kembali."); }
    finally { setSubmitting(false); }
  };

  const visit = (destination: string) => { navigate(destination); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const documentItems = training?.documents || [];
  const materials = documentItems.filter(item => item.type === "MATERIAL");
  const lkpd = documentItems.filter(item => item.type === "LKPD");
  const activeTasks = training?.taskTypes?.filter(item => item.active) || [];
  const selectedTask = activeTasks.find(item => item.id === selectedTaskId);
  const formMode = showingSubmission;
  const overviewCards: Array<{ label: string; value: number | null; Icon: typeof GraduationCap }> = [
    { label: "Diklat terbit", value: overview?.stats.publishedTrainings ?? null, Icon: GraduationCap },
    { label: "Dokumen materi", value: overview?.stats.materials ?? null, Icon: BookOpen },
    { label: "LKPD tersedia", value: overview?.stats.lkpd ?? null, Icon: ClipboardList },
    { label: "Pengumpulan", value: overview?.stats.submissions ?? null, Icon: Send },
  ];

  return <div className="diklat-portal relative z-10 min-h-[100dvh] font-sans text-[#183650]">
    <PublicHeader active={isArchive ? "archive" : isDocumentPage ? "materials" : "home"} />
    <main className="mx-auto max-w-7xl px-5 pb-20 pt-7 sm:px-8 lg:pt-10">
      <div className="mb-7 flex items-center gap-2 text-xs font-medium text-[#82909a]"><button onClick={() => visit(root)} className="hover:text-[#294d69]">Pusat Diklat</button><span>/</span><span>{detailSlug ? (training?.title || "Detail diklat") : isArchive ? "Arsip" : isDocumentPage ? (activeTab === "lkpd" ? "LKPD" : "Materi") : showTrainingList ? "Jelajahi diklat" : "Beranda"}</span></div>

      {detailSlug ? <section>
        {detailLoading && <div className="mx-auto max-w-4xl animate-pulse rounded-[28px] border border-[#e1e7e8] bg-white p-8 sm:p-12" aria-busy="true"><div className="h-4 w-28 rounded bg-[#e7edef]" /><div className="mt-7 h-9 w-4/5 rounded bg-[#e7edef]" /><div className="mt-5 h-4 w-full rounded bg-[#eef1f2]" /><div className="mt-2 h-4 w-3/4 rounded bg-[#eef1f2]" /></div>}
        {!detailLoading && detailError && <div className="mx-auto max-w-4xl"><Notice title="Detail belum tersedia" message={detailError} retry={() => setDetailRetryKey(value => value + 1)} /></div>}
        {!detailLoading && training && <>
          <div className="diklat-blue-surface relative overflow-hidden rounded-[28px] border border-[#b8d5f1]/80">
            {training.coverPhotoUrl && <>
              <img src={apiPath(training.coverPhotoUrl)} alt="" aria-hidden="true" loading="eager" decoding="async" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover opacity-35" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#e8f2f8]/95 via-[#e5f0f8]/85 to-[#b8d5f1]/55" />
            </>}
            <div className="relative px-6 py-9 sm:px-10 sm:py-12 lg:px-14">
              <div className="diklat-hero-orbit diklat-hero-orbit--large pointer-events-none absolute right-[-40px] top-[-100px] h-[360px] w-[360px] rounded-full border" />
              <div className="diklat-hero-orbit diklat-hero-orbit--small pointer-events-none absolute right-[30px] top-[-28px] h-[260px] w-[260px] rounded-full border" />
              <div className="relative max-w-3xl"><button onClick={() => visit(root)} className="mb-7 inline-flex items-center gap-2 text-xs font-semibold text-[#315b78] hover:text-[#173653]"><ArrowLeft size={15} /> Kembali ke daftar</button>
                <div className="flex flex-wrap items-center gap-2"><Pill tint="gold">{training.category || "Diklat"}</Pill>{training.period && <span className="text-xs text-[#526f89]">{training.period}</span>}</div>
                <h1 className="diklat-detail-title mt-5 text-3xl font-extrabold leading-tight tracking-[-.04em] sm:text-5xl">{training.title}</h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#49657d] sm:text-base">{training.description || training.summary}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {training.acceptsSubmissions && <button onClick={() => openSubmission(training.slug)} className="inline-flex items-center gap-2 rounded-xl bg-[#e9cb83] px-5 py-3 text-sm font-extrabold text-[#203b52] transition hover:bg-[#f1d997]"><Send size={16} /> Kirim tugas</button>}
                  <button onClick={() => visit(`${root}?tab=materi`)} className="inline-flex items-center gap-2 rounded-xl border border-[#8eb6dc] bg-white/50 px-5 py-3 text-sm font-bold text-[#24577f] transition hover:bg-white/85"><BookOpen size={16} /> Jelajahi dokumen</button>
                </div>
              </div>
            </div>
          </div>
          {(training.photos?.length || 0) > 1 && <section className="mt-7">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#8b713e]">Dokumentasi kegiatan</p>
            <h2 className="mt-2 text-xl font-extrabold text-[#183650]">Foto diklat</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {training.photos!.slice(1).map(photo => <img key={photo.id} src={apiPath(photo.url)} alt={photo.fileName || `Foto ${training.title}`} loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-2xl border border-[#dfe5e7] bg-white object-cover" />)}
            </div>
          </section>}
          {formMode && <section id="form-kirim" className="mt-7 rounded-[24px] border border-[#dfe6e7] bg-[#fffefa] p-5 sm:p-8">
            {receipt ? <div className="mx-auto max-w-2xl py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f1eb] text-[#31684a]"><Check size={24} /></div>
              <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#668271]">Konfirmasi pengiriman</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#1b3a51]">Pengiriman tugas berhasil</h2>
               <p className="mt-2 text-sm leading-6 text-[#71808a]">{receipt.duplicate ? "Pengiriman sebelumnya ditemukan dan tidak dibuat ulang. Simpan nomor referensi berikut untuk pengecekan." : "Server telah mengonfirmasi penyimpanan file dan pencatatan tugas Anda. Simpan nomor referensi berikut untuk keperluan pengecekan."}</p>
              <div className="mt-6 grid gap-3 rounded-2xl bg-[#f2f5f2] p-5 sm:grid-cols-2">
                {[["Diklat", receipt.trainingName], ["Nama", receipt.fullName], ...(receipt.nip ? [["NIP", receipt.nip]] : []), ["Instansi", receipt.institution], ["Jenis tugas", receipt.taskName], ["Nama file", receipt.fileName], ["Waktu diterima", fmtDate(receipt.submittedAt)], ["Referensi", receipt.reference], ["Status", receipt.status]].map(([label, value]) => <div key={label}><p className="text-[10px] font-bold uppercase tracking-widest text-[#83918e]">{label}</p><p className="mt-1 break-words text-sm font-bold text-[#2b4a5b]">{value}</p></div>)}
              </div>
               <div className="mt-5 rounded-xl border border-[#e4e8e3] px-4 py-3 text-sm text-[#667770]"><span className="font-bold">Akses file: </span>{receipt.fileAccess === "LINK" && receipt.driveUrl ? "Tautan Google Drive individual aktif sesuai kebijakan penyelenggara." : receipt.secureFileUrl ? "File disimpan secara privat. Tautan ini hanya memberikan akses ke berkas pengiriman Anda." : "File disimpan secara privat. Akses file peserta belum tersedia pada konfigurasi server ini."}</div>
              {receipt.fileAccess === "LINK" && receipt.driveUrl && <a href={receipt.driveUrl} target="_blank" rel="noreferrer" className="diklat-on-blue mt-5 inline-flex items-center gap-2 rounded-xl bg-[#173653] px-5 py-3 text-sm font-bold text-white hover:bg-[#244d6b]"><ArrowDownToLine size={16} /> Lihat file di Google Drive</a>}
               {receipt.fileAccess === "PRIVATE" && receipt.secureFileUrl && <a href={apiPath(receipt.secureFileUrl)} className="diklat-on-blue mt-5 inline-flex items-center gap-2 rounded-xl bg-[#173653] px-5 py-3 text-sm font-bold text-white hover:bg-[#244d6b]"><ArrowDownToLine size={16} /> Unduh file yang dikirim</a>}
              <button onClick={() => { setReceipt(null); setSubmissionFile(null); setSubmissionForm({ fullName: "", nip: "", institution: "" }); setIdempotencyKey(newIdempotencyKey()); navigate(`${root}/diklat/${encodeURIComponent(training.slug)}`); }} className="mt-6 block text-sm font-bold text-[#42667c] underline underline-offset-4">Kembali ke detail diklat</button>
            </div> : <div className="mx-auto max-w-3xl">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#8b713e]">Pengumpulan karya</p><h2 className="mt-2 text-2xl font-extrabold text-[#1b3a51]">Kirim tugas diklat</h2><p className="mt-1 text-sm text-[#75828b]">Lengkapi data dan pilih berkas untuk diunggah.</p></div><button onClick={() => navigate(`${root}/diklat/${encodeURIComponent(training.slug)}`)} className="inline-flex items-center gap-1 text-sm font-semibold text-[#71808a] hover:text-[#244d6b]"><X size={15} /> Tutup</button></div>
               {submissionError && <div role="alert" className="mt-5 rounded-xl border border-[#e9c7bf] bg-[#fbefec] px-4 py-3 text-sm text-[#984c3f]">{submissionError}<p className="mt-1 text-xs">Data formulir dan berkas tetap ada di perangkat ini. Pengiriman belum dikonfirmasi; Anda dapat mencoba kembali.</p></div>}
              {!training.acceptsSubmissions && <div className="mt-5 rounded-xl border border-[#e8ddc2] bg-[#faf5e9] p-4 text-sm text-[#745e34]">Pengumpulan untuk diklat ini sedang ditutup.</div>}
              {training.acceptsSubmissions && <form className="mt-6" onSubmit={submitWork}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><label className="mb-1.5 block text-xs font-bold text-[#526574]">Jenis diklat</label><div className="rounded-xl border border-[#e0e6e7] bg-[#f4f6f4] px-4 py-3 text-sm font-semibold text-[#516773]">{training.title}</div></div>
                  <label className="text-xs font-bold text-[#526574]">Nama lengkap
                    <input required maxLength={120} autoComplete="name" value={submissionForm.fullName} onChange={event => setSubmissionForm({ ...submissionForm, fullName: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#dce4e5] bg-white px-4 py-3 text-sm font-medium text-[#203c53] outline-none focus:border-[#67859a] focus:ring-2 focus:ring-[#67859a]/15" placeholder="Nama sesuai identitas" />
                  </label>
                  <label className="text-xs font-bold text-[#526574]">NIP <span className="font-normal text-[#8b969c]">(opsional)</span>
                    <input maxLength={30} inputMode="numeric" value={submissionForm.nip} onChange={event => setSubmissionForm({ ...submissionForm, nip: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#dce4e5] bg-white px-4 py-3 text-sm font-medium text-[#203c53] outline-none focus:border-[#67859a] focus:ring-2 focus:ring-[#67859a]/15" placeholder="Nomor induk pegawai" />
                  </label>
                  <label className="text-xs font-bold text-[#526574]">Asal instansi
                    <input required maxLength={120} value={submissionForm.institution} onChange={event => setSubmissionForm({ ...submissionForm, institution: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#dce4e5] bg-white px-4 py-3 text-sm font-medium text-[#203c53] outline-none focus:border-[#67859a] focus:ring-2 focus:ring-[#67859a]/15" placeholder="Nama instansi" />
                  </label>
                  <label className="text-xs font-bold text-[#526574]">Jenis tugas
                    <select required value={selectedTaskId} onChange={event => setSelectedTaskId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dce4e5] bg-white px-4 py-3 text-sm font-medium text-[#203c53] outline-none focus:border-[#67859a]">
                      <option value="">Pilih jenis tugas</option>{activeTasks.map(task => <option key={task.id} value={task.id}>{task.name}</option>)}
                    </select>
                  </label>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-[#526574]">File tugas</label>
                    <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#bccbd0] bg-[#f8f9f6] px-5 py-7 text-center transition hover:border-[#66869a] hover:bg-[#f2f6f4]">
                      <Upload size={21} className="text-[#5b7889]" /><span className="mt-2 text-sm font-bold text-[#38576b]">{submissionFile?.name || "Pilih berkas tugas"}</span>
                      <span className="mt-1 text-xs text-[#839098]">{selectedTask?.maxFileSizeMb ? `Maksimal ${selectedTask.maxFileSizeMb} MB` : "Ukuran maksimum mengikuti ketentuan diklat"}{selectedTask?.allowedMimeTypes?.length ? ` · ${selectedTask.allowedMimeTypes.join(", ")}` : ""}</span>
                       <input required type="file" accept={selectedTask?.allowedMimeTypes?.join(",") || undefined} className="sr-only" onChange={event => setSubmissionFile(event.target.files?.[0] || null)} />
                    </label>
                    {selectedTask?.deadline && <p className="mt-2 text-xs text-[#7b8790]">Tenggat: {fmtDate(selectedTask.deadline)}</p>}
                  </div>
                </div>
                {!activeTasks.length && <div role="status" className="mt-4 rounded-xl border border-[#e8ddc2] bg-[#faf5e9] px-4 py-3 text-sm text-[#745e34]">Belum ada jenis tugas aktif untuk diklat ini. Pengumpulan belum tersedia.</div>}
                <button disabled={submitting || !activeTasks.length} className="diklat-on-blue mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#173653] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#244d6b] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{submitting ? "Mengirim berkas…" : <><Send size={16} /> Kirim tugas</>}</button>
                <p className="mt-3 max-w-xl text-xs leading-5 text-[#89949a]"><ShieldCheck size={13} className="mr-1 inline" />Berkas hanya diproses melalui portal dan kebijakan akses ditentukan oleh penyelenggara diklat.</p>
              </form>}
            </div>}
          </section>}
          <div className="mt-9 grid gap-7 lg:grid-cols-[1fr_300px]">
            <div className="space-y-7">
              {[{ title: "Materi pembelajaran", label: "DOKUMEN MATERI", rows: materials, type: "MATERIAL" as DocumentType }, { title: "Lembar kerja peserta", label: "LEMBAR KERJA", rows: lkpd, type: "LKPD" as DocumentType }].map(group => <section key={group.type} className="rounded-[22px] border border-[#dfe6e7] bg-[#fffefa] p-5 sm:p-7">
                <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#8b713e]">{group.label}</p><h2 className="mt-1 text-xl font-extrabold text-[#1d3b52]">{group.title}</h2></div><span className="text-xs text-[#88949a]">{group.rows.length} dokumen</span></div>
                {group.rows.length ? <div className="divide-y divide-[#e7ebea]">{group.rows.map(item => <DocumentRow key={item.id} item={item} />)}</div> : <p className="rounded-xl border border-dashed border-[#dce4e4] px-5 py-7 text-center text-sm text-[#87939a]">Belum ada {group.type === "LKPD" ? "LKPD" : "materi"} yang dipublikasikan.</p>}
              </section>)}
            </div>
            <aside className="h-fit rounded-[22px] border border-[#dfe6e7] bg-[#fffefa] p-5 sm:p-6">
              <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#8b713e]">Tentang diklat</p>
              <h2 className="mt-2 text-lg font-extrabold leading-snug text-[#1d3b52]">{training.title}</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div><dt className="text-xs text-[#849098]">Periode</dt><dd className="mt-1 font-semibold text-[#40596a]">{training.period || "Belum dicantumkan"}</dd></div>
                <div><dt className="text-xs text-[#849098]">Kategori</dt><dd className="mt-1 font-semibold text-[#40596a]">{training.category || "Umum"}</dd></div>
                <div><dt className="text-xs text-[#849098]">Tahun</dt><dd className="mt-1 font-semibold text-[#40596a]">{training.year || "—"}</dd></div>
              </dl>
              {training.acceptsSubmissions && <button onClick={() => openSubmission(training.slug)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e9cb83] px-4 py-3 text-sm font-extrabold text-[#243d50] transition hover:bg-[#f0d995]"><Send size={15} /> Kirim tugas</button>}
            </aside>
          </div>
        </>}
      </section> : isDocumentPage ? <section>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[11px] font-extrabold uppercase tracking-[.19em] text-[#8c7543]">Pustaka diklat</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em] text-[#183650] sm:text-4xl">{activeTab === "lkpd" ? "Lembar kerja peserta" : "Materi pembelajaran"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#72808a]">Temukan dokumen yang dipublikasikan untuk mendukung kegiatan pengembangan kompetensi.</p></div>
          <div className="flex rounded-xl border border-[#dce4e5] bg-white p-1"><button onClick={() => visit(`${root}?tab=materi`)} className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === "materi" ? "diklat-on-blue bg-[#173653] text-white" : "text-[#657681]"}`}>Materi</button><button onClick={() => visit(`${root}?tab=lkpd`)} className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === "lkpd" ? "diklat-on-blue bg-[#173653] text-white" : "text-[#657681]"}`}>LKPD</button></div>
        </div>
         <div className="mt-7 grid gap-3 rounded-2xl border border-[#dfe6e7] bg-[#fffefa] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_220px_200px_auto]">
           <div className="relative"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#82909a]" /><input value={docQuery} onChange={event => { setDocQuery(event.target.value); setDocListPage(1); }} placeholder="Cari judul atau keterangan dokumen" className="w-full rounded-xl border border-[#dce4e5] bg-white py-3 pl-10 pr-4 text-sm text-[#203c53] outline-none focus:border-[#68879a]" /></div>
           <select aria-label="Filter diklat dokumen" value={documentTrainingId} onChange={event => { setDocumentTrainingId(event.target.value); setDocListPage(1); }} className="rounded-xl border border-[#dce4e5] bg-white px-3.5 py-3 text-sm text-[#426175] outline-none focus:border-[#68879a]"><option value="">Semua diklat</option>{documentFilters.trainings.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
           <select aria-label="Filter kategori dokumen" value={documentCategory} onChange={event => { setDocumentCategory(event.target.value); setDocListPage(1); }} className="rounded-xl border border-[#dce4e5] bg-white px-3.5 py-3 text-sm text-[#426175] outline-none focus:border-[#68879a]"><option value="">Semua kategori</option>{documentFilters.categories.map(item => <option key={item} value={item}>{item}</option>)}</select>
           <button onClick={() => { setDocQuery(""); setDocumentTrainingId(""); setDocumentCategory(""); setDocListPage(1); }} className="rounded-xl border border-[#dce4e5] px-4 py-3 text-sm font-bold text-[#426175] hover:bg-[#f2f5f3]">Bersihkan</button>
         </div>
         {documentFiltersError && <p className="mt-2 text-xs text-[#9b493d]" role="status">{documentFiltersError}</p>}
        <div className="mt-6 rounded-[22px] border border-[#dfe6e7] bg-[#fffefa] p-5 sm:p-7">
          {docsLoading ? <div className="space-y-5" aria-busy="true">{[1, 2, 3].map(n => <div key={n} className="animate-pulse flex gap-4"><div className="h-11 w-11 rounded-xl bg-[#edf1f1]" /><div className="flex-1"><div className="h-4 w-1/3 rounded bg-[#edf1f1]" /><div className="mt-2 h-3 w-2/3 rounded bg-[#f0f2f2]" /></div></div>)}</div>
            : docsError ? <Notice title="Dokumen tidak dapat dimuat" message={docsError} retry={() => void loadDocuments()} />
              : documents.length ? <div className="divide-y divide-[#e7ebea]">{documents.map(item => <DocumentRow key={item.id} item={item} />)}</div>
                : <div className="py-12 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf2f2] text-[#638093]"><FolderArchive size={21} /></span><h2 className="mt-4 font-bold text-[#365469]">Belum ada dokumen</h2><p className="mt-1 text-sm text-[#849098]">Dokumen yang sesuai pencarian akan tampil di sini setelah dipublikasikan.</p></div>}
          {documentPage && documentPage.totalPages > 1 && <Pagination page={documentPage.page} totalPages={documentPage.totalPages} onChange={setDocListPage} />}
        </div>
      </section> : showTrainingList ? <section>
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[11px] font-extrabold uppercase tracking-[.19em] text-[#8c7543]">{isArchive ? "Jejak pembelajaran" : "Program pembelajaran"}</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em] text-[#183650] sm:text-4xl">{isArchive ? "Arsip diklat" : "Jelajahi diklat"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#72808a]">{isArchive ? "Kegiatan terdahulu tetap dapat ditelusuri bersama materi dan LKPD yang tersedia." : "Pilih program diklat untuk menemukan materi, lembar kerja, dan informasi pengumpulan."}</p></div>
          <button onClick={() => setMobileSearchOpen(!mobileSearchOpen)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce4e5] bg-white px-4 py-3 text-sm font-bold text-[#47677b] md:hidden"><Search size={16} /> Cari diklat <ChevronDown size={15} /></button>
        </div>
        <div className={`${mobileSearchOpen ? "flex" : "hidden"} mt-6 flex-col gap-3 rounded-2xl border border-[#dfe6e7] bg-[#fffefa] p-4 sm:flex sm:flex-row`}>
          <div className="relative flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#82909a]" /><input value={search} onChange={event => { setSearch(event.target.value); setListPage(1); }} placeholder="Cari nama atau topik diklat" className="w-full rounded-xl border border-[#dce4e5] bg-white py-3 pl-10 pr-4 text-sm text-[#203c53] outline-none focus:border-[#68879a]" /></div>
          {isArchive && <label className="flex items-center gap-2 rounded-xl border border-[#dce4e5] px-3 text-xs font-bold text-[#6f8089]"><CalendarDays size={15} /><input aria-label="Tahun arsip" value={year} onChange={event => { setYear(event.target.value); setListPage(1); }} inputMode="numeric" maxLength={4} placeholder="Tahun" className="w-20 py-3 text-sm outline-none" /></label>}
          <button onClick={() => { setSearch(""); setYear(""); setListPage(1); }} className="rounded-xl px-4 py-3 text-sm font-bold text-[#667b89] hover:bg-[#f2f5f3]">Bersihkan</button>
        </div>
        <div className="mt-7 flex items-center justify-between"><p className="text-sm text-[#75838c]">{trainingPage ? `${trainingPage.total} kegiatan` : "Kegiatan"}</p><button onClick={() => visit(`${root}?tab=materi`)} className="hidden items-center gap-2 text-sm font-bold text-[#43657a] hover:text-[#9b782f] sm:inline-flex"><BookOpen size={16} /> Buka pustaka materi</button></div>
        {trainingsLoading ? <div className="mt-4"><LoadingRows /></div> : trainingsError ? <div className="mt-5"><Notice title="Daftar diklat belum dapat dimuat" message={trainingsError} retry={() => void loadTrainings()} /></div> : trainings.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{trainings.map(item => <TrainingCard key={item.id} item={item} archive={isArchive} />)}</div> : <div className="mt-5 rounded-[22px] border border-dashed border-[#cdd8db] bg-[#fbfcf9] px-6 py-14 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf0ef] text-[#678396]"><GraduationCap size={22} /></span><h2 className="mt-4 font-bold text-[#345369]">{search ? "Tidak ada diklat yang cocok" : isArchive ? "Arsip belum tersedia" : "Belum ada diklat terbit"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#829098]">Coba ubah kata pencarian atau kembali lagi setelah kegiatan dipublikasikan.</p>{search && <button onClick={() => setSearch("")} className="mt-4 text-sm font-bold text-[#42667c] underline underline-offset-4">Hapus pencarian</button>}</div>}
        {trainingPage && trainingPage.totalPages > 1 && <Pagination page={trainingPage.page} totalPages={trainingPage.totalPages} onChange={setListPage} />}
      </section> : <>
        <section className="diklat-blue-surface relative isolate overflow-hidden rounded-[28px] border border-[#b8d5f1]/80">
          <div className="diklat-hero-orbit diklat-hero-orbit--large pointer-events-none absolute right-[-70px] top-[-115px] h-[430px] w-[430px] rounded-full border" />
          <div className="diklat-hero-orbit diklat-hero-orbit--small pointer-events-none absolute right-[35px] top-[-20px] h-[290px] w-[290px] rounded-full border" />
          <div className="diklat-hero-glow pointer-events-none absolute bottom-[-145px] right-[145px] h-[240px] w-[240px] rounded-full blur-3xl" />
          <div className="relative grid gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-14 lg:py-[76px]">
            <div className="diklat-hero-copy"><div className="inline-flex items-center gap-2 rounded-full border border-[#9fc4e8]/70 bg-white/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#285d8d] shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#3986c7]" /> Portal pengembangan kompetensi</div>
              <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-[#456987]">SMKN 1 Wonogiri</p>
              <h1 className="diklat-hero-title mt-3 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-[-.055em] text-[#153651] sm:text-5xl lg:text-[58px]">{overview?.settings.title || "Pusat Diklat"}</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#294b68] sm:text-lg">Satu portal untuk materi, LKPD, dan pengumpulan tugas diklat.</p>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#49657d]">{overview?.settings.description || "Akses bahan pembelajaran dan kirim tugas kegiatan pengembangan kompetensi melalui portal digital sekolah."}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => visit(`${root}?tab=jelajahi`)} className="diklat-primary-link inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-extrabold">Jelajahi diklat <ArrowRight size={16} /></button>
                 {overview?.settings.submissionsEnabled && <button onClick={() => openSubmission()} className="diklat-secondary-link inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold"><Send size={15} /> Kirim tugas</button>}
              </div>
            </div>
            <div className="diklat-feature-wrap relative mx-auto w-full max-w-[410px]">
              <div className="diklat-feature-panel rounded-[25px] p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-[#c6dbef]/80 pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#52728f]">Ruang belajar</p><p className="mt-1 text-lg font-bold text-[#173b5b]">Satu akses, banyak bekal.</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9ebff] text-[#2868a3]"><BookOpen size={19} /></span></div>
                <div className="mt-4 space-y-3">
                  {[{ icon: FileText, title: "Materi terkurasi", desc: "Baca dan unduh bahan pembelajaran" }, { icon: ClipboardList, title: "LKPD siap digunakan", desc: "Lembar kerja untuk setiap kegiatan" }, { icon: Send, title: "Pengumpulan terarah", desc: "Kirim hasil kerja pada jenis tugasnya" }].map((item, index) => <div key={item.title} className="diklat-feature-row flex items-center gap-3 rounded-2xl p-3.5" style={{ animationDelay: `${index * 90}ms` }}><span className="diklat-feature-icon flex h-10 w-10 items-center justify-center rounded-xl"><item.icon size={17} /></span><div><p className="text-sm font-bold text-[#183d5c]">{item.title}</p><p className="mt-0.5 text-xs text-[#526f89]">{item.desc}</p></div><ArrowRight size={14} className="ml-auto text-[#4d7ca7]" /></div>)}
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#bcd4ec]/80 bg-white/45 px-4 py-3"><ShieldCheck size={16} className="shrink-0 text-[#3478ad]" /><p className="text-[11px] leading-5 text-[#496680]">Informasi dan dokumen mengikuti publikasi resmi penyelenggara.</p></div>
              </div>
            </div>
          </div>
        </section>
        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overviewCards.map(({ label, value, Icon }) => <div key={label} className="diklat-stat-card flex items-center gap-4 rounded-2xl px-5 py-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#dfedfc] text-[#3475ac]"><Icon size={19} /></span><div><p className="text-xs font-semibold text-[#5b748a]">{label}</p><p className="mt-1 text-2xl font-extrabold text-[#1d3b52]">{overviewLoading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-[#dce9f4]" /> : value ?? "—"}</p></div>
          </div>)}
        </section>
        {overviewError && <div className="mt-4"><Notice title="Ringkasan belum dapat dimuat" message={overviewError} retry={() => void loadOverview()} /></div>}
        <section className="mt-14">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-extrabold uppercase tracking-[.19em] text-[#8c7543]">Mulai dari sini</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-.035em] text-[#183650] sm:text-3xl">Diklat pilihan</h2><p className="mt-2 text-sm text-[#77858d]">Program terbaru yang telah dipublikasikan.</p></div><button onClick={() => visit(`${root}?tab=jelajahi`)} className="inline-flex items-center gap-2 text-sm font-extrabold text-[#3c6076] hover:text-[#9b782f]">Semua diklat <ArrowRight size={16} /></button></div>
          {overviewLoading ? <div className="mt-6"><LoadingRows /></div> : overviewError ? null : overview?.featured?.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{overview.featured.map(item => <TrainingCard key={item.id} item={item} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-[#cdd8db] bg-[#fbfcf9] p-9 text-center"><GraduationCap className="mx-auto text-[#78909c]" size={24} /><p className="mt-3 font-bold text-[#365469]">Belum ada diklat pilihan</p><p className="mt-1 text-sm text-[#849098]">Kegiatan akan tampil di sini setelah dipublikasikan.</p></div>}
        </section>
        <section className="mt-14 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <button onClick={() => visit(`${root}?tab=materi`)} className="diklat-link-card group flex min-h-[190px] items-center justify-between gap-5 rounded-[22px] p-6 text-left sm:p-8">
            <span><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8eff1] text-[#43667a]"><BookOpen size={21} /></span><span className="mt-5 block text-xl font-extrabold text-[#1d3b52]">Materi & LKPD</span><span className="mt-2 block max-w-sm text-sm leading-6 text-[#77858d]">Cari dokumen pembelajaran dari berbagai kegiatan yang tersedia.</span></span>
            <ArrowRight className="shrink-0 text-[#557488] transition group-hover:translate-x-1" size={20} />
          </button>
          <button onClick={() => overview?.settings.archiveVisible && visit(`${root}/arsip`)} disabled={!overview?.settings.archiveVisible} className="diklat-link-card diklat-link-card--archive group flex min-h-[190px] items-center justify-between gap-5 rounded-[22px] p-6 text-left disabled:cursor-not-allowed disabled:opacity-70 sm:p-8">
            <span><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dfedfc] text-[#3475ac]"><FolderArchive size={21} /></span><span className="mt-5 block text-xl font-extrabold text-[#1d3b52]">Arsip pembelajaran</span><span className="mt-2 block max-w-sm text-sm leading-6 text-[#526f89]">{overview?.settings.archiveVisible ? "Telusuri program terdahulu dan dokumen yang tetap tersedia." : "Arsip saat ini belum dibuka untuk pengunjung."}</span></span>
            {overview?.settings.archiveVisible && <ArrowRight className="shrink-0 text-[#3475ac] transition group-hover:translate-x-1" size={20} />}
          </button>
        </section>
      </>}
    </main>
    <footer className="border-t border-[#dce3e4] bg-[#f0f2ef]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-[#75828a] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-bold text-[#35566b]">Pusat Diklat · SMKN 1 Wonogiri</span><span>Portal materi, LKPD, dan pengumpulan tugas diklat.</span></div></footer>
  </div>;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return <nav className="mt-7 flex items-center justify-center gap-3" aria-label="Navigasi halaman">
    <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4e5] bg-white px-3.5 py-2.5 text-sm font-bold text-[#47677b] disabled:opacity-40"><ChevronLeft size={16} /> Sebelumnya</button>
    <span aria-live="polite" className="text-xs font-semibold text-[#75838c]">Halaman {page} dari {totalPages}</span>
    <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4e5] bg-white px-3.5 py-2.5 text-sm font-bold text-[#47677b] disabled:opacity-40">Berikutnya <ChevronLeft className="rotate-180" size={16} /></button>
  </nav>;
}
