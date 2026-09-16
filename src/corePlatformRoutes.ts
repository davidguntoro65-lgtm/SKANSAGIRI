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

  app.get("/api/v1/akademik/master", requireAuth, async (_req, res) => {
    const [academicYears, departments, subjects, classes, teachers, students] = await Promise.all([
      db.academicYear.findMany({ orderBy: { code: "desc" } }),
      db.department.findMany({ orderBy: { code: "asc" } }),
      db.subject.findMany({ include: { department: true }, orderBy: { code: "asc" } }),
      db.academicClass.findMany({ include: { academicYear: true, department: true }, orderBy: { code: "asc" } }),
      db.coreTeacher.findMany({ orderBy: { nip: "asc" } }),
      db.coreStudent.findMany({ orderBy: { nisn: "asc" }, take: 100 }),
    ]);
    return ok(res, { academicYears, departments, subjects, classes, teachers, students });
  });

  app.get("/api/v1/akademik/assignments", requireAuth, async (_req, res) => {
    const assignments = await db.teachingAssignment.findMany({ include: { teacher: true, subject: true, academicClass: true, academicYear: true }, orderBy: { updatedAt: "desc" } });
    return ok(res, assignments);
  });

  app.get("/api/v1/akademik/teacher-requests", requireAuth, async (_req, res) => {
    const requests = await db.teacherSelectionRequest.findMany({ include: { teacher: true, academicYear: true, items: { include: { subject: true, class: true } } }, orderBy: { createdAt: "desc" } });
    return ok(res, requests);
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