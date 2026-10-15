import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, Archive, ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpDown, BookOpen, Check, ChevronLeft, ChevronRight,
  ClipboardList, Cloud, Download, File, FilePlus2, FileSpreadsheet, FolderOpen, GraduationCap, Image as ImageIcon,
  HardDrive, History, LoaderCircle, Pencil, Plus, RefreshCw, Search, Settings, ShieldCheck,
  Trash2, Upload, X,
} from "lucide-react";
import { apiFetch, apiPath } from "../utils/navigation";

type Theme = "light" | "dark";
type AdminSection = "dashboard" | "trainings" | "submissions" | "audit" | "settings";
type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Training = {
  id: string; title: string; slug: string; summary: string; description: string; category?: string | null;
  period?: string | null; year?: number | string | null; status: Status; acceptsSubmissions: boolean;
  archiveVisible: boolean; sortOrder: number; counts: { materials: number; lkpd: number; taskTypes: number; submissions: number };
  photos?: TrainingPhoto[]; coverPhotoUrl?: string | null;
  createdAt: string; updatedAt: string;
};
type TrainingPhoto = { id: string; sortOrder: number; fileName: string; mimeType: string; sizeBytes: number; url: string };
type TrainingPhotoEntry = { key: string; photo?: TrainingPhoto; file?: File; previewUrl: string };
type TaskType = {
  id: string; trainingId: string; name: string; description?: string | null; sortOrder: number;
  active: boolean; deadline?: string | null; maxFileSizeMb?: number | null; allowedMimeTypes?: string[] | null;
  trainingName?: string;
};
type DocumentItem = {
  id: string; trainingId: string; type: "MATERIAL" | "LKPD"; title: string; description?: string | null;
  category?: string | null; driveFileName: string; mimeType?: string | null; sizeBytes?: number | null;
  downloadUrl?: string | null; sortOrder: number; status: Status; createdAt: string;
};
type Submission = {
  id: string; reference: string; trainingId: string; trainingName: string; taskTypeId: string; taskName: string;
  fullName: string; nip?: string | null; institution: string; submittedAt: string; status: string;
  fileName: string; mimeType?: string | null; sizeBytes?: number | null; driveUrl?: string | null;
};
type AuditItem = { action: string; entity: string; entityId: string; actor?: string | null; createdAt: string; metadata?: unknown };
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
type Envelope<T> = { success: boolean; data?: T; error?: { message?: string } };
type Props = { theme?: Theme };
type SettingsData = {
  title: string; description: string; archiveVisible: boolean; submissionsEnabled: boolean;
  maxFileSizeMb: number; allowedMimeTypes: string[]; allowedExtensions: string[];
  submissionDriveAccess: "PRIVATE" | "LINK"; rootFolderId: string; driveConfigured: boolean;
  driveConnected: boolean; driveOAuthAvailable: boolean; driveMessage?: string | null;
};
type DriveStatus = {
  configured: boolean; connected: boolean; rootFolderId?: string | null; message?: string | null;
  oauthAvailable: boolean; oauthConnected: boolean;
  filesToVerify: number; missingFiles: number; checked?: number; newlyMissing?: number;
  restored?: number; remaining?: number; nextCursor?: string | null;
};
type TrainingDraft = {
  title: string; summary: string; description: string; category: string; period: string;
  year: string; status: Status; acceptsSubmissions: boolean; archiveVisible: boolean; sortOrder: string;
};
type TaskDraft = {
  name: string; description: string; sortOrder: string; active: boolean; deadline: string;
  maxFileSizeMb: string; allowedMimeTypes: string;
};
type DocumentDraft = { type: "MATERIAL" | "LKPD"; title: string; description: string; category: string; sortOrder: string; status: Status };
type DocumentFileInput = { id: number; files: File[] };

const TOKEN_KEY = "smkn1_adm_token";
const PAGE_SIZE = 10;
const MAX_DOCUMENT_FILE_BYTES = 40 * 1024 * 1024;
const MAX_TRAINING_MATERIALS = 10;
const MAX_TRAINING_PHOTOS = 6;
const MAX_TRAINING_PHOTO_BYTES = 20 * 1024 * 1024;
const emptyTraining: TrainingDraft = { title: "", summary: "", description: "", category: "", period: "", year: "", status: "DRAFT", acceptsSubmissions: false, archiveVisible: false, sortOrder: "0" };
const emptyTask: TaskDraft = { name: "", description: "", sortOrder: "0", active: true, deadline: "", maxFileSizeMb: "", allowedMimeTypes: "" };
const emptyDoc: DocumentDraft = { type: "MATERIAL", title: "", description: "", category: "", sortOrder: "0", status: "PUBLISHED" };
const dateText = (value?: string | null) => value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—";
const sizeText = (bytes?: number | null) => !bytes ? "—" : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const inputBase = "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2";
const jsonHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`, "Content-Type": "application/json" });
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` });

async function optimizeTrainingPhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Foto tidak dapat diproses oleh browser.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error("Foto tidak dapat dikompres.")), "image/webp", 0.82);
    });
    const extension = blob.type === "image/webp" ? ".webp" : blob.type === "image/png" ? ".png" : ".jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto-diklat";
    return new window.File([blob], `${baseName}${extension}`, { type: blob.type || "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

function TrainingPhotoPreview({ entry, dark }: { entry: TrainingPhotoEntry; dark: boolean }) {
  const [source, setSource] = useState(entry.file ? entry.previewUrl : "");
  useEffect(() => {
    if (entry.file) {
      setSource(entry.previewUrl);
      return;
    }
    if (!entry.photo) return;
    const controller = new AbortController();
    let objectUrl = "";
    apiFetch(apiPath(entry.photo.url), { headers: authHeaders(), signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Foto tidak tersedia.");
        return response.blob();
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => { if (!controller.signal.aborted) setSource(""); });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [entry.file, entry.photo?.id, entry.photo?.url, entry.previewUrl]);
  return source
    ? <img src={source} alt={entry.photo?.fileName || entry.file?.name || "Foto kegiatan Diklat"} className="h-full w-full object-cover" />
    : <div className={`flex h-full w-full items-center justify-center text-xs ${dark ? "bg-white/5 text-slate-500" : "bg-[#edf1ef] text-[#87939a]"}`}>Memuat foto…</div>;
}

async function adminData<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(url, init);
  const payload = await response.json().catch(() => ({})) as Envelope<T>;
  if (!response.ok || payload.success === false) throw new Error(payload.error?.message || "Permintaan admin belum berhasil.");
  if (!payload.data) throw new Error("Server tidak mengembalikan data yang diharapkan.");
  return payload.data;
}

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function PanelCard({ children, className = "", dark }: { children: React.ReactNode; className?: string; dark: boolean }) {
  return <section className={`rounded-2xl border ${dark ? "border-white/10 bg-[#14293a]" : "border-[#dce5e6] bg-[#fffefa]"} ${className}`}>{children}</section>;
}

function SectionHeading({ eyebrow, title, detail, children, dark }: { eyebrow: string; title: string; detail: string; children?: React.ReactNode; dark: boolean }) {
  return <div className={`mb-6 flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end ${dark ? "border-white/10" : "border-[#e2e8e8]"}`}>
    <div><p className={`text-[10px] font-extrabold uppercase tracking-[.18em] ${dark ? "text-[#d1b66f]" : "text-[#8b713e]"}`}>{eyebrow}</p><h2 className={`mt-2 text-2xl font-extrabold tracking-tight ${dark ? "text-[#f0f3ee]" : "text-[#183650]"}`}>{title}</h2><p className={`mt-1 max-w-2xl text-sm leading-6 ${dark ? "text-slate-400" : "text-[#71808a]"}`}>{detail}</p></div>{children}
  </div>;
}

function StatusBadge({ status, dark }: { status: string; dark: boolean }) {
  const styles: Record<string, string> = {
    PUBLISHED: dark ? "bg-emerald-300/10 text-emerald-300" : "bg-[#e5f1eb] text-[#31684a]",
    ARCHIVED: dark ? "bg-white/10 text-slate-300" : "bg-[#e9edf2] text-[#526174]",
    DRAFT: dark ? "bg-amber-300/10 text-amber-200" : "bg-[#f4eddc] text-[#80622b]",
    STORED: dark ? "bg-emerald-300/10 text-emerald-300" : "bg-[#e5f1eb] text-[#31684a]",
    FAILED: dark ? "bg-rose-300/10 text-rose-300" : "bg-[#fbebe8] text-[#9b493d]",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${styles[status] || (dark ? "bg-white/10 text-slate-300" : "bg-[#edf0f1] text-[#61717c]")}`}>{status}</span>;
}

function AdminTableEmpty({ text, dark }: { text: string; dark: boolean }) {
  return <div className={`rounded-xl border border-dashed px-5 py-12 text-center text-sm ${dark ? "border-white/15 text-slate-400" : "border-[#d8e1e2] text-[#7c8990]"}`}>{text}</div>;
}

export default function AdminDiklat({ theme = "light" }: Props) {
  const dark = theme === "dark";
  const palette = {
    text: dark ? "text-[#eaf0ed]" : "text-[#233e53]",
    muted: dark ? "text-slate-400" : "text-[#71808a]",
    input: `${inputBase} ${dark ? "border-white/10 bg-[#0d1d2b] text-[#eaf0ed] placeholder:text-slate-500 focus:border-[#b99b56] focus:ring-[#b99b56]/15" : "border-[#dbe3e4] bg-white text-[#233e53] placeholder:text-[#93a0a4] focus:border-[#66869a] focus:ring-[#66869a]/15"}`,
    button: dark ? "border-white/10 bg-white/[.04] text-slate-200 hover:bg-white/[.08]" : "border-[#dce4e5] bg-white text-[#456378] hover:bg-[#f2f5f3]",
  };
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{
    stats: { trainings: number; activeTrainings: number; materials: number; lkpd: number; submissions: number };
    recentSubmissions: Submission[];
    drive: { configured: boolean; connected: boolean; message?: string | null };
  } | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const selectedTraining = useMemo(() => trainings.find(item => item.id === selectedTrainingId) || null, [selectedTrainingId, trainings]);
  const [trainingDetail, setTrainingDetail] = useState<{ documents: DocumentItem[]; taskTypes: TaskType[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailWarning, setDetailWarning] = useState("");
  const [trainingDialog, setTrainingDialog] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [trainingDraft, setTrainingDraft] = useState<TrainingDraft>(emptyTraining);
  const [trainingPhotoEntries, setTrainingPhotoEntries] = useState<TrainingPhotoEntry[]>([]);
  const [nextTrainingPhotoKey, setNextTrainingPhotoKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTask);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);
  const [documentDraft, setDocumentDraft] = useState<DocumentDraft>(emptyDoc);
  const [documentFileInputs, setDocumentFileInputs] = useState<DocumentFileInput[]>([{ id: 0, files: [] }]);
  const [nextDocumentFileInputId, setNextDocumentFileInputId] = useState(1);
  const [documentFileInputVersion, setDocumentFileInputVersion] = useState(0);
  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(null);
  const [submissionItems, setSubmissionItems] = useState<Submission[]>([]);
  const [submissionTaskTypes, setSubmissionTaskTypes] = useState<TaskType[]>([]);
  const [submissionPagination, setSubmissionPagination] = useState<Pagination | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionExporting, setSubmissionExporting] = useState(false);
  const [submissionPage, setSubmissionPage] = useState(1);
  const [filters, setFilters] = useState({ q: "", trainingId: "", taskTypeId: "", institution: "", status: "", dateFrom: "", dateTo: "", sortBy: "submittedAt", sortOrder: "desc" });
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditPagination, setAuditPagination] = useState<Pagination | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [driveTesting, setDriveTesting] = useState(false);
  const [driveReconciling, setDriveReconciling] = useState(false);
  const [driveCursor, setDriveCursor] = useState("");
  const selectedDocumentFiles = documentFileInputs.flatMap(row => row.files.map((file, index) => ({ rowId: row.id, index, file })));
  const oversizedDocumentFiles = selectedDocumentFiles.filter(({ file }) => file.size > MAX_DOCUMENT_FILE_BYTES);
  const existingMaterialCount = trainingDetail?.documents.filter(item => item.type === "MATERIAL").length ?? selectedTraining?.counts.materials ?? 0;
  const remainingMaterialSlots = Math.max(0, MAX_TRAINING_MATERIALS - existingMaterialCount);
  const tooManyMaterialFiles = documentDraft.type === "MATERIAL" && selectedDocumentFiles.length > remainingMaterialSlots;

  const success = (text: string) => setNotice({ type: "success", text });
  const failure = (error: unknown, fallback: string) => setNotice({ type: "error", text: error instanceof Error ? error.message : fallback });

  const loadOverview = useCallback(async () => {
    const [summary, list] = await Promise.all([
      adminData<typeof overview>("/api/v1/diklat/admin/overview", { headers: authHeaders() }),
      adminData<{ trainings: Training[] }>("/api/v1/diklat/admin/trainings", { headers: authHeaders() }),
    ]);
    setOverview(summary);
    setTrainings(list.trainings || []);
  }, []);
  const reload = useCallback(async () => {
    setLoading(true);
    try { await loadOverview(); }
    catch (error) { failure(error, "Ringkasan Pusat Diklat tidak dapat dimuat."); }
    finally { setLoading(false); }
  }, [loadOverview]);
  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (!selectedTraining) { setTrainingDetail(null); setDetailWarning(""); return; }
    let alive = true;
    setDetailLoading(true); setDetailWarning(""); setTrainingDetail(null);
    Promise.all([
      adminData<{ documents: DocumentItem[] }>(`/api/v1/diklat/admin/trainings/${selectedTraining.id}/documents`, { headers: authHeaders() }),
      adminData<{ taskTypes: TaskType[] }>(`/api/v1/diklat/admin/trainings/${selectedTraining.id}/task-types`, { headers: authHeaders() }),
    ])
      .then(([documents, taskTypes]) => {
        if (alive) setTrainingDetail({ documents: documents.documents || [], taskTypes: taskTypes.taskTypes || [] });
      })
      .catch(error => { if (alive) setDetailWarning(error instanceof Error ? error.message : "Data terkait diklat tidak dapat dimuat."); })
      .finally(() => { if (alive) setDetailLoading(false); });
    return () => { alive = false; };
  }, [selectedTraining]);

  const loadSubmissions = useCallback(async () => {
    setSubmissionLoading(true);
    const params = new URLSearchParams({ page: String(submissionPage), pageSize: String(PAGE_SIZE), sortBy: filters.sortBy, sortOrder: filters.sortOrder });
    Object.entries(filters).forEach(([key, value]) => { if (value && key !== "sortBy" && key !== "sortOrder") params.set(key, value); });
    try {
      const data = await adminData<{ items: Submission[]; pagination: Pagination }>(`/api/v1/diklat/admin/submissions?${params}`, { headers: authHeaders() });
      setSubmissionItems(data.items || []); setSubmissionPagination(data.pagination);
    } catch (error) { failure(error, "Riwayat pengumpulan tidak dapat dimuat."); }
    finally { setSubmissionLoading(false); }
  }, [filters, submissionPage]);
  useEffect(() => { if (section === "submissions") void loadSubmissions(); }, [loadSubmissions, section]);
  useEffect(() => {
    if (section !== "submissions") return;
    let alive = true;
    const params = new URLSearchParams();
    if (filters.trainingId) params.set("trainingId", filters.trainingId);
    adminData<{ taskTypes: TaskType[] }>(`/api/v1/diklat/admin/task-types${params.size ? `?${params}` : ""}`, { headers: authHeaders() })
      .then(data => { if (alive) setSubmissionTaskTypes(data.taskTypes || []); })
      .catch(error => { if (alive) failure(error, "Filter jenis tugas tidak dapat dimuat."); });
    return () => { alive = false; };
  }, [filters.trainingId, section]);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ page: String(auditPage), pageSize: "15" });
      const data = await adminData<{ items: AuditItem[]; pagination: Pagination }>(`/api/v1/diklat/admin/audit?${params}`, { headers: authHeaders() });
      setAuditItems(data.items || []); setAuditPagination(data.pagination);
    } catch (error) { failure(error, "Log aktivitas tidak dapat dimuat."); }
    finally { setAuditLoading(false); }
  }, [auditPage]);
  useEffect(() => { if (section === "audit") void loadAudit(); }, [loadAudit, section]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await adminData<{ settings: SettingsData }>("/api/v1/diklat/admin/settings", { headers: authHeaders() });
      setSettings(data.settings);
      await loadDriveStatus();
    } catch (error) { failure(error, "Pengaturan modul tidak dapat dimuat."); }
    finally { setSettingsLoading(false); }
  }, []);
  const loadDriveStatus = async () => {
    try { setDriveStatus(await adminData<DriveStatus>("/api/v1/diklat/admin/drive/status", { headers: authHeaders() })); }
    catch (error) { setDriveStatus(null); throw error; }
  };
  useEffect(() => { if (section === "settings") void loadSettings(); }, [loadSettings, section]);

  const closeTrainingDialog = () => {
    if (saving) return;
    trainingPhotoEntries.forEach(entry => { if (entry.file && entry.previewUrl) URL.revokeObjectURL(entry.previewUrl); });
    setTrainingPhotoEntries([]);
    setTrainingDialog(false);
    setEditingTraining(null);
  };
  const startCreateTraining = () => {
    setEditingTraining(null);
    setTrainingDraft(emptyTraining);
    setTrainingPhotoEntries([]);
    setTrainingDialog(true);
  };
  const startEditTraining = (item: Training) => {
    setEditingTraining(item);
    setTrainingDraft({ title: item.title || "", summary: item.summary || "", description: item.description || "", category: item.category || "", period: item.period || "", year: item.year ? String(item.year) : "", status: item.status, acceptsSubmissions: item.acceptsSubmissions, archiveVisible: item.archiveVisible, sortOrder: String(item.sortOrder ?? 0) });
    setTrainingPhotoEntries((item.photos || []).map(photo => ({ key: `saved-${photo.id}`, photo, previewUrl: "" })));
    setTrainingDialog(true);
  };
  const addTrainingPhotos = (files: File[]) => {
    if (files.some(file => file.size > MAX_TRAINING_PHOTO_BYTES)) {
      failure(new Error("Batas ukuran foto adalah 20 MB per foto."), "Foto terlalu besar.");
      return;
    }
    if (trainingPhotoEntries.length + files.length > MAX_TRAINING_PHOTOS) {
      failure(new Error(`Maksimal ${MAX_TRAINING_PHOTOS} foto per diklat. Hapus foto yang tidak diperlukan terlebih dahulu.`), "Batas jumlah foto tercapai.");
      return;
    }
    const nextEntries = files.map((file, index) => ({
      key: `new-${nextTrainingPhotoKey + index}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setNextTrainingPhotoKey(current => current + files.length);
    setTrainingPhotoEntries(current => [...current, ...nextEntries]);
  };
  const removeTrainingPhoto = (entry: TrainingPhotoEntry) => {
    if (entry.file && entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    setTrainingPhotoEntries(current => current.filter(item => item.key !== entry.key));
  };
  const moveTrainingPhoto = (index: number, offset: -1 | 1) => {
    setTrainingPhotoEntries(current => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });
  };
  const saveTraining = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    const data = { ...trainingDraft, year: trainingDraft.year ? Number(trainingDraft.year) : null, sortOrder: Number(trainingDraft.sortOrder) || 0 };
    const originalPhotos = [...(editingTraining?.photos || [])];
    let entries = [...trainingPhotoEntries];
    let savedTraining: Training | null = null;
    let persistedPhotos: TrainingPhoto[] = [];
    try {
      const response = await adminData<{ training: Training }>(editingTraining ? `/api/v1/diklat/admin/trainings/${editingTraining.id}` : "/api/v1/diklat/admin/trainings", {
        method: editingTraining ? "PUT" : "POST", headers: jsonHeaders(), body: JSON.stringify(data),
      });
      savedTraining = response.training;
      setEditingTraining(savedTraining);
      persistedPhotos = [...(savedTraining.photos || [])];
      const currentIds = new Set(entries.flatMap(entry => entry.photo ? [entry.photo.id] : []));
      const removedPhotos = originalPhotos.filter(photo => !currentIds.has(photo.id));

      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (!entry.file) continue;
        try {
          const optimized = await optimizeTrainingPhoto(entry.file);
          const body = new FormData();
          body.append("file", optimized);
          const uploaded = await adminData<{ photo: TrainingPhoto }>(`/api/v1/diklat/admin/trainings/${savedTraining.id}/photos`, {
            method: "POST", headers: authHeaders(), body,
          });
          if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
          entries[index] = { key: entry.key, photo: uploaded.photo, previewUrl: "" };
          persistedPhotos.push(uploaded.photo);
          setTrainingPhotoEntries([...entries]);
        } catch (error) {
          setEditingTraining({ ...savedTraining, photos: persistedPhotos });
          setTrainingPhotoEntries(entries);
          failure(new Error(`Data diklat sudah tersimpan, tetapi foto “${entry.file.name}” belum berhasil diunggah. ${error instanceof Error ? error.message : ""}`), "Foto belum berhasil diunggah.");
          setSaving(false);
          return;
        }
      }

      for (const photo of removedPhotos) {
        try {
          await adminData(`/api/v1/diklat/admin/trainings/${savedTraining.id}/photos/${photo.id}`, {
            method: "DELETE", headers: authHeaders(),
          });
          persistedPhotos = persistedPhotos.filter(item => item.id !== photo.id);
        } catch (error) {
          setEditingTraining({ ...savedTraining, photos: persistedPhotos });
          setTrainingPhotoEntries(entries);
          failure(new Error(`Data diklat sudah tersimpan, tetapi foto lama belum dapat dihapus. ${error instanceof Error ? error.message : ""}`), "Perubahan foto belum lengkap.");
          setSaving(false);
          return;
        }
      }

      const orderedPhotoIds = entries.flatMap(entry => entry.photo ? [entry.photo.id] : []);
      setEditingTraining({ ...savedTraining, photos: persistedPhotos });
      await adminData(`/api/v1/diklat/admin/trainings/${savedTraining.id}/photos/order`, {
        method: "PATCH", headers: jsonHeaders(), body: JSON.stringify({ photoIds: orderedPhotoIds }),
      });
      const finalPhotos = orderedPhotoIds.map(id => persistedPhotos.find(photo => photo.id === id)).filter((photo): photo is TrainingPhoto => Boolean(photo));
      setTrainingPhotoEntries(finalPhotos.map(photo => ({ key: `saved-${photo.id}`, photo, previewUrl: "" })));
      setEditingTraining({ ...savedTraining, photos: finalPhotos });
      setTrainingDialog(false);
      setEditingTraining(null);
      success(editingTraining ? "Perubahan diklat dan foto tersimpan." : "Diklat baru berhasil dibuat.");
      await reload();
      if (savedTraining.id) setSelectedTrainingId(savedTraining.id);
    } catch (error) {
      failure(error, savedTraining ? "Data diklat tersimpan, tetapi urutan foto belum berhasil disimpan." : "Perubahan diklat belum tersimpan.");
    }
    finally { setSaving(false); }
  };
  const changeTrainingStatus = async (item: Training, status: Status) => {
    if (status === "ARCHIVED" && !window.confirm(`Arsipkan “${item.title}”? Data, dokumen, dan riwayat pengumpulan tetap dipertahankan.`)) return;
    try {
      await adminData(`/api/v1/diklat/admin/trainings/${item.id}/status`, { method: "PATCH", headers: jsonHeaders(), body: JSON.stringify({ status }) });
      success(status === "ARCHIVED" ? "Diklat diarsipkan. Riwayat tetap dipertahankan." : `Status diklat diubah menjadi ${status}.`);
      await reload();
    } catch (error) { failure(error, "Status diklat belum berubah."); }
  };
  const deleteTraining = async (item: Training) => {
    if (!window.confirm(`Hapus draft “${item.title}”? Penghapusan hanya diizinkan server untuk draft tanpa riwayat.`)) return;
    try { await adminData(`/api/v1/diklat/admin/trainings/${item.id}`, { method: "DELETE", headers: authHeaders() }); success("Draft diklat berhasil dihapus."); if (selectedTrainingId === item.id) setSelectedTrainingId(""); await reload(); }
    catch (error) { failure(error, "Draft tidak dapat dihapus. Pastikan diklat masih kosong."); }
  };
  const saveTaskType = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTraining) return;
    setSaving(true);
    const body = {
      name: taskDraft.name.trim(), description: taskDraft.description.trim(), sortOrder: Number(taskDraft.sortOrder) || 0,
      active: taskDraft.active, deadline: taskDraft.deadline ? new Date(taskDraft.deadline).toISOString() : null,
      maxFileSizeMb: taskDraft.maxFileSizeMb ? Number(taskDraft.maxFileSizeMb) : null,
      allowedMimeTypes: taskDraft.allowedMimeTypes.split(",").map(item => item.trim()).filter(Boolean),
    };
    try {
      await adminData(editingTask ? `/api/v1/diklat/admin/task-types/${editingTask.id}` : `/api/v1/diklat/admin/trainings/${selectedTraining.id}/task-types`, {
        method: editingTask ? "PUT" : "POST", headers: jsonHeaders(), body: JSON.stringify(body),
      });
      setTaskDraft(emptyTask); setEditingTask(null); success(editingTask ? "Jenis tugas berhasil diperbarui." : "Jenis tugas berhasil ditambahkan.");
      await loadOverview(); setSelectedTrainingId(selectedTraining.id);
    } catch (error) { failure(error, "Jenis tugas belum tersimpan."); }
    finally { setSaving(false); }
  };
  const beginEditTask = (item: TaskType) => {
    setEditingTask(item);
    setTaskDraft({ name: item.name, description: item.description || "", sortOrder: String(item.sortOrder), active: item.active, deadline: toLocalDateTime(item.deadline), maxFileSizeMb: item.maxFileSizeMb ? String(item.maxFileSizeMb) : "", allowedMimeTypes: item.allowedMimeTypes?.join(", ") || "" });
  };
  const removeTask = async (item: TaskType) => {
    if (!window.confirm(`Nonaktifkan atau hapus jenis tugas “${item.name}”? Riwayat pengumpulan akan dipertahankan.`)) return;
    try { await adminData(`/api/v1/diklat/admin/task-types/${item.id}`, { method: "DELETE", headers: authHeaders() }); success("Jenis tugas dihapus atau dinonaktifkan sesuai riwayatnya."); await loadOverview(); if (selectedTraining) setSelectedTrainingId(selectedTraining.id); }
    catch (error) { failure(error, "Jenis tugas belum dapat dihapus."); }
  };
  const addDocumentFileInput = () => {
    setDocumentFileInputs(current => [...current, { id: nextDocumentFileInputId, files: [] }]);
    setNextDocumentFileInputId(current => current + 1);
  };
  const uploadDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTraining || !selectedDocumentFiles.length) return;
    if (oversizedDocumentFiles.length) {
      failure(new Error(`Batas unggahan adalah 40 MB per berkas. Ganti: ${oversizedDocumentFiles.slice(0, 3).map(({ file }) => file.name).join(", ")}.`), "Berkas terlalu besar.");
      return;
    }
    if (documentDraft.type === "MATERIAL" && selectedDocumentFiles.length > remainingMaterialSlots) {
      failure(new Error(`Diklat ini maksimal ${MAX_TRAINING_MATERIALS} materi. Sisa slot: ${remainingMaterialSlots}.`), "Batas jumlah materi tercapai.");
      return;
    }
    const baseTitle = documentDraft.title.trim();
    if (!baseTitle) return;

    setSaving(true);
    setNotice(null);
    const failedFiles: Array<{ rowId: number; index: number; file: File; error: unknown }> = [];
    let refreshError: unknown = null;
    try {
      for (const [order, selected] of selectedDocumentFiles.entries()) {
        const body = new FormData();
        const fileTitle = selectedDocumentFiles.length > 1
          ? `${baseTitle} — ${selected.file.name.replace(/\.[^.]+$/, "")}`.slice(0, 160)
          : baseTitle;
        body.append("type", documentDraft.type);
        body.append("title", fileTitle);
        body.append("description", documentDraft.description.trim());
        body.append("category", documentDraft.category.trim());
        body.append("sortOrder", String((Number(documentDraft.sortOrder) || 0) + order));
        body.append("status", documentDraft.status);
        body.append("file", selected.file);
        try {
          await adminData(`/api/v1/diklat/admin/trainings/${selectedTraining.id}/documents`, { method: "POST", headers: authHeaders(), body });
        } catch (error) {
          failedFiles.push({ ...selected, error });
        }
      }

      const uploadedCount = selectedDocumentFiles.length - failedFiles.length;
      if (uploadedCount) {
        try {
          await loadOverview();
          setSelectedTrainingId(selectedTraining.id);
        } catch (error) {
          refreshError = error;
        }
      }

      setDocumentFileInputVersion(version => version + 1);
      if (failedFiles.length) {
        const failedKeys = new Set(failedFiles.map(item => `${item.rowId}:${item.index}`));
        setDocumentFileInputs(current => {
          const remaining = current
            .map(row => ({ ...row, files: row.files.filter((_, index) => failedKeys.has(`${row.id}:${index}`)) }))
            .filter(row => row.files.length);
          return remaining.length ? remaining : [{ id: 0, files: [] }];
        });
        const failedNames = failedFiles.slice(0, 3).map(item => item.file.name).join(", ");
        const more = failedFiles.length > 3 ? `, dan ${failedFiles.length - 3} lainnya` : "";
        const firstReason = failedFiles[0].error instanceof Error ? ` Alasan: ${failedFiles[0].error.message}` : "";
        const refreshNote = refreshError ? " Daftar dokumen belum dapat diperbarui." : "";
        failure(new Error(`${uploadedCount} berhasil; gagal: ${failedNames}${more}.${firstReason} Berkas gagal tetap dipilih untuk dicoba lagi.${refreshNote}`), "Sebagian berkas belum berhasil diunggah.");
      } else {
        setDocumentDraft(emptyDoc);
        setDocumentFileInputs([{ id: 0, files: [] }]);
        if (refreshError) failure(refreshError, "Dokumen berhasil diunggah, tetapi daftar belum dapat diperbarui.");
        else success(`${documentDraft.type === "LKPD" ? "LKPD" : "Materi"}: ${uploadedCount} berkas berhasil diunggah.`);
      }
    } catch (error) {
      failure(error, "Dokumen belum berhasil diunggah.");
    } finally {
      setSaving(false);
    }
  };
  const saveDocumentMetadata = async (event: FormEvent) => {
    event.preventDefault(); if (!editingDocument) return;
    setSaving(true);
    const body = { title: documentDraft.title.trim(), description: documentDraft.description.trim(), category: documentDraft.category.trim(), sortOrder: Number(documentDraft.sortOrder) || 0, status: documentDraft.status };
    try {
      await adminData(`/api/v1/diklat/admin/documents/${editingDocument.id}`, { method: "PUT", headers: jsonHeaders(), body: JSON.stringify(body) });
      setEditingDocument(null); success("Metadata dokumen berhasil diperbarui."); await loadOverview(); if (selectedTraining) setSelectedTrainingId(selectedTraining.id);
    } catch (error) { failure(error, "Metadata dokumen belum tersimpan."); }
    finally { setSaving(false); }
  };
  const changeDocumentStatus = async (item: DocumentItem, status: Status) => {
    if (status === "ARCHIVED" && !window.confirm(`Arsipkan dokumen “${item.title}”? Riwayat dan berkas akan dipertahankan.`)) return;
    try {
      await adminData(`/api/v1/diklat/admin/documents/${item.id}/status`, { method: "PATCH", headers: jsonHeaders(), body: JSON.stringify({ status }) });
      success(status === "ARCHIVED" ? "Dokumen diarsipkan tanpa menghapus berkas." : "Status dokumen berhasil diperbarui.");
      if (selectedTraining) setSelectedTrainingId(selectedTraining.id);
    } catch (error) { failure(error, "Status dokumen belum berubah."); }
  };
  const archiveDocument = async (item: DocumentItem) => {
    if (!window.confirm(`Arsipkan dokumen “${item.title}”? Dokumen tidak akan dihapus permanen.`)) return;
    try { await adminData(`/api/v1/diklat/admin/documents/${item.id}`, { method: "DELETE", headers: authHeaders() }); success("Dokumen diarsipkan; berkas dan riwayat tetap dipertahankan."); if (selectedTraining) setSelectedTrainingId(selectedTraining.id); }
    catch (error) { failure(error, "Dokumen belum dapat diarsipkan."); }
  };

  const downloadSubmissionFile = async (item: Submission) => {
    try {
      const response = await apiFetch(`/api/v1/diklat/admin/submissions/${item.id}/file`, { headers: authHeaders() });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as Envelope<unknown>;
        throw new Error(payload.error?.message || "Berkas tidak dapat diakses.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = item.fileName || "berkas-pengumpulan"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (error) { failure(error, "Berkas tidak dapat diunduh."); }
  };
  const exportSubmissions = async () => {
    setSubmissionExporting(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    try {
      const response = await apiFetch(`/api/v1/diklat/admin/submissions/export.xlsx?${params}`, { headers: authHeaders() });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as Envelope<unknown>;
        throw new Error(payload.error?.message || "Ekspor Excel belum berhasil.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `pengumpulan-diklat-${new Date().toISOString().slice(0, 10)}.xlsx`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (error) { failure(error, "Laporan belum dapat diekspor."); }
    finally { setSubmissionExporting(false); }
  };

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault(); if (!settings) return;
    setSaving(true);
    const body = {
      title: settings.title, description: settings.description, archiveVisible: settings.archiveVisible,
      submissionsEnabled: settings.submissionsEnabled, maxFileSizeMb: Number(settings.maxFileSizeMb),
      allowedMimeTypes: settings.allowedMimeTypes, allowedExtensions: settings.allowedExtensions,
      submissionDriveAccess: settings.submissionDriveAccess, rootFolderId: settings.rootFolderId,
    };
    try {
      const data = await adminData<{ settings: SettingsData }>("/api/v1/diklat/admin/settings", { method: "PUT", headers: jsonHeaders(), body: JSON.stringify(body) });
      setSettings(data.settings); success("Pengaturan portal berhasil disimpan.");
    } catch (error) { failure(error, "Pengaturan belum tersimpan."); }
    finally { setSaving(false); }
  };
  const testDrive = async () => {
    setDriveTesting(true);
    try {
      const data = await adminData<DriveStatus>("/api/v1/diklat/admin/drive/status/test", { method: "POST", headers: authHeaders() });
      setDriveStatus(data);
      success(data.connected ? "Pemeriksaan Drive berhasil; server mengonfirmasi koneksi." : "Pemeriksaan selesai, tetapi koneksi Drive belum tersambung.");
    } catch (error) { failure(error, "Pemeriksaan Google Drive belum berhasil."); }
    finally { setDriveTesting(false); }
  };
  const connectDrive = async () => {
    const popup = window.open("about:blank", "diklat-google-drive-oauth", "popup,width=560,height=720");
    if (!popup) {
      failure(new Error("Izinkan pop-up untuk situs ini, lalu klik Hubungkan Google Drive lagi."), "Pop-up login Google diblokir.");
      return;
    }
    setDriveConnecting(true);
    try {
      const data = await adminData<{ authorizationUrl: string }>("/api/v1/diklat/admin/drive/oauth/start", { headers: authHeaders() });
      popup.location.href = data.authorizationUrl;
    } catch (error) {
      popup.close();
      setDriveConnecting(false);
      failure(error, "Login Google belum dapat dimulai.");
    }
  };
  const disconnectDrive = async () => {
    setDriveTesting(true);
    try {
      await adminData("/api/v1/diklat/admin/drive/oauth/disconnect", { method: "POST", headers: authHeaders() });
      await loadDriveStatus();
      success("Akun Google Drive telah dilepaskan.");
    } catch (error) { failure(error, "Akun Google Drive belum dapat dilepaskan."); }
    finally { setDriveTesting(false); }
  };
  useEffect(() => {
    const receiveDriveOAuth = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "diklat-drive-oauth") return;
      setDriveConnecting(false);
      void adminData<DriveStatus>("/api/v1/diklat/admin/drive/status", { headers: authHeaders() })
        .then(setDriveStatus)
        .catch(() => {});
      if (event.data.success) success(String(event.data.message || "Google Drive terhubung."));
      else failure(new Error(String(event.data.message || "Login Google belum berhasil.")), "Koneksi Google Drive gagal.");
    };
    window.addEventListener("message", receiveDriveOAuth);
    return () => window.removeEventListener("message", receiveDriveOAuth);
  }, []);
  const reconcileDriveFiles = async () => {
    setDriveReconciling(true);
    try {
      const data = await adminData<DriveStatus>("/api/v1/diklat/admin/drive/reconcile", {
        method: "POST", headers: jsonHeaders(), body: JSON.stringify({ cursor: driveCursor }),
      });
      setDriveStatus(data);
      setDriveCursor(data.nextCursor || "");
      success(data.remaining
        ? `${data.checked || 0} berkas diperiksa. Masih ada ${data.remaining} berkas untuk diperiksa.`
        : `${data.checked || 0} berkas diperiksa. ${data.newlyMissing || 0} berkas tidak ditemukan, ${data.restored || 0} berkas dipulihkan.`);
    } catch (error) { failure(error, "Pemeriksaan berkas Drive belum berhasil."); }
    finally { setDriveReconciling(false); }
  };
  const updateFilter = (key: keyof typeof filters, value: string) => { setFilters(current => ({ ...current, [key]: value })); setSubmissionPage(1); };
  const overviewCards: Array<{ label: string; value: number; Icon: typeof Activity }> = [
    { label: "Total diklat", value: overview?.stats.trainings ?? 0, Icon: GraduationCap },
    { label: "Diklat aktif", value: overview?.stats.activeTrainings ?? 0, Icon: Activity },
    { label: "Materi", value: overview?.stats.materials ?? 0, Icon: BookOpen },
    { label: "LKPD", value: overview?.stats.lkpd ?? 0, Icon: File },
    { label: "Pengumpulan", value: overview?.stats.submissions ?? 0, Icon: ClipboardList },
  ];

  const navItems: Array<{ id: AdminSection; label: string; icon: typeof Activity }> = [
    { id: "dashboard", label: "Ringkasan", icon: Activity },
    { id: "trainings", label: "Diklat & dokumen", icon: GraduationCap },
    { id: "submissions", label: "Pengumpulan", icon: ClipboardList },
    { id: "audit", label: "Audit aktivitas", icon: History },
    { id: "settings", label: "Pengaturan", icon: Settings },
  ];

  return <div className={`admin-diklat min-h-[480px] rounded-3xl p-3 text-left sm:p-5 lg:p-7 ${dark ? "bg-[#0b1a27] text-[#eaf0ed]" : "bg-[#f3f5f2] text-[#233e53]"}`}>
    <div className="mx-auto max-w-[1500px]">
      <div className={`mb-5 flex flex-col justify-between gap-4 rounded-2xl border px-5 py-5 sm:flex-row sm:items-center sm:px-7 ${dark ? "border-white/10 bg-[#102333]" : "border-[#dce5e5] bg-[#fffefa]"}`}>
        <div className="flex items-center gap-4"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${dark ? "bg-[#d7bd7c]/10 text-[#d7bd7c]" : "bg-[#e8eef0] text-[#365a73]"}`}><GraduationCap size={22} /></span><div><p className={`text-[10px] font-extrabold uppercase tracking-[.18em] ${dark ? "text-[#d1b66f]" : "text-[#8b713e]"}`}>SMKN 1 Wonogiri</p><h1 className={`mt-1 text-xl font-extrabold tracking-tight ${dark ? "text-white" : "text-[#183650]"}`}>Pengelolaan Pusat Diklat</h1><p className={`mt-1 text-xs ${palette.muted}`}>Kelola program, dokumen pembelajaran, dan riwayat pengumpulan.</p></div></div>
        <button onClick={() => void reload()} disabled={loading} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${palette.button}`}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Muat ulang</button>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Menu pengelolaan diklat">
        {navItems.map(item => <button role="tab" aria-selected={section === item.id} key={item.id} onClick={() => setSection(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold transition ${section === item.id ? "bg-[#173653] text-white shadow-sm" : dark ? "border border-white/10 bg-white/[.035] text-slate-300 hover:bg-white/[.07]" : "border border-[#dce4e5] bg-[#fffefa] text-[#617583] hover:bg-[#edf2f1]"}`}><item.icon size={15} />{item.label}</button>)}
      </div>
      {notice && <div role={notice.type === "error" ? "alert" : "status"} className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? dark ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-[#b9d8c5] bg-[#eaf4ed] text-[#356849]" : dark ? "border-rose-300/20 bg-rose-300/10 text-rose-200" : "border-[#e8c9c2] bg-[#fbefec] text-[#984c3f]"}`}><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Tutup pemberitahuan"><X size={16} /></button></div>}
      {loading ? <PanelCard dark={dark} className="animate-pulse p-8"><div className={`h-5 w-48 rounded ${dark ? "bg-white/10" : "bg-[#e6ebeb]"}`} /><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(n => <div key={n} className={`h-24 rounded-xl ${dark ? "bg-white/5" : "bg-[#eef1ef]"}`} />)}</div></PanelCard> : !overview ? <PanelCard dark={dark} className="p-8"><div className="mx-auto max-w-xl text-center"><HardDrive className="mx-auto text-[#b58b43]" size={25} /><h2 className={`mt-3 font-bold ${palette.text}`}>Data Pusat Diklat belum tersedia</h2><p className={`mt-1 text-sm ${palette.muted}`}>Periksa sesi administrator dan koneksi layanan, lalu coba muat kembali.</p><button onClick={() => void reload()} className="mt-4 rounded-lg bg-[#173653] px-4 py-2 text-sm font-bold text-white">Coba lagi</button></div></PanelCard> : <>
        {section === "dashboard" && <section>
          <SectionHeading eyebrow="Ikhtisar operasional" title="Ringkasan Pusat Diklat" detail="Pantau publikasi kegiatan, kelengkapan dokumen, dan alur pengumpulan terbaru." dark={dark}>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${overview.drive.connected ? dark ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-[#c0dec9] bg-[#edf5ef] text-[#356849]" : dark ? "border-amber-300/20 bg-amber-300/10 text-amber-100" : "border-[#ead9b8] bg-[#fbf5e8] text-[#80622b]"}`}><span className={`h-2 w-2 rounded-full ${overview.drive.connected ? "bg-emerald-500" : "bg-amber-500"}`} />Drive {overview.drive.connected ? "terhubung" : overview.drive.configured ? "perlu pemeriksaan" : "belum dikonfigurasi"}</span>
          </SectionHeading>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {overviewCards.map(({ label, value, Icon }) => <PanelCard key={label} dark={dark} className="p-4"><div className="flex items-center justify-between"><p className={`text-xs font-semibold ${palette.muted}`}>{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${dark ? "bg-white/[.06] text-[#d1b66f]" : "bg-[#eaf0ef] text-[#557589]"}`}><Icon size={17} /></span></div><p className={`mt-4 text-3xl font-extrabold tracking-tight ${palette.text}`}>{value}</p></PanelCard>)}
          </div>
          <PanelCard dark={dark} className="mt-5 overflow-hidden">
            <div className={`flex flex-col justify-between gap-3 border-b px-5 py-4 sm:flex-row sm:items-center ${dark ? "border-white/10" : "border-[#e2e8e8]"}`}><div><h3 className={`font-extrabold ${palette.text}`}>Pengumpulan terbaru</h3><p className={`mt-1 text-xs ${palette.muted}`}>Data peserta hanya terlihat di area administrator.</p></div><button onClick={() => setSection("submissions")} className="text-sm font-bold text-[#b08b45]">Semua pengumpulan <ArrowRightIcon /></button></div>
            {overview.recentSubmissions?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className={dark ? "bg-white/[.025] text-slate-400" : "bg-[#f7f8f5] text-[#7b8990]"}><tr>{["Referensi / peserta", "Diklat & tugas", "Instansi", "Waktu", "Status"].map(head => <th key={head} className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider">{head}</th>)}</tr></thead><tbody className={`divide-y ${dark ? "divide-white/5" : "divide-[#edf0ef]"}`}>{overview.recentSubmissions.map(item => <tr key={item.id}><td className="px-5 py-4"><p className={`font-bold ${palette.text}`}>{item.reference}</p><p className={`mt-1 text-xs ${palette.muted}`}>{item.fullName}</p></td><td className="px-5 py-4"><p className={`font-semibold ${palette.text}`}>{item.trainingName}</p><p className={`mt-1 text-xs ${palette.muted}`}>{item.taskName}</p></td><td className={`px-5 py-4 text-xs ${palette.muted}`}>{item.institution}</td><td className={`px-5 py-4 text-xs ${palette.muted}`}>{dateText(item.submittedAt)}</td><td className="px-5 py-4"><StatusBadge dark={dark} status={item.status} /></td></tr>)}</tbody></table></div> : <AdminTableEmpty text="Belum ada pengumpulan untuk ditampilkan." dark={dark} />}
          </PanelCard>
        </section>}

        {section === "trainings" && <section>
          <SectionHeading eyebrow="Manajemen konten" title="Diklat, materi & tugas" detail="Setiap perubahan publikasi dan pengarsipan tetap mempertahankan riwayat kegiatan." dark={dark}>
            <button onClick={startCreateTraining} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173653] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#244d6b]"><Plus size={16} /> Buat diklat</button>
          </SectionHeading>
          <PanelCard dark={dark} className="overflow-hidden">
            {trainings.length ? <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className={dark ? "bg-white/[.025] text-slate-400" : "bg-[#f7f8f5] text-[#7b8990]"}><tr>{["Nama diklat", "Periode", "Materi / LKPD", "Pengumpulan", "Status", "Tindakan"].map(head => <th key={head} className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider">{head}</th>)}</tr></thead><tbody className={`divide-y ${dark ? "divide-white/5" : "divide-[#edf0ef]"}`}>{trainings.map(item => <tr key={item.id} className={selectedTrainingId === item.id ? dark ? "bg-white/[.04]" : "bg-[#f1f5f2]" : ""}>
              <td className="px-4 py-4"><button onClick={() => setSelectedTrainingId(item.id)} className={`text-left font-extrabold hover:text-[#bc9852] ${palette.text}`}>{item.title}</button><p className={`mt-1 text-xs ${palette.muted}`}>{item.category || "Tanpa kategori"} · {item.year || "Tahun belum diatur"}</p></td>
              <td className={`px-4 py-4 text-xs ${palette.muted}`}>{item.period || "—"}</td><td className={`px-4 py-4 text-xs ${palette.muted}`}>{item.counts?.materials || 0} materi · {item.counts?.lkpd || 0} LKPD</td><td className={`px-4 py-4 text-xs ${palette.muted}`}>{item.counts?.submissions || 0}</td>
              <td className="px-4 py-4"><StatusBadge dark={dark} status={item.status} /></td>
              <td className="px-4 py-4"><div className="flex items-center gap-1"><button title="Kelola materi dan tugas" aria-label={`Kelola ${item.title}`} onClick={() => setSelectedTrainingId(item.id)} className={`rounded-lg p-2 ${palette.muted} hover:bg-[#bd9b58]/10 hover:text-[#a57c31]`}><FolderOpen size={16} /></button><button title="Edit diklat" aria-label={`Edit ${item.title}`} onClick={() => startEditTraining(item)} className={`rounded-lg p-2 ${palette.muted} hover:bg-[#bd9b58]/10 hover:text-[#a57c31]`}><Pencil size={16} /></button>
                {item.status === "DRAFT" && <><button title="Terbitkan" aria-label={`Terbitkan ${item.title}`} onClick={() => void changeTrainingStatus(item, "PUBLISHED")} className="rounded-lg px-2 py-1.5 text-[10px] font-extrabold text-emerald-600 hover:bg-emerald-500/10">Terbitkan</button><button title="Hapus draft" aria-label={`Hapus ${item.title}`} onClick={() => void deleteTraining(item)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={15} /></button></>}
                {item.status === "PUBLISHED" && <button title="Arsipkan" aria-label={`Arsipkan ${item.title}`} onClick={() => void changeTrainingStatus(item, "ARCHIVED")} className="rounded-lg p-2 text-[#a47f35] hover:bg-[#bd9b58]/10"><Archive size={15} /></button>}
                {item.status === "ARCHIVED" && <button title="Terbitkan kembali" aria-label={`Terbitkan kembali ${item.title}`} onClick={() => void changeTrainingStatus(item, "PUBLISHED")} className="rounded-lg px-2 py-1.5 text-[10px] font-extrabold text-[#4b7892] hover:bg-[#4b7892]/10">Terbitkan</button>}
              </div></td></tr>)}</tbody></table></div> : <div className="p-5"><AdminTableEmpty text="Belum ada data diklat. Buat diklat pertama untuk mulai mengelola kegiatan." dark={dark} /></div>}
          </PanelCard>
          {selectedTraining && <div className="mt-5">
            <PanelCard dark={dark} className="p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-3 border-b border-current/10 pb-4 sm:flex-row sm:items-start"><div><p className={`text-[10px] font-extrabold uppercase tracking-[.18em] ${dark ? "text-[#d1b66f]" : "text-[#8b713e]"}`}>Ruang pengelolaan kegiatan</p><h3 className={`mt-1 text-xl font-extrabold ${palette.text}`}>{selectedTraining.title}</h3><p className={`mt-1 text-xs ${palette.muted}`}>Dokumen dan jenis tugas disajikan dari informasi yang dapat diakses oleh endpoint detail publik.</p></div><button onClick={() => setSelectedTrainingId("")} className={`inline-flex items-center gap-1 self-start text-xs font-bold ${palette.muted}`}><X size={14} /> Tutup</button></div>
              {detailLoading ? <div className="mt-5 animate-pulse space-y-3" aria-busy="true"><div className={`h-12 rounded-xl ${dark ? "bg-white/5" : "bg-[#eef1ef]"}`} /><div className={`h-12 rounded-xl ${dark ? "bg-white/5" : "bg-[#eef1ef]"}`} /></div> : detailWarning ? <div role="status" className={`mt-4 rounded-xl border p-4 text-sm ${dark ? "border-amber-300/15 bg-amber-300/5 text-amber-100" : "border-[#ead9b8] bg-[#fbf5e8] text-[#80622b]"}`}>{detailWarning} Pengelolaan yang memerlukan daftar lama mungkin terbatas oleh kontrak API saat ini.</div> : <div className="mt-5 grid gap-6 xl:grid-cols-2">
                <div>
                  <h4 className={`mb-3 flex items-center gap-2 text-sm font-extrabold ${palette.text}`}><ClipboardList size={16} className="text-[#bd9852]" /> Jenis tugas</h4>
                  <form onSubmit={saveTaskType} className={`mb-3 rounded-xl border p-4 ${dark ? "border-white/10 bg-white/[.02]" : "border-[#e2e8e8] bg-[#fafbf8]"}`}>
                    <div className="mb-3 flex items-center justify-between"><p className={`text-xs font-bold ${palette.muted}`}>{editingTask ? "Ubah jenis tugas" : "Tambah jenis tugas"}</p>{editingTask && <button type="button" onClick={() => { setEditingTask(null); setTaskDraft(emptyTask); }} className={`text-xs ${palette.muted}`}>Batal edit</button>}</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={`text-xs font-semibold ${palette.muted}`}>Nama tugas<input required maxLength={100} value={taskDraft.name} onChange={e => setTaskDraft({ ...taskDraft, name: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
                      <label className={`text-xs font-semibold ${palette.muted}`}>Urutan<input type="number" value={taskDraft.sortOrder} onChange={e => setTaskDraft({ ...taskDraft, sortOrder: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
                      <label className={`text-xs font-semibold ${palette.muted}`}>Tenggat<input type="datetime-local" value={taskDraft.deadline} onChange={e => setTaskDraft({ ...taskDraft, deadline: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
                      <label className={`text-xs font-semibold ${palette.muted}`}>Batas ukuran (MB)<input type="number" min="1" step="1" value={taskDraft.maxFileSizeMb} onChange={e => setTaskDraft({ ...taskDraft, maxFileSizeMb: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
                      <label className={`text-xs font-semibold sm:col-span-2 ${palette.muted}`}>Jenis MIME diizinkan <span className="font-normal">(pisahkan dengan koma)</span><input value={taskDraft.allowedMimeTypes} onChange={e => setTaskDraft({ ...taskDraft, allowedMimeTypes: e.target.value })} className={`${palette.input} mt-1.5`} placeholder="application/pdf, image/jpeg" /></label>
                      <label className={`text-xs font-semibold sm:col-span-2 ${palette.muted}`}>Keterangan<textarea rows={2} value={taskDraft.description} onChange={e => setTaskDraft({ ...taskDraft, description: e.target.value })} className={`${palette.input} mt-1.5 resize-y`} /></label>
                      <label className={`inline-flex items-center gap-2 text-xs font-semibold ${palette.muted}`}><input type="checkbox" checked={taskDraft.active} onChange={e => setTaskDraft({ ...taskDraft, active: e.target.checked })} className="accent-[#315d78]" /> Aktif bagi peserta</label>
                    </div>
                    <button disabled={saving} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#173653] px-3.5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={14} /> : editingTask ? <Check size={14} /> : <Plus size={14} />}{editingTask ? "Simpan perubahan" : "Tambah jenis tugas"}</button>
                  </form>
                  {trainingDetail?.taskTypes?.length ? <div className="space-y-2">{trainingDetail.taskTypes.map(item => <div key={item.id} className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${dark ? "border-white/10" : "border-[#e2e8e8]"}`}><div className="min-w-0 flex-1"><p className={`truncate text-sm font-bold ${palette.text}`}>{item.name}</p><p className={`mt-0.5 text-[10px] ${palette.muted}`}>{item.active ? "Aktif" : "Nonaktif"} · Urutan {item.sortOrder}{item.deadline ? ` · Tenggat ${dateText(item.deadline)}` : ""}</p></div><button aria-label={`Edit ${item.name}`} onClick={() => beginEditTask(item)} className={`rounded-lg p-2 ${palette.muted} hover:text-[#bd9852]`}><Pencil size={15} /></button><button aria-label={`Hapus ${item.name}`} onClick={() => void removeTask(item)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={15} /></button></div>)}</div> : <p className={`rounded-xl border border-dashed p-4 text-xs ${dark ? "border-white/10 text-slate-400" : "border-[#dce4e5] text-[#7b8990]"}`}>Daftar jenis tugas belum tersedia melalui endpoint detail untuk kegiatan ini.</p>}
                </div>
                <div>
                  <h4 className={`mb-3 flex items-center gap-2 text-sm font-extrabold ${palette.text}`}><BookOpen size={16} className="text-[#bd9852]" /> Materi dan LKPD</h4>
                  <form onSubmit={uploadDocument} className={`mb-3 rounded-xl border p-4 ${dark ? "border-white/10 bg-white/[.02]" : "border-[#e2e8e8] bg-[#fafbf8]"}`}>
                    <p className={`mb-3 text-xs font-bold ${palette.muted}`}>Unggah dokumen baru</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={`text-xs font-semibold ${palette.muted}`}>Jenis dokumen<select value={documentDraft.type} onChange={e => setDocumentDraft({ ...documentDraft, type: e.target.value as DocumentDraft["type"] })} className={`${palette.input} mt-1.5`}><option value="MATERIAL">Materi</option><option value="LKPD">LKPD</option></select></label>
                      <label className={`text-xs font-semibold ${palette.muted}`}>Status publikasi<select value={documentDraft.status} onChange={e => setDocumentDraft({ ...documentDraft, status: e.target.value as Status })} className={`${palette.input} mt-1.5`}><option value="DRAFT">Draft</option><option value="PUBLISHED">Terbit</option></select></label>
                      <label className={`text-xs font-semibold sm:col-span-2 ${palette.muted}`}>Judul<input required value={documentDraft.title} onChange={e => setDocumentDraft({ ...documentDraft, title: e.target.value })} className={`${palette.input} mt-1.5`} />{selectedDocumentFiles.length > 1 && <span className="mt-1 block text-[10px] font-normal">Nama berkas otomatis ditambahkan pada judul setiap dokumen.</span>}</label>
                      <label className={`text-xs font-semibold ${palette.muted}`}>Kategori<input value={documentDraft.category} onChange={e => setDocumentDraft({ ...documentDraft, category: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
                      <label className={`text-xs font-semibold ${palette.muted}`}>Urutan<input type="number" value={documentDraft.sortOrder} onChange={e => setDocumentDraft({ ...documentDraft, sortOrder: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
                      <label className={`text-xs font-semibold sm:col-span-2 ${palette.muted}`}>Deskripsi<textarea rows={2} value={documentDraft.description} onChange={e => setDocumentDraft({ ...documentDraft, description: e.target.value })} className={`${palette.input} mt-1.5 resize-y`} /></label>
                      <div className={`sm:col-span-2 text-xs font-semibold ${palette.muted}`}>
                        <p className="mb-1.5">Pilih berkas</p>
                        <div className="space-y-2">
                          {documentFileInputs.map((row, index) => <div key={`${row.id}-${documentFileInputVersion}`} className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <input aria-label={`Pilih berkas ${index + 1}`} type="file" multiple disabled={saving || (documentDraft.type === "MATERIAL" && remainingMaterialSlots === 0)} onChange={event => {
                                const files = Array.from(event.currentTarget.files || []);
                                const otherSelectedCount = selectedDocumentFiles.filter(selected => selected.rowId !== row.id).length;
                                if (documentDraft.type === "MATERIAL" && otherSelectedCount + files.length > remainingMaterialSlots) {
                                  failure(new Error(`Sisa slot materi untuk diklat ini: ${remainingMaterialSlots}. Maksimal ${MAX_TRAINING_MATERIALS} materi per diklat.`), "Batas jumlah materi tercapai.");
                                  event.currentTarget.value = "";
                                  return;
                                }
                                setDocumentFileInputs(current => current.map(item => item.id === row.id ? { ...item, files } : item));
                              }} className={`${palette.input} file:mr-3 file:rounded-lg file:border-0 file:bg-[#edf2f1] file:px-3 file:py-1.5 file:text-xs file:font-bold`} />
                              {row.files.length > 0 && <ul className="mt-1 space-y-1 pl-1 text-[10px] font-normal">
                                {row.files.map((file, fileIndex) => <li key={`${file.name}-${file.size}-${fileIndex}`} className="truncate">{file.name} · {sizeText(file.size)}</li>)}
                              </ul>}
                            </div>
                            {documentFileInputs.length > 1 && <button type="button" disabled={saving} onClick={() => setDocumentFileInputs(current => current.length > 1 ? current.filter(item => item.id !== row.id) : current)} aria-label={`Hapus pilihan berkas ${index + 1}`} className={`rounded-lg border p-2.5 disabled:opacity-50 ${palette.button}`}><X size={15} /></button>}
                          </div>)}
                        </div>
                        <button type="button" disabled={saving || (documentDraft.type === "MATERIAL" && selectedDocumentFiles.length >= remainingMaterialSlots)} onClick={addDocumentFileInput} className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${palette.button}`}><Plus size={14} /> Tambah berkas</button>
                        <p className="mt-1 text-[10px] font-normal">Maksimal 40 MB per berkas; batas portal dapat lebih rendah. Materi maksimal {MAX_TRAINING_MATERIALS} berkas per diklat{documentDraft.type === "MATERIAL" ? ` (sisa ${remainingMaterialSlots})` : ""}.</p>
                        {remainingMaterialSlots === 0 && documentDraft.type === "MATERIAL" && <p role="status" className="mt-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">Batas 10 materi sudah tercapai. LKPD tetap dapat diunggah.</p>}
                        {oversizedDocumentFiles.length > 0 && <p role="alert" className="mt-2 rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">Berkas melebihi batas teknis 40 MB dan tidak akan dikirim: {oversizedDocumentFiles.slice(0, 3).map(({ file }) => file.name).join(", ")}{oversizedDocumentFiles.length > 3 ? `, dan ${oversizedDocumentFiles.length - 3} lainnya` : ""}. Ganti dengan berkas yang lebih kecil.</p>}
                        {tooManyMaterialFiles && <p role="alert" className="mt-2 rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">Jumlah file melebihi sisa batas materi diklat ini.</p>}
                      </div>
                    </div>
                    <button disabled={saving || selectedDocumentFiles.length === 0 || oversizedDocumentFiles.length > 0 || tooManyMaterialFiles} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#173653] px-3.5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={14} /> : <Upload size={14} />} {saving ? "Mengunggah berkas…" : selectedDocumentFiles.length > 1 ? `Unggah ${selectedDocumentFiles.length} dokumen` : "Unggah dokumen"}</button>
                  </form>
                  {trainingDetail?.documents?.length ? <div className="space-y-2">{trainingDetail.documents.map(item => <div key={item.id} className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${dark ? "border-white/10" : "border-[#e2e8e8]"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${dark ? "bg-white/[.05] text-[#d1b66f]" : "bg-[#edf2f1] text-[#557589]"}`}><File size={16} /></span><div className="min-w-0 flex-1"><p className={`truncate text-sm font-bold ${palette.text}`}>{item.title}</p><p className={`mt-0.5 text-[10px] ${palette.muted}`}>{item.type === "LKPD" ? "LKPD" : "Materi"} · {item.driveFileName}</p></div><StatusBadge dark={dark} status={item.status} /><button aria-label={`Edit ${item.title}`} onClick={() => { setEditingDocument(item); setDocumentDraft({ type: item.type, title: item.title, description: item.description || "", category: item.category || "", sortOrder: String(item.sortOrder), status: item.status }); }} className={`rounded-lg p-2 ${palette.muted} hover:text-[#bd9852]`}><Pencil size={15} /></button><button aria-label={`Arsipkan ${item.title}`} onClick={() => void archiveDocument(item)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Archive size={15} /></button></div>)}</div> : <p className={`rounded-xl border border-dashed p-4 text-xs ${dark ? "border-white/10 text-slate-400" : "border-[#dce4e5] text-[#7b8990]"}`}>Daftar dokumen belum tersedia melalui endpoint detail untuk kegiatan ini.</p>}
                </div>
              </div>}
            </PanelCard>
          </div>}
        </section>}

        {section === "submissions" && <section>
          <SectionHeading eyebrow="Riwayat peserta" title="Pengumpulan tugas" detail="Cari, saring, urutkan, dan unduh laporan pengumpulan sesuai kebutuhan." dark={dark}>
            <button onClick={() => void exportSubmissions()} disabled={submissionExporting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173653] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"><FileSpreadsheet size={16} />{submissionExporting ? "Menyiapkan Excel…" : "Ekspor Excel"}</button>
          </SectionHeading>
          <PanelCard dark={dark} className="mb-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className={`text-[10px] font-bold uppercase tracking-wide ${palette.muted}`}><span className="sr-only">Cari pengumpulan</span><span className="relative block"><Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${palette.muted}`} /><input value={filters.q} onChange={e => updateFilter("q", e.target.value)} placeholder="Cari nama atau referensi" className={`${palette.input} pl-9`} /></span></label>
              <select aria-label="Filter diklat" value={filters.trainingId} onChange={e => { updateFilter("trainingId", e.target.value); updateFilter("taskTypeId", ""); }} className={palette.input}><option value="">Semua diklat</option>{trainings.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
               <select aria-label="Filter jenis tugas" value={filters.taskTypeId} onChange={e => updateFilter("taskTypeId", e.target.value)} className={palette.input}><option value="">Semua jenis tugas</option>{submissionTaskTypes.map(item => <option key={item.id} value={item.id}>{item.trainingName ? `${item.trainingName} · ` : ""}{item.name}</option>)}</select>
              <input aria-label="Filter instansi" value={filters.institution} onChange={e => updateFilter("institution", e.target.value)} placeholder="Asal instansi" className={palette.input} />
              <input aria-label="Tanggal mulai" type="date" value={filters.dateFrom} onChange={e => updateFilter("dateFrom", e.target.value)} className={palette.input} />
              <input aria-label="Tanggal akhir" type="date" value={filters.dateTo} onChange={e => updateFilter("dateTo", e.target.value)} className={palette.input} />
              <select aria-label="Filter status" value={filters.status} onChange={e => updateFilter("status", e.target.value)} className={palette.input}><option value="">Semua status</option><option value="STORED">Tersimpan</option><option value="FAILED">Gagal</option></select>
              <div className="flex gap-2"><select aria-label="Urutkan berdasarkan" value={filters.sortBy} onChange={e => updateFilter("sortBy", e.target.value)} className={palette.input}><option value="submittedAt">Waktu kirim</option><option value="fullName">Nama peserta</option><option value="reference">Referensi</option></select><button aria-label="Balik urutan" onClick={() => updateFilter("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc")} className={`shrink-0 rounded-xl border px-3 ${palette.button}`}><ArrowUpDown size={16} /></button></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className={`text-xs ${palette.muted}`}>{submissionPagination ? `${submissionPagination.total} catatan ditemukan` : "Penyaring diterapkan pada server."}</p><button onClick={() => { setFilters({ q: "", trainingId: "", taskTypeId: "", institution: "", status: "", dateFrom: "", dateTo: "", sortBy: "submittedAt", sortOrder: "desc" }); setSubmissionPage(1); }} className="text-xs font-bold text-[#b08b45]">Bersihkan filter</button></div>
          </PanelCard>
          <PanelCard dark={dark} className="overflow-hidden">
            {submissionLoading ? <div className="space-y-4 p-5" aria-busy="true">{[1, 2, 3, 4].map(n => <div key={n} className={`h-12 animate-pulse rounded-xl ${dark ? "bg-white/5" : "bg-[#eef1ef]"}`} />)}</div> : submissionItems.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-xs"><thead className={dark ? "bg-white/[.025] text-slate-400" : "bg-[#f7f8f5] text-[#7b8990]"}><tr>{["Referensi / tanggal", "Peserta / NIP", "Diklat / tugas", "Instansi", "File", "Status", ""].map(head => <th key={head} className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider">{head}</th>)}</tr></thead><tbody className={`divide-y ${dark ? "divide-white/5" : "divide-[#edf0ef]"}`}>{submissionItems.map(item => <tr key={item.id}><td className="px-4 py-4"><p className={`font-bold ${palette.text}`}>{item.reference}</p><p className={`mt-1 ${palette.muted}`}>{dateText(item.submittedAt)}</p></td><td className="px-4 py-4"><p className={`font-bold ${palette.text}`}>{item.fullName}</p><p className={`mt-1 ${palette.muted}`}>NIP: {item.nip || "—"}</p></td><td className="px-4 py-4"><p className={`max-w-[220px] truncate font-semibold ${palette.text}`}>{item.trainingName}</p><p className={`mt-1 ${palette.muted}`}>{item.taskName}</p></td><td className={`max-w-[180px] truncate px-4 py-4 ${palette.muted}`}>{item.institution}</td><td className="px-4 py-4"><p className={`max-w-[190px] truncate font-semibold ${palette.text}`}>{item.fileName}</p><p className={`mt-1 ${palette.muted}`}>{sizeText(item.sizeBytes)}</p></td><td className="px-4 py-4"><StatusBadge dark={dark} status={item.status} /></td><td className="px-4 py-4"><button onClick={() => void downloadSubmissionFile(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#bd9852]/25 px-3 py-2 font-bold text-[#bc9852] hover:bg-[#bd9852]/10"><Download size={14} /> File</button></td></tr>)}</tbody></table></div> : <div className="p-5"><AdminTableEmpty text="Tidak ada pengumpulan untuk filter ini." dark={dark} /></div>}
            {submissionPagination && <Pager page={submissionPagination.page} totalPages={submissionPagination.totalPages} onChange={setSubmissionPage} dark={dark} />}
          </PanelCard>
        </section>}

        {section === "audit" && <section>
          <SectionHeading eyebrow="Akuntabilitas" title="Audit aktivitas" detail="Riwayat perubahan administratif tercatat oleh server." dark={dark} />
          <PanelCard dark={dark} className="overflow-hidden">
            {auditLoading ? <div className="space-y-4 p-5" aria-busy="true">{[1, 2, 3].map(n => <div key={n} className={`h-16 animate-pulse rounded-xl ${dark ? "bg-white/5" : "bg-[#eef1ef]"}`} />)}</div> : auditItems.length ? <div className="divide-y divide-current/10">{auditItems.map((item, index) => <article key={`${item.entityId}-${item.createdAt}-${index}`} className="flex gap-4 px-5 py-4"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${dark ? "bg-white/[.05] text-[#d1b66f]" : "bg-[#edf2f1] text-[#557589]"}`}><History size={17} /></span><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row"><p className={`font-bold ${palette.text}`}>{item.action} <span className={`font-medium ${palette.muted}`}>· {item.entity}</span></p><time className={`text-xs ${palette.muted}`}>{dateText(item.createdAt)}</time></div><p className={`mt-1 text-xs ${palette.muted}`}>Pelaku: {item.actor || "Tidak dicantumkan"} · ID objek: {item.entityId}</p>{item.metadata != null && <details className="mt-2"><summary className={`cursor-pointer text-xs font-bold ${dark ? "text-slate-300" : "text-[#557589]"}`}>Lihat metadata</summary><pre className={`mt-2 max-h-40 overflow-auto rounded-lg p-3 text-[10px] ${dark ? "bg-black/20 text-slate-300" : "bg-[#f2f4f2] text-[#5c6d77]"}`}>{JSON.stringify(item.metadata, null, 2)}</pre></details>}</div></article>)}</div> : <div className="p-5"><AdminTableEmpty text="Belum ada aktivitas audit." dark={dark} /></div>}
            {auditPagination && <Pager page={auditPagination.page} totalPages={auditPagination.totalPages} onChange={setAuditPage} dark={dark} />}
          </PanelCard>
        </section>}

        {section === "settings" && <section>
          <SectionHeading eyebrow="Konfigurasi modul" title="Pengaturan portal" detail="Atur tampilan publik, ketentuan berkas, kebijakan akses, dan status integrasi Drive." dark={dark} />
          {settingsLoading ? <PanelCard dark={dark} className="animate-pulse p-7"><div className={`h-5 w-56 rounded ${dark ? "bg-white/10" : "bg-[#e6ebeb]"}`} /><div className={`mt-6 h-36 rounded-xl ${dark ? "bg-white/5" : "bg-[#eef1ef]"}`} /></PanelCard> : settings && <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            <PanelCard dark={dark} className="p-5 sm:p-7">
              <form onSubmit={saveSettings}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={`text-xs font-bold sm:col-span-2 ${palette.muted}`}>Judul portal<input required value={settings.title} onChange={e => setSettings({ ...settings, title: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
                  <label className={`text-xs font-bold sm:col-span-2 ${palette.muted}`}>Deskripsi portal<textarea rows={4} value={settings.description} onChange={e => setSettings({ ...settings, description: e.target.value })} className={`${palette.input} mt-1.5 resize-y`} /></label>
                  <label className={`text-xs font-bold ${palette.muted}`}>Batas ukuran unggahan (MB)<input required type="number" min="1" max="40" value={settings.maxFileSizeMb} onChange={e => setSettings({ ...settings, maxFileSizeMb: Number(e.target.value) })} className={`${palette.input} mt-1.5`} /><span className="mt-1 block text-[10px] font-normal">Batas teknis maksimum: 40 MB per file.</span></label>
                  <label className={`text-xs font-bold ${palette.muted}`}>Akses file hasil tugas<select value={settings.submissionDriveAccess} onChange={e => setSettings({ ...settings, submissionDriveAccess: e.target.value as SettingsData["submissionDriveAccess"] })} className={`${palette.input} mt-1.5`}><option value="PRIVATE">Privat</option><option value="LINK">Tautan individual</option></select></label>
                  <label className={`text-xs font-bold sm:col-span-2 ${palette.muted}`}>Jenis MIME yang diizinkan <span className="font-normal">(pisahkan dengan koma)</span><input value={settings.allowedMimeTypes.join(", ")} onChange={e => setSettings({ ...settings, allowedMimeTypes: e.target.value.split(",").map(item => item.trim()).filter(Boolean) })} className={`${palette.input} mt-1.5`} /></label>
                  <label className={`text-xs font-bold sm:col-span-2 ${palette.muted}`}>Ekstensi yang diizinkan <span className="font-normal">(pisahkan dengan koma)</span><input value={settings.allowedExtensions.join(", ")} onChange={e => setSettings({ ...settings, allowedExtensions: e.target.value.split(",").map(item => item.trim()).filter(Boolean) })} className={`${palette.input} mt-1.5`} /></label>
                  <label className={`text-xs font-bold sm:col-span-2 ${palette.muted}`}>ID folder induk Drive<input value={settings.rootFolderId} onChange={e => setSettings({ ...settings, rootFolderId: e.target.value })} className={`${palette.input} mt-1.5`} /><span className="mt-1 block text-[10px] font-normal">ID folder bukan kredensial. Jangan masukkan token atau rahasia integrasi.</span></label>
                  <div className={`space-y-3 rounded-xl border p-4 sm:col-span-2 ${dark ? "border-white/10" : "border-[#e2e8e8]"}`}>
                    <label className={`flex items-center gap-3 text-sm font-semibold ${palette.text}`}><input type="checkbox" checked={settings.archiveVisible} onChange={e => setSettings({ ...settings, archiveVisible: e.target.checked })} className="h-4 w-4 accent-[#315d78]" /> Tampilkan arsip kepada publik</label>
                    <label className={`flex items-center gap-3 text-sm font-semibold ${palette.text}`}><input type="checkbox" checked={settings.submissionsEnabled} onChange={e => setSettings({ ...settings, submissionsEnabled: e.target.checked })} className="h-4 w-4 accent-[#315d78]" /> Izinkan pengumpulan tugas</label>
                  </div>
                </div>
                <button disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#173653] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />} Simpan pengaturan</button>
              </form>
            </PanelCard>
            <div className="space-y-5">
              <PanelCard dark={dark} className="p-5">
                <div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${dark ? "bg-white/[.05] text-[#d1b66f]" : "bg-[#edf2f1] text-[#557589]"}`}><Cloud size={18} /></span><div><h3 className={`font-extrabold ${palette.text}`}>Google Drive</h3><p className={`text-xs ${palette.muted}`}>Status dari layanan server</p></div></div>
                {driveStatus ? <div className="mt-5 space-y-3"><div className={`flex items-center justify-between rounded-xl p-3 ${dark ? "bg-white/[.04]" : "bg-[#f4f6f3]"}`}><span className={`text-xs ${palette.muted}`}>Konfigurasi</span><StatusBadge dark={dark} status={driveStatus.configured ? "SIAP" : "BELUM SIAP"} /></div><div className={`flex items-center justify-between rounded-xl p-3 ${dark ? "bg-white/[.04]" : "bg-[#f4f6f3]"}`}><span className={`text-xs ${palette.muted}`}>Koneksi</span><StatusBadge dark={dark} status={driveStatus.connected ? "TERHUBUNG" : "BELUM TERHUBUNG"} /></div><p className={`text-xs leading-5 ${palette.muted}`}>{driveStatus.message || "Belum ada pesan status dari server."}</p><div className={`grid grid-cols-2 gap-2 text-xs ${palette.muted}`}><p>Berkas perlu verifikasi <strong className={palette.text}>{driveStatus.filesToVerify}</strong></p><p>Berkas tidak ditemukan <strong className={palette.text}>{driveStatus.missingFiles}</strong></p></div></div> : <p className={`mt-4 text-sm ${palette.muted}`}>Status Drive belum dapat diverifikasi.</p>}
                  {driveStatus?.oauthConnected
                    ? <button onClick={() => void disconnectDrive()} disabled={driveTesting} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50 ${palette.button}`}>{driveTesting ? <LoaderCircle size={15} className="animate-spin" /> : <X size={15} />} Putuskan akun Google</button>
                    : <button onClick={() => void connectDrive()} disabled={driveConnecting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173653] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">{driveConnecting ? <LoaderCircle size={15} className="animate-spin" /> : <Cloud size={15} />} Hubungkan Google Drive</button>}
                  {!driveStatus?.oauthAvailable && <p className={`mt-2 text-[10px] leading-4 ${palette.muted}`}>Login popup memerlukan OAuth Google yang dikonfigurasi pada environment server. Kredensial tidak disimpan di kode aplikasi.</p>}
                  <button onClick={() => void testDrive()} disabled={driveTesting} className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50 ${palette.button}`}>{driveTesting ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />} Uji koneksi Drive</button>
                 <button onClick={() => void reconcileDriveFiles()} disabled={driveReconciling || !driveStatus?.connected} className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${palette.button}`}>{driveReconciling ? <LoaderCircle size={15} className="animate-spin" /> : <ShieldCheck size={15} />}{driveCursor ? "Lanjutkan verifikasi berkas" : "Verifikasi berkas di Drive"}</button>
              </PanelCard>
              <PanelCard dark={dark} className="p-5">
                <div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${(driveStatus?.connected ?? settings.driveConnected) ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-600"}`}><ShieldCheck size={18} /></span><div><h3 className={`font-extrabold ${palette.text}`}>Ringkasan konfigurasi</h3><p className={`text-xs ${palette.muted}`}>Tidak ada rahasia yang ditampilkan di halaman ini.</p></div></div>
                <p className={`mt-4 text-xs leading-5 ${palette.muted}`}>{driveStatus?.message || settings.driveMessage || "Status koneksi hanya dinyatakan aktif jika dikonfirmasi oleh server."}</p>
                <div className={`mt-4 flex items-center justify-between border-t pt-3 text-xs ${dark ? "border-white/10" : "border-[#e5eae9]"} ${palette.muted}`}><span>Akses penyimpanan</span><strong className={palette.text}>{settings.submissionDriveAccess === "PRIVATE" ? "Privat" : "Tautan individual"}</strong></div>
              </PanelCard>
            </div>
          </div>}
        </section>}
      </>}
    </div>

    {trainingDialog && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0d2030]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) closeTrainingDialog(); }}>
      <form onSubmit={saveTraining} className={`max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border p-5 shadow-2xl sm:rounded-3xl sm:p-7 ${dark ? "border-white/10 bg-[#13293a]" : "border-[#dce4e5] bg-[#fffefa]"}`} aria-labelledby="training-dialog-title">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#8b713e]">Data kegiatan</p><h2 id="training-dialog-title" className={`mt-1 text-xl font-extrabold ${palette.text}`}>{editingTraining ? "Edit diklat" : "Buat diklat"}</h2></div><button type="button" disabled={saving} onClick={closeTrainingDialog} aria-label="Tutup formulir" className={`rounded-lg p-2 disabled:opacity-50 ${palette.muted}`}><X size={18} /></button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className={`text-xs font-bold sm:col-span-2 ${palette.muted}`}>Nama diklat<input required maxLength={180} value={trainingDraft.title} onChange={e => setTrainingDraft({ ...trainingDraft, title: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
          <label className={`text-xs font-bold sm:col-span-2 ${palette.muted}`}>Ringkasan<textarea rows={2} value={trainingDraft.summary} onChange={e => setTrainingDraft({ ...trainingDraft, summary: e.target.value })} className={`${palette.input} mt-1.5 resize-y`} /></label>
          <label className={`text-xs font-bold sm:col-span-2 ${palette.muted}`}>Deskripsi<textarea rows={4} value={trainingDraft.description} onChange={e => setTrainingDraft({ ...trainingDraft, description: e.target.value })} className={`${palette.input} mt-1.5 resize-y`} /></label>
          <div className={`rounded-xl border p-4 sm:col-span-2 ${dark ? "border-white/10 bg-white/[.02]" : "border-[#e2e8e8] bg-[#fafbf8]"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className={`flex items-center gap-2 text-xs font-extrabold ${palette.text}`}><ImageIcon size={15} className="text-[#bd9852]" /> Foto kegiatan <span className={`font-semibold ${palette.muted}`}>({trainingPhotoEntries.length}/{MAX_TRAINING_PHOTOS})</span></p>
                <p className={`mt-1 text-[10px] leading-4 ${palette.muted}`}>Foto pertama menjadi banner depan. Maksimal 6 foto, 20 MB per foto. Foto dioptimalkan sebelum disimpan agar halaman publik lebih ringan.</p></div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#dce4e5] bg-white px-3 py-2 text-xs font-bold text-[#456378] hover:bg-[#f2f5f3]">
                <Plus size={14} /> Pilih foto
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={saving || trainingPhotoEntries.length >= MAX_TRAINING_PHOTOS} onChange={event => {
                  addTrainingPhotos(Array.from(event.currentTarget.files || []));
                  event.currentTarget.value = "";
                }} className="sr-only" />
              </label>
            </div>
            {trainingPhotoEntries.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {trainingPhotoEntries.map((entry, index) => <div key={entry.key} className={`overflow-hidden rounded-xl border ${dark ? "border-white/10 bg-black/10" : "border-[#dce4e5] bg-white"}`}>
                <div className="relative aspect-[4/3]">
                  <TrainingPhotoPreview entry={entry} dark={dark} />
                  {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-[#173653]/90 px-2 py-1 text-[9px] font-extrabold text-white">Banner depan</span>}
                </div>
                <div className="flex items-center gap-1 p-2">
                  <span className={`min-w-0 flex-1 truncate text-[10px] ${palette.muted}`} title={entry.photo?.fileName || entry.file?.name}>{entry.photo?.fileName || entry.file?.name || "Foto"}</span>
                  <button type="button" disabled={saving || index === 0} onClick={() => moveTrainingPhoto(index, -1)} aria-label="Jadikan foto lebih awal" className={`rounded-md p-1.5 disabled:opacity-30 ${palette.muted}`}><ArrowUp size={14} /></button>
                  <button type="button" disabled={saving || index === trainingPhotoEntries.length - 1} onClick={() => moveTrainingPhoto(index, 1)} aria-label="Pindahkan foto ke urutan berikutnya" className={`rounded-md p-1.5 disabled:opacity-30 ${palette.muted}`}><ArrowDown size={14} /></button>
                  <button type="button" disabled={saving} onClick={() => removeTrainingPhoto(entry)} aria-label="Hapus foto dari diklat" className="rounded-md p-1.5 text-rose-500 disabled:opacity-30"><X size={14} /></button>
                </div>
              </div>)}
            </div>}
          </div>
          <label className={`text-xs font-bold ${palette.muted}`}>Kategori<input value={trainingDraft.category} onChange={e => setTrainingDraft({ ...trainingDraft, category: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
          <label className={`text-xs font-bold ${palette.muted}`}>Periode<input value={trainingDraft.period} onChange={e => setTrainingDraft({ ...trainingDraft, period: e.target.value })} className={`${palette.input} mt-1.5`} placeholder="Misalnya: Mei–Juni" /></label>
          <label className={`text-xs font-bold ${palette.muted}`}>Tahun<input type="number" min="2000" max="2100" value={trainingDraft.year} onChange={e => setTrainingDraft({ ...trainingDraft, year: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
          <label className={`text-xs font-bold ${palette.muted}`}>Urutan tampil<input type="number" value={trainingDraft.sortOrder} onChange={e => setTrainingDraft({ ...trainingDraft, sortOrder: e.target.value })} className={`${palette.input} mt-1.5`} /></label>
          <label className={`text-xs font-bold ${palette.muted}`}>Status<select value={trainingDraft.status} onChange={e => setTrainingDraft({ ...trainingDraft, status: e.target.value as Status })} className={`${palette.input} mt-1.5`}><option value="DRAFT">Draft</option><option value="PUBLISHED">Terbit</option><option value="ARCHIVED">Arsip</option></select></label>
          <div className={`space-y-3 rounded-xl border p-4 sm:col-span-2 ${dark ? "border-white/10" : "border-[#e2e8e8]"}`}>
            <label className={`flex items-center gap-3 text-sm font-semibold ${palette.text}`}><input type="checkbox" checked={trainingDraft.acceptsSubmissions} onChange={e => setTrainingDraft({ ...trainingDraft, acceptsSubmissions: e.target.checked })} className="accent-[#315d78]" /> Terima pengumpulan tugas</label>
            <label className={`flex items-center gap-3 text-sm font-semibold ${palette.text}`}><input type="checkbox" checked={trainingDraft.archiveVisible} onChange={e => setTrainingDraft({ ...trainingDraft, archiveVisible: e.target.checked })} className="accent-[#315d78]" /> Izinkan tampil di arsip publik</label>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={closeTrainingDialog} className={`rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50 ${palette.button}`}>Batal</button><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173653] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50">{saving && <LoaderCircle size={15} className="animate-spin" />}{editingTraining ? "Simpan perubahan" : "Buat diklat"}</button></div>
      </form>
    </div>}
    {editingDocument && <div className="fixed inset-0 z-[110] flex items-end justify-center bg-[#0d2030]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">
      <form onSubmit={saveDocumentMetadata} className={`w-full max-w-xl rounded-t-3xl border p-5 shadow-2xl sm:rounded-3xl sm:p-7 ${dark ? "border-white/10 bg-[#13293a]" : "border-[#dce4e5] bg-[#fffefa]"}`}>
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#8b713e]">Metadata dokumen</p><h2 className={`mt-1 text-xl font-extrabold ${palette.text}`}>Edit informasi dokumen</h2></div><button type="button" onClick={() => setEditingDocument(null)} aria-label="Tutup" className={`rounded-lg p-2 ${palette.muted}`}><X size={18} /></button></div>
        <div className="mt-5 space-y-4"><label className={`block text-xs font-bold ${palette.muted}`}>Judul<input required value={documentDraft.title} onChange={e => setDocumentDraft({ ...documentDraft, title: e.target.value })} className={`${palette.input} mt-1.5`} /></label><label className={`block text-xs font-bold ${palette.muted}`}>Deskripsi<textarea rows={3} value={documentDraft.description} onChange={e => setDocumentDraft({ ...documentDraft, description: e.target.value })} className={`${palette.input} mt-1.5`} /></label><div className="grid gap-3 sm:grid-cols-2"><label className={`text-xs font-bold ${palette.muted}`}>Kategori<input value={documentDraft.category} onChange={e => setDocumentDraft({ ...documentDraft, category: e.target.value })} className={`${palette.input} mt-1.5`} /></label><label className={`text-xs font-bold ${palette.muted}`}>Urutan<input type="number" value={documentDraft.sortOrder} onChange={e => setDocumentDraft({ ...documentDraft, sortOrder: e.target.value })} className={`${palette.input} mt-1.5`} /></label></div><label className={`block text-xs font-bold ${palette.muted}`}>Status<select value={documentDraft.status} onChange={e => setDocumentDraft({ ...documentDraft, status: e.target.value as Status })} className={`${palette.input} mt-1.5`}><option value="DRAFT">Draft</option><option value="PUBLISHED">Terbit</option><option value="ARCHIVED">Arsip</option></select></label></div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditingDocument(null)} className={`rounded-xl border px-4 py-3 text-sm font-bold ${palette.button}`}>Batal</button><button disabled={saving} className="rounded-xl bg-[#173653] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50">Simpan perubahan</button></div>
      </form>
    </div>}
  </div>;
}

function Pager({ page, totalPages, onChange, dark }: { page: number; totalPages: number; onChange: (value: number) => void; dark: boolean }) {
  if (totalPages <= 1) return null;
  return <div className={`flex items-center justify-between border-t px-4 py-3 ${dark ? "border-white/10" : "border-[#e4e9e8]"}`}><span className={`text-xs ${dark ? "text-slate-400" : "text-[#76858d]"}`}>Halaman {page} dari {totalPages}</span><div className="flex gap-2"><button aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => onChange(page - 1)} className={`rounded-lg border p-2 disabled:opacity-40 ${dark ? "border-white/10" : "border-[#dce4e5]"}`}><ChevronLeft size={16} /></button><button aria-label="Halaman berikutnya" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={`rounded-lg border p-2 disabled:opacity-40 ${dark ? "border-white/10" : "border-[#dce4e5]"}`}><ChevronRight size={16} /></button></div></div>;
}

function ArrowRightIcon() {
  return <ChevronRight size={14} className="ml-1 inline" />;
}
