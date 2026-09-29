CREATE TYPE "CurriculumModuleStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "CurriculumModule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "phase" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "ownerTeacherId" TEXT NOT NULL,
    "status" "CurriculumModuleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurriculumModuleAsset" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurriculumModuleAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CurriculumModule_ownerTeacherId_status_idx" ON "CurriculumModule"("ownerTeacherId", "status");
CREATE INDEX "CurriculumModule_academicYearId_status_idx" ON "CurriculumModule"("academicYearId", "status");
CREATE INDEX "CurriculumModule_subjectId_status_idx" ON "CurriculumModule"("subjectId", "status");
CREATE INDEX "CurriculumModuleAsset_moduleId_idx" ON "CurriculumModuleAsset"("moduleId");

ALTER TABLE "CurriculumModule"
ADD CONSTRAINT "CurriculumModule_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CurriculumModule"
ADD CONSTRAINT "CurriculumModule_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CurriculumModule"
ADD CONSTRAINT "CurriculumModule_ownerTeacherId_fkey"
FOREIGN KEY ("ownerTeacherId") REFERENCES "CoreTeacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CurriculumModuleAsset"
ADD CONSTRAINT "CurriculumModuleAsset_moduleId_fkey"
FOREIGN KEY ("moduleId") REFERENCES "CurriculumModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;