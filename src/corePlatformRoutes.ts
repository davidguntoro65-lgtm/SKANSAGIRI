import crypto from "crypto";
import type { Express, Request, Response, NextFunction } from "express";
import * as XLSX from "xlsx";
import { db } from "./db";

type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
type AdminPasswordProvider = () => Promise<string | null>;
type ImportType =
  | "tahun-ajaran"
  | "jurusan"
  | "mapel"
  | "kelas"
  | "guru"
  | "siswa"
  | "assignment-guru"
  | "enrollment-siswa";

type PreviewRow = {
  row: number;
  values: Record<string, unknown>;
  status: "VALID" | "UNCHANGED" | "DUPLICATE" | "ERROR";
  errors: string[];
};

const STUDENT_DATA_HEADERS = [
  "nisn", "nis", "namaLengkap", "email", "noTelp", "jenisKelamin",
  "tempatLahir", "tanggalLahir", "kodeKelas", "kodeTahunAjaran", "password", "status",
];

const TEMPLATE_DEFINITIONS: Record<ImportType, { label: string; headers: string[] }> = {
  "tahun-ajaran": { label: "Tahun Ajaran", headers: ["code", "name", "isActive"] },
  jurusan: { label: "Jurusan / Program Keahlian", headers: ["code", "name"] },
  mapel: { label: "Mata Pelajaran", headers: ["code", "name", "kodeJurusan"] },
  kelas: { label: "Kelas", headers: ["code", "name", "tingkat", "kodeJurusan", "kodeTahunAjaran"] },
  guru: { label: "Guru", headers: ["nip", "namaLengkap", "email", "noHp", "status"] },
  siswa: {
    label: "Siswa",
    headers: STUDENT_DATA_HEADERS,
  },
  "assignment-guru": { label: "Assignment Guru", headers: ["nip", "kodeMapel", "kodeKelas", "kodeTahunAjaran", "status"] },
  "enrollment-siswa": { label: "Enrollment Siswa", headers: ["nisn", "kodeKelas", "kodeTahunAjaran", "status"] },
};

const REQUIRED_HEADERS: Record<ImportType, string[]> = {
  "tahun-ajaran": ["code", "name"],
  jurusan: ["code", "name"],
  mapel: ["code", "name"],
  kelas: ["code", "name", "tingkat", "kodeTahunAjaran"],
  guru: ["nip", "namaLengkap"],
  siswa: ["nisn", "nis", "namaLengkap", "kodeKelas", "kodeTahunAjaran"],
  "assignment-guru": ["nip", "kodeMapel", "kodeKelas", "kodeTahunAjaran"],
  "enrollment-siswa": ["nisn", "kodeKelas", "kodeTahunAjaran"],
};

const VALID_STATUSES = new Set(["ACTIVE", "INACTIVE", "ARCHIVED"]);

function ok(res: Response, data: unknown, meta?: Record<string, unknown>) {
  return res.json({ success: true, data, ...(meta ? { meta } : {}) });
}

function fail(res: Response, status: number, code: string, message: string, fields?: unknown) {
  return res.status(status).json({ success: false, error: { code, message, ...(fields ? { fields } : {}) } });
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

type PilketosRateBucket = { count: number; resetAt: number };
const pilketosRateBuckets = new Map<string, PilketosRateBucket>();
const PILKETOS_RATE_WINDOW_MS = 60_000;
const PILKETOS_RATE_PER_SOURCE = 30_000;
const PILKETOS_RATE_MAX_BUCKETS = 40_000;
let pilketosRateChecks = 0;
const PILKETOS_PUBLIC_ELECTION_CACHE_MS = 10_000;
let pilketosPublicElectionCacheVersion = 0;
const pilketosPublicElectionCache = new Map<
  string,
  { expiresAt: number; election: any } | { expiresAt: number; electionPromise: Promise<any> }
>();

async function getCachedPublicPilketosElection(includeDraft = false) {
  const key = includeDraft ? "active-or-draft" : "active";
  const cached = pilketosPublicElectionCache.get(key);
  if (cached && "electionPromise" in cached) return cached.electionPromise;
  if (cached && "election" in cached && cached.expiresAt > Date.now()) return cached.election;
  const cacheVersion = pilketosPublicElectionCacheVersion;

  const electionPromise = (async () => {
    const candidateInclude = {
      orderBy: [{ grade: "asc" as const }, { candidateNo: "asc" as const }],
    };
    const openElection = await db.pilketosElection.findFirst({
      where: { status: "OPEN" },
      include: { candidates: candidateInclude },
      orderBy: { updatedAt: "desc" },
    });
    if (openElection || !includeDraft) return openElection;
    return db.pilketosElection.findFirst({
      where: { status: "DRAFT" },
      include: { candidates: candidateInclude },
      orderBy: { updatedAt: "desc" },
    });
  })();
  pilketosPublicElectionCache.set(key, { expiresAt: 0, electionPromise });
  try {
    const election = await electionPromise;
    if (cacheVersion === pilketosPublicElectionCacheVersion) {
      pilketosPublicElectionCache.set(key, { expiresAt: Date.now() + PILKETOS_PUBLIC_ELECTION_CACHE_MS, election });
    }
    return election;
  } catch (error) {
    pilketosPublicElectionCache.delete(key);
    throw error;
  }
}

function invalidatePublicPilketosElectionCache() {
  pilketosPublicElectionCacheVersion += 1;
  pilketosPublicElectionCache.clear();
}

function pilketosRateLimit(scope: "identify" | "status" | "vote", perIdentifierLimit: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (++pilketosRateChecks % 256 === 0) {
      for (const [key, bucket] of pilketosRateBuckets) {
        if (bucket.resetAt <= now) pilketosRateBuckets.delete(key);
      }
    }

    const identifier = clean(req.body?.identifier).toUpperCase();
    const identifierHash = crypto.createHash("sha256").update(identifier || "__missing__").digest("hex");
    const sessionToken = (req.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const source = sessionToken
      ? crypto.createHash("sha256").update(sessionToken).digest("hex")
      : req.socket.remoteAddress || "unknown";
    const keys = [
      { key: `source:${source}`, limit: PILKETOS_RATE_PER_SOURCE },
      { key: `${scope}:${identifierHash}`, limit: perIdentifierLimit },
    ];
    const blocked = keys
      .map(({ key, limit }) => ({ key, limit, bucket: pilketosRateBuckets.get(key) }))
      .find(({ bucket, limit }) => bucket && bucket.resetAt > now && bucket.count >= limit);

    if (blocked) {
      const retryAfter = Math.max(1, Math.ceil(((blocked.bucket?.resetAt || now + 1) - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return fail(res, 429, "RATE_LIMITED", "Terlalu banyak permintaan Pilketos. Silakan coba lagi sebentar.");
    }

    for (const { key } of keys) {
      const bucket = pilketosRateBuckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        pilketosRateBuckets.set(key, { count: 1, resetAt: now + PILKETOS_RATE_WINDOW_MS });
      } else {
        bucket.count += 1;
      }
    }
    while (pilketosRateBuckets.size > PILKETOS_RATE_MAX_BUCKETS) {
      const oldestKey = pilketosRateBuckets.keys().next().value;
      if (!oldestKey) break;
      pilketosRateBuckets.delete(oldestKey);
    }
    return next();
  };
}

function safeTextEqual(leftText: string, rightText: string) {
  const left = Buffer.from(leftText);
  const right = Buffer.from(rightText);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function hashPasswordAsync(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  return new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

function studentAccountEmail(nis: string) {
  const normalizedNis = nis.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const uniqueSuffix = crypto.createHash("sha256").update(nis).digest("hex").slice(0, 12);
  return `siswa.${normalizedNis}.${uniqueSuffix}@akun.smkn1wonogiri.local`;
}

function studentLoginEmail(values: Record<string, unknown>, user?: { email?: string | null } | null) {
  const suppliedEmail = clean(values.email).toLowerCase();
  const existingEmail = user && typeof user === "object" ? clean(user.email).toLowerCase() : "";
  // CoreUser requires a unique email even when a student has no contact email.
  // Keep that internal identity separate from CoreStudent.email so NIS login works.
  return suppliedEmail || existingEmail || studentAccountEmail(clean(values.nis));
}

function maskPreviewRows(rows: PreviewRow[]) {
  return rows.map((row) => ({
    ...row,
    values: Object.fromEntries(Object.entries(row.values).map(([key, value]) => [key, key === "password" && clean(value) ? "••••••••" : value])),
  }));
}

function asBoolean(value: unknown) {
  return ["true", "1", "ya", "yes", "aktif", "active"].includes(clean(value).toLowerCase());
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 24 * 60 * 60 * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const text = clean(value);
  if (!text) return null;
  const localDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localDate) {
    const [, day, month, year] = localDate;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
    return date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseWorkbook(fileBase64: string, type: ImportType) {
  const definition = TEMPLATE_DEFINITIONS[type];
  if (!definition) throw new Error("Jenis template tidak dikenal.");
  const base64 = fileBase64.replace(/^data:.*?;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw new Error("File XLSX kosong atau melebihi batas 10 MB.");
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("Workbook tidak memiliki sheet.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "" });
  const headerRow = (matrix[0] || []).map((value) => clean(value));
  const missing = REQUIRED_HEADERS[type].filter((header) => !headerRow.includes(header));
  if (missing.length) throw new Error(`Header wajib tidak lengkap: ${missing.join(", ")}.`);
  const rows = matrix.slice(1).map((row) => {
    const values: Record<string, unknown> = {};
    definition.headers.forEach((header) => {
      const aliases = header === "noTelp" ? ["noTelp", "noHp"] : [header];
      const sourceHeader = aliases.find((candidate) => headerRow.includes(candidate));
      values[header] = sourceHeader ? (row as unknown[])[headerRow.indexOf(sourceHeader)] ?? "" : "";
    });
    return values;
  }).filter((row) => Object.values(row).some((value) => clean(value)));
  if (!rows.length) throw new Error("File belum berisi baris data untuk diimpor.");
  return { checksum, rows };
}

async function referenceMaps() {
  const [years, departments, subjects, classes, teachers, studentRecords] = await Promise.all([
    db.academicYear.findMany({ select: { id: true, code: true } }),
    db.department.findMany({ select: { id: true, code: true } }),
    db.subject.findMany({ select: { id: true, code: true } }),
    db.academicClass.findMany({ select: { id: true, code: true, academicYearId: true } }),
    db.coreTeacher.findMany({ select: { id: true, nip: true } }),
    db.coreStudent.findMany({
      select: {
        id: true,
        nisn: true,
        nis: true,
        userId: true,
      },
    }),
  ]);
  const linkedUserIds = [...new Set(studentRecords.map((student) => student.userId).filter((id): id is string => Boolean(id)))];
  const linkedUsers = linkedUserIds.length
    ? await db.coreUser.findMany({ where: { id: { in: linkedUserIds } }, select: { id: true, email: true } })
    : [];
  const usersById = new Map(linkedUsers.map((user) => [user.id, user]));
  const students = studentRecords.map((student) => ({
    ...student,
    user: student.userId ? usersById.get(student.userId) ?? null : null,
  }));
  return {
    years: new Map(years.map((item) => [item.code, item])),
    departments: new Map(departments.map((item) => [item.code, item])),
    subjects: new Map(subjects.map((item) => [item.code, item])),
    classes: new Map(classes.map((item) => [item.code, item])),
    teachers: new Map(teachers.map((item) => [item.nip, item])),
    students: new Map(students.map((item) => [item.nisn, item])),
    studentsByNis: new Map(students.filter((item) => item.nis).map((item) => [item.nis!, item])),
  };
}

async function validateRows(type: ImportType, rows: Record<string, unknown>[]): Promise<PreviewRow[]> {
  const refs = await referenceMaps();
  const accountEmails = type === "siswa"
    ? [...new Set(rows.map((values) => {
      const nisn = clean(values.nisn);
      const existing = refs.students.get(nisn) as { user?: { email: string } | null } | undefined;
      return studentLoginEmail(values, existing?.user);
    }))]
    : [];
  const emailOwners = accountEmails.length
    ? await db.coreUser.findMany({ where: { email: { in: accountEmails } }, select: { id: true, email: true } })
    : [];
  const emailOwnerByEmail = new Map(emailOwners.map((user) => [user.email, user]));
  const seen = new Set<string>();
  const seenStudentNisn = new Set<string>();
  const seenStudentNis = new Set<string>();
  const seenStudentEmails = new Set<string>();
  const seenAccountEmails = new Set<string>();
  const result: PreviewRow[] = [];
  const keyFor = (values: Record<string, unknown>) => {
    switch (type) {
      case "tahun-ajaran": return clean(values.code);
      case "jurusan": return clean(values.code);
      case "mapel": return clean(values.code);
      case "kelas": return clean(values.code);
      case "guru": return clean(values.nip);
      case "siswa": return [values.nisn, values.nis].map(clean).join("|");
      case "assignment-guru": return [values.nip, values.kodeMapel, values.kodeKelas, values.kodeTahunAjaran].map(clean).join("|");
      case "enrollment-siswa": return [values.nisn, values.kodeKelas, values.kodeTahunAjaran].map(clean).join("|");
    }
  };

  rows.forEach((values, index) => {
    const errors: string[] = [];
    for (const header of REQUIRED_HEADERS[type]) if (!clean(values[header])) errors.push(`${header} wajib diisi.`);
    const key = keyFor(values);
    if (seen.has(key)) errors.push("Duplikat di dalam file.");
    seen.add(key);
    if (type === "guru" && clean(values.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(values.email))) errors.push("Format email tidak valid.");
    if (type === "siswa" && clean(values.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(values.email))) errors.push("Format email tidak valid.");
    if (type === "siswa") {
      const nisn = clean(values.nisn);
      const nis = clean(values.nis);
      const email = clean(values.email).toLowerCase();
      const existingStudent = refs.students.get(nisn) as { user?: { id: string; email: string } | null } | undefined;
      const accountEmail = studentLoginEmail(values, existingStudent?.user);
      if (seenStudentNisn.has(nisn)) errors.push(`NISN "${nisn}" duplikat di dalam file.`);
      if (seenStudentNis.has(nis)) errors.push(`NIS "${nis}" duplikat di dalam file.`);
      if (email && seenStudentEmails.has(email)) errors.push(`Email "${email}" duplikat di dalam file.`);
      if (seenAccountEmails.has(accountEmail)) errors.push(`Email akun "${accountEmail}" duplikat di dalam file.`);
      seenStudentNisn.add(nisn);
      seenStudentNis.add(nis);
      if (email) seenStudentEmails.add(email);
      seenAccountEmails.add(accountEmail);
      const emailOwner = emailOwnerByEmail.get(accountEmail);
      if (emailOwner && emailOwner.id !== existingStudent?.user?.id) {
        errors.push(`Email akun "${accountEmail}" sudah digunakan akun lain.`);
      }
      const password = clean(values.password);
      if (password && password.length < 8) errors.push("Password awal harus minimal 8 karakter.");
      if (!password && !existingStudent?.user?.id) errors.push("Password awal wajib diisi minimal 8 karakter untuk akun baru.");
      const existingByNis = refs.studentsByNis.get(nis) as { nisn: string } | undefined;
      if (existingByNis && existingByNis.nisn !== nisn) errors.push(`NIS "${nis}" sudah digunakan siswa lain.`);
    }
    if (type === "siswa" && clean(values.tanggalLahir) && !parseDate(values.tanggalLahir)) errors.push("Format tanggalLahir tidak valid.");
    if (type === "kelas" && clean(values.kodeTahunAjaran) && !refs.years.has(clean(values.kodeTahunAjaran))) errors.push(`Kode tahun ajaran "${clean(values.kodeTahunAjaran)}" tidak ditemukan.`);
    if (type === "kelas" && clean(values.kodeJurusan) && !refs.departments.has(clean(values.kodeJurusan))) errors.push(`Kode jurusan "${clean(values.kodeJurusan)}" tidak ditemukan.`);
    if (type === "mapel" && clean(values.kodeJurusan) && !refs.departments.has(clean(values.kodeJurusan))) errors.push(`Kode jurusan "${clean(values.kodeJurusan)}" tidak ditemukan.`);
    if (type === "siswa") {
      if (clean(values.kodeKelas) && !refs.classes.has(clean(values.kodeKelas))) errors.push(`Kode kelas "${clean(values.kodeKelas)}" tidak ditemukan.`);
      if (clean(values.kodeTahunAjaran) && !refs.years.has(clean(values.kodeTahunAjaran))) errors.push(`Kode tahun ajaran "${clean(values.kodeTahunAjaran)}" tidak ditemukan.`);
    }
    if (type === "assignment-guru") {
      if (!refs.teachers.has(clean(values.nip))) errors.push(`NIP "${clean(values.nip)}" tidak ditemukan.`);
      if (!refs.subjects.has(clean(values.kodeMapel))) errors.push(`Kode mapel "${clean(values.kodeMapel)}" tidak ditemukan.`);
      if (!refs.classes.has(clean(values.kodeKelas))) errors.push(`Kode kelas "${clean(values.kodeKelas)}" tidak ditemukan.`);
      if (!refs.years.has(clean(values.kodeTahunAjaran))) errors.push(`Kode tahun ajaran "${clean(values.kodeTahunAjaran)}" tidak ditemukan.`);
    }
    if (type === "enrollment-siswa") {
      if (!refs.students.has(clean(values.nisn))) errors.push(`NISN "${clean(values.nisn)}" tidak ditemukan.`);
      if (!refs.classes.has(clean(values.kodeKelas))) errors.push(`Kode kelas "${clean(values.kodeKelas)}" tidak ditemukan.`);
      if (!refs.years.has(clean(values.kodeTahunAjaran)) ) errors.push(`Kode tahun ajaran "${clean(values.kodeTahunAjaran)}" tidak ditemukan.`);
    }
    if (["siswa", "assignment-guru", "enrollment-siswa"].includes(type)) {
      const classroom = refs.classes.get(clean(values.kodeKelas));
      const year = refs.years.get(clean(values.kodeTahunAjaran));
      if (classroom && year && classroom.academicYearId !== year.id) {
        errors.push(`Kelas "${clean(values.kodeKelas)}" bukan bagian dari tahun ajaran "${clean(values.kodeTahunAjaran)}".`);
      }
    }
    if (values.status && !VALID_STATUSES.has(clean(values.status).toUpperCase())) errors.push("Status harus ACTIVE, INACTIVE, atau ARCHIVED.");
    result.push({ row: index + 2, values, status: errors.length ? (errors.some((error) => error.startsWith("Duplikat")) ? "DUPLICATE" : "ERROR") : "VALID", errors });
  });
  return result;
}

function statusValue(value: unknown) {
  const status = clean(value).toUpperCase();
  return VALID_STATUSES.has(status) ? status : "ACTIVE";
}

function pageParams(req: { query: Record<string, unknown> }) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 25));
  const search = clean(req.query.search);
  return { page, pageSize, search };
}

function masterSearchWhere(entity: string, field: string, search: string): Record<string, any> | undefined {
  if (!search) return undefined;
  const contains = { contains: search, mode: "insensitive" as const };
  const status = search.toUpperCase();
  const validStatus = VALID_STATUSES.has(status) ? status : null;
  const activeValue = ["AKTIF", "ACTIVE", "YA", "TRUE"].includes(status)
    ? true
    : ["TIDAK AKTIF", "NONAKTIF", "INACTIVE", "TIDAK", "FALSE"].includes(status)
      ? false
      : null;
  const statusFilter = validStatus
    ? { status: validStatus }
    : entity === "academicYears" && activeValue !== null
      ? { isActive: activeValue }
      : { id: "__no_matching_master_record__" };
  const isAll = field === "all";
  const is = (value: unknown) => value === field;
  const or = (...filters: Array<Record<string, any> | null>) => filters.filter((filter): filter is Record<string, any> => Boolean(filter));
  const text = (key: string) => ({ [key]: contains });
  const department = {
    department: { is: { OR: [{ code: contains }, { name: contains }] } },
  };
  const academicYear = {
    academicYear: { is: { OR: [{ code: contains }, { name: contains }] } },
  };
  switch (entity) {
    case "academicYears": {
      if (is("code")) return text("code");
      if (is("name")) return text("name");
      if (is("status")) return statusFilter;
      if (isAll) return { OR: or(text("code"), text("name"), validStatus ? { status: validStatus } : null, activeValue !== null ? { isActive: activeValue } : null) };
      return { id: "__no_matching_master_record__" };
    }
    case "departments": {
      if (is("code")) return text("code");
      if (is("name")) return text("name");
      if (is("status")) return statusFilter;
      if (isAll) return { OR: or(text("code"), text("name"), validStatus ? { status: validStatus } : null) };
      return { id: "__no_matching_master_record__" };
    }
    case "subjects": {
      if (is("code")) return text("code");
      if (is("name")) return text("name");
      if (is("department")) return department;
      if (is("status")) return statusFilter;
      if (isAll) return { OR: or(text("code"), text("name"), department, validStatus ? { status: validStatus } : null) };
      return { id: "__no_matching_master_record__" };
    }
    case "classes": {
      if (is("code")) return text("code");
      if (is("name")) return text("name");
      if (is("grade")) return text("grade");
      if (is("academicYear")) return academicYear;
      if (is("department")) return department;
      if (is("status")) return statusFilter;
      if (isAll) return { OR: or(text("code"), text("name"), text("grade"), academicYear, department, validStatus ? { status: validStatus } : null) };
      return { id: "__no_matching_master_record__" };
    }
    case "teachers": {
      if (is("nip")) return text("nip");
      if (is("name")) return text("fullName");
      if (is("email")) return text("email");
      if (is("status")) return statusFilter;
      if (isAll) return { OR: or(text("nip"), text("fullName"), text("email"), text("phone"), validStatus ? { status: validStatus } : null) };
      return { id: "__no_matching_master_record__" };
    }
    case "students": {
      const classEnrollment = {
        enrollments: {
          some: { status: "ACTIVE", academicClass: { is: { OR: [{ code: contains }, { name: contains }] } } },
        },
      };
      const yearEnrollment = {
        enrollments: {
          some: { status: "ACTIVE", academicYear: { is: { OR: [{ code: contains }, { name: contains }] } } },
        },
      };
      if (is("nis")) return text("nis");
      if (is("nisn")) return text("nisn");
      if (is("name")) return text("fullName");
      if (is("class")) return classEnrollment;
      if (is("academicYear")) return yearEnrollment;
      if (is("status")) return statusFilter;
      if (isAll) return { OR: or(text("nis"), text("nisn"), text("fullName"), text("email"), text("phone"), classEnrollment, yearEnrollment, validStatus ? { status: validStatus } : null) };
      return { id: "__no_matching_master_record__" };
    }
    default:
      return undefined;
  }
}

async function audit(action: string, entity: string, entityId: string | undefined, metadata: Record<string, unknown> = {}) {
  await db.coreAuditLog.create({ data: { action, entity, entityId, actor: "ADMIN_SESSION", metadata: metadata as any } });
}

async function commitRows(type: ImportType, rows: PreviewRow[], actor: string, jobId: string) {
  const validRows = rows.filter((row) => row.status === "VALID" || row.status === "UNCHANGED");
  const preparedRows: Array<PreviewRow & { passwordHash?: string }> = new Array(validRows.length);
  let nextRow = 0;
  const hashWorkers = Math.min(4, validRows.length);
  await Promise.all(Array.from({ length: hashWorkers }, async () => {
    while (nextRow < validRows.length) {
      const index = nextRow++;
      const row = validRows[index];
      const password = type === "siswa" ? clean(row.values.password) : "";
      const passwordHash = password ? await hashPasswordAsync(password) : undefined;
      preparedRows[index] = { ...row, ...(passwordHash ? { passwordHash } : {}) };
    }
  }));

  return db.$transaction(async (tx) => {
    const claimedJob = await tx.coreImportJob.updateMany({
      where: { id: jobId, templateType: type, status: "PREVIEWED" },
      data: { status: "COMMITTED", committedAt: new Date(), successRows: validRows.length, errorRows: 0 },
    });
    if (claimedJob.count !== 1) throw new Error("IMPORT_ALREADY_PROCESSED");

    let success = 0;
    const studentRoleAssignments: { userId: string; roleId: string }[] = [];
    let studentRoleId: string | null = null;
    let studentsByNisn = new Map<string, {
      id: string;
      nisn: string;
      email: string | null;
      phone: string | null;
      gender: string | null;
      birthPlace: string | null;
      birthDate: Date | null;
      status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
      user: { id: string; email: string; status: "INVITED" | "ACTIVE" | "DISABLED" } | null;
    }>();
    let yearsByCode = new Map<string, { id: string }>();
    let classesByCode = new Map<string, { id: string }>();
    let usersByEmail = new Map<string, { id: string; email: string }>();

    if (type === "siswa") {
      const nisns = [...new Set(preparedRows.map(({ values }) => clean(values.nisn)))];
      const yearCodes = [...new Set(preparedRows.map(({ values }) => clean(values.kodeTahunAjaran)))];
      const classCodes = [...new Set(preparedRows.map(({ values }) => clean(values.kodeKelas)))];
      const [studentRecords, years, classes, role] = await Promise.all([
        tx.coreStudent.findMany({
          where: { nisn: { in: nisns } },
          select: {
            id: true,
            nisn: true,
            email: true,
            phone: true,
            gender: true,
            birthPlace: true,
            birthDate: true,
            status: true,
            userId: true,
          },
        }),
        tx.academicYear.findMany({ where: { code: { in: yearCodes } }, select: { id: true, code: true } }),
        tx.academicClass.findMany({ where: { code: { in: classCodes } }, select: { id: true, code: true } }),
        tx.coreRole.upsert({ where: { name: "SISWA" }, update: {}, create: { name: "SISWA" } }),
      ]);
      const linkedUserIds = [...new Set(studentRecords.map((student) => student.userId).filter((id): id is string => Boolean(id)))];
      const linkedUsers = linkedUserIds.length
        ? await tx.coreUser.findMany({ where: { id: { in: linkedUserIds } }, select: { id: true, email: true, status: true } })
        : [];
      const usersById = new Map(linkedUsers.map((user) => [user.id, user]));
      const students = studentRecords.map((student) => ({
        ...student,
        user: student.userId ? usersById.get(student.userId) ?? null : null,
      }));
      studentsByNisn = new Map(students.map((student) => [student.nisn, student]));
      yearsByCode = new Map(years.map((year) => [year.code, year]));
      classesByCode = new Map(classes.map((classroom) => [classroom.code, classroom]));
      studentRoleId = role.id;

      const accountEmails = [...new Set(preparedRows.map(({ values }) => {
        const nisn = clean(values.nisn);
        return studentLoginEmail(values, studentsByNisn.get(nisn)?.user);
      }))];
      const users = await tx.coreUser.findMany({
        where: { email: { in: accountEmails } },
        select: { id: true, email: true },
      });
      usersByEmail = new Map(users.map((user) => [user.email, user]));
    }

    for (const { values, passwordHash } of preparedRows) {
      const existingStudent = type === "siswa" ? studentsByNisn.get(clean(values.nisn)) : undefined;
      const status = (clean(values.status) ? statusValue(values.status) : existingStudent?.status || "ACTIVE") as "ACTIVE" | "INACTIVE" | "ARCHIVED";
      if (type === "tahun-ajaran") {
        const code = clean(values.code);
        if (asBoolean(values.isActive)) await tx.academicYear.updateMany({ data: { isActive: false }, where: { isActive: true } });
        await tx.academicYear.upsert({ where: { code }, update: { name: clean(values.name), isActive: asBoolean(values.isActive), status }, create: { code, name: clean(values.name), isActive: asBoolean(values.isActive), status } });
      } else if (type === "jurusan") {
        await tx.department.upsert({ where: { code: clean(values.code) }, update: { name: clean(values.name), status }, create: { code: clean(values.code), name: clean(values.name), status } });
      } else if (type === "mapel") {
        const department = clean(values.kodeJurusan) ? await tx.department.findUnique({ where: { code: clean(values.kodeJurusan) } }) : null;
        await tx.subject.upsert({ where: { code: clean(values.code) }, update: { name: clean(values.name), departmentId: department?.id, status }, create: { code: clean(values.code), name: clean(values.name), departmentId: department?.id, status } });
      } else if (type === "kelas") {
        const year = await tx.academicYear.findUnique({ where: { code: clean(values.kodeTahunAjaran) } });
        const department = clean(values.kodeJurusan) ? await tx.department.findUnique({ where: { code: clean(values.kodeJurusan) } }) : null;
        if (year) await tx.academicClass.upsert({ where: { code: clean(values.code) }, update: { name: clean(values.name), grade: clean(values.tingkat), academicYearId: year.id, departmentId: department?.id, status }, create: { code: clean(values.code), name: clean(values.name), grade: clean(values.tingkat), academicYearId: year.id, departmentId: department?.id, status } });
      } else if (type === "guru") {
        const email = clean(values.email) || null;
        const teacher = await tx.coreTeacher.upsert({ where: { nip: clean(values.nip) }, update: { fullName: clean(values.namaLengkap), email, phone: clean(values.noHp) || null, status }, create: { nip: clean(values.nip), fullName: clean(values.namaLengkap), email, phone: clean(values.noHp) || null, status } });
        if (email) {
          const user = await tx.coreUser.upsert({ where: { email }, update: { fullName: clean(values.namaLengkap) }, create: { email, fullName: clean(values.namaLengkap) } });
          await tx.coreTeacher.update({ where: { id: teacher.id }, data: { userId: user.id } });
          const role = await tx.coreRole.upsert({ where: { name: "GURU" }, update: {}, create: { name: "GURU" } });
          await tx.coreUserRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
        }
      } else if (type === "siswa") {
        const nisn = clean(values.nisn);
        const nis = clean(values.nis);
        const suppliedEmail = clean(values.email).toLowerCase() || null;
        const email = suppliedEmail || existingStudent?.email || null;
        const phone = clean(values.noTelp || values.noHp) || existingStudent?.phone || null;
        const gender = clean(values.jenisKelamin) || existingStudent?.gender || null;
        const birthPlace = clean(values.tempatLahir) || existingStudent?.birthPlace || null;
        const birthDate = clean(values.tanggalLahir) ? parseDate(values.tanggalLahir) : existingStudent?.birthDate || null;
        const existingUser = existingStudent?.user || null;
        const accountEmail = studentLoginEmail(values, existingUser);
        const userStatus = clean(values.status) || !existingUser
          ? (status === "ACTIVE" ? "ACTIVE" : "DISABLED")
          : undefined;
        const emailOwner = usersByEmail.get(accountEmail);
        if (emailOwner && emailOwner.id !== existingUser?.id) throw new Error(`Email akun siswa "${accountEmail}" sudah digunakan akun lain.`);
        if (!existingUser && !passwordHash) throw new Error("Hash password awal siswa tidak berhasil disiapkan.");
        const coreUser = existingUser
          ? await tx.coreUser.update({
            where: { id: existingUser.id },
            data: {
              ...(suppliedEmail || !clean(existingUser.email) ? { email: suppliedEmail || accountEmail } : {}),
              fullName: clean(values.namaLengkap),
              ...(userStatus ? { status: userStatus } : {}),
              ...(passwordHash ? { passwordHash, passwordChangeRecommended: true } : {}),
            },
          })
          : await tx.coreUser.create({ data: { email: accountEmail, fullName: clean(values.namaLengkap), status: userStatus!, passwordHash: passwordHash!, passwordChangeRecommended: true } });
        const formerEmail = clean(existingUser?.email).toLowerCase();
        if (formerEmail && formerEmail !== coreUser.email) {
          const formerOwner = usersByEmail.get(formerEmail);
          if (formerOwner?.id === existingUser?.id) usersByEmail.delete(formerEmail);
        }
        usersByEmail.set(coreUser.email, { id: coreUser.id, email: coreUser.email });
        const student = await tx.coreStudent.upsert({
          where: { nisn },
          update: { nis, fullName: clean(values.namaLengkap), email, phone, gender, birthPlace, birthDate, status, userId: coreUser.id },
          create: { nisn, nis, fullName: clean(values.namaLengkap), email, phone, gender, birthPlace, birthDate, status, userId: coreUser.id },
        });
        if (studentRoleId) studentRoleAssignments.push({ userId: coreUser.id, roleId: studentRoleId });
        const year = yearsByCode.get(clean(values.kodeTahunAjaran));
        const classroom = classesByCode.get(clean(values.kodeKelas));
        if (year && classroom) await tx.studentEnrollment.upsert({ where: { studentId_academicYearId: { studentId: student.id, academicYearId: year.id } }, update: { classId: classroom.id, status }, create: { studentId: student.id, classId: classroom.id, academicYearId: year.id, status } });
      } else if (type === "assignment-guru") {
        const [teacher, subject, classroom, year] = await Promise.all([
          tx.coreTeacher.findUnique({ where: { nip: clean(values.nip) } }),
          tx.subject.findUnique({ where: { code: clean(values.kodeMapel) } }),
          tx.academicClass.findUnique({ where: { code: clean(values.kodeKelas) } }),
          tx.academicYear.findUnique({ where: { code: clean(values.kodeTahunAjaran) } }),
        ]);
        if (teacher && subject && classroom && year) {
          await tx.teacherSubject.upsert({ where: { teacherId_subjectId: { teacherId: teacher.id, subjectId: subject.id } }, update: {}, create: { teacherId: teacher.id, subjectId: subject.id, source: "ADMIN_IMPORT" } });
          await tx.teachingAssignment.upsert({ where: { teacherId_subjectId_classId_academicYearId: { teacherId: teacher.id, subjectId: subject.id, classId: classroom.id, academicYearId: year.id } }, update: { status, source: "ADMIN_IMPORT" }, create: { teacherId: teacher.id, subjectId: subject.id, classId: classroom.id, academicYearId: year.id, status, source: "ADMIN_IMPORT" } });
        }
      } else if (type === "enrollment-siswa") {
        const [student, classroom, year] = await Promise.all([
          tx.coreStudent.findUnique({ where: { nisn: clean(values.nisn) } }),
          tx.academicClass.findUnique({ where: { code: clean(values.kodeKelas) } }),
          tx.academicYear.findUnique({ where: { code: clean(values.kodeTahunAjaran) } }),
        ]);
        if (student && classroom && year) await tx.studentEnrollment.upsert({ where: { studentId_academicYearId: { studentId: student.id, academicYearId: year.id } }, update: { classId: classroom.id, status }, create: { studentId: student.id, classId: classroom.id, academicYearId: year.id, status } });
      }
      success += 1;
    }
    if (studentRoleAssignments.length) {
      await tx.coreUserRole.createMany({ data: studentRoleAssignments, skipDuplicates: true });
    }
    await tx.coreAuditLog.create({ data: { action: "IMPORT_COMMIT", entity: type, actor, metadata: { rows: success } } });
    return success;
  }, type === "siswa" ? { maxWait: 10_000, timeout: 60_000 } : undefined);
}

type LmsActor = {
  userId: string;
  roles: string[];
  teacher: { id: string; nip: string; fullName: string } | null;
};

async function getLmsActor(req: Request): Promise<LmsActor | null> {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { coreUser: { include: { roles: { include: { role: true } }, teacher: true } } },
  });
  if (!session?.coreUser || session.expiresAt < new Date() || session.coreUser.status !== "ACTIVE") return null;
  return {
    userId: session.coreUser.id,
    roles: session.coreUser.roles.map(({ role }) => role.name),
    teacher: session.coreUser.teacher ? {
      id: session.coreUser.teacher.id,
      nip: session.coreUser.teacher.nip,
      fullName: session.coreUser.teacher.fullName,
    } : null,
  };
}

async function getPilketosSession(req: Request) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: {
      coreUser: {
        include: {
          roles: { include: { role: true } },
          student: true,
        },
      },
    },
  });
  if (!session?.coreUser || session.expiresAt < new Date() || session.coreUser.status !== "ACTIVE") return null;
  return session;
}

async function hasPilketosAdminAccess(req: Request) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return false;
  const session = await db.session.findUnique({
    where: { token },
    include: { coreUser: { include: { roles: { include: { role: true } } } } },
  });
  if (!session || session.expiresAt < new Date()) return false;
  if (!session.coreUser) return true;
  return session.coreUser.status === "ACTIVE" && session.coreUser.roles.some(({ role }) => role.name === "ADMIN" || role.name === "OPERATOR");
}

function imageDataError(value: unknown) {
  const image = clean(value);
  if (!image) return null;
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(image)) return "Foto kandidat harus berupa PNG, JPG, atau WebP.";
  if (image.length > 800 * 1024) return "Foto kandidat terlalu besar. Maksimal 800 KB setelah dikompres.";
  return null;
}

type PilketosGrade = "X" | "XI";
type PilketosPosition = "KETUA_UMUM" | "KETUA_1" | "KETUA_3" | "KETUA_4";
type PilketosVotingPhase = "DRAFT" | "SCHEDULED" | "OPEN" | "ENDED" | "CLOSED";

const PILKETOS_POSITIONS: PilketosPosition[] = ["KETUA_UMUM", "KETUA_1", "KETUA_3", "KETUA_4"];
// Temporary voter for development simulations; remove it when retiring this test account.
const PILKETOS_SIMULATION_NIS = "10101010";
const PILKETOS_POSITION_GRADE: Record<PilketosPosition, PilketosGrade> = {
  KETUA_UMUM: "XI",
  KETUA_1: "XI",
  KETUA_3: "X",
  KETUA_4: "X",
};

async function resolvePilketosStudent(identifierValue: unknown) {
  const identifier = clean(identifierValue);
  if (!identifier || identifier.length > 64) return null;
  // This reserved simulation voter must never be accepted by a production API.
  if (process.env.NODE_ENV === "production" && identifier === PILKETOS_SIMULATION_NIS) return null;
  return db.coreStudent.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ nis: identifier }, { nisn: identifier }],
    },
    select: { id: true, userId: true, fullName: true, nis: true, nisn: true },
  });
}

function getPilketosVotingPhase(election: { status: string; startsAt?: Date | string | null; endsAt?: Date | string | null }, now = new Date()): PilketosVotingPhase {
  if (election.status === "DRAFT") return "DRAFT";
  if (election.status !== "OPEN") return "CLOSED";
  if (election.startsAt && now < new Date(election.startsAt)) return "SCHEDULED";
  if (election.endsAt && now >= new Date(election.endsAt)) return "ENDED";
  return "OPEN";
}

function candidateRevision(candidates: any[] = []) {
  return candidates
    .map((candidate) => `${candidate.id}:${new Date(candidate.updatedAt || candidate.createdAt || 0).getTime()}`)
    .sort()
    .join("|");
}

function publicPilketosElection(
  election: any,
  votedPositions: string[] = [],
  votedCandidateIds: string[] = [],
  stats?: any,
  options: { includePhotoData?: boolean } = {},
) {
  if (!election) return null;
  return {
    id: election.id,
    title: election.title,
    academicYear: election.academicYear,
    description: election.description,
    status: election.status,
    startsAt: election.startsAt,
    endsAt: election.endsAt,
    votingPhase: getPilketosVotingPhase(election),
    serverTime: new Date().toISOString(),
    hasVoted: votedCandidateIds.length > 0,
    votedPositions,
    votedCandidateIds,
    stats,
    candidateRevision: candidateRevision(election.candidates || []),
    candidates: (election.candidates || []).map((candidate: any) => ({
      id: candidate.id,
      grade: candidate.grade,
      candidateNo: candidate.candidateNo,
      name: candidate.name,
      ...(options.includePhotoData === false
        ? {
            photoData: null,
            photoUrl: candidate.photoData
              ? `/api/v1/pilketos/candidates/${candidate.id}/photo?v=${new Date(candidate.updatedAt || candidate.createdAt || 0).getTime()}`
              : null,
          }
        : { photoData: candidate.photoData }),
      voteCount: candidate._count?.votes,
      voteCounts: candidate.voteCounts,
    })),
  };
}

async function getPilketosStats(electionId: string) {
  const [totalVoters, voteRows] = await Promise.all([
    db.coreStudent.count({ where: { status: "ACTIVE" } }),
    db.pilketosVote.findMany({
      where: { electionId },
      select: { studentId: true, position: true },
    }),
  ]);
  const positionsByStudent = new Map<string, Set<string>>();
  for (const vote of voteRows) {
    const positions = positionsByStudent.get(vote.studentId) || new Set<string>();
    positions.add(vote.position);
    positionsByStudent.set(vote.studentId, positions);
  }
  const totalCompleted = [...positionsByStudent.values()].filter((positions) =>
    PILKETOS_POSITIONS.every((position) => positions.has(position)) ||
    (positions.has("LEGACY_X") && positions.has("LEGACY_XI")),
  ).length;
  const legacyVoterCount = [...positionsByStudent.values()].filter((positions) =>
    positions.has("LEGACY_X") || positions.has("LEGACY_XI"),
  ).length;
  return {
    totalVoters,
    totalVoted: positionsByStudent.size,
    totalCompleted,
    totalPending: Math.max(0, positionsByStudent.size - totalCompleted),
    legacyVoterCount,
  };
}

function canManageAllLms(roles: string[]) {
  return roles.includes("ADMIN") || roles.includes("OPERATOR");
}

function moduleScope(actor: LmsActor) {
  return canManageAllLms(actor.roles) ? {} : { ownerTeacherId: actor.teacher?.id || "__missing_teacher__" };
}

export function registerCorePlatformRoutes(app: Express, requireAuth: AuthMiddleware, getAdminPassword: AdminPasswordProvider) {
  const adminPasswordAttempts = new Map<string, { count: number; windowEndsAt: number; blockedUntil: number }>();
  const confirmAdminPassword = async (req: Request, res: Response) => {
    const suppliedPassword = typeof req.body?.adminPassword === "string" ? req.body.adminPassword : "";
    if (!suppliedPassword) {
      fail(res, 400, "ADMIN_PASSWORD_REQUIRED", "Kata sandi admin wajib diisi untuk mengubah data siswa.");
      return false;
    }
    const source = req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const attempt = adminPasswordAttempts.get(source);
    if (attempt && attempt.blockedUntil > now) {
      const secondsLeft = Math.ceil((attempt.blockedUntil - now) / 1000);
      res.setHeader("Retry-After", String(secondsLeft));
      fail(res, 429, "ADMIN_PASSWORD_RATE_LIMITED", `Terlalu banyak percobaan. Coba lagi dalam ${secondsLeft} detik.`);
      return false;
    }

    let currentPassword: string | null;
    try {
      currentPassword = await getAdminPassword();
    } catch {
      fail(res, 503, "ADMIN_CREDENTIALS_UNAVAILABLE", "Kata sandi admin tidak dapat diverifikasi saat ini.");
      return false;
    }
    if (!currentPassword) {
      fail(res, 503, "ADMIN_CREDENTIALS_UNAVAILABLE", "Akun admin belum dikonfigurasi.");
      return false;
    }
    if (!safeTextEqual(suppliedPassword, currentPassword)) {
      const current = attempt && attempt.windowEndsAt > now
        ? attempt
        : { count: 0, windowEndsAt: now + 60_000, blockedUntil: 0 };
      current.count += 1;
      if (current.count >= 5) {
        current.count = 0;
        current.blockedUntil = now + 60_000;
      }
      adminPasswordAttempts.set(source, current);
      while (adminPasswordAttempts.size > 10_000) {
        const oldest = adminPasswordAttempts.keys().next().value;
        if (!oldest) break;
        adminPasswordAttempts.delete(oldest);
      }
      fail(res, 403, "INVALID_ADMIN_PASSWORD", "Kata sandi admin salah. Tidak ada data yang diubah.");
      return false;
    }
    adminPasswordAttempts.delete(source);
    return true;
  };

  app.get("/api/v1/pilketos/active", asyncRoute(async (req, res) => {
    // The public landing page also needs to preview candidates while the
    // committee is still preparing a draft. Prefer the live election, then
    // fall back to the newest draft so names and photos are visible before
    // voting opens.
    const election = await getCachedPublicPilketosElection(true);
    let votedPositions: string[] = [];
    let votedCandidateIds: string[] = [];
    const session = await getPilketosSession(req);
    if (election && session?.coreUser?.student) {
      const votes = await db.pilketosVote.findMany({
        where: { electionId: election.id, studentId: session.coreUser.student.id },
        select: { position: true, candidateId: true },
      });
      votedPositions = votes.map((vote) => vote.position);
      votedCandidateIds = votes.map((vote) => vote.candidateId);
    }
    res.setHeader("Cache-Control", "private, no-store");
    return ok(res, {
      election: publicPilketosElection(election, votedPositions, votedCandidateIds, undefined, { includePhotoData: false }),
    });
  }));

  app.get("/api/v1/pilketos/candidates/:candidateId/photo", asyncRoute(async (req, res) => {
    const election = await getCachedPublicPilketosElection(true);
    const candidate = election?.candidates.find((item: any) => item.id === req.params.candidateId);
    const photo = typeof candidate?.photoData === "string"
      ? candidate.photoData.match(/^data:(image\/(?:png|jpe?g|webp));base64,([a-z\d+/=\s]+)$/i)
      : null;
    if (!candidate || !photo) return fail(res, 404, "PHOTO_NOT_FOUND", "Foto kandidat tidak ditemukan.");

    const updatedAt = new Date(candidate.updatedAt || candidate.createdAt || 0).getTime();
    const etag = `"pilketos-${candidate.id}-${updatedAt}"`;
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.get("If-None-Match") === etag) return res.status(304).end();
    return res.type(photo[1].toLowerCase()).send(Buffer.from(photo[2].replace(/\s/g, ""), "base64"));
  }));

  app.post("/api/v1/pilketos/identify", pilketosRateLimit("identify", 30), asyncRoute(async (req, res) => {
    const election = await getCachedPublicPilketosElection();
    if (!election) {
      return fail(res, 409, "ELECTION_NOT_OPEN", "Pemilihan belum dibuka atau sudah ditutup.");
    }
    const votingPhase = getPilketosVotingPhase(election);
    if (votingPhase === "SCHEDULED") {
      return fail(res, 409, "VOTING_NOT_STARTED", "Waktu pemungutan suara belum dimulai.");
    }
    if (votingPhase === "ENDED") {
      return fail(res, 409, "VOTING_ENDED", "Waktu pemungutan suara sudah berakhir.");
    }
    if (votingPhase !== "OPEN") {
      return fail(res, 409, "ELECTION_NOT_OPEN", "Pemilihan belum dibuka atau sudah ditutup.");
    }

    const student = await resolvePilketosStudent(req.body?.identifier);
    if (!student) {
      return fail(res, 404, "STUDENT_NOT_FOUND", "NIS/NISN tidak ditemukan atau siswa tidak aktif.");
    }

    const votes = await db.pilketosVote.findMany({
      where: { electionId: election.id, studentId: student.id },
      select: { position: true, candidateId: true },
    });
    res.setHeader("Cache-Control", "private, no-store");
    return ok(res, {
      student: { fullName: student.fullName },
      election: publicPilketosElection(
        election,
        votes.map((vote) => vote.position),
        votes.map((vote) => vote.candidateId),
        undefined,
        { includePhotoData: false },
      ),
    });
  }));

  app.post("/api/v1/pilketos/vote", pilketosRateLimit("vote", 10), asyncRoute(async (req, res) => {
    const student = await resolvePilketosStudent(req.body?.identifier);
    if (!student) {
      return fail(res, 404, "STUDENT_NOT_FOUND", "NIS/NISN tidak ditemukan atau siswa tidak aktif.");
    }
    const electionId = clean(req.body.electionId);
    const submittedVotes = Array.isArray(req.body.votes)
      ? req.body.votes.map((vote: any) => ({
          position: clean(vote?.position).toUpperCase(),
          candidateId: clean(vote?.candidateId),
        }))
      : [];
    const submittedPositions = submittedVotes.map((vote: any) => vote.position);
    const candidateIds = submittedVotes.map((vote: any) => vote.candidateId);
    if (
      !electionId ||
      submittedVotes.length !== PILKETOS_POSITIONS.length ||
      PILKETOS_POSITIONS.some((position) => submittedPositions.filter((value) => value === position).length !== 1) ||
      submittedPositions.some((position) => !PILKETOS_POSITIONS.includes(position as PilketosPosition)) ||
      candidateIds.some((id: string) => !id) ||
      new Set(candidateIds).size !== PILKETOS_POSITIONS.length
    ) {
      return fail(res, 400, "FOUR_POSITIONS_REQUIRED", "Pilih satu kandidat untuk masing-masing dari empat jabatan.");
    }
    const election = await db.pilketosElection.findUnique({ where: { id: electionId } });
    if (!election) return fail(res, 409, "ELECTION_NOT_OPEN", "Pemilihan belum dibuka atau sudah ditutup.");
    const votingPhase = getPilketosVotingPhase(election);
    if (votingPhase === "SCHEDULED") return fail(res, 409, "VOTING_NOT_STARTED", "Waktu pemungutan suara belum dimulai.");
    if (votingPhase === "ENDED") return fail(res, 409, "VOTING_ENDED", "Waktu pemungutan suara sudah berakhir.");
    if (votingPhase !== "OPEN") return fail(res, 409, "ELECTION_NOT_OPEN", "Pemilihan belum dibuka atau sudah ditutup.");
    const candidates = await db.pilketosCandidate.findMany({
      where: { id: { in: candidateIds }, electionId },
      select: { id: true, grade: true, candidateNo: true },
    });
    const candidateById = new Map<string, (typeof candidates)[number]>();
    for (const candidate of candidates) candidateById.set(candidate.id, candidate);
    const candidateByPosition = new Map<PilketosPosition, (typeof candidates)[number] | undefined>();
    for (const vote of submittedVotes) {
      candidateByPosition.set(vote.position as PilketosPosition, candidateById.get(vote.candidateId));
    }
    for (const position of PILKETOS_POSITIONS) {
      if (candidateByPosition.get(position)?.grade !== PILKETOS_POSITION_GRADE[position]) {
        return fail(res, 400, "CANDIDATE_GRADE_MISMATCH", `Kandidat untuk ${position.replaceAll("_", " ")} harus berasal dari kelas ${PILKETOS_POSITION_GRADE[position]}.`);
      }
    }
    if (
      candidateByPosition.get("KETUA_UMUM")?.id === candidateByPosition.get("KETUA_1")?.id ||
      candidateByPosition.get("KETUA_3")?.id === candidateByPosition.get("KETUA_4")?.id
    ) {
      return fail(res, 400, "DUPLICATE_CANDIDATE", "Kandidat yang sama tidak boleh dipilih untuk dua jabatan pada tingkat kelas yang sama.");
    }
    try {
      const result = await db.$transaction(async (tx) => {
        const existingVotes = await tx.pilketosVote.findMany({
          where: { electionId, studentId: student.id },
          select: { position: true },
        });
        if (existingVotes.length) {
          throw Object.assign(new Error("Anda sudah menyelesaikan pemilihan ini."), { code: "ALREADY_VOTED" });
        }

        await tx.pilketosVote.createMany({
          data: submittedVotes.map((vote: any) => {
            const candidate = candidateById.get(vote.candidateId)!;
            return {
              electionId,
              candidateId: candidate.id,
              grade: candidate.grade,
              position: vote.position,
              studentId: student.id,
              userId: student.userId,
            };
          }),
        });
        await tx.coreAuditLog.create({
          data: {
            action: "PILKETOS_VOTE_CAST",
            entity: "PilketosElection",
            entityId: electionId,
            actor: student.userId || student.id,
            userId: student.userId,
            metadata: {
              positions: submittedVotes.map((vote: any) => vote.position),
              candidateNos: submittedVotes.map((vote: any) => candidateById.get(vote.candidateId)?.candidateNo),
            },
          },
        });
        return { completed: true, voteCount: submittedVotes.length };
      });
      return ok(res, {
        ...result,
        message: "Pilihan untuk empat jabatan berhasil disimpan.",
      });
    } catch (error: any) {
      if (error?.code === "P2002" || error?.code === "ALREADY_VOTED") {
        return fail(res, 409, "ALREADY_VOTED", "Anda sudah menggunakan hak pilih pada pemilihan ini.");
      }
      throw error;
    }
  }));

  app.get("/api/v1/pilketos/admin", requireAuth, asyncRoute(async (req, res) => {
    if (!(await hasPilketosAdminAccess(req))) return fail(res, 403, "FORBIDDEN", "Akses pengelolaan Pilketos tidak diizinkan.");
    const election = await db.pilketosElection.findFirst({
      include: {
        candidates: { orderBy: [{ grade: "asc" }, { candidateNo: "asc" }], include: { _count: { select: { votes: true } } } },
        _count: { select: { votes: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
    const [stats, voteGroups] = election
      ? await Promise.all([
          getPilketosStats(election.id),
          db.pilketosVote.groupBy({
            by: ["candidateId", "position"],
            where: { electionId: election.id, position: { in: PILKETOS_POSITIONS } },
            _count: { _all: true },
          }),
        ])
      : [null, []];
    const voteCountsByCandidate = new Map<string, Record<PilketosPosition, number>>();
    for (const group of voteGroups) {
      const counts = voteCountsByCandidate.get(group.candidateId) || {
        KETUA_UMUM: 0,
        KETUA_1: 0,
        KETUA_3: 0,
        KETUA_4: 0,
      };
      counts[group.position as PilketosPosition] = group._count._all;
      voteCountsByCandidate.set(group.candidateId, counts);
    }
    const electionWithVoteCounts = election && {
      ...election,
      candidates: election.candidates.map((candidate) => ({
        ...candidate,
        voteCounts: voteCountsByCandidate.get(candidate.id) || {
          KETUA_UMUM: 0,
          KETUA_1: 0,
          KETUA_3: 0,
          KETUA_4: 0,
        },
      })),
    };
    return ok(res, { election: publicPilketosElection(electionWithVoteCounts), stats });
  }));

  app.get("/api/v1/pilketos/admin/elections/:electionId/non-voters", requireAuth, asyncRoute(async (req, res) => {
    if (!(await hasPilketosAdminAccess(req))) return fail(res, 403, "FORBIDDEN", "Akses pengelolaan Pilketos tidak diizinkan.");

    const election = await db.pilketosElection.findUnique({
      where: { id: req.params.electionId },
      select: { id: true, academicYear: true },
    });
    if (!election) return fail(res, 404, "ELECTION_NOT_FOUND", "Data pemilihan tidak ditemukan.");

    const [students, votes] = await Promise.all([
      db.coreStudent.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          nis: true,
          nisn: true,
          fullName: true,
          enrollments: {
            where: { status: "ACTIVE" },
            select: {
              academicYear: { select: { name: true, isActive: true } },
              academicClass: { select: { name: true } },
            },
          },
        },
        orderBy: [{ fullName: "asc" }, { nisn: "asc" }],
      }),
      db.pilketosVote.findMany({
        where: { electionId: election.id },
        select: { studentId: true },
      }),
    ]);
    const votedStudentIds = new Set(votes.map((vote) => vote.studentId));
    const nonVoters = students
      .filter((student) => !votedStudentIds.has(student.id))
      .map((student) => {
        const enrollment =
          student.enrollments.find((item) => item.academicYear.name === election.academicYear) ||
          student.enrollments.find((item) => item.academicYear.isActive) ||
          student.enrollments[0];
        return {
          studentNumber: student.nis?.trim() || student.nisn,
          fullName: student.fullName,
          className: enrollment?.academicClass.name || "-",
        };
      });

    return ok(res, { electionId: election.id, academicYear: election.academicYear, students: nonVoters });
  }));

  app.post("/api/v1/pilketos/admin/election", requireAuth, asyncRoute(async (req, res) => {
    if (!(await hasPilketosAdminAccess(req))) return fail(res, 403, "FORBIDDEN", "Akses pengelolaan Pilketos tidak diizinkan.");
    const electionId = clean(req.body.id);
    const title = clean(req.body.title);
    const academicYear = clean(req.body.academicYear);
    const description = clean(req.body.description);
    const status = clean(req.body.status).toUpperCase();
    if (!title || !academicYear) return fail(res, 400, "REQUIRED_FIELD", "Judul dan tahun ajaran wajib diisi.");
    if (!["DRAFT", "OPEN", "CLOSED"].includes(status)) return fail(res, 400, "INVALID_STATUS", "Status pemilihan tidak valid.");
    const startsAtInput = clean(req.body.startsAt);
    const endsAtInput = clean(req.body.endsAt);
    const startsAt = parseDate(startsAtInput);
    const endsAt = parseDate(endsAtInput);
    if (startsAtInput && !startsAt) return fail(res, 400, "INVALID_START_TIME", "Waktu mulai pemilihan tidak valid.");
    if (endsAtInput && !endsAt) return fail(res, 400, "INVALID_END_TIME", "Waktu akhir pemilihan tidak valid.");
    if (Boolean(startsAt) !== Boolean(endsAt)) return fail(res, 400, "SCHEDULE_INCOMPLETE", "Isi waktu mulai dan waktu akhir, atau kosongkan keduanya untuk mode manual.");
    if (startsAt && endsAt && endsAt <= startsAt) return fail(res, 400, "INVALID_TIME_RANGE", "Waktu akhir harus setelah waktu mulai.");
    const candidates = electionId
      ? await db.pilketosCandidate.findMany({ where: { electionId }, select: { grade: true } })
      : [];
    const gradeCounts = {
      X: candidates.filter((candidate) => candidate.grade === "X").length,
      XI: candidates.filter((candidate) => candidate.grade === "XI").length,
    };
    if (status === "OPEN" && (candidates.length !== 8 || gradeCounts.X !== 4 || gradeCounts.XI !== 4)) {
      return fail(res, 409, "CANDIDATES_REQUIRED", "Pemilihan hanya dapat dibuka jika tersedia tepat 4 kandidat kelas X dan 4 kandidat kelas XI.");
    }
    const data = { title, academicYear, description, status: status as "DRAFT" | "OPEN" | "CLOSED", startsAt, endsAt };
    const election = await db.$transaction(async (tx) => {
      if (data.status === "OPEN") await tx.pilketosElection.updateMany({ where: { status: "OPEN", ...(electionId ? { id: { not: electionId } } : {}) }, data: { status: "CLOSED" } });
      return electionId
        ? tx.pilketosElection.update({ where: { id: electionId }, data, include: { candidates: { orderBy: [{ grade: "asc" }, { candidateNo: "asc" }], include: { _count: { select: { votes: true } } } } } })
        : tx.pilketosElection.create({ data, include: { candidates: true } });
    });
    invalidatePublicPilketosElectionCache();
    return ok(res, { election: publicPilketosElection(election), stats: await getPilketosStats(election.id) });
  }));

  app.post("/api/v1/pilketos/admin/election/:electionId/candidates", requireAuth, asyncRoute(async (req, res) => {
    if (!(await hasPilketosAdminAccess(req))) return fail(res, 403, "FORBIDDEN", "Akses pengelolaan Pilketos tidak diizinkan.");
    const election = await db.pilketosElection.findUnique({ where: { id: req.params.electionId } });
    if (!election) return fail(res, 404, "ELECTION_NOT_FOUND", "Pemilihan tidak ditemukan.");
    if (election.status !== "DRAFT") return fail(res, 409, "ELECTION_LOCKED", "Kandidat hanya dapat diubah saat status masih draft.");
    const name = clean(req.body.name);
    const grade = clean(req.body.grade).toUpperCase() as PilketosGrade;
    const photoData = clean(req.body.photoData) || null;
    const candidateNo = Number(req.body.candidateNo);
    if (!name) return fail(res, 400, "REQUIRED_FIELD", "Nama kandidat wajib diisi.");
    if (!["X", "XI"].includes(grade)) return fail(res, 400, "INVALID_GRADE", "Kelas kandidat harus X atau XI.");
    if (!Number.isInteger(candidateNo) || candidateNo < 1 || candidateNo > 99) return fail(res, 400, "INVALID_NUMBER", "Nomor kandidat harus berupa angka 1 sampai 99.");
    const gradeCount = await db.pilketosCandidate.count({ where: { electionId: election.id, grade } });
    if (gradeCount >= 4) return fail(res, 409, "GRADE_LIMIT_REACHED", `Maksimal 4 kandidat untuk kelas ${grade}.`);
    const totalCandidates = await db.pilketosCandidate.count({ where: { electionId: election.id } });
    if (totalCandidates >= 8) return fail(res, 409, "CANDIDATE_LIMIT_REACHED", "Pemilihan hanya boleh memiliki tepat 8 kandidat: 4 kelas X dan 4 kelas XI.");
    const photoError = imageDataError(photoData);
    if (photoError) return fail(res, 413, "INVALID_IMAGE", photoError);
    try {
      const candidate = await db.pilketosCandidate.create({ data: { electionId: election.id, grade, candidateNo, name, photoData } });
      invalidatePublicPilketosElectionCache();
      return res.status(201).json({ success: true, data: candidate });
    } catch (error: any) {
      if (error?.code === "P2002") return fail(res, 409, "DUPLICATE_NUMBER", "Nomor kandidat sudah digunakan.");
      throw error;
    }
  }));

  app.patch("/api/v1/pilketos/admin/candidates/:candidateId", requireAuth, asyncRoute(async (req, res) => {
    if (!(await hasPilketosAdminAccess(req))) return fail(res, 403, "FORBIDDEN", "Akses pengelolaan Pilketos tidak diizinkan.");
    const current = await db.pilketosCandidate.findUnique({
      where: { id: req.params.candidateId },
      include: { election: true, _count: { select: { votes: true } } },
    });
    if (!current) return fail(res, 404, "CANDIDATE_NOT_FOUND", "Kandidat tidak ditemukan.");
    if (current.election.status !== "DRAFT") return fail(res, 409, "ELECTION_LOCKED", "Kandidat hanya dapat diubah saat status masih draft.");
    if (current._count.votes) return fail(res, 409, "CANDIDATE_HAS_VOTES", "Kandidat yang sudah menerima suara tidak dapat diubah.");
    const name = req.body.name === undefined ? current.name : clean(req.body.name);
    const grade = (req.body.grade === undefined ? current.grade : clean(req.body.grade).toUpperCase()) as PilketosGrade;
    const photoData = req.body.photoData === undefined ? current.photoData : (clean(req.body.photoData) || null);
    const candidateNo = req.body.candidateNo === undefined ? current.candidateNo : Number(req.body.candidateNo);
    if (!name) return fail(res, 400, "REQUIRED_FIELD", "Nama kandidat wajib diisi.");
    if (!["X", "XI"].includes(grade)) return fail(res, 400, "INVALID_GRADE", "Kelas kandidat harus X atau XI.");
    if (!Number.isInteger(candidateNo) || candidateNo < 1 || candidateNo > 99) return fail(res, 400, "INVALID_NUMBER", "Nomor kandidat harus berupa angka 1 sampai 99.");
    if (grade !== current.grade) {
      const gradeCount = await db.pilketosCandidate.count({ where: { electionId: current.electionId, grade, id: { not: current.id } } });
      if (gradeCount >= 4) return fail(res, 409, "GRADE_LIMIT_REACHED", `Maksimal 4 kandidat untuk kelas ${grade}.`);
    }
    const photoError = imageDataError(photoData);
    if (photoError) return fail(res, 413, "INVALID_IMAGE", photoError);
    try {
      const candidate = await db.pilketosCandidate.update({ where: { id: current.id }, data: { name, grade, photoData, candidateNo } });
      invalidatePublicPilketosElectionCache();
      return ok(res, candidate);
    } catch (error: any) {
      if (error?.code === "P2002") return fail(res, 409, "DUPLICATE_NUMBER", "Nomor kandidat sudah digunakan.");
      throw error;
    }
  }));

  app.delete("/api/v1/pilketos/admin/candidates/:candidateId", requireAuth, asyncRoute(async (req, res) => {
    if (!(await hasPilketosAdminAccess(req))) return fail(res, 403, "FORBIDDEN", "Akses pengelolaan Pilketos tidak diizinkan.");
    const current = await db.pilketosCandidate.findUnique({ where: { id: req.params.candidateId }, include: { election: true, _count: { select: { votes: true } } } });
    if (!current) return fail(res, 404, "CANDIDATE_NOT_FOUND", "Kandidat tidak ditemukan.");
    if (current.election.status !== "DRAFT") return fail(res, 409, "ELECTION_LOCKED", "Kandidat hanya dapat diubah saat status masih draft.");
    if (current._count.votes) return fail(res, 409, "CANDIDATE_HAS_VOTES", "Kandidat yang sudah menerima suara tidak dapat dihapus.");
    await db.pilketosCandidate.delete({ where: { id: current.id } });
    invalidatePublicPilketosElectionCache();
    return ok(res, { deleted: true });
  }));

  app.post("/api/v1/pilketos/admin/reset-votes", requireAuth, asyncRoute(async (req, res) => {
    if (!(await hasPilketosAdminAccess(req))) return fail(res, 403, "FORBIDDEN", "Akses pengelolaan Pilketos tidak diizinkan.");
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const electionId = clean(req.body?.electionId);
    if (!password) return fail(res, 400, "PASSWORD_REQUIRED", "Kata sandi admin wajib diisi untuk reset suara.");
    if (!electionId) return fail(res, 400, "ELECTION_REQUIRED", "Pemilihan yang akan direset tidak valid.");

    const election = await db.pilketosElection.findUnique({ where: { id: electionId }, select: { id: true } });
    if (!election) return fail(res, 404, "ELECTION_NOT_FOUND", "Pemilihan yang akan direset tidak ditemukan.");

    let adminPassword: string | null;
    try {
      adminPassword = await getAdminPassword();
    } catch {
      return fail(res, 503, "ADMIN_CREDENTIALS_UNAVAILABLE", "Kata sandi admin tidak dapat diverifikasi saat ini.");
    }
    if (!adminPassword) return fail(res, 503, "ADMIN_CREDENTIALS_UNAVAILABLE", "Akun admin belum dikonfigurasi.");
    if (!safeTextEqual(password, adminPassword)) {
      return fail(res, 401, "INVALID_ADMIN_PASSWORD", "Kata sandi admin salah. Tidak ada suara yang dihapus.");
    }

    let deletedCount: number;
    try {
      deletedCount = await db.$transaction(async (tx) => {
        const deleted = await tx.pilketosVote.deleteMany({ where: { electionId: election.id } });
        await tx.coreAuditLog.create({
          data: {
            action: "PILKETOS_VOTE_RESET",
            entity: "PilketosVote",
            entityId: election.id,
            actor: "ADMIN_SESSION",
            metadata: {
              deletedCount: deleted.count,
              scope: "CURRENT_ELECTION",
            },
          },
        });
        return deleted.count;
      });
    } catch {
      return fail(res, 500, "VOTE_RESET_FAILED", "Reset suara gagal. Tidak ada perubahan yang diterapkan.");
    }

    return ok(res, { deletedCount });
  }));

  // Wave 2 / Sprint 5: curriculum module foundation. Upload and ingestion are
  // intentionally separate follow-up stages so a module can be managed safely
  // before introducing long-running file jobs.
  app.get("/api/v1/lms/guru/context", requireAuth, async (req, res) => {
    const actor = await getLmsActor(req);
    if (!actor) return fail(res, 401, "UNAUTHENTICATED", "Session guru tidak valid.");
    if (!actor.teacher && !canManageAllLms(actor.roles)) return fail(res, 403, "TEACHER_PROFILE_REQUIRED", "Akun belum terhubung ke profil guru.");
    const assignments = actor.teacher
      ? await db.teachingAssignment.findMany({
          where: { teacherId: actor.teacher.id, status: "ACTIVE" },
          include: { subject: true, academicClass: true, academicYear: true },
          orderBy: [{ academicYear: { code: "desc" } }, { subject: { name: "asc" } }],
        })
      : [];
    const years = await db.academicYear.findMany({ where: { status: "ACTIVE" }, orderBy: { code: "desc" } });
    return ok(res, { teacher: actor.teacher, assignments, years, roles: actor.roles });
  });

  app.get("/api/v1/lms/guru/dashboard", requireAuth, async (req, res) => {
    const actor = await getLmsActor(req);
    if (!actor) return fail(res, 401, "UNAUTHENTICATED", "Session guru tidak valid.");
    if (!actor.teacher && !canManageAllLms(actor.roles)) return fail(res, 403, "TEACHER_PROFILE_REQUIRED", "Akun belum terhubung ke profil guru.");
    const scope = moduleScope(actor);
    const [total, drafts, reviews, published, archived, recent] = await Promise.all([
      db.curriculumModule.count({ where: scope }),
      db.curriculumModule.count({ where: { ...scope, status: "DRAFT" } }),
      db.curriculumModule.count({ where: { ...scope, status: "REVIEW" } }),
      db.curriculumModule.count({ where: { ...scope, status: "PUBLISHED" } }),
      db.curriculumModule.count({ where: { ...scope, status: "ARCHIVED" } }),
      db.curriculumModule.findMany({
        where: scope,
        include: { subject: true, academicYear: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);
    return ok(res, { totals: { total, drafts, reviews, published, archived }, recent });
  });

  app.get("/api/v1/lms/guru/modul", requireAuth, async (req, res) => {
    const actor = await getLmsActor(req);
    if (!actor) return fail(res, 401, "UNAUTHENTICATED", "Session guru tidak valid.");
    if (!actor.teacher && !canManageAllLms(actor.roles)) return fail(res, 403, "TEACHER_PROFILE_REQUIRED", "Akun belum terhubung ke profil guru.");
    const search = clean(req.query.search);
    const status = clean(req.query.status).toUpperCase();
    const scope = moduleScope(actor);
    const where = {
      ...scope,
      ...(status && ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].includes(status) ? { status: status as "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED" } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" as const } }, { phase: { contains: search, mode: "insensitive" as const } }, { element: { contains: search, mode: "insensitive" as const } }] } : {}),
    };
    const items = await db.curriculumModule.findMany({
      where,
      include: { subject: true, academicYear: true, ownerTeacher: { select: { fullName: true, nip: true } }, _count: { select: { assets: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return ok(res, { items });
  });

  app.post("/api/v1/lms/guru/modul", requireAuth, async (req, res) => {
    const actor = await getLmsActor(req);
    if (!actor) return fail(res, 401, "UNAUTHENTICATED", "Session guru tidak valid.");
    if (!actor.teacher) return fail(res, 403, "TEACHER_PROFILE_REQUIRED", "Akun belum terhubung ke profil guru.");
    const title = clean(req.body.title);
    const phase = clean(req.body.phase);
    const element = clean(req.body.element);
    const description = clean(req.body.description);
    const subjectId = clean(req.body.subjectId);
    const academicYearId = clean(req.body.academicYearId);
    if (!title || !phase || !element || !subjectId || !academicYearId) return fail(res, 400, "REQUIRED_FIELD", "Judul, fase, elemen, mapel, dan tahun ajaran wajib diisi.");
    const assignment = await db.teachingAssignment.findFirst({ where: { teacherId: actor.teacher.id, subjectId, academicYearId, status: "ACTIVE" } });
    if (!assignment) return fail(res, 403, "ASSIGNMENT_REQUIRED", "Modul hanya dapat dibuat untuk mapel dan tahun ajaran yang menjadi assignment Anda.");
    const [subject, academicYear] = await Promise.all([
      db.subject.findUnique({ where: { id: subjectId } }),
      db.academicYear.findUnique({ where: { id: academicYearId } }),
    ]);
    if (!subject || !academicYear) return fail(res, 422, "REFERENCE_NOT_FOUND", "Mapel atau tahun ajaran tidak ditemukan.");
    const item = await db.$transaction(async (tx) => {
      const created = await tx.curriculumModule.create({
        data: { title, phase, element, description, subjectId, academicYearId, ownerTeacherId: actor.teacher!.id, status: "DRAFT" },
        include: { subject: true, academicYear: true },
      });
      await tx.coreAuditLog.create({ data: { action: "CURRICULUM_MODULE_CREATE", entity: "CurriculumModule", entityId: created.id, actor: actor.userId, userId: actor.userId, metadata: { title, subjectId, academicYearId } } });
      return created;
    });
    return res.status(201).json({ success: true, data: item });
  });

  app.patch("/api/v1/lms/guru/modul/:moduleId", requireAuth, async (req, res) => {
    const actor = await getLmsActor(req);
    if (!actor?.teacher) return fail(res, actor ? 403 : 401, actor ? "TEACHER_PROFILE_REQUIRED" : "UNAUTHENTICATED", actor ? "Akun belum terhubung ke profil guru." : "Session guru tidak valid.");
    const current = await db.curriculumModule.findFirst({ where: { id: req.params.moduleId, ownerTeacherId: actor.teacher.id } });
    if (!current) return fail(res, 404, "MODULE_NOT_FOUND", "Modul tidak ditemukan.");
    if (current.status === "ARCHIVED" || current.status === "PUBLISHED") return fail(res, 409, "MODULE_LOCKED", "Modul terbit atau arsip tidak dapat diedit langsung.");
    const data: Record<string, string> = {};
    for (const key of ["title", "description", "phase", "element"]) if (req.body[key] !== undefined) data[key] = clean(req.body[key]);
    if (data.title === "" || data.phase === "" || data.element === "") return fail(res, 400, "REQUIRED_FIELD", "Judul, fase, dan elemen tidak boleh kosong.");
    if (req.body.status !== undefined && ["DRAFT", "REVIEW"].includes(clean(req.body.status).toUpperCase())) data.status = clean(req.body.status).toUpperCase();
    const item = await db.$transaction(async (tx) => {
      const updated = await tx.curriculumModule.update({ where: { id: current.id }, data: data as any, include: { subject: true, academicYear: true } });
      await tx.coreAuditLog.create({ data: { action: "CURRICULUM_MODULE_UPDATE", entity: "CurriculumModule", entityId: updated.id, actor: actor.userId, userId: actor.userId, metadata: { status: updated.status } } });
      return updated;
    });
    return ok(res, item);
  });

  app.post("/api/v1/lms/guru/modul/:moduleId/submit-review", requireAuth, async (req, res) => {
    const actor = await getLmsActor(req);
    if (!actor?.teacher) return fail(res, actor ? 403 : 401, actor ? "TEACHER_PROFILE_REQUIRED" : "UNAUTHENTICATED", actor ? "Akun belum terhubung ke profil guru." : "Session guru tidak valid.");
    const current = await db.curriculumModule.findFirst({ where: { id: req.params.moduleId, ownerTeacherId: actor.teacher.id } });
    if (!current) return fail(res, 404, "MODULE_NOT_FOUND", "Modul tidak ditemukan.");
    if (current.status !== "DRAFT") return fail(res, 409, "INVALID_TRANSITION", "Hanya modul draft yang dapat dikirim untuk review.");
    const item = await db.curriculumModule.update({ where: { id: current.id }, data: { status: "REVIEW" }, include: { subject: true, academicYear: true } });
    await audit("CURRICULUM_MODULE_REVIEW", "CurriculumModule", item.id, { actor: actor.userId });
    return ok(res, item);
  });

  app.post("/api/v1/lms/guru/modul/:moduleId/publish", requireAuth, async (req, res) => {
    const actor = await getLmsActor(req);
    if (!actor?.teacher && !actor?.roles.some((role) => role === "ADMIN" || role === "OPERATOR")) return fail(res, actor ? 403 : 401, actor ? "FORBIDDEN" : "UNAUTHENTICATED", actor ? "Akses publikasi tidak diizinkan." : "Session guru tidak valid.");
    const current = await db.curriculumModule.findFirst({ where: { id: req.params.moduleId, ...moduleScope(actor!) } });
    if (!current) return fail(res, 404, "MODULE_NOT_FOUND", "Modul tidak ditemukan.");
    if (!["REVIEW", "DRAFT"].includes(current.status)) return fail(res, 409, "INVALID_TRANSITION", "Modul harus berstatus draft atau review untuk diterbitkan.");
    const item = await db.curriculumModule.update({ where: { id: current.id }, data: { status: "PUBLISHED" }, include: { subject: true, academicYear: true } });
    await audit("CURRICULUM_MODULE_PUBLISH", "CurriculumModule", item.id, { actor: actor!.userId });
    return ok(res, item);
  });

  app.post("/api/v1/lms/guru/modul/:moduleId/archive", requireAuth, async (req, res) => {
    const actor = await getLmsActor(req);
    if (!actor) return fail(res, 401, "UNAUTHENTICATED", "Session guru tidak valid.");
    const current = await db.curriculumModule.findFirst({ where: { id: req.params.moduleId, ...moduleScope(actor) } });
    if (!current) return fail(res, 404, "MODULE_NOT_FOUND", "Modul tidak ditemukan.");
    const item = await db.curriculumModule.update({ where: { id: current.id }, data: { status: "ARCHIVED" }, include: { subject: true, academicYear: true } });
    await audit("CURRICULUM_MODULE_ARCHIVE", "CurriculumModule", item.id, { actor: actor.userId });
    return ok(res, item);
  });

  app.get("/api/v1/akademik/overview", requireAuth, async (_req, res) => {
    const [academicYear, teachers, students, subjects, classes, pendingRequests, lastImport] = await Promise.all([
      db.academicYear.findFirst({ where: { isActive: true, status: "ACTIVE" }, orderBy: { code: "desc" } }),
      db.coreTeacher.count({ where: { status: "ACTIVE" } }),
      db.coreStudent.count({ where: { status: "ACTIVE" } }),
      db.subject.count({ where: { status: "ACTIVE" } }),
      db.academicClass.count({ where: { status: "ACTIVE" } }),
      db.teacherSelectionRequest.count({ where: { status: "SUBMITTED" } }),
      db.coreImportJob.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);
    return ok(res, { academicYear, totals: { teachers, students, subjects, classes }, pendingRequests, lastImport });
  });

  app.get("/api/v1/akademik/siswa/export", requireAuth, async (_req, res) => {
    try {
      const students = await db.coreStudent.findMany({
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { academicClass: true, academicYear: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { nisn: "asc" },
      });
      const rows = students.map((student) => {
        const enrollment = student.enrollments[0];
        return [
          student.nisn,
          student.nis ?? "",
          student.fullName,
          student.email ?? "",
          student.phone ?? "",
          student.gender ?? "",
          student.birthPlace ?? "",
          student.birthDate?.toISOString().slice(0, 10) ?? "",
          enrollment?.academicClass.code ?? "",
          enrollment?.academicYear.code ?? "",
          "",
          student.status,
        ];
      });
      const sheet = XLSX.utils.aoa_to_sheet([STUDENT_DATA_HEADERS, ...rows]);
      sheet["!cols"] = STUDENT_DATA_HEADERS.map((header) => ({ wch: Math.max(16, header.length + 2) }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Data Siswa");
      const file = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", 'attachment; filename="data-siswa.xlsx"');
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(file);
    } catch {
      return fail(res, 500, "STUDENT_EXPORT_FAILED", "Data siswa gagal diekspor.");
    }
  });

  app.get("/api/v1/akademik/master", requireAuth, async (req, res) => {
    const { page, pageSize, search } = pageParams(req);
    const entity = clean(req.query.entity);
    const searchBy = clean(req.query.searchBy) || "all";
    const whereFor = (key: string) => entity === key ? masterSearchWhere(key, searchBy, search) : undefined;
    const academicYearWhere = whereFor("academicYears");
    const departmentWhere = whereFor("departments");
    const subjectWhere = whereFor("subjects");
    const classWhere = whereFor("classes");
    const teacherWhere = whereFor("teachers");
    const studentWhere = whereFor("students");
    const [
      academicYears,
      departments,
      subjects,
      classes,
      teachers,
      students,
      totalTeachers,
      totalStudents,
      matchingTeachers,
      matchingStudents,
      totalAcademicYears,
      totalDepartments,
      totalSubjects,
      totalClasses,
    ] = await Promise.all([
      db.academicYear.findMany({ where: academicYearWhere, orderBy: { code: "desc" } }),
      db.department.findMany({ where: departmentWhere, orderBy: { code: "asc" } }),
      db.subject.findMany({ where: subjectWhere, include: { department: true }, orderBy: { code: "asc" } }),
      db.academicClass.findMany({ where: classWhere, include: { academicYear: true, department: true }, orderBy: { code: "asc" } }),
      db.coreTeacher.findMany({ where: teacherWhere, orderBy: { nip: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
      db.coreStudent.findMany({
        where: studentWhere,
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { academicClass: true, academicYear: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { nisn: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.coreTeacher.count(),
      db.coreStudent.count(),
      entity === "teachers" && search ? db.coreTeacher.count({ where: teacherWhere }) : Promise.resolve(null),
      entity === "students" && search ? db.coreStudent.count({ where: studentWhere }) : Promise.resolve(null),
      db.academicYear.count(),
      db.department.count(),
      db.subject.count(),
      db.academicClass.count(),
    ]);
    const counts = {
      academicYears: totalAcademicYears,
      departments: totalDepartments,
      subjects: totalSubjects,
      classes: totalClasses,
      teachers: totalTeachers,
      students: totalStudents,
    };
    const matchingCounts = {
      teachers: matchingTeachers ?? totalTeachers,
      students: matchingStudents ?? totalStudents,
    };
    return ok(res, {
      academicYears,
      departments,
      subjects,
      classes,
      teachers,
      students,
      counts,
      matchingCounts,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(matchingCounts.students / pageSize)),
      search,
      searchBy,
      entity,
    });
  });

  app.post("/api/v1/akademik/siswa", requireAuth, async (req, res) => {
    const nisn = clean(req.body.nisn);
    const nis = clean(req.body.nis);
    const fullName = clean(req.body.fullName || req.body.namaLengkap);
    const email = clean(req.body.email).toLowerCase() || null;
    const phone = clean(req.body.phone || req.body.noTelp) || null;
    const birthPlace = clean(req.body.birthPlace || req.body.tempatLahir) || null;
    const birthDateInput = clean(req.body.birthDate || req.body.tanggalLahir);
    const birthDate = parseDate(birthDateInput);
    const gender = clean(req.body.gender || req.body.jenisKelamin) || null;
    const status = clean(req.body.status).toUpperCase() || "ACTIVE";
    const password = String(req.body.password ?? "");
    const classCode = clean(req.body.classCode || req.body.kodeKelas);
    const academicYearCode = clean(req.body.academicYearCode || req.body.kodeTahunAjaran);

    if (!nisn || !nis || !fullName) return fail(res, 400, "REQUIRED_FIELD", "NISN, NIS, dan nama lengkap wajib diisi.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, "INVALID_EMAIL", "Format email tidak valid.");
    if (birthDateInput && !birthDate) return fail(res, 400, "INVALID_BIRTH_DATE", "Tanggal lahir tidak valid.");
    if (!VALID_STATUSES.has(status)) return fail(res, 400, "INVALID_STATUS", "Status harus ACTIVE, INACTIVE, atau ARCHIVED.");
    if (password && password.length < 8) return fail(res, 400, "WEAK_PASSWORD", "Password akun siswa harus minimal 8 karakter.");
    if (Boolean(classCode) !== Boolean(academicYearCode)) return fail(res, 400, "INCOMPLETE_ENROLLMENT", "Kode kelas dan tahun ajaran harus diisi bersama-sama.");

    const existing = await db.coreStudent.findFirst({
      where: { OR: [{ nisn }, { nis }] },
      select: { nis: true, nisn: true },
    });
    if (existing) {
      const duplicate = existing.nisn === nisn ? "NISN" : "NIS";
      return fail(res, 409, "DUPLICATE_STUDENT_IDENTIFIER", `${duplicate} sudah digunakan siswa lain.`);
    }

    let enrollment: { classId: string; academicYearId: string } | null = null;
    if (classCode && academicYearCode) {
      const [classroom, academicYear] = await Promise.all([
        db.academicClass.findUnique({ where: { code: classCode } }),
        db.academicYear.findUnique({ where: { code: academicYearCode } }),
      ]);
      if (!classroom || !academicYear) return fail(res, 422, "REFERENCE_NOT_FOUND", "Kode kelas atau tahun ajaran tidak ditemukan.");
      if (classroom.academicYearId !== academicYear.id) return fail(res, 422, "ENROLLMENT_YEAR_MISMATCH", "Tahun ajaran tidak sesuai dengan kelas yang dipilih.");
      enrollment = { classId: classroom.id, academicYearId: academicYear.id };
    }

    try {
      const student = await db.$transaction(async (tx) => {
        const created = await tx.coreStudent.create({
          data: { nisn, nis, fullName, email, phone, gender, birthPlace, birthDate, status: status as "ACTIVE" | "INACTIVE" | "ARCHIVED" },
        });
        let saved = created;

        if (password) {
          const accountEmail = email || studentAccountEmail(nis);
          const existingUser = await tx.coreUser.findUnique({ where: { email: accountEmail } });
          if (existingUser) throw Object.assign(new Error("Email akun sudah digunakan."), { code: "DUPLICATE_ACCOUNT_EMAIL" });
          const user = await tx.coreUser.create({
            data: {
              email: accountEmail,
              fullName,
              status: status === "ACTIVE" ? "ACTIVE" : "DISABLED",
              passwordHash: hashPassword(password),
              passwordChangeRecommended: true,
            },
          });
          saved = await tx.coreStudent.update({ where: { id: created.id }, data: { userId: user.id } });
          const role = await tx.coreRole.upsert({ where: { name: "SISWA" }, update: {}, create: { name: "SISWA" } });
          await tx.coreUserRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: role.id } },
            update: {},
            create: { userId: user.id, roleId: role.id },
          });
        }

        if (enrollment) {
          await tx.studentEnrollment.upsert({
            where: { studentId_academicYearId: { studentId: created.id, academicYearId: enrollment.academicYearId } },
            update: { classId: enrollment.classId, status: status as "ACTIVE" | "INACTIVE" | "ARCHIVED" },
            create: { studentId: created.id, classId: enrollment.classId, academicYearId: enrollment.academicYearId, status: status as "ACTIVE" | "INACTIVE" | "ARCHIVED" },
          });
        }

        await tx.coreAuditLog.create({
          data: { action: "MASTER_CREATE", entity: "CoreStudent", entityId: created.id, actor: "ADMIN_SESSION", metadata: { nis, nisn, hasAccount: Boolean(password), hasEnrollment: Boolean(enrollment) } },
        });
        return saved;
      });
      const studentWithEnrollment = await db.coreStudent.findUnique({
        where: { id: student.id },
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { academicClass: true, academicYear: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });
      return res.status(201).json({ success: true, data: studentWithEnrollment || student });
    } catch (error: any) {
      if (error?.code === "P2002" || error?.code === "DUPLICATE_ACCOUNT_EMAIL") {
        return fail(res, 409, "DUPLICATE_STUDENT_DATA", error?.code === "DUPLICATE_ACCOUNT_EMAIL" ? "Email akun sudah digunakan." : "NIS, NISN, atau email akun sudah digunakan.");
      }
      throw error;
    }
  });

  app.patch("/api/v1/akademik/siswa/:id", requireAuth, async (req, res) => {
    if (!(await confirmAdminPassword(req, res))) return;

    const id = clean(req.params.id);
    const nisn = clean(req.body.nisn);
    const nis = clean(req.body.nis);
    const fullName = clean(req.body.fullName || req.body.namaLengkap);
    const email = clean(req.body.email).toLowerCase() || null;
    const phone = clean(req.body.phone || req.body.noTelp) || null;
    const birthPlace = clean(req.body.birthPlace || req.body.tempatLahir) || null;
    const birthDateInput = clean(req.body.birthDate || req.body.tanggalLahir);
    const birthDate = parseDate(birthDateInput);
    const gender = clean(req.body.gender || req.body.jenisKelamin) || null;
    const status = clean(req.body.status).toUpperCase() || "ACTIVE";
    const enrollmentId = clean(req.body.enrollmentId) || null;
    const classCode = clean(req.body.classCode || req.body.kodeKelas);
    const academicYearCode = clean(req.body.academicYearCode || req.body.kodeTahunAjaran);

    if (!nisn || !nis || !fullName) return fail(res, 400, "REQUIRED_FIELD", "NISN, NIS, dan nama lengkap wajib diisi.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, "INVALID_EMAIL", "Format email tidak valid.");
    if (birthDateInput && !birthDate) return fail(res, 400, "INVALID_BIRTH_DATE", "Tanggal lahir tidak valid.");
    if (!VALID_STATUSES.has(status)) return fail(res, 400, "INVALID_STATUS", "Status harus ACTIVE, INACTIVE, atau ARCHIVED.");
    if (Boolean(classCode) !== Boolean(academicYearCode)) return fail(res, 400, "INCOMPLETE_ENROLLMENT", "Kode kelas dan tahun ajaran harus diisi bersama-sama.");

    const [student, duplicate, currentEnrollment] = await Promise.all([
      db.coreStudent.findUnique({ where: { id }, select: { id: true, userId: true } }),
      db.coreStudent.findFirst({
        where: { id: { not: id }, OR: [{ nisn }, { nis }] },
        select: { nisn: true, nis: true },
      }),
      enrollmentId ? db.studentEnrollment.findFirst({ where: { id: enrollmentId, studentId: id }, select: { id: true } }) : Promise.resolve(null),
    ]);
    if (!student) return fail(res, 404, "STUDENT_NOT_FOUND", "Data siswa tidak ditemukan.");
    if (duplicate) {
      const field = duplicate.nisn === nisn ? "NISN" : "NIS";
      return fail(res, 409, "DUPLICATE_STUDENT_IDENTIFIER", `${field} sudah digunakan siswa lain.`);
    }
    if (enrollmentId && !currentEnrollment) {
      return fail(res, 409, "ENROLLMENT_CHANGED", "Penempatan siswa berubah. Muat ulang data sebelum menyimpan.");
    }

    let targetEnrollment: { classId: string; academicYearId: string } | null = null;
    if (classCode && academicYearCode) {
      const [classroom, academicYear] = await Promise.all([
        db.academicClass.findUnique({ where: { code: classCode } }),
        db.academicYear.findUnique({ where: { code: academicYearCode } }),
      ]);
      if (!classroom || !academicYear) return fail(res, 422, "REFERENCE_NOT_FOUND", "Kode kelas atau tahun ajaran tidak ditemukan.");
      if (classroom.academicYearId !== academicYear.id) {
        return fail(res, 422, "ENROLLMENT_YEAR_MISMATCH", "Tahun ajaran tidak sesuai dengan kelas yang dipilih.");
      }
      targetEnrollment = { classId: classroom.id, academicYearId: academicYear.id };
    }

    try {
      const updated = await db.$transaction(async (tx) => {
        const saved = await tx.coreStudent.update({
          where: { id },
          data: { nisn, nis, fullName, email, phone, gender, birthPlace, birthDate, status: status as "ACTIVE" | "INACTIVE" | "ARCHIVED" },
        });

        if (student.userId) {
          await tx.coreUser.update({
            where: { id: student.userId },
            data: {
              email: email || studentAccountEmail(nis),
              fullName,
              status: status === "ACTIVE" ? "ACTIVE" : "DISABLED",
            },
          });
        }

        if (enrollmentId && (!targetEnrollment || (await tx.studentEnrollment.findUnique({ where: { id: enrollmentId }, select: { academicYearId: true } }))?.academicYearId !== targetEnrollment.academicYearId)) {
          await tx.studentEnrollment.update({
            where: { id: enrollmentId },
            data: { status: status === "ARCHIVED" ? "ARCHIVED" : "INACTIVE" },
          });
        }
        if (targetEnrollment) {
          await tx.studentEnrollment.upsert({
            where: { studentId_academicYearId: { studentId: id, academicYearId: targetEnrollment.academicYearId } },
            update: { classId: targetEnrollment.classId, status: status as "ACTIVE" | "INACTIVE" | "ARCHIVED" },
            create: { studentId: id, ...targetEnrollment, status: status as "ACTIVE" | "INACTIVE" | "ARCHIVED" },
          });
        }

        await tx.coreAuditLog.create({
          data: {
            action: "MASTER_UPDATE",
            entity: "CoreStudent",
            entityId: id,
            actor: "ADMIN_SESSION",
            metadata: { nis: saved.nis, nisn: saved.nisn, fullName: saved.fullName },
          },
        });
        return saved;
      });
      const studentWithEnrollment = await db.coreStudent.findUnique({
        where: { id: updated.id },
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { academicClass: true, academicYear: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });
      return ok(res, studentWithEnrollment || updated);
    } catch (error: any) {
      if (error?.code === "P2002") return fail(res, 409, "DUPLICATE_STUDENT_DATA", "NIS, NISN, atau email akun sudah digunakan.");
      if (error?.code === "P2025") return fail(res, 404, "STUDENT_NOT_FOUND", "Data siswa tidak ditemukan.");
      throw error;
    }
  });

  app.delete("/api/v1/akademik/siswa", requireAuth, async (req, res) => {
    const ids: string[] = Array.isArray(req.body?.ids)
      ? [...new Set((req.body.ids as unknown[]).filter((value): value is string => typeof value === "string").map((value) => clean(value)).filter(Boolean))]
      : [];
    if (!ids.length || ids.length > 100) {
      return fail(res, 400, "INVALID_STUDENT_SELECTION", "Pilih antara 1 sampai 100 siswa untuk dihapus.");
    }

    try {
      const deletedCount = await db.$transaction(async (tx) => {
        const students = await tx.coreStudent.findMany({
          where: { id: { in: ids } },
          include: {
            enrollments: { select: { id: true } },
            pilketosVotes: { select: { id: true } },
          },
        });
        if (students.length !== ids.length) {
          throw Object.assign(new Error("Sebagian data siswa tidak ditemukan. Tidak ada data yang dihapus."), { code: "STUDENT_NOT_FOUND" });
        }

        const linkedUserIds = students.map((item) => item.userId).filter((value): value is string => Boolean(value));
        if (linkedUserIds.length) {
          await tx.coreUser.updateMany({ where: { id: { in: linkedUserIds } }, data: { status: "DISABLED" } });
        }
        for (const item of students) {
          await tx.coreAuditLog.create({
            data: {
              action: "MASTER_DELETE",
              entity: "CoreStudent",
              entityId: item.id,
              actor: "ADMIN_SESSION",
              metadata: {
                nis: item.nis,
                nisn: item.nisn,
                fullName: item.fullName,
                deletedEnrollments: item.enrollments.length,
                deletedPilketosVotes: item.pilketosVotes.length,
              },
            },
          });
        }
        await tx.coreStudent.deleteMany({ where: { id: { in: ids } } });
        return students.length;
      });
      return ok(res, { deletedCount });
    } catch (error: any) {
      if (error?.code === "STUDENT_NOT_FOUND") return fail(res, 404, "STUDENT_NOT_FOUND", error.message);
      throw error;
    }
  });

  app.get("/api/v1/akademik/audit", requireAuth, async (req, res) => {
    const { page, pageSize, search } = pageParams(req);
    const where = search ? { OR: [{ action: { contains: search, mode: "insensitive" as const } }, { entity: { contains: search, mode: "insensitive" as const } }, { actor: { contains: search, mode: "insensitive" as const } }] } : undefined;
    const [items, total] = await Promise.all([
      db.coreAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      db.coreAuditLog.count({ where }),
    ]);
    return ok(res, { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) });
  });

  app.get("/api/v1/akademik/import/jobs", requireAuth, async (req, res) => {
    const { page, pageSize } = pageParams(req);
    const [items, total] = await Promise.all([
      db.coreImportJob.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      db.coreImportJob.count(),
    ]);
    return ok(res, { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) });
  });

  app.get("/api/v1/akademik/import/jobs/:jobId/errors", requireAuth, async (req, res) => {
    const job = await db.coreImportJob.findUnique({ where: { id: req.params.jobId }, select: { id: true, fileName: true, errors: true, errorRows: true } });
    if (!job) return fail(res, 404, "IMPORT_NOT_FOUND", "Riwayat import tidak ditemukan.");
    return ok(res, job);
  });

  app.post("/api/v1/akademik/tahun-ajaran", requireAuth, async (req, res) => {
    const code = clean(req.body.code);
    const name = clean(req.body.name);
    if (!code || !name) return fail(res, 400, "REQUIRED_FIELD", "Kode dan nama tahun ajaran wajib diisi.");
    try {
      const item = await db.$transaction(async (tx) => {
        const isActive = Boolean(req.body.isActive);
        if (isActive) await tx.academicYear.updateMany({ where: { isActive: true }, data: { isActive: false } });
        const created = await tx.academicYear.create({ data: { code, name, isActive, status: statusValue(req.body.status) as "ACTIVE" | "INACTIVE" | "ARCHIVED" } });
        await tx.coreAuditLog.create({ data: { action: "MASTER_CREATE", entity: "AcademicYear", entityId: created.id, actor: "ADMIN_SESSION", metadata: { code } } });
        return created;
      });
      return ok(res, item);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return fail(res, 409, "DUPLICATE_CODE", "Kode tahun ajaran sudah digunakan.");
      return fail(res, 500, "MASTER_CREATE_FAILED", "Tahun ajaran gagal dibuat.");
    }
  });

  app.patch("/api/v1/akademik/tahun-ajaran/:id", requireAuth, async (req, res) => {
    try {
      const item = await db.$transaction(async (tx) => {
        if (Boolean(req.body.isActive)) await tx.academicYear.updateMany({ where: { isActive: true, id: { not: req.params.id } }, data: { isActive: false } });
        const updated = await tx.academicYear.update({ where: { id: req.params.id }, data: { ...(req.body.code !== undefined ? { code: clean(req.body.code) } : {}), ...(req.body.name !== undefined ? { name: clean(req.body.name) } : {}), ...(req.body.isActive !== undefined ? { isActive: Boolean(req.body.isActive) } : {}), ...(req.body.status !== undefined ? { status: statusValue(req.body.status) as "ACTIVE" | "INACTIVE" | "ARCHIVED" } : {}) } });
        await tx.coreAuditLog.create({ data: { action: "MASTER_UPDATE", entity: "AcademicYear", entityId: updated.id, actor: "ADMIN_SESSION", metadata: { code: updated.code } } });
        return updated;
      });
      return ok(res, item);
    } catch (error) {
      if ((error as { code?: string }).code === "P2025") return fail(res, 404, "NOT_FOUND", "Tahun ajaran tidak ditemukan.");
      if ((error as { code?: string }).code === "P2002") return fail(res, 409, "DUPLICATE_CODE", "Kode tahun ajaran sudah digunakan.");
      return fail(res, 500, "MASTER_UPDATE_FAILED", "Tahun ajaran gagal diperbarui.");
    }
  });

  app.post("/api/v1/akademik/jurusan", requireAuth, async (req, res) => {
    const code = clean(req.body.code);
    const name = clean(req.body.name);
    if (!code || !name) return fail(res, 400, "REQUIRED_FIELD", "Kode dan nama jurusan wajib diisi.");
    try {
      const item = await db.department.create({ data: { code, name, status: statusValue(req.body.status) as "ACTIVE" | "INACTIVE" | "ARCHIVED" } });
      await audit("MASTER_CREATE", "Department", item.id, { code });
      return ok(res, item);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return fail(res, 409, "DUPLICATE_CODE", "Kode jurusan sudah digunakan.");
      return fail(res, 500, "MASTER_CREATE_FAILED", "Jurusan gagal dibuat.");
    }
  });

  app.patch("/api/v1/akademik/jurusan/:id", requireAuth, async (req, res) => {
    try {
      const item = await db.department.update({ where: { id: req.params.id }, data: { ...(req.body.code !== undefined ? { code: clean(req.body.code) } : {}), ...(req.body.name !== undefined ? { name: clean(req.body.name) } : {}), ...(req.body.status !== undefined ? { status: statusValue(req.body.status) as "ACTIVE" | "INACTIVE" | "ARCHIVED" } : {}) } });
      await audit("MASTER_UPDATE", "Department", item.id, { code: item.code });
      return ok(res, item);
    } catch (error) {
      if ((error as { code?: string }).code === "P2025") return fail(res, 404, "NOT_FOUND", "Jurusan tidak ditemukan.");
      if ((error as { code?: string }).code === "P2002") return fail(res, 409, "DUPLICATE_CODE", "Kode jurusan sudah digunakan.");
      return fail(res, 500, "MASTER_UPDATE_FAILED", "Jurusan gagal diperbarui.");
    }
  });

  app.post("/api/v1/akademik/mapel", requireAuth, async (req, res) => {
    const code = clean(req.body.code);
    const name = clean(req.body.name);
    if (!code || !name) return fail(res, 400, "REQUIRED_FIELD", "Kode dan nama mapel wajib diisi.");
    const department = clean(req.body.departmentId) ? await db.department.findUnique({ where: { id: clean(req.body.departmentId) } }) : null;
    if (req.body.departmentId && !department) return fail(res, 422, "REFERENCE_NOT_FOUND", "Jurusan tidak ditemukan.");
    try {
      const item = await db.subject.create({ data: { code, name, departmentId: department?.id, status: statusValue(req.body.status) as "ACTIVE" | "INACTIVE" | "ARCHIVED" } });
      await audit("MASTER_CREATE", "Subject", item.id, { code });
      return ok(res, item);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return fail(res, 409, "DUPLICATE_CODE", "Kode mapel sudah digunakan.");
      return fail(res, 500, "MASTER_CREATE_FAILED", "Mapel gagal dibuat.");
    }
  });

  app.patch("/api/v1/akademik/mapel/:id", requireAuth, async (req, res) => {
    try {
      const departmentId = req.body.departmentId === null ? null : (req.body.departmentId ? clean(req.body.departmentId) : undefined);
      if (departmentId && !(await db.department.findUnique({ where: { id: departmentId } }))) return fail(res, 422, "REFERENCE_NOT_FOUND", "Jurusan tidak ditemukan.");
      const item = await db.subject.update({ where: { id: req.params.id }, data: { ...(req.body.code !== undefined ? { code: clean(req.body.code) } : {}), ...(req.body.name !== undefined ? { name: clean(req.body.name) } : {}), ...(departmentId !== undefined ? { departmentId } : {}), ...(req.body.status !== undefined ? { status: statusValue(req.body.status) as "ACTIVE" | "INACTIVE" | "ARCHIVED" } : {}) } });
      await audit("MASTER_UPDATE", "Subject", item.id, { code: item.code });
      return ok(res, item);
    } catch (error) {
      if ((error as { code?: string }).code === "P2025") return fail(res, 404, "NOT_FOUND", "Mapel tidak ditemukan.");
      if ((error as { code?: string }).code === "P2002") return fail(res, 409, "DUPLICATE_CODE", "Kode mapel sudah digunakan.");
      return fail(res, 500, "MASTER_UPDATE_FAILED", "Mapel gagal diperbarui.");
    }
  });

  app.post("/api/v1/akademik/kelas", requireAuth, async (req, res) => {
    const code = clean(req.body.code);
    const name = clean(req.body.name);
    const grade = clean(req.body.grade);
    const year = await db.academicYear.findUnique({ where: { id: clean(req.body.academicYearId) } });
    if (!code || !name || !["X", "XI", "XII"].includes(grade) || !year) return fail(res, 422, "INVALID_REFERENCE", "Kode, nama, tingkat X/XI/XII, dan tahun ajaran valid wajib diisi.");
    const department = clean(req.body.departmentId) ? await db.department.findUnique({ where: { id: clean(req.body.departmentId) } }) : null;
    if (req.body.departmentId && !department) return fail(res, 422, "REFERENCE_NOT_FOUND", "Jurusan tidak ditemukan.");
    try {
      const item = await db.academicClass.create({ data: { code, name, grade, academicYearId: year.id, departmentId: department?.id, status: statusValue(req.body.status) as "ACTIVE" | "INACTIVE" | "ARCHIVED" } });
      await audit("MASTER_CREATE", "AcademicClass", item.id, { code });
      return ok(res, item);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return fail(res, 409, "DUPLICATE_CODE", "Kode kelas sudah digunakan.");
      return fail(res, 500, "MASTER_CREATE_FAILED", "Kelas gagal dibuat.");
    }
  });

  app.patch("/api/v1/akademik/kelas/:id", requireAuth, async (req, res) => {
    try {
      const academicYearId = req.body.academicYearId ? clean(req.body.academicYearId) : undefined;
      if (academicYearId && !(await db.academicYear.findUnique({ where: { id: academicYearId } }))) return fail(res, 422, "REFERENCE_NOT_FOUND", "Tahun ajaran tidak ditemukan.");
      const item = await db.academicClass.update({ where: { id: req.params.id }, data: { ...(req.body.code !== undefined ? { code: clean(req.body.code) } : {}), ...(req.body.name !== undefined ? { name: clean(req.body.name) } : {}), ...(req.body.grade !== undefined ? { grade: clean(req.body.grade) } : {}), ...(academicYearId ? { academicYearId } : {}), ...(req.body.departmentId !== undefined ? { departmentId: req.body.departmentId ? clean(req.body.departmentId) : null } : {}), ...(req.body.status !== undefined ? { status: statusValue(req.body.status) as "ACTIVE" | "INACTIVE" | "ARCHIVED" } : {}) } });
      await audit("MASTER_UPDATE", "AcademicClass", item.id, { code: item.code });
      return ok(res, item);
    } catch (error) {
      if ((error as { code?: string }).code === "P2025") return fail(res, 404, "NOT_FOUND", "Kelas tidak ditemukan.");
      if ((error as { code?: string }).code === "P2002") return fail(res, 409, "DUPLICATE_CODE", "Kode kelas sudah digunakan.");
      return fail(res, 500, "MASTER_UPDATE_FAILED", "Kelas gagal diperbarui.");
    }
  });

  app.get("/api/v1/akademik/assignments", requireAuth, async (_req, res) => {
    const assignments = await db.teachingAssignment.findMany({ include: { teacher: true, subject: true, academicClass: true, academicYear: true }, orderBy: { updatedAt: "desc" } });
    return ok(res, assignments);
  });

  app.get("/api/v1/akademik/teacher-requests", requireAuth, async (_req, res) => {
    const requests = await db.teacherSelectionRequest.findMany({ include: { teacher: true, academicYear: true, items: { include: { subject: true, class: true } } }, orderBy: { createdAt: "desc" } });
    return ok(res, requests);
  });

  async function coreTeacherFromSession(req: Request) {
    const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
    if (!token) return null;
    const session = await db.session.findUnique({ where: { token }, include: { coreUser: { include: { teacher: true } } } });
    if (!session || session.expiresAt < new Date() || !session.coreUser?.teacher || session.coreUser.status !== "ACTIVE") return null;
    return { session, user: session.coreUser, teacher: session.coreUser.teacher };
  }

  async function selectionPayload(req: Request, teacherId: string) {
    const academicYearId = clean(req.body.academicYearId) || (await db.academicYear.findFirst({ where: { isActive: true, status: "ACTIVE" }, orderBy: { code: "desc" } }))?.id;
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!academicYearId || !items.length) throw new Error("Tahun ajaran aktif dan minimal satu pilihan wajib diisi.");
    const year = await db.academicYear.findUnique({ where: { id: academicYearId } });
    if (!year) throw new Error("Tahun ajaran tidak ditemukan.");
    const pairs = new Set<string>();
    const normalized: { subjectId: string; classId: string }[] = [];
    for (const raw of items) {
      const subjectId = clean(raw?.subjectId);
      const classId = clean(raw?.classId);
      const pair = `${subjectId}|${classId}`;
      if (!subjectId || !classId || pairs.has(pair)) throw new Error("Pilihan mapel dan kelas tidak valid atau duplikat.");
      pairs.add(pair);
      const [subject, classroom] = await Promise.all([
        db.subject.findUnique({ where: { id: subjectId } }),
        db.academicClass.findUnique({ where: { id: classId } }),
      ]);
      if (!subject || subject.status !== "ACTIVE" || !classroom || classroom.status !== "ACTIVE" || classroom.academicYearId !== academicYearId) throw new Error("Mapel atau kelas tidak tersedia pada tahun ajaran yang dipilih.");
      normalized.push({ subjectId, classId });
    }
    return { academicYearId, normalized };
  }

  app.post("/api/v1/akademik/teacher-requests", async (req, res) => {
    const actor = await coreTeacherFromSession(req);
    if (!actor) return fail(res, 401, "UNAUTHENTICATED", "Login guru aktif diperlukan.");
    try {
      const { academicYearId, normalized } = await selectionPayload(req, actor.teacher.id);
      const request = await db.$transaction(async (tx) => {
        const saved = await tx.teacherSelectionRequest.upsert({
          where: { teacherId_academicYearId: { teacherId: actor.teacher.id, academicYearId } },
          update: { status: "SUBMITTED", submittedAt: new Date(), reviewNote: null, reviewedAt: null, reviewedBy: null },
          create: { teacherId: actor.teacher.id, academicYearId, status: "SUBMITTED", submittedAt: new Date() },
        });
        await tx.teacherSelectionItem.deleteMany({ where: { requestId: saved.id } });
        await tx.teacherSelectionItem.createMany({ data: normalized.map((item) => ({ requestId: saved.id, ...item })) });
        await tx.coreAuditLog.create({ data: { action: "TEACHER_REQUEST_SUBMIT", entity: "TeacherSelectionRequest", entityId: saved.id, actor: actor.user.id, userId: actor.user.id, metadata: { itemCount: normalized.length } as any } });
        return tx.teacherSelectionRequest.findUnique({ where: { id: saved.id }, include: { academicYear: true, items: { include: { subject: true, class: true } } } });
      });
      return ok(res, request);
    } catch (error) {
      return fail(res, 422, "REQUEST_INVALID", error instanceof Error ? error.message : "Pengajuan tidak valid.");
    }
  });

  app.patch("/api/v1/akademik/teacher-requests/:id", async (req, res) => {
    const actor = await coreTeacherFromSession(req);
    if (!actor) return fail(res, 401, "UNAUTHENTICATED", "Login guru aktif diperlukan.");
    const existing = await db.teacherSelectionRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.teacherId !== actor.teacher.id) return fail(res, 404, "NOT_FOUND", "Pengajuan tidak ditemukan.");
    if (!["DRAFT", "NEEDS_REVISION"].includes(existing.status)) return fail(res, 409, "INVALID_STATE", "Pengajuan hanya dapat diedit saat draft atau perlu revisi.");
    try {
      const { academicYearId, normalized } = await selectionPayload(req, actor.teacher.id);
      const updated = await db.$transaction(async (tx) => {
        const saved = await tx.teacherSelectionRequest.update({ where: { id: existing.id }, data: { academicYearId, status: "DRAFT", reviewNote: null } });
        await tx.teacherSelectionItem.deleteMany({ where: { requestId: saved.id } });
        await tx.teacherSelectionItem.createMany({ data: normalized.map((item) => ({ requestId: saved.id, ...item })) });
        await tx.coreAuditLog.create({ data: { action: "TEACHER_REQUEST_SUBMIT", entity: "TeacherSelectionRequest", entityId: saved.id, actor: actor.user.id, userId: actor.user.id, metadata: { action: "REVISION", itemCount: normalized.length } as any } });
        return saved;
      });
      return ok(res, updated);
    } catch (error) {
      return fail(res, 422, "REQUEST_INVALID", error instanceof Error ? error.message : "Revisi tidak valid.");
    }
  });

  app.post("/api/v1/akademik/users/:id/invite", requireAuth, async (req, res) => {
    const user = await db.coreUser.findUnique({ where: { id: req.params.id } });
    if (!user) return fail(res, 404, "NOT_FOUND", "User tidak ditemukan.");
    const activationToken = crypto.randomBytes(32).toString("hex");
    await db.coreUser.update({ where: { id: user.id }, data: { status: "INVITED", activationTokenHash: crypto.createHash("sha256").update(activationToken).digest("hex"), activationExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) } });
    await audit("USER_STATUS_CHANGE", "CoreUser", user.id, { status: "INVITED", action: "INVITATION_CREATED" });
    return ok(res, { userId: user.id, email: user.email, activationToken, expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) });
  });

  app.patch("/api/v1/akademik/teacher-requests/:id/review", requireAuth, async (req, res) => {
    const { status, reviewNote } = req.body;
    if (!["APPROVED", "REJECTED", "NEEDS_REVISION"].includes(status)) return fail(res, 400, "INVALID_STATUS", "Status review tidak valid.");
    try {
      const request = await db.$transaction(async (tx) => {
        const existing = await tx.teacherSelectionRequest.findUnique({ where: { id: req.params.id }, include: { items: true } });
        if (!existing) throw new Error("NOT_FOUND");
        const updated = await tx.teacherSelectionRequest.update({ where: { id: existing.id }, data: { status, reviewNote: clean(reviewNote) || null, reviewedAt: new Date(), reviewedBy: "ADMIN_SESSION" } });
        if (status === "APPROVED") {
          for (const item of existing.items) {
            await tx.teachingAssignment.upsert({ where: { teacherId_subjectId_classId_academicYearId: { teacherId: existing.teacherId, subjectId: item.subjectId, classId: item.classId, academicYearId: existing.academicYearId } }, update: { status: "ACTIVE", source: "TEACHER_REQUEST", approvedBy: "ADMIN_SESSION", approvedAt: new Date() }, create: { teacherId: existing.teacherId, subjectId: item.subjectId, classId: item.classId, academicYearId: existing.academicYearId, source: "TEACHER_REQUEST", approvedBy: "ADMIN_SESSION", approvedAt: new Date() } });
          }
        }
        await tx.coreAuditLog.create({ data: { action: "TEACHER_REQUEST_REVIEW", entity: "TeacherSelectionRequest", entityId: existing.id, actor: "ADMIN_SESSION", metadata: { status } } });
        return updated;
      });
      return ok(res, request);
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") return fail(res, 404, "NOT_FOUND", "Pengajuan guru tidak ditemukan.");
      return fail(res, 500, "REVIEW_FAILED", "Pengajuan guru gagal diproses.");
    }
  });

  app.get("/api/v1/akademik/import/templates", requireAuth, (_req, res) => ok(res, Object.entries(TEMPLATE_DEFINITIONS).map(([type, definition]) => ({ type, ...definition }))));

  app.get("/api/v1/akademik/import/templates/bank", requireAuth, (_req, res) => {
    const workbook = XLSX.utils.book_new();
    const guideRows = [
      ["BANK DATA TEMPLATE AKADEMIK"],
      ["Gunakan sheet sesuai jenis data. Jangan mengubah nama kolom pada baris pertama."],
      [],
      ["Sheet", "Jenis data", "Kolom wajib", "Kolom tersedia"],
      ...Object.entries(TEMPLATE_DEFINITIONS).map(([type, definition]) => [
        definition.label,
        type,
        REQUIRED_HEADERS[type as ImportType].join(", "),
        definition.headers.join(", "),
      ]),
    ];
    const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
    guideSheet["!cols"] = [{ wch: 28 }, { wch: 22 }, { wch: 48 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, "Petunjuk");

    Object.entries(TEMPLATE_DEFINITIONS).forEach(([type, definition]) => {
      const example = definition.headers.map((header) => header === "isActive" ? "YA" : "");
      const sheet = XLSX.utils.aoa_to_sheet([definition.headers, example]);
      sheet["!cols"] = definition.headers.map(() => ({ wch: 22 }));
      const sheetName = definition.label.slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    const file = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", 'attachment; filename="bank-data-template-akademik.xlsx"');
    res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(file);
  });

  app.get("/api/v1/akademik/import/templates/:type", requireAuth, (req, res) => {
    const type = req.params.type as ImportType;
    const definition = TEMPLATE_DEFINITIONS[type];
    if (!definition) return fail(res, 404, "TEMPLATE_NOT_FOUND", "Template tidak ditemukan.");
    const example = definition.headers.map((header) => header === "isActive" ? "YA" : "");
    const sheet = XLSX.utils.aoa_to_sheet([definition.headers, example]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Template");
    const file = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", `attachment; filename="template-${type}.xlsx"`);
    res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(file);
  });

  app.post("/api/v1/akademik/import/:type/preview", requireAuth, async (req, res) => {
    const type = req.params.type as ImportType;
    if (!TEMPLATE_DEFINITIONS[type]) return fail(res, 404, "TEMPLATE_NOT_FOUND", "Jenis import tidak didukung.");
    try {
      const { fileName, fileBase64 } = req.body;
      if (!fileName || !fileBase64) return fail(res, 400, "FILE_REQUIRED", "Nama file dan isi file wajib dikirim.");
      const parsed = parseWorkbook(fileBase64, type);
      const rows = await validateRows(type, parsed.rows);
      const errorRows = rows.filter((row) => row.status === "ERROR" || row.status === "DUPLICATE").length;
      const job = await db.coreImportJob.create({ data: { templateType: type, fileName: clean(fileName), fileChecksum: parsed.checksum, status: "PREVIEWED", totalRows: rows.length, successRows: rows.length - errorRows, errorRows, errors: maskPreviewRows(rows.filter((row) => row.errors.length).slice(0, 200)) as any, uploadedBy: "ADMIN_SESSION" } });
      return ok(res, { jobId: job.id, templateType: type, fileName: job.fileName, rows: maskPreviewRows(rows.slice(0, 200)), totalRows: rows.length, validRows: job.successRows, errorRows });
    } catch (error) {
      return fail(res, 400, "PREVIEW_FAILED", error instanceof Error ? error.message : "File gagal diproses.");
    }
  });

  app.post("/api/v1/akademik/import/:type/commit", requireAuth, async (req, res) => {
    const type = req.params.type as ImportType;
    if (!TEMPLATE_DEFINITIONS[type]) return fail(res, 404, "TEMPLATE_NOT_FOUND", "Jenis import tidak didukung.");
    try {
      const { jobId, fileBase64 } = req.body;
      const job = await db.coreImportJob.findUnique({ where: { id: jobId } });
      if (!job || job.templateType !== type) return fail(res, 404, "IMPORT_NOT_FOUND", "Preview import tidak ditemukan.");
      if (job.status !== "PREVIEWED") return fail(res, 409, "IMPORT_ALREADY_PROCESSED", "Import ini sudah diproses.");
      const parsed = parseWorkbook(fileBase64, type);
      if (parsed.checksum !== job.fileChecksum) return fail(res, 409, "CHECKSUM_MISMATCH", "File berbeda dari file saat preview.");
      const rows = await validateRows(type, parsed.rows);
      const invalid = rows.filter((row) => row.status === "ERROR" || row.status === "DUPLICATE");
      if (invalid.length) return fail(res, 422, "VALIDATION_FAILED", "Perbaiki semua error sebelum commit.", { errors: maskPreviewRows(invalid.slice(0, 200)) });
      const successRows = await commitRows(type, rows, "ADMIN_SESSION", job.id);
      return ok(res, { jobId: job.id, status: "COMMITTED", successRows });
    } catch (error) {
      if (error instanceof Error && error.message === "IMPORT_ALREADY_PROCESSED") {
        return fail(res, 409, "IMPORT_ALREADY_PROCESSED", "Import ini sudah diproses.");
      }
      return fail(res, 500, "COMMIT_FAILED", error instanceof Error ? error.message : "Import gagal disimpan.");
    }
  });
}