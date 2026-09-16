-- CreateEnum
CREATE TYPE "CoreUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "CoreRoleName" AS ENUM ('ADMIN', 'OPERATOR', 'GURU', 'SISWA', 'WALI_KELAS', 'BENDAHARA', 'KEPALA_SEKOLAH', 'EDITOR_PUBLIC');

-- CreateEnum
CREATE TYPE "CoreRecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('ADMIN_IMPORT', 'ADMIN_MANUAL', 'TEACHER_REQUEST');

-- CreateEnum
CREATE TYPE "TeacherRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEWED', 'COMMITTED', 'FAILED');

-- CreateTable
CREATE TABLE "OsisInfo" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "namaKabinet" TEXT NOT NULL DEFAULT 'OSIS SKANSAGIRI',
    "masaBakti" TEXT NOT NULL DEFAULT '',
    "tagline" TEXT NOT NULL DEFAULT '',
    "visi" TEXT NOT NULL DEFAULT '',
    "misi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sejarah" TEXT NOT NULL DEFAULT '',
    "quoteKetua" TEXT NOT NULL DEFAULT '',
    "namaKetua" TEXT NOT NULL DEFAULT '',
    "jumlahProker" INTEGER NOT NULL DEFAULT 0,
    "jumlahMember" INTEGER NOT NULL DEFAULT 0,
    "jumlahEkskul" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OsisInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OsisPengurus" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "bidang" TEXT NOT NULL DEFAULT '',
    "foto" TEXT,
    "tugasPokok" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OsisPengurus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OsisProgramKerja" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "bidang" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DIRENCANAKAN',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "targetDate" TEXT NOT NULL DEFAULT '',
    "penanggungJawab" TEXT NOT NULL DEFAULT '',
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OsisProgramKerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OsisAgenda" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "waktu" TEXT NOT NULL DEFAULT '',
    "tempat" TEXT NOT NULL DEFAULT '',
    "deskripsi" TEXT NOT NULL DEFAULT '',
    "jenis" TEXT NOT NULL DEFAULT 'RUTIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OsisAgenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OsisEkskul" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT NOT NULL DEFAULT 'AKADEMIK',
    "deskripsi" TEXT NOT NULL DEFAULT '',
    "jadwal" TEXT NOT NULL DEFAULT '',
    "pembina" TEXT NOT NULL DEFAULT '',
    "jumlahAnggota" INTEGER NOT NULL DEFAULT 0,
    "foto" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OsisEkskul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OsisGaleri" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "kategori" TEXT NOT NULL DEFAULT 'KEGIATAN',
    "foto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OsisGaleri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OsisPrestasi" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL DEFAULT '',
    "tingkat" TEXT NOT NULL DEFAULT 'SEKOLAH',
    "tanggal" TEXT NOT NULL,
    "foto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OsisPrestasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OsisAspirasi" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL DEFAULT 'Anonim',
    "kelas" TEXT NOT NULL DEFAULT '',
    "kategori" TEXT NOT NULL DEFAULT 'KEGIATAN',
    "isi" TEXT NOT NULL,
    "anonim" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'BARU',
    "balasan" TEXT NOT NULL DEFAULT '',
    "publik" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OsisAspirasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "status" "CoreUserStatus" NOT NULL DEFAULT 'INVITED',
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreRole" (
    "id" TEXT NOT NULL,
    "name" "CoreRoleName" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoreRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreUserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoreUserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "status" "CoreRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CoreRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT,
    "status" "CoreRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicClass" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "departmentId" TEXT,
    "homeroomId" TEXT,
    "status" "CoreRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreTeacher" (
    "id" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "CoreRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreStudent" (
    "id" TEXT NOT NULL,
    "nisn" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "birthPlace" TEXT,
    "birthDate" TIMESTAMP(3),
    "status" "CoreRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSubject" (
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "CoreRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "AssignmentSource" NOT NULL DEFAULT 'ADMIN_IMPORT',

    CONSTRAINT "TeacherSubject_pkey" PRIMARY KEY ("teacherId","subjectId")
);

-- CreateTable
CREATE TABLE "TeachingAssignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "AssignmentSource" NOT NULL DEFAULT 'ADMIN_MANUAL',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSelectionRequest" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "status" "TeacherRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSelectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSelectionItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "TeacherSelectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "status" "CoreRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreImportJob" (
    "id" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileChecksum" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEWED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "CoreImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "actor" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "CoreAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoreUser_email_key" ON "CoreUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoreRole_name_key" ON "CoreRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_code_key" ON "AcademicYear"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicClass_code_key" ON "AcademicClass"("code");

-- CreateIndex
CREATE INDEX "AcademicClass_academicYearId_status_idx" ON "AcademicClass"("academicYearId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CoreTeacher_nip_key" ON "CoreTeacher"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "CoreTeacher_userId_key" ON "CoreTeacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoreStudent_nisn_key" ON "CoreStudent"("nisn");

-- CreateIndex
CREATE UNIQUE INDEX "CoreStudent_userId_key" ON "CoreStudent"("userId");

-- CreateIndex
CREATE INDEX "TeachingAssignment_academicYearId_status_idx" ON "TeachingAssignment"("academicYearId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingAssignment_teacherId_subjectId_classId_academicYear_key" ON "TeachingAssignment"("teacherId", "subjectId", "classId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSelectionRequest_teacherId_academicYearId_key" ON "TeacherSelectionRequest"("teacherId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSelectionItem_requestId_subjectId_classId_key" ON "TeacherSelectionItem"("requestId", "subjectId", "classId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_classId_academicYearId_idx" ON "StudentEnrollment"("classId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_studentId_academicYearId_key" ON "StudentEnrollment"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "CoreImportJob_templateType_createdAt_idx" ON "CoreImportJob"("templateType", "createdAt");

-- CreateIndex
CREATE INDEX "CoreAuditLog_entity_createdAt_idx" ON "CoreAuditLog"("entity", "createdAt");

-- AddForeignKey
ALTER TABLE "CoreUserRole" ADD CONSTRAINT "CoreUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CoreUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreUserRole" ADD CONSTRAINT "CoreUserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CoreRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicClass" ADD CONSTRAINT "AcademicClass_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicClass" ADD CONSTRAINT "AcademicClass_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicClass" ADD CONSTRAINT "AcademicClass_homeroomId_fkey" FOREIGN KEY ("homeroomId") REFERENCES "CoreTeacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreTeacher" ADD CONSTRAINT "CoreTeacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CoreUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreStudent" ADD CONSTRAINT "CoreStudent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CoreUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "CoreTeacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "CoreTeacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSelectionRequest" ADD CONSTRAINT "TeacherSelectionRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "CoreTeacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSelectionRequest" ADD CONSTRAINT "TeacherSelectionRequest_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSelectionItem" ADD CONSTRAINT "TeacherSelectionItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TeacherSelectionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSelectionItem" ADD CONSTRAINT "TeacherSelectionItem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSelectionItem" ADD CONSTRAINT "TeacherSelectionItem_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "CoreStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreAuditLog" ADD CONSTRAINT "CoreAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CoreUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
