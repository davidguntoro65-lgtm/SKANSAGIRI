import crypto from "crypto";
import path from "path";
import { Readable } from "stream";
import type { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import { google } from "googleapis";
import { ReplitConnectors } from "@replit/connectors-sdk";
import * as XLSX from "xlsx";
import { db } from "./db";

type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
type ModuleSettings = {
  id: number;
  title: string;
  description: string;
  submissionsEnabled: boolean;
  archiveVisible: boolean;
  maxFileSizeMb: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  submissionDriveAccess: string;
  rootFolderId: string;
};

const API = "/api/v1/diklat";
const HARD_MAX_FILE_BYTES = 20 * 1024 * 1024;
const PAGE_SIZE_MAX = 50;
const PUBLIC_TRAINING_STATES = new Set(["PUBLISHED", "ARCHIVED"]);
const TRAINING_STATES = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const DOCUMENT_STATES = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const DOCUMENT_TYPES = new Set(["MATERIAL", "LKPD"]);
const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};
const DEFAULT_ALLOWED_MIME_TYPES = Object.values(MIME_BY_EXTENSION).filter((mime, index, list) => list.indexOf(mime) === index);
const DEFAULT_ALLOWED_EXTENSIONS = Object.keys(MIME_BY_EXTENSION);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: HARD_MAX_FILE_BYTES, files: 1, fields: 18, fieldSize: 16 * 1024 },
});

const submissionRateBuckets = new Map<string, { count: number; resetAt: number }>();
function submissionRateLimit(req: Request, res: Response, next: NextFunction) {
  const source = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const bucket = submissionRateBuckets.get(source);
  if (bucket && bucket.resetAt > now && bucket.count >= 8) {
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return fail(res, 429, "RATE_LIMITED", "Terlalu banyak pengiriman dari jaringan ini. Silakan coba kembali beberapa saat lagi.");
  }
  if (!bucket || bucket.resetAt <= now) submissionRateBuckets.set(source, { count: 1, resetAt: now + 10 * 60_000 });
  else bucket.count += 1;
  if (submissionRateBuckets.size > 20_000) {
    for (const [key, value] of submissionRateBuckets) if (value.resetAt <= now) submissionRateBuckets.delete(key);
  }
  return next();
}

function ok(res: Response, data: unknown) {
  return res.json({ success: true, data });
}

function fail(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, error: { code, message } });
}

function clean(value: unknown, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function parseIntBounded(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function slugify(value: string) {
  const result = value.normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return result || "diklat";
}

function cleanFileName(value: string) {
  const leaf = path.basename(value.replace(/\\/g, "/"));
  const safe = leaf.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 160);
  return safe || "berkas";
}

function validateFileSignature(file: Express.Multer.File) {
  const extension = path.extname(cleanFileName(file.originalname)).toLowerCase();
  const expectedMime = MIME_BY_EXTENSION[extension];
  if (!expectedMime) return { error: "Ekstensi file ini tidak didukung." };
  const bytes = file.buffer;
  const pdf = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const zip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2]) && [0x04, 0x06, 0x08].includes(bytes[3]);
  const signatureMatches = extension === ".pdf" ? pdf
    : extension === ".png" ? png
      : extension === ".jpg" || extension === ".jpeg" ? jpg
        : zip;
  if (!signatureMatches) return { error: "Isi file tidak sesuai dengan ekstensi yang dipilih." };
  const browserMime = clean(file.mimetype, 150).toLowerCase();
  const genericMime = !browserMime || browserMime === "application/octet-stream" || browserMime === "application/zip" || browserMime === "application/x-zip-compressed";
  if (!genericMime && browserMime !== expectedMime) return { error: "Jenis file yang dikirim tidak sesuai dengan nama file." };
  return { extension, mimeType: expectedMime };
}

function serviceAccountCredentials(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.client_email === "string" && typeof parsed.private_key === "string") return parsed;
  } catch {
    return null;
  }
  return null;
}

function isReplitRuntime() {
  return Boolean(
    process.env.REPL_ID || process.env.REPL_SLUG || process.env.REPLIT_DEV_DOMAIN ||
    process.env.REPLIT_DEPLOYMENT_ID || process.env.REPLIT_DEPLOYMENT_ENVIRONMENT ||
    process.env.REPLIT_CONNECTORS_HOSTNAME || process.env.REPL_IDENTITY ||
    process.env.WEB_REPL_RENEWAL,
  );
}

function driveConfigured() {
  return Boolean(serviceAccountCredentials()) || isReplitRuntime();
}

function driveQueryPath(pathname: string, parameters: Record<string, unknown>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

async function connectorDriveRequest(
  pathname: string,
  options: { method?: string; body?: unknown; contentType?: string; download?: boolean } = {},
) {
  const headers: Record<string, string> = {};
  if (options.contentType) headers["Content-Type"] = options.contentType;
  if (options.download) headers.Accept = "application/octet-stream";
  const response = await new ReplitConnectors().proxy("google-drive", pathname, {
    method: options.method || "GET",
    headers,
    body: options.body,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as any;
    const error = new Error(payload?.error?.message || `Google Drive returned HTTP ${response.status}.`) as any;
    error.code = response.status;
    error.response = { status: response.status, data: payload };
    throw error;
  }
  if (options.download) {
    return { data: response.body ? Readable.fromWeb(response.body as any) : Readable.from([]) };
  }
  if (response.status === 204 || options.method === "DELETE") return { data: {} };
  return { data: await response.json() };
}

async function collectMediaBody(body: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function getConnectorDriveClient() {
  const files = {
    list: (parameters: Record<string, unknown>) =>
      connectorDriveRequest(driveQueryPath("/drive/v3/files", parameters)),
    create: async (parameters: any) => {
      const pathname = driveQueryPath("/drive/v3/files", {
        fields: parameters.fields,
        supportsAllDrives: parameters.supportsAllDrives,
      });
      if (!parameters.media?.body) {
        return connectorDriveRequest(pathname, { method: "POST", body: parameters.requestBody || {} });
      }

      const mimeType = parameters.media.mimeType || "application/octet-stream";
      const boundary = `diklat-${crypto.randomBytes(18).toString("hex")}`;
      const metadata = Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(parameters.requestBody || {})}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      );
      const media = await collectMediaBody(parameters.media.body);
      const closingBoundary = Buffer.from(`\r\n--${boundary}--`);
      return connectorDriveRequest(
        driveQueryPath("/upload/drive/v3/files", {
          uploadType: "multipart",
          fields: parameters.fields,
          supportsAllDrives: parameters.supportsAllDrives,
        }),
        {
          method: "POST",
          body: Buffer.concat([metadata, media, closingBoundary]),
          contentType: `multipart/related; boundary=${boundary}`,
        },
      );
    },
    get: (parameters: Record<string, unknown>) => {
      const fileId = encodeURIComponent(String(parameters.fileId || ""));
      const pathname = driveQueryPath(`/drive/v3/files/${fileId}`, {
        fields: parameters.fields,
        alt: parameters.alt,
        supportsAllDrives: parameters.supportsAllDrives,
      });
      return connectorDriveRequest(pathname, { download: parameters.alt === "media" });
    },
    delete: (parameters: Record<string, unknown>) =>
      connectorDriveRequest(
        driveQueryPath(`/drive/v3/files/${encodeURIComponent(String(parameters.fileId || ""))}`, {
          supportsAllDrives: parameters.supportsAllDrives,
        }),
        { method: "DELETE" },
      ),
  };
  const permissions = {
    create: (parameters: any) =>
      connectorDriveRequest(
        driveQueryPath(`/drive/v3/files/${encodeURIComponent(String(parameters.fileId || ""))}/permissions`, {
          fields: parameters.fields,
          supportsAllDrives: parameters.supportsAllDrives,
        }),
        { method: "POST", body: parameters.requestBody || {} },
      ),
  };
  return { files, permissions };
}

function getDriveClient(): any {
  const credentials = serviceAccountCredentials();
  if (!credentials) {
    if (isReplitRuntime()) return getConnectorDriveClient();
    throw new Error("GOOGLE_DRIVE_NOT_CONFIGURED");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: credentials as any,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

function driveErrorMessage(error: unknown) {
  const code = Number((error as any)?.code || (error as any)?.response?.status || 0);
  if (code === 401) return "Otorisasi Google Drive ditolak. Periksa koneksi Drive Replit atau akun layanan.";
  if (code === 403) return "Akses Google Drive ditolak. Periksa izin folder, cakupan koneksi, dan kebijakan Drive.";
  if ((error as any)?.message === "GOOGLE_DRIVE_NOT_CONFIGURED") return "Koneksi Google Drive belum tersedia di environment server.";
  return "Google Drive belum dapat dihubungi. Periksa konfigurasi dan coba kembali.";
}

async function ensureSettings(): Promise<ModuleSettings> {
  const existing = await db.diklatModuleSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return db.diklatModuleSettings.create({
    data: { id: 1, allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES, allowedExtensions: DEFAULT_ALLOWED_EXTENSIONS },
  });
}

function publicSettings(settings: ModuleSettings) {
  return {
    title: settings.title,
    description: settings.description,
    archiveVisible: settings.archiveVisible,
    submissionsEnabled: settings.submissionsEnabled,
  };
}

function adminSettings(settings: ModuleSettings) {
  return {
    ...publicSettings(settings),
    submissionsEnabled: settings.submissionsEnabled,
    maxFileSizeMb: settings.maxFileSizeMb,
    allowedMimeTypes: settings.allowedMimeTypes,
    allowedExtensions: settings.allowedExtensions,
    submissionDriveAccess: settings.submissionDriveAccess,
    rootFolderId: settings.rootFolderId,
    driveConfigured: driveConfigured(),
    driveConnected: false,
    driveMessage: driveConfigured()
      ? "Koneksi Drive belum diuji."
      : "Koneksi Google Drive belum tersedia di environment server.",
  };
}

async function audit(actor: "ADMIN_SESSION" | "PUBLIC", action: string, entity: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  try {
    await db.coreAuditLog.create({
      data: { action, entity, entityId, actor, metadata: metadata as any },
    });
  } catch (error) {
    console.error("Pusat Diklat audit write failed:", (error as any)?.code || "unknown");
  }
}

async function getTrainingCounts(trainingIds: string[], publishedOnly = false) {
  const counts = new Map<string, { materials: number; lkpd: number; taskTypes: number; submissions: number }>();
  if (!trainingIds.length) return counts;
  const [documents, tasks, submissions] = await Promise.all([
    db.diklatDocument.groupBy({
      by: ["trainingId", "type"],
      where: { trainingId: { in: trainingIds }, ...(publishedOnly ? { status: "PUBLISHED" } : {}) },
      _count: { _all: true },
    }),
    db.diklatTaskType.groupBy({
      by: ["trainingId"],
      where: { trainingId: { in: trainingIds }, ...(publishedOnly ? { active: true } : {}) },
      _count: { _all: true },
    }),
    db.diklatSubmission.groupBy({
      by: ["trainingId"],
      where: { trainingId: { in: trainingIds } },
      _count: { _all: true },
    }),
  ]);
  for (const id of trainingIds) counts.set(id, { materials: 0, lkpd: 0, taskTypes: 0, submissions: 0 });
  for (const row of documents) {
    const item = counts.get(row.trainingId);
    if (!item) continue;
    if (row.type === "MATERIAL") item.materials = row._count._all;
    if (row.type === "LKPD") item.lkpd = row._count._all;
  }
  for (const row of tasks) counts.get(row.trainingId)!.taskTypes = row._count._all;
  for (const row of submissions) counts.get(row.trainingId)!.submissions = row._count._all;
  return counts;
}

async function trainingSummaries(trainings: any[], publishedOnly = false) {
  const counts = await getTrainingCounts(trainings.map((item) => item.id), publishedOnly);
  return trainings.map((training) => ({
    id: training.id,
    title: training.title,
    slug: training.slug,
    summary: training.summary,
    description: training.description,
    category: training.category,
    period: training.period,
    year: training.year,
    status: training.status,
    acceptsSubmissions: training.acceptsSubmissions,
    archiveVisible: training.archiveVisible,
    sortOrder: training.sortOrder,
    counts: counts.get(training.id) || { materials: 0, lkpd: 0, taskTypes: 0, submissions: 0 },
    createdAt: training.createdAt,
    updatedAt: training.updatedAt,
  }));
}

async function getOrCreateFolder(name: string, parentId: string) {
  const drive = getDriveClient();
  const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const found = await drive.files.list({
    q: `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    pageSize: 10,
    fields: "files(id,name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const existing = found.data.files?.[0]?.id;
  if (existing) return existing;
  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error("Google Drive gagal membuat folder penyimpanan.");
  return created.data.id;
}

async function ensureModuleRoot(settings: ModuleSettings) {
  if (settings.rootFolderId) return settings.rootFolderId;
  const root = await getOrCreateFolder("PUSAT DIKLAT SMKN 1 WONOGIRI", "root");
  await db.diklatModuleSettings.update({ where: { id: 1 }, data: { rootFolderId: root } });
  return root;
}

async function ensureTrainingFolder(training: any, kind: "MATERIAL" | "LKPD" | "SUBMISSION", settings: ModuleSettings, taskType?: any) {
  const rootId = await ensureModuleRoot(settings);
  let trainingId = training.driveFolderId;
  if (!trainingId) {
    trainingId = await getOrCreateFolder(training.slug, rootId);
    await db.diklatTraining.update({ where: { id: training.id }, data: { driveFolderId: trainingId } });
  }
  if (kind === "SUBMISSION" && taskType) {
    let submissionId = training.submissionsFolderId;
    if (!submissionId) {
      submissionId = await getOrCreateFolder("TUGAS_PESERTA", trainingId);
      await db.diklatTraining.update({ where: { id: training.id }, data: { submissionsFolderId: submissionId } });
    }
    if (taskType.driveFolderId) return taskType.driveFolderId;
    const folderId = await getOrCreateFolder(taskType.id, submissionId);
    await db.diklatTaskType.update({ where: { id: taskType.id }, data: { driveFolderId: folderId } });
    return folderId;
  }
  const field = kind === "MATERIAL" ? "materialsFolderId" : kind === "LKPD" ? "lkpdFolderId" : "submissionsFolderId";
  let folderId = training[field];
  if (folderId) return folderId;
  if (kind === "SUBMISSION") folderId = await getOrCreateFolder("TUGAS_PESERTA", trainingId);
  else folderId = await getOrCreateFolder(kind === "MATERIAL" ? "MATERI" : "LKPD", trainingId);
  await db.diklatTraining.update({ where: { id: training.id }, data: { [field]: folderId } });
  return folderId;
}

async function uploadDriveFile(file: Express.Multer.File, name: string, parentId: string, publicAccess = false) {
  const drive = getDriveClient();
  const created = await drive.files.create({
    requestBody: { name, mimeType: file.mimetype || "application/octet-stream", parents: [parentId] },
    media: { mimeType: file.mimetype || "application/octet-stream", body: Readable.from(file.buffer) },
    fields: "id,name,mimeType,size,webViewLink,parents",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error("Google Drive tidak mengembalikan identitas file.");
  const id = created.data.id;
  try {
    if (publicAccess) {
      await drive.permissions.create({
        fileId: id,
        requestBody: { type: "anyone", role: "reader" },
        fields: "id",
        supportsAllDrives: true,
      });
    }
    const details = await drive.files.get({
      fileId: id,
      fields: "id,name,mimeType,size,webViewLink,parents,trashed",
      supportsAllDrives: true,
    });
    if (details.data.trashed) throw new Error("Google Drive menandai file sebagai terhapus.");
    return {
      driveFileId: id,
      folderId: parentId,
      name,
      mimeType: details.data.mimeType || file.mimetype || "application/octet-stream",
      sizeBytes: BigInt(details.data.size || file.size),
      webUrl: details.data.webViewLink || `https://drive.google.com/file/d/${id}/view`,
      publicAccess,
    };
  } catch (error) {
    await drive.files.delete({ fileId: id, supportsAllDrives: true }).catch(() => {});
    throw error;
  }
}

async function cleanupDriveFile(driveFileId: string) {
  await getDriveClient().files.delete({ fileId: driveFileId, supportsAllDrives: true });
}

async function streamDriveFile(res: Response, file: any) {
  if (!file || file.verificationStatus !== "STORED") return fail(res, 404, "FILE_UNAVAILABLE", "File tidak tersedia.");
  try {
    const drive = getDriveClient();
    const response = await drive.files.get(
      { fileId: file.driveFileId, alt: "media", supportsAllDrives: true } as any,
      { responseType: "stream" } as any,
    );
    const stream = response.data as NodeJS.ReadableStream;
    const safeName = cleanFileName(file.name);
    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(safeName)}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    stream.on("error", (error) => {
      console.error("Pusat Diklat Drive download failed:", (error as any)?.code || "unknown");
      if (!res.headersSent) res.status(502).end("File tidak dapat diambil dari Google Drive.");
      else res.destroy(error as Error);
    });
    stream.pipe(res);
  } catch (error) {
    console.error("Pusat Diklat Drive stream failed:", (error as any)?.code || "unknown");
    return fail(res, 502, "DRIVE_DOWNLOAD_FAILED", driveErrorMessage(error));
  }
}

function parseListQuery(req: Request) {
  const page = parseIntBounded(req.query.page, 1, 1, 100_000);
  const pageSize = parseIntBounded(req.query.pageSize, 20, 1, PAGE_SIZE_MAX);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function publicDocumentShape(document: any) {
  const driveFile = document.driveFile;
  return {
    id: document.id,
    trainingId: document.trainingId,
    type: document.type,
    title: document.title,
    description: document.description,
    category: document.category,
    driveFileName: driveFile?.name || "",
    mimeType: driveFile?.mimeType || "",
    sizeBytes: Number(driveFile?.sizeBytes || 0),
    downloadUrl: `${API}/public/documents/${document.id}/download`,
    sortOrder: document.sortOrder,
    status: document.status,
    createdAt: document.createdAt,
  };
}

function taskTypeShape(task: any) {
  return {
    id: task.id,
    trainingId: task.trainingId,
    name: task.name,
    description: task.description,
    sortOrder: task.sortOrder,
    active: task.active,
    deadline: task.deadline,
    maxFileSizeMb: task.maxFileSizeMb,
    allowedMimeTypes: task.allowedMimeTypes,
  };
}

function submissionShape(submission: any) {
  const trainingName = submission.training?.title || submission.trainingName || "";
  const driveFile = submission.driveFile;
  return {
    id: submission.id,
    reference: submission.reference,
    trainingId: submission.trainingId,
    trainingName,
    taskTypeId: submission.taskTypeId,
    taskName: submission.taskName,
    fullName: submission.fullName,
    nip: submission.nip,
    institution: submission.institution,
    submittedAt: submission.submittedAt,
    status: submission.status,
    fileName: driveFile?.name || "",
    mimeType: driveFile?.mimeType || "",
    sizeBytes: Number(driveFile?.sizeBytes || 0),
    driveUrl: driveFile?.webUrl || null,
  };
}

function privateSubmissionAccessToken(reference: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(`diklat-submission:${reference}`).digest("base64url");
}

function submissionReceiptShape(submission: any, duplicate = false) {
  const driveFile = submission.driveFile;
  const publicAccess = Boolean(driveFile?.publicAccess);
  return {
    reference: submission.reference,
    trainingName: submission.training?.title || "",
    taskName: submission.taskName,
    fullName: submission.fullName,
    nip: submission.nip,
    institution: submission.institution,
    fileName: driveFile?.name || "",
    submittedAt: submission.submittedAt,
    status: submission.status,
    ...(publicAccess ? { driveUrl: driveFile.webUrl || `https://drive.google.com/file/d/${driveFile.driveFileId}/view` } : {}),
    ...(!publicAccess && privateSubmissionAccessToken(submission.reference)
      ? { secureFileUrl: `${API}/public/submissions/${encodeURIComponent(submission.reference)}/file?token=${encodeURIComponent(privateSubmissionAccessToken(submission.reference)!)}` }
      : {}),
    fileAccess: publicAccess ? "LINK" : "PRIVATE",
    ...(duplicate ? { duplicate: true } : {}),
  };
}

function submissionWhere(query: Request["query"]) {
  const where: any = {};
  const q = clean(query.q, 160);
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { nip: { contains: q, mode: "insensitive" } },
      { institution: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
    ];
  }
  const trainingId = clean(query.trainingId, 100);
  const taskTypeId = clean(query.taskTypeId, 100);
  const institution = clean(query.institution, 160);
  const status = clean(query.status, 40);
  if (trainingId) where.trainingId = trainingId;
  if (taskTypeId) where.taskTypeId = taskTypeId;
  if (institution) where.institution = { contains: institution, mode: "insensitive" };
  if (status) where.status = status;
  const range: any = {};
  const from = clean(query.dateFrom, 40);
  const to = clean(query.dateTo, 40);
  if (from) {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00.000+07:00`) : new Date(from);
    if (!Number.isNaN(parsed.getTime())) range.gte = parsed;
  }
  if (to) {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59.999+07:00`) : new Date(to);
    if (!Number.isNaN(parsed.getTime())) {
      range.lte = parsed;
    }
  }
  if (Object.keys(range).length) where.submittedAt = range;
  return where;
}

async function loadSubmissions(req: Request, limit = PAGE_SIZE_MAX) {
  const { page, pageSize, skip } = parseListQuery(req);
  const where = submissionWhere(req.query);
  const total = await db.diklatSubmission.count({ where });
  const sortBy = clean(req.query.sortBy, 32);
  const direction = clean(req.query.sortOrder, 4).toLowerCase() === "asc" ? "asc" : "desc";
  const allowedSort = new Set(["submittedAt", "fullName", "institution", "reference", "status"]);
  const orderBy = sortBy === "trainingName" ? { training: { title: direction } }
    : allowedSort.has(sortBy) ? { [sortBy || "submittedAt"]: direction }
      : { submittedAt: "desc" };
  const submissions = await db.diklatSubmission.findMany({
    where,
    skip: limit > 0 ? skip : 0,
    take: limit > 0 ? Math.min(pageSize, limit) : undefined,
    orderBy: [orderBy as any, { id: "desc" }],
    include: { training: { select: { title: true } }, driveFile: true },
  });
  return { items: submissions.map(submissionShape), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

function route(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => Promise.resolve(handler(req, res, next)).catch(next);
}

function uploadSingle(fieldName: string) {
  const parseFile = upload.single(fieldName);
  return (req: Request, res: Response, next: NextFunction) => {
    parseFile(req, res, (error?: unknown) => {
      if (!error) return next();
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          const maxFileSizeMb = HARD_MAX_FILE_BYTES / (1024 * 1024);
          return fail(res, 413, "FILE_TOO_LARGE", `Ukuran file melebihi batas teknis maksimal ${maxFileSizeMb} MB per berkas.`);
        }
        return fail(res, 400, "INVALID_UPLOAD", "Permintaan unggah tidak valid. Pastikan satu berkas dikirim untuk setiap permintaan.");
      }
      return next(error);
    });
  };
}

export function registerDiklatRoutes(app: Express, requireAuth: AuthMiddleware) {
  const admin = requireAuth as any;

  app.get(`${API}/public/overview`, route(async (_req, res) => {
    const settings = await ensureSettings();
    const trainings = await db.diklatTraining.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 3,
    });
    const [publishedTrainings, materials, lkpd, submissions, featured] = await Promise.all([
      db.diklatTraining.count({ where: { status: "PUBLISHED" } }),
      db.diklatDocument.count({ where: { type: "MATERIAL", status: "PUBLISHED", training: { status: "PUBLISHED" } } }),
      db.diklatDocument.count({ where: { type: "LKPD", status: "PUBLISHED", training: { status: "PUBLISHED" } } }),
      db.diklatSubmission.count(),
      trainingSummaries(trainings, true),
    ]);
    return ok(res, {
      settings: publicSettings(settings),
      stats: { publishedTrainings, materials, lkpd, submissions },
      featured: featured.map((item) => ({
        ...item,
        acceptsSubmissions: item.acceptsSubmissions && settings.submissionsEnabled,
      })),
    });
  }));

  app.get(`${API}/public/trainings`, route(async (req, res) => {
    const settings = await ensureSettings();
    const status = clean(req.query.status, 20).toUpperCase() || "PUBLISHED";
    if (!PUBLIC_TRAINING_STATES.has(status)) return fail(res, 400, "INVALID_STATUS", "Status diklat tidak valid.");
    if (status === "ARCHIVED" && !settings.archiveVisible) {
      return ok(res, { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } });
    }
    const { page, pageSize, skip } = parseListQuery(req);
    const q = clean(req.query.q, 160);
    const year = Number.parseInt(String(req.query.year || ""), 10);
    const where: any = {
      status,
      ...(status === "ARCHIVED" ? { archiveVisible: true } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] } : {}),
      ...(Number.isInteger(year) ? { year } : {}),
    };
    const [items, total] = await Promise.all([
      db.diklatTraining.findMany({ where, skip, take: pageSize, orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }] }),
      db.diklatTraining.count({ where }),
    ]);
    const summaries = await trainingSummaries(items, true);
    return ok(res, {
      items: summaries.map((item) => ({
        ...item,
        acceptsSubmissions: item.acceptsSubmissions && settings.submissionsEnabled,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }));

  app.get(`${API}/public/trainings/:slug`, route(async (req, res) => {
    const settings = await ensureSettings();
    const training = await db.diklatTraining.findUnique({
      where: { slug: clean(req.params.slug, 100) },
      include: {
        documents: {
          where: { status: "PUBLISHED", driveFile: { is: { verificationStatus: "STORED" } } },
          include: { driveFile: true },
          orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        },
        taskTypes: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!training || !PUBLIC_TRAINING_STATES.has(training.status) ||
      (training.status === "ARCHIVED" && (!settings.archiveVisible || !training.archiveVisible))) {
      return fail(res, 404, "TRAINING_NOT_FOUND", "Diklat tidak ditemukan atau belum dipublikasikan.");
    }
    if (training.status === "ARCHIVED") training.taskTypes = [];
    const [summary] = await trainingSummaries([training], true);
    return ok(res, {
      training: {
        ...summary,
        acceptsSubmissions: summary.acceptsSubmissions && settings.submissionsEnabled,
        documents: training.documents.map(publicDocumentShape),
        taskTypes: training.taskTypes.map(taskTypeShape),
      },
    });
  }));

  app.get(`${API}/public/documents`, route(async (req, res) => {
    const settings = await ensureSettings();
    const { page, pageSize, skip } = parseListQuery(req);
    const type = clean(req.query.type, 20).toUpperCase();
    if (type && !DOCUMENT_TYPES.has(type)) return fail(res, 400, "INVALID_DOCUMENT_TYPE", "Jenis dokumen tidak valid.");
    const trainingId = clean(req.query.trainingId, 100);
    const category = clean(req.query.category, 120);
    const q = clean(req.query.q, 160);
    const where: any = {
      status: "PUBLISHED",
      ...(type ? { type } : {}),
      ...(trainingId ? { trainingId } : {}),
      ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] } : {}),
      training: {
        OR: [{ status: "PUBLISHED" }, ...(settings.archiveVisible ? [{ status: "ARCHIVED", archiveVisible: true }] : [])],
      },
      driveFile: { is: { verificationStatus: "STORED" } },
    };
    const [documents, total] = await Promise.all([
      db.diklatDocument.findMany({
        where, skip, take: pageSize,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: { driveFile: true },
      }),
      db.diklatDocument.count({ where }),
    ]);
    return ok(res, { items: documents.map(publicDocumentShape), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  }));

  app.get(`${API}/public/documents/filters`, route(async (_req, res) => {
    const settings = await ensureSettings();
    const visibleTrainingStates = [
      { status: "PUBLISHED" },
      ...(settings.archiveVisible ? [{ status: "ARCHIVED", archiveVisible: true }] : []),
    ];
    const [trainings, categories] = await Promise.all([
      db.diklatTraining.findMany({
        where: { OR: visibleTrainingStates },
        select: { id: true, title: true },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      }),
      db.diklatDocument.findMany({
        where: {
          status: "PUBLISHED",
          training: { OR: visibleTrainingStates },
          driveFile: { is: { verificationStatus: "STORED" } },
          NOT: { category: "" },
        },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      }),
    ]);
    return ok(res, { trainings, categories: categories.map((item) => item.category).filter(Boolean) });
  }));

  app.get(`${API}/public/documents/:documentId/download`, route(async (req, res) => {
    const settings = await ensureSettings();
    const document = await db.diklatDocument.findUnique({
      where: { id: clean(req.params.documentId, 100) },
      include: { training: true, driveFile: true },
    });
    const visible = document?.training.status === "PUBLISHED" ||
      (document?.training.status === "ARCHIVED" && settings.archiveVisible && document.training.archiveVisible);
    if (!document || document.status !== "PUBLISHED" || !visible) return fail(res, 404, "DOCUMENT_NOT_FOUND", "Dokumen tidak tersedia.");
    return streamDriveFile(res, document.driveFile);
  }));

  app.get(`${API}/public/submissions/:reference/file`, route(async (req, res) => {
    const reference = clean(req.params.reference, 80);
    const provided = clean(req.query.token, 128);
    const expected = privateSubmissionAccessToken(reference);
    if (!expected || !provided) return fail(res, 403, "FILE_ACCESS_DENIED", "Tautan file tidak valid atau sudah tidak tersedia.");
    const actualBytes = Buffer.from(provided);
    const expectedBytes = Buffer.from(expected);
    if (actualBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(actualBytes, expectedBytes)) {
      return fail(res, 403, "FILE_ACCESS_DENIED", "Tautan file tidak valid atau sudah tidak tersedia.");
    }
    const submission = await db.diklatSubmission.findUnique({
      where: { reference },
      include: { driveFile: true },
    });
    if (!submission) return fail(res, 404, "SUBMISSION_NOT_FOUND", "File pengumpulan tidak ditemukan.");
    return streamDriveFile(res, submission.driveFile);
  }));

  app.post(`${API}/public/submissions`, submissionRateLimit, uploadSingle("file"), route(async (req, res) => {
    const settings = await ensureSettings();
    if (!settings.submissionsEnabled) return fail(res, 403, "SUBMISSIONS_CLOSED", "Pengumpulan tugas sedang ditutup.");
    const trainingId = clean(req.body?.trainingId, 100);
    const taskTypeId = clean(req.body?.taskTypeId, 100);
    const fullName = clean(req.body?.fullName, 160);
    const nip = clean(req.body?.nip, 40);
    const institution = clean(req.body?.institution, 180);
    const rawKey = clean(req.body?.idempotencyKey, 150);
    if (!trainingId || !taskTypeId || !fullName || !institution || rawKey.length < 12 || !req.file) {
      return fail(res, 400, "VALIDATION_ERROR", "Diklat, nama lengkap, asal instansi, jenis tugas, file, dan kunci pengiriman diperlukan.");
    }
    if (!/^[\p{L}\p{N} .,'’()-]+$/u.test(fullName) || !fullName.trim()) return fail(res, 400, "INVALID_NAME", "Nama lengkap tidak valid.");
    const idempotencyKey = crypto.createHash("sha256").update(rawKey).digest("hex");
    const previous = await db.diklatSubmission.findUnique({
      where: { idempotencyKey },
      include: { training: { select: { title: true } }, driveFile: true },
    });
    if (previous) return ok(res, { submission: submissionReceiptShape(previous, true) });

    const [training, taskType] = await Promise.all([
      db.diklatTraining.findUnique({ where: { id: trainingId } }),
      db.diklatTaskType.findUnique({ where: { id: taskTypeId } }),
    ]);
    if (!training || training.status !== "PUBLISHED") return fail(res, 404, "TRAINING_NOT_AVAILABLE", "Diklat tidak ditemukan atau belum dibuka untuk peserta.");
    if (!training.acceptsSubmissions) return fail(res, 403, "SUBMISSIONS_CLOSED", "Diklat ini belum menerima pengumpulan tugas.");
    if (!taskType || taskType.trainingId !== training.id || !taskType.active) {
      return fail(res, 400, "TASK_TYPE_NOT_AVAILABLE", "Jenis tugas tidak tersedia untuk diklat yang dipilih.");
    }
    if (taskType.deadline && taskType.deadline.getTime() < Date.now()) return fail(res, 403, "DEADLINE_PASSED", "Batas waktu pengumpulan tugas sudah lewat.");
    const maxBytes = Math.min(settings.maxFileSizeMb, taskType.maxFileSizeMb || settings.maxFileSizeMb) * 1024 * 1024;
    if (req.file.size > maxBytes || req.file.size > HARD_MAX_FILE_BYTES) {
      return fail(res, 413, "FILE_TOO_LARGE", `Ukuran file melebihi batas ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
    }
    const detected = validateFileSignature(req.file);
    if (detected.error) return fail(res, 415, "INVALID_FILE", detected.error);
    const taskAllowed = taskType.allowedMimeTypes.length
      ? taskType.allowedMimeTypes
      : settings.allowedMimeTypes;
    if (!settings.allowedExtensions.includes(detected.extension!) || !settings.allowedMimeTypes.includes(detected.mimeType!) || !taskAllowed.includes(detected.mimeType!)) {
      return fail(res, 415, "FILE_TYPE_NOT_ALLOWED", "Jenis file ini tidak diizinkan untuk tugas yang dipilih.");
    }

    const reference = `PD-${new Date().getFullYear()}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
    const safeName = cleanFileName(req.file.originalname);
    let driveFile: Awaited<ReturnType<typeof uploadDriveFile>> | null = null;
    try {
      const folderId = await ensureTrainingFolder(training, "SUBMISSION", settings, taskType);
      driveFile = await uploadDriveFile(req.file, safeName, folderId, settings.submissionDriveAccess === "LINK");
      const submission = await db.$transaction(async (tx) => {
        const stored = await tx.diklatDriveFile.create({
          data: { ...driveFile!, kind: "SUBMISSION", verificationStatus: "STORED" },
        });
        return tx.diklatSubmission.create({
          data: {
            reference,
            idempotencyKey,
            trainingId: training.id,
            taskTypeId: taskType.id,
            taskName: taskType.name,
            fullName,
            nip: nip || null,
            institution,
            driveFileId: stored.id,
          },
          include: { driveFile: true },
        });
      });
      await audit("PUBLIC", "DIKLAT_SUBMISSION_CREATED", "DiklatSubmission", submission.id, { trainingId, taskTypeId });
      return ok(res, {
        submission: submissionReceiptShape({ ...submission, training: { title: training.title } }),
      });
    } catch (error) {
      if (driveFile) {
        try { await cleanupDriveFile(driveFile.driveFileId); }
        catch (cleanupError) { console.error("Pusat Diklat orphaned Drive file:", driveFile.driveFileId, (cleanupError as any)?.code || "unknown"); }
      }
      if ((error as any)?.code === "P2002") {
        const existing = await db.diklatSubmission.findUnique({
          where: { idempotencyKey },
          include: { training: { select: { title: true } }, driveFile: true },
        });
        if (existing) return ok(res, { submission: submissionReceiptShape(existing, true) });
      }
      await audit("PUBLIC", "DIKLAT_SUBMISSION_FAILED", "DiklatSubmission", undefined, { trainingId, taskTypeId, reason: (error as any)?.message === "GOOGLE_DRIVE_NOT_CONFIGURED" ? "DRIVE_NOT_CONFIGURED" : "UPLOAD_OR_DATABASE_FAILURE" });
      console.error("Pusat Diklat submission failed:", (error as any)?.code || (error as any)?.message || "unknown");
      return fail(res, 502, "SUBMISSION_STORAGE_FAILED", driveErrorMessage(error));
    }
  }));

  app.get(`${API}/admin/overview`, admin, route(async (_req, res) => {
    const [trainings, activeTrainings, materials, lkpd, submissions, recent] = await Promise.all([
      db.diklatTraining.count(),
      db.diklatTraining.count({ where: { status: "PUBLISHED" } }),
      db.diklatDocument.count({ where: { type: "MATERIAL" } }),
      db.diklatDocument.count({ where: { type: "LKPD" } }),
      db.diklatSubmission.count(),
      db.diklatSubmission.findMany({ take: 8, orderBy: { submittedAt: "desc" }, include: { training: { select: { title: true } }, driveFile: true } }),
    ]);
    let drive = { configured: driveConfigured(), connected: false, message: "" };
    if (!drive.configured) drive.message = "Koneksi Google Drive belum tersedia di environment server.";
    else drive.message = "Koneksi Drive belum diuji.";
    return ok(res, { stats: { trainings, activeTrainings, materials, lkpd, submissions }, recentSubmissions: recent.map(submissionShape), drive });
  }));

  app.get(`${API}/admin/trainings`, admin, route(async (_req, res) => {
    const trainings = await db.diklatTraining.findMany({ orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }] });
    return ok(res, { trainings: await trainingSummaries(trainings) });
  }));

  app.post(`${API}/admin/trainings`, admin, route(async (req, res) => {
    const title = clean(req.body?.title, 160);
    if (!title) return fail(res, 400, "VALIDATION_ERROR", "Nama diklat wajib diisi.");
    const requestedStatus = clean(req.body?.status, 20).toUpperCase() || "DRAFT";
    if (!TRAINING_STATES.has(requestedStatus)) return fail(res, 400, "INVALID_STATUS", "Status diklat tidak valid.");
    const slugBase = slugify(clean(req.body?.slug, 100) || title);
    let slug = slugBase;
    for (let suffix = 2; await db.diklatTraining.findUnique({ where: { slug } }); suffix += 1) slug = `${slugBase}-${suffix}`;
    const year = req.body?.year === "" || req.body?.year == null ? null : Number.parseInt(String(req.body.year), 10);
    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2200)) return fail(res, 400, "INVALID_YEAR", "Tahun diklat tidak valid.");
    const training = await db.diklatTraining.create({
      data: {
        title, slug,
        summary: clean(req.body?.summary, 400),
        description: clean(req.body?.description, 12_000),
        category: clean(req.body?.category, 120),
        period: clean(req.body?.period, 120),
        year,
        status: requestedStatus,
        acceptsSubmissions: req.body?.acceptsSubmissions === true,
        archiveVisible: req.body?.archiveVisible !== false,
        sortOrder: parseIntBounded(req.body?.sortOrder, 0, -100_000, 100_000),
      },
    });
    await audit("ADMIN_SESSION", "DIKLAT_TRAINING_CREATED", "DiklatTraining", training.id, { status: training.status });
    const [summary] = await trainingSummaries([training]);
    return ok(res, { training: summary });
  }));

  app.put(`${API}/admin/trainings/:id`, admin, route(async (req, res) => {
    const existing = await db.diklatTraining.findUnique({ where: { id: clean(req.params.id, 100) } });
    if (!existing) return fail(res, 404, "TRAINING_NOT_FOUND", "Diklat tidak ditemukan.");
    const title = clean(req.body?.title, 160);
    if (!title) return fail(res, 400, "VALIDATION_ERROR", "Nama diklat wajib diisi.");
    const status = clean(req.body?.status, 20).toUpperCase();
    if (!TRAINING_STATES.has(status)) return fail(res, 400, "INVALID_STATUS", "Status diklat tidak valid.");
    const year = req.body?.year === "" || req.body?.year == null ? null : Number.parseInt(String(req.body.year), 10);
    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2200)) return fail(res, 400, "INVALID_YEAR", "Tahun diklat tidak valid.");
    const training = await db.diklatTraining.update({
      where: { id: existing.id },
      data: {
        title,
        summary: clean(req.body?.summary, 400),
        description: clean(req.body?.description, 12_000),
        category: clean(req.body?.category, 120),
        period: clean(req.body?.period, 120),
        year,
        status,
        acceptsSubmissions: req.body?.acceptsSubmissions === true,
        archiveVisible: req.body?.archiveVisible !== false,
        sortOrder: parseIntBounded(req.body?.sortOrder, 0, -100_000, 100_000),
      },
    });
    await audit("ADMIN_SESSION", "DIKLAT_TRAINING_UPDATED", "DiklatTraining", training.id, { status: training.status });
    const [summary] = await trainingSummaries([training]);
    return ok(res, { training: summary });
  }));

  app.delete(`${API}/admin/trainings/:id`, admin, route(async (req, res) => {
    const id = clean(req.params.id, 100);
    const [training, documents, submissions] = await Promise.all([
      db.diklatTraining.findUnique({ where: { id } }),
      db.diklatDocument.count({ where: { trainingId: id } }),
      db.diklatSubmission.count({ where: { trainingId: id } }),
    ]);
    if (!training) return fail(res, 404, "TRAINING_NOT_FOUND", "Diklat tidak ditemukan.");
    if (training.status !== "DRAFT" || documents || submissions) return fail(res, 409, "TRAINING_HAS_HISTORY", "Diklat yang pernah dipublikasikan atau memiliki dokumen/pengumpulan tidak dapat dihapus. Gunakan arsip.");
    await db.diklatTraining.delete({ where: { id } });
    await audit("ADMIN_SESSION", "DIKLAT_TRAINING_DELETED", "DiklatTraining", id);
    return ok(res, { deleted: true });
  }));

  app.patch(`${API}/admin/trainings/:id/status`, admin, route(async (req, res) => {
    const status = clean(req.body?.status, 20).toUpperCase();
    if (!TRAINING_STATES.has(status)) return fail(res, 400, "INVALID_STATUS", "Status diklat tidak valid.");
    const training = await db.diklatTraining.update({ where: { id: clean(req.params.id, 100) }, data: { status, ...(status === "ARCHIVED" ? { acceptsSubmissions: false } : {}) } }).catch((error) => {
      if ((error as any)?.code === "P2025") return null;
      throw error;
    });
    if (!training) return fail(res, 404, "TRAINING_NOT_FOUND", "Diklat tidak ditemukan.");
    await audit("ADMIN_SESSION", status === "ARCHIVED" ? "DIKLAT_TRAINING_ARCHIVED" : "DIKLAT_TRAINING_STATUS_CHANGED", "DiklatTraining", training.id, { status });
    const [summary] = await trainingSummaries([training]);
    return ok(res, { training: summary });
  }));

  app.post(`${API}/admin/trainings/:id/task-types`, admin, route(async (req, res) => {
    const trainingId = clean(req.params.id, 100);
    const training = await db.diklatTraining.findUnique({ where: { id: trainingId }, select: { id: true } });
    const name = clean(req.body?.name, 160);
    if (!training) return fail(res, 404, "TRAINING_NOT_FOUND", "Diklat tidak ditemukan.");
    if (!name) return fail(res, 400, "VALIDATION_ERROR", "Nama jenis tugas wajib diisi.");
    const deadline = parseOptionalDate(req.body?.deadline);
    if (deadline === undefined) return fail(res, 400, "INVALID_DEADLINE", "Batas waktu tidak valid.");
    const allowed = Array.isArray(req.body?.allowedMimeTypes) ? req.body.allowedMimeTypes.filter((item: unknown) => DEFAULT_ALLOWED_MIME_TYPES.includes(clean(item, 150))) : [];
    const taskType = await db.diklatTaskType.create({
      data: {
        trainingId, name, description: clean(req.body?.description, 2_000),
        sortOrder: parseIntBounded(req.body?.sortOrder, 0, -100_000, 100_000),
        active: req.body?.active !== false,
        deadline,
        maxFileSizeMb: req.body?.maxFileSizeMb == null || req.body?.maxFileSizeMb === "" ? null : parseIntBounded(req.body.maxFileSizeMb, 1, 1, 20),
        allowedMimeTypes: allowed,
      },
    });
    await audit("ADMIN_SESSION", "DIKLAT_TASK_TYPE_CREATED", "DiklatTaskType", taskType.id, { trainingId });
    return ok(res, { taskType: taskTypeShape(taskType) });
  }));

  app.put(`${API}/admin/task-types/:id`, admin, route(async (req, res) => {
    const id = clean(req.params.id, 100);
    const existing = await db.diklatTaskType.findUnique({ where: { id } });
    if (!existing) return fail(res, 404, "TASK_TYPE_NOT_FOUND", "Jenis tugas tidak ditemukan.");
    const name = clean(req.body?.name, 160);
    if (!name) return fail(res, 400, "VALIDATION_ERROR", "Nama jenis tugas wajib diisi.");
    const deadline = parseOptionalDate(req.body?.deadline);
    if (deadline === undefined) return fail(res, 400, "INVALID_DEADLINE", "Batas waktu tidak valid.");
    const allowed = Array.isArray(req.body?.allowedMimeTypes) ? req.body.allowedMimeTypes.filter((item: unknown) => DEFAULT_ALLOWED_MIME_TYPES.includes(clean(item, 150))) : [];
    const data: any = {
      name, description: clean(req.body?.description, 2_000),
      sortOrder: parseIntBounded(req.body?.sortOrder, 0, -100_000, 100_000),
      active: req.body?.active !== false,
      deadline,
      maxFileSizeMb: req.body?.maxFileSizeMb == null || req.body?.maxFileSizeMb === "" ? null : parseIntBounded(req.body.maxFileSizeMb, 1, 1, 20),
      allowedMimeTypes: allowed,
    };
    if (existing.active && !data.active) {
      const count = await db.diklatSubmission.count({ where: { taskTypeId: id } });
      if (count) data.active = false;
    }
    const taskType = await db.diklatTaskType.update({ where: { id }, data });
    await audit("ADMIN_SESSION", "DIKLAT_TASK_TYPE_UPDATED", "DiklatTaskType", id, { active: taskType.active });
    return ok(res, { taskType: taskTypeShape(taskType) });
  }));

  app.delete(`${API}/admin/task-types/:id`, admin, route(async (req, res) => {
    const id = clean(req.params.id, 100);
    const task = await db.diklatTaskType.findUnique({ where: { id } });
    if (!task) return fail(res, 404, "TASK_TYPE_NOT_FOUND", "Jenis tugas tidak ditemukan.");
    const count = await db.diklatSubmission.count({ where: { taskTypeId: id } });
    if (count) {
      await db.diklatTaskType.update({ where: { id }, data: { active: false } });
      await audit("ADMIN_SESSION", "DIKLAT_TASK_TYPE_DEACTIVATED", "DiklatTaskType", id, { historyCount: count });
      return ok(res, { deleted: false, deactivated: true });
    }
    await db.diklatTaskType.delete({ where: { id } });
    await audit("ADMIN_SESSION", "DIKLAT_TASK_TYPE_DELETED", "DiklatTaskType", id);
    return ok(res, { deleted: true });
  }));

  app.post(`${API}/admin/trainings/:id/documents`, admin, uploadSingle("file"), route(async (req, res) => {
    const training = await db.diklatTraining.findUnique({ where: { id: clean(req.params.id, 100) } });
    const type = clean(req.body?.type, 20).toUpperCase();
    const title = clean(req.body?.title, 160);
    if (!training) return fail(res, 404, "TRAINING_NOT_FOUND", "Diklat tidak ditemukan.");
    if (!DOCUMENT_TYPES.has(type) || !title || !req.file) return fail(res, 400, "VALIDATION_ERROR", "Jenis dokumen, judul, dan file wajib diisi.");
    const settings = await ensureSettings();
    if (req.file.size > settings.maxFileSizeMb * 1024 * 1024) return fail(res, 413, "FILE_TOO_LARGE", `Ukuran file melebihi batas ${settings.maxFileSizeMb} MB.`);
    const detected = validateFileSignature(req.file);
    if (detected.error) return fail(res, 415, "INVALID_FILE", detected.error);
    if (!settings.allowedExtensions.includes(detected.extension!) || !settings.allowedMimeTypes.includes(detected.mimeType!)) {
      return fail(res, 415, "FILE_TYPE_NOT_ALLOWED", "Jenis file ini tidak diizinkan.");
    }
    const requestedStatus = clean(req.body?.status, 20).toUpperCase() || "DRAFT";
    if (!DOCUMENT_STATES.has(requestedStatus)) return fail(res, 400, "INVALID_STATUS", "Status dokumen tidak valid.");
    let stored: Awaited<ReturnType<typeof uploadDriveFile>> | null = null;
    try {
      const parentId = await ensureTrainingFolder(training, type as "MATERIAL" | "LKPD", settings);
      stored = await uploadDriveFile(req.file, cleanFileName(req.file.originalname), parentId);
      const document = await db.$transaction(async (tx) => {
        const driveFile = await tx.diklatDriveFile.create({ data: { ...stored!, kind: type, verificationStatus: "STORED" } });
        return tx.diklatDocument.create({
          data: {
            trainingId: training.id, driveFileId: driveFile.id, type, title,
            description: clean(req.body?.description, 2_000),
            category: clean(req.body?.category, 120),
            sortOrder: parseIntBounded(req.body?.sortOrder, 0, -100_000, 100_000),
            status: requestedStatus,
          },
          include: { driveFile: true },
        });
      });
      await audit("ADMIN_SESSION", "DIKLAT_DOCUMENT_CREATED", "DiklatDocument", document.id, { trainingId: training.id, type });
      return ok(res, { document: publicDocumentShape(document) });
    } catch (error) {
      if (stored) await cleanupDriveFile(stored.driveFileId).catch((cleanupError) => console.error("Pusat Diklat orphaned Drive file:", stored!.driveFileId, (cleanupError as any)?.code || "unknown"));
      console.error("Pusat Diklat document upload failed:", (error as any)?.code || "unknown");
      return fail(res, 502, "DOCUMENT_STORAGE_FAILED", driveErrorMessage(error));
    }
  }));

  app.put(`${API}/admin/documents/:id`, admin, route(async (req, res) => {
    const id = clean(req.params.id, 100);
    const existing = await db.diklatDocument.findUnique({ where: { id }, include: { driveFile: true } });
    if (!existing) return fail(res, 404, "DOCUMENT_NOT_FOUND", "Dokumen tidak ditemukan.");
    const title = clean(req.body?.title, 160);
    if (!title) return fail(res, 400, "VALIDATION_ERROR", "Judul dokumen wajib diisi.");
    const status = clean(req.body?.status, 20).toUpperCase();
    if (!DOCUMENT_STATES.has(status)) return fail(res, 400, "INVALID_STATUS", "Status dokumen tidak valid.");
    const document = await db.diklatDocument.update({
      where: { id },
      data: { title, description: clean(req.body?.description, 2_000), category: clean(req.body?.category, 120), sortOrder: parseIntBounded(req.body?.sortOrder, 0, -100_000, 100_000), status },
      include: { driveFile: true },
    });
    await audit("ADMIN_SESSION", "DIKLAT_DOCUMENT_UPDATED", "DiklatDocument", id, { status });
    return ok(res, { document: publicDocumentShape(document) });
  }));

  app.patch(`${API}/admin/documents/:id/status`, admin, route(async (req, res) => {
    const status = clean(req.body?.status, 20).toUpperCase();
    if (!DOCUMENT_STATES.has(status)) return fail(res, 400, "INVALID_STATUS", "Status dokumen tidak valid.");
    const document = await db.diklatDocument.update({ where: { id: clean(req.params.id, 100) }, data: { status }, include: { driveFile: true } }).catch((error) => {
      if ((error as any)?.code === "P2025") return null;
      throw error;
    });
    if (!document) return fail(res, 404, "DOCUMENT_NOT_FOUND", "Dokumen tidak ditemukan.");
    await audit("ADMIN_SESSION", status === "ARCHIVED" ? "DIKLAT_DOCUMENT_ARCHIVED" : "DIKLAT_DOCUMENT_STATUS_CHANGED", "DiklatDocument", document.id, { status });
    return ok(res, { document: publicDocumentShape(document) });
  }));

  app.delete(`${API}/admin/documents/:id`, admin, route(async (req, res) => {
    const id = clean(req.params.id, 100);
    const document = await db.diklatDocument.update({ where: { id }, data: { status: "ARCHIVED" } }).catch((error) => {
      if ((error as any)?.code === "P2025") return null;
      throw error;
    });
    if (!document) return fail(res, 404, "DOCUMENT_NOT_FOUND", "Dokumen tidak ditemukan.");
    await audit("ADMIN_SESSION", "DIKLAT_DOCUMENT_ARCHIVED", "DiklatDocument", id);
    return ok(res, { deleted: false, archived: true });
  }));

  app.get(`${API}/admin/trainings/:id/documents`, admin, route(async (req, res) => {
    const documents = await db.diklatDocument.findMany({
      where: { trainingId: clean(req.params.id, 100) },
      include: { driveFile: true },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return ok(res, { documents: documents.map(publicDocumentShape) });
  }));

  app.get(`${API}/admin/trainings/:id/task-types`, admin, route(async (req, res) => {
    const taskTypes = await db.diklatTaskType.findMany({
      where: { trainingId: clean(req.params.id, 100) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return ok(res, { taskTypes: taskTypes.map(taskTypeShape) });
  }));

  app.get(`${API}/admin/task-types`, admin, route(async (req, res) => {
    const trainingId = clean(req.query.trainingId, 100);
    const taskTypes = await db.diklatTaskType.findMany({
      where: trainingId ? { trainingId } : {},
      include: { training: { select: { title: true } } },
      orderBy: [{ training: { title: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return ok(res, {
      taskTypes: taskTypes.map((task) => ({ ...taskTypeShape(task), trainingName: task.training.title })),
    });
  }));

  app.get(`${API}/admin/submissions/export.xlsx`, admin, route(async (req, res) => {
    const result = await loadSubmissions(req, -1);
    const rows = result.items.map((item) => ({
      "Nomor Referensi": item.reference,
      "Waktu Pengiriman": item.submittedAt,
      "Diklat": item.trainingName,
      "Nama Lengkap": item.fullName,
      "NIP": item.nip || "",
      "Asal Instansi": item.institution,
      "Jenis Tugas": item.taskName,
      "Nama File": item.fileName,
      "Status": item.status,
      "Tautan Google Drive": item.driveUrl || "",
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Pengumpulan Diklat");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=pengumpulan-diklat.xlsx");
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(buffer);
  }));

  app.get(`${API}/admin/submissions`, admin, route(async (req, res) => ok(res, await loadSubmissions(req))));

  app.get(`${API}/admin/submissions/:id/file`, admin, route(async (req, res) => {
    const submission = await db.diklatSubmission.findUnique({
      where: { id: clean(req.params.id, 100) },
      include: { driveFile: true },
    });
    if (!submission) return fail(res, 404, "SUBMISSION_NOT_FOUND", "Pengumpulan tidak ditemukan.");
    return streamDriveFile(res, submission.driveFile);
  }));

  app.get(`${API}/admin/settings`, admin, route(async (_req, res) => {
    const settings = await ensureSettings();
    return ok(res, { settings: adminSettings(settings) });
  }));

  app.put(`${API}/admin/settings`, admin, route(async (req, res) => {
    const title = clean(req.body?.title, 160);
    const maxFileSizeMb = parseIntBounded(req.body?.maxFileSizeMb, 15, 1, 20);
    if (!title) return fail(res, 400, "VALIDATION_ERROR", "Nama portal wajib diisi.");
    const allowedMimeTypes: string[] = Array.isArray(req.body?.allowedMimeTypes)
      ? [...new Set<string>((req.body.allowedMimeTypes as unknown[]).map((item) => clean(item, 150)).filter((item): item is string => DEFAULT_ALLOWED_MIME_TYPES.includes(item)))]
      : DEFAULT_ALLOWED_MIME_TYPES;
    const allowedExtensions: string[] = Array.isArray(req.body?.allowedExtensions)
      ? [...new Set<string>((req.body.allowedExtensions as unknown[]).map((item) => clean(item, 12).toLowerCase()).filter((item): item is string => DEFAULT_ALLOWED_EXTENSIONS.includes(item)))]
      : DEFAULT_ALLOWED_EXTENSIONS;
    if (!allowedMimeTypes.length || !allowedExtensions.length) return fail(res, 400, "INVALID_FILE_POLICY", "Pilih sedikitnya satu jenis dan ekstensi file yang diizinkan.");
    const submissionDriveAccess = clean(req.body?.submissionDriveAccess, 20).toUpperCase();
    if (!["PRIVATE", "LINK"].includes(submissionDriveAccess)) return fail(res, 400, "INVALID_DRIVE_ACCESS", "Pengaturan akses file tidak valid.");
    const settings = await db.diklatModuleSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        title,
        description: clean(req.body?.description, 1_000),
        submissionsEnabled: req.body?.submissionsEnabled !== false,
        archiveVisible: req.body?.archiveVisible !== false,
        maxFileSizeMb,
        allowedMimeTypes,
        allowedExtensions,
        submissionDriveAccess,
        rootFolderId: clean(req.body?.rootFolderId, 200),
      },
      update: {
        title,
        description: clean(req.body?.description, 1_000),
        submissionsEnabled: req.body?.submissionsEnabled !== false,
        archiveVisible: req.body?.archiveVisible !== false,
        maxFileSizeMb,
        allowedMimeTypes,
        allowedExtensions,
        submissionDriveAccess,
        rootFolderId: clean(req.body?.rootFolderId, 200),
      },
    });
    await audit("ADMIN_SESSION", "DIKLAT_SETTINGS_UPDATED", "DiklatModuleSettings", "1", { submissionDriveAccess });
    return ok(res, { settings: adminSettings(settings) });
  }));

  app.get(`${API}/admin/drive/status`, admin, route(async (_req, res) => {
    const settings = await ensureSettings();
    const [filesToVerify, missingFiles] = await Promise.all([
      db.diklatDriveFile.count({ where: { verificationStatus: "STORED" } }),
      db.diklatDriveFile.count({ where: { verificationStatus: "MISSING" } }),
    ]);
    const configured = driveConfigured();
    let connected = false;
    let message = configured ? "Koneksi Drive belum diuji." : "Koneksi Google Drive belum tersedia di environment server.";
    if (configured) {
      try {
        await getDriveClient().files.list({ pageSize: 1, fields: "files(id)", supportsAllDrives: true, includeItemsFromAllDrives: true });
        connected = true;
        message = "Google Drive terhubung.";
      } catch (error) { message = driveErrorMessage(error); }
    }
    return ok(res, { configured, connected, rootFolderId: settings.rootFolderId, message, filesToVerify, missingFiles });
  }));

  app.post(`${API}/admin/drive/status/test`, admin, route(async (_req, res) => {
    const settings = await ensureSettings();
    const [filesToVerify, missingFiles] = await Promise.all([
      db.diklatDriveFile.count({ where: { verificationStatus: "STORED" } }),
      db.diklatDriveFile.count({ where: { verificationStatus: "MISSING" } }),
    ]);
    if (!driveConfigured()) return fail(res, 503, "DRIVE_NOT_CONFIGURED", "Koneksi Google Drive belum tersedia di environment server.");
    try {
      await getDriveClient().files.list({ pageSize: 1, fields: "files(id)", supportsAllDrives: true, includeItemsFromAllDrives: true });
      await audit("ADMIN_SESSION", "DIKLAT_DRIVE_CONNECTION_TESTED", "DiklatDriveFile", undefined, { connected: true });
      return ok(res, { configured: true, connected: true, rootFolderId: settings.rootFolderId, message: "Google Drive terhubung.", filesToVerify, missingFiles });
    } catch (error) {
      const message = driveErrorMessage(error);
      await audit("ADMIN_SESSION", "DIKLAT_DRIVE_CONNECTION_TESTED", "DiklatDriveFile", undefined, { connected: false });
      return fail(res, 502, "DRIVE_CONNECTION_FAILED", message);
    }
  }));

  app.post(`${API}/admin/drive/reconcile`, admin, route(async (req, res) => {
    if (!driveConfigured()) {
      return fail(res, 503, "DRIVE_NOT_CONFIGURED", "Koneksi Google Drive belum tersedia di environment server.");
    }
    const cursor = clean(req.body?.cursor, 100);
    const where: any = {
      verificationStatus: { in: ["STORED", "MISSING"] },
      ...(cursor ? { id: { gt: cursor } } : {}),
    };
    const files = await db.diklatDriveFile.findMany({
      where,
      take: 100,
      orderBy: { id: "asc" },
      select: { id: true, driveFileId: true, verificationStatus: true },
    });
    let newlyMissing = 0;
    let restored = 0;
    let checked = 0;
    let skipped = 0;
    const drive = getDriveClient();
    for (let index = 0; index < files.length; index += 5) {
      await Promise.all(files.slice(index, index + 5).map(async (file) => {
        try {
          const response = await drive.files.get({
            fileId: file.driveFileId,
            fields: "id,trashed",
            supportsAllDrives: true,
          });
          const nextStatus = response.data.trashed ? "MISSING" : "STORED";
          if (nextStatus !== file.verificationStatus) {
            await db.diklatDriveFile.update({ where: { id: file.id }, data: { verificationStatus: nextStatus } });
            if (nextStatus === "MISSING") newlyMissing += 1;
            else restored += 1;
          }
          checked += 1;
        } catch (error) {
          const status = Number((error as any)?.code || (error as any)?.response?.status || 0);
          if (status === 404) {
            if (file.verificationStatus !== "MISSING") {
              await db.diklatDriveFile.update({ where: { id: file.id }, data: { verificationStatus: "MISSING" } });
              newlyMissing += 1;
            }
            checked += 1;
          } else {
            skipped += 1;
          }
        }
      }));
    }
    const lastId = files.at(-1)?.id || cursor;
    const remainingWhere = {
      verificationStatus: { in: ["STORED", "MISSING"] },
      ...(lastId ? { id: { gt: lastId } } : {}),
    };
    const [remaining, filesToVerify, missingFiles] = await Promise.all([
      db.diklatDriveFile.count({ where: remainingWhere }),
      db.diklatDriveFile.count({ where: { verificationStatus: "STORED" } }),
      db.diklatDriveFile.count({ where: { verificationStatus: "MISSING" } }),
    ]);
    await audit("ADMIN_SESSION", "DIKLAT_DRIVE_RECONCILED", "DiklatDriveFile", undefined, {
      checked, newlyMissing, restored, skipped, remaining,
    });
    return ok(res, {
      configured: true,
      connected: true,
      message: skipped ? `Pemeriksaan selesai dengan ${skipped} berkas yang tidak dapat diverifikasi.` : "Pemeriksaan konsistensi Drive selesai.",
      checked,
      newlyMissing,
      restored,
      skipped,
      remaining,
      nextCursor: remaining && lastId ? lastId : null,
      filesToVerify,
      missingFiles,
    });
  }));

  app.get(`${API}/admin/audit`, admin, route(async (req, res) => {
    const { page, pageSize, skip } = parseListQuery(req);
    const where = { entity: { startsWith: "Diklat" } };
    const [items, total] = await Promise.all([
      db.coreAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      db.coreAuditLog.count({ where }),
    ]);
    return ok(res, { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  }));
}
