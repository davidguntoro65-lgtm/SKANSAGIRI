import crypto from "crypto";
import type { Express, Request, Response, NextFunction } from "express";
import * as XLSX from "xlsx";
import { db } from "./db";

type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
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

const TEMPLATE_DEFINITIONS: Record<ImportType, { label: string; headers: string[] }> = {
  "tahun-ajaran": { label: "Tahun Ajaran", headers: ["code", "name", "isActive"] },
  jurusan: { label: "Jurusan / Program Keahlian", headers: ["code", "name"] },
  mapel: { label: "Mata Pelajaran", headers: ["code", "name", "kodeJurusan"] },
  kelas: { label: "Kelas", headers: ["code", "name", "tingkat", "kodeJurusan", "kodeTahunAjaran"] },
  guru: { label: "Guru", headers: ["nip", "namaLengkap", "email", "noHp", "status"] },
  siswa: {
    label: "Siswa",
    headers: ["nisn", "namaLengkap", "email", "noHp", "jenisKelamin", "tempatLahir", "tanggalLahir", "kodeKelas", "kodeTahunAjaran", "status"],
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
  siswa: ["nisn", "namaLengkap", "kodeKelas", "kodeTahunAjaran"],
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

function asBoolean(value: unknown) {
  return ["true", "1", "ya", "yes", "aktif", "active"].includes(clean(value).toLowerCase());
}

function parseDate(value: unknown): Date | null {
  const text = clean(value);
  if (!text) return null;
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
    definition.headers.forEach((header, index) => { values[header] = (row as unknown[])[headerRow.indexOf(header)] ?? ""; });
    return values;
  }).filter((row) => Object.values(row).some((value) => clean(value)));
  return { checksum, rows };
}

async function referenceMaps() {
  const [years, departments, subjects, classes, teachers, students] = await Promise.all([
    db.academicYear.findMany({ select: { id: true, code: true } }),
    db.department.findMany({ select: { id: true, code: true } }),
    db.subject.findMany({ select: { id: true, code: true } }),
    db.academicClass.findMany({ select: { id: true, code: true, academicYearId: true } }),
    db.coreTeacher.findMany({ select: { id: true, nip: true } }),
    db.coreStudent.findMany({ select: { id: true, nisn: true } }),
  ]);
  return {
    years: new Map(years.map((item) => [item.code, item])),
    departments: new Map(departments.map((item) => [item.code, item])),
    subjects: new Map(subjects.map((item) => [item.code, item])),
    classes: new Map(classes.map((item) => [item.code, item])),
    teachers: new Map(teachers.map((item) => [item.nip, item])),
    students: new Map(students.map((item) => [item.nisn, item])),
  };
}

async function validateRows(type: ImportType, rows: Record<string, unknown>[]): Promise<PreviewRow[]> {
  const refs = await referenceMaps();
  const seen = new Set<string>();
  const result: PreviewRow[] = [];
  const keyFor = (values: Record<string, unknown>) => {
    switch (type) {
      case "tahun-ajaran": return clean(values.code);
      case "jurusan": return clean(values.code);
      case "mapel": return clean(values.code);
      case "kelas": return clean(values.code);
      case "guru": return clean(values.nip);
      case "siswa": return clean(values.nisn);
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

async function audit(action: string, entity: string, entityId: string | undefined, metadata: Record<string, unknown> = {}) {
  await db.coreAuditLog.create({ data: { action, entity, entityId, actor: "ADMIN_SESSION", metadata: metadata as any } });
}

async function commitRows(type: ImportType, rows: PreviewRow[], actor: string) {
  const validRows = rows.filter((row) => row.status === "VALID" || row.status === "UNCHANGED");
  return db.$transaction(async (tx) => {
    let success = 0;
    for (const { values } of validRows) {
      const status = statusValue(values.status) as "ACTIVE" | "INACTIVE" | "ARCHIVED";
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
        const student = await tx.coreStudent.upsert({ where: { nisn: clean(values.nisn) }, update: { fullName: clean(values.namaLengkap), email: clean(values.email) || null, phone: clean(values.noHp) || null, gender: clean(values.jenisKelamin) || null, birthPlace: clean(values.tempatLahir) || null, birthDate: parseDate(values.tanggalLahir), status }, create: { nisn: clean(values.nisn), fullName: clean(values.namaLengkap), email: clean(values.email) || null, phone: clean(values.noHp) || null, gender: clean(values.jenisKelamin) || null, birthPlace: clean(values.tempatLahir) || null, birthDate: parseDate(values.tanggalLahir), status } });
        const year = await tx.academicYear.findUnique({ where: { code: clean(values.kodeTahunAjaran) } });
        const classroom = await tx.academicClass.findUnique({ where: { code: clean(values.kodeKelas) } });
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
    await tx.coreAuditLog.create({ data: { action: "IMPORT_COMMIT", entity: type, actor, metadata: { rows: success } } });
    return success;
  });
}

export function registerCorePlatformRoutes(app: Express, requireAuth: AuthMiddleware) {
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

  app.get("/api/v1/akademik/master", requireAuth, async (req, res) => {
    const { page, pageSize, search } = pageParams(req);
    const contains = search ? { contains: search, mode: "insensitive" as const } : undefined;
    const [academicYears, departments, subjects, classes, teachers, students] = await Promise.all([
      db.academicYear.findMany({ where: contains ? { OR: [{ code: contains }, { name: contains }] } : undefined, orderBy: { code: "desc" } }),
      db.department.findMany({ where: contains ? { OR: [{ code: contains }, { name: contains }] } : undefined, orderBy: { code: "asc" } }),
      db.subject.findMany({ where: contains ? { OR: [{ code: contains }, { name: contains }] } : undefined, include: { department: true }, orderBy: { code: "asc" } }),
      db.academicClass.findMany({ where: contains ? { OR: [{ code: contains }, { name: contains }] } : undefined, include: { academicYear: true, department: true }, orderBy: { code: "asc" } }),
      db.coreTeacher.findMany({ where: contains ? { OR: [{ nip: contains }, { fullName: contains }] } : undefined, orderBy: { nip: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
      db.coreStudent.findMany({ where: contains ? { OR: [{ nisn: contains }, { fullName: contains }] } : undefined, orderBy: { nisn: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return ok(res, { academicYears, departments, subjects, classes, teachers, students, page, pageSize, search });
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
      const job = await db.coreImportJob.create({ data: { templateType: type, fileName: clean(fileName), fileChecksum: parsed.checksum, status: "PREVIEWED", totalRows: rows.length, successRows: rows.length - errorRows, errorRows, errors: rows.filter((row) => row.errors.length).slice(0, 200) as any, uploadedBy: "ADMIN_SESSION" } });
      return ok(res, { jobId: job.id, templateType: type, fileName: job.fileName, rows: rows.slice(0, 200), totalRows: rows.length, validRows: job.successRows, errorRows });
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
      if (invalid.length) return fail(res, 422, "VALIDATION_FAILED", "Perbaiki semua error sebelum commit.", { errors: invalid.slice(0, 200) });
      const successRows = await commitRows(type, rows, "ADMIN_SESSION");
      const updated = await db.coreImportJob.update({ where: { id: job.id }, data: { status: "COMMITTED", successRows, errorRows: 0, committedAt: new Date() } });
      return ok(res, { jobId: updated.id, status: updated.status, successRows });
    } catch (error) {
      return fail(res, 500, "COMMIT_FAILED", error instanceof Error ? error.message : "Import gagal disimpan.");
    }
  });
}