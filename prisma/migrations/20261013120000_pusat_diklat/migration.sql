CREATE TABLE "DiklatModuleSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL DEFAULT 'PUSAT DIKLAT SMKN 1 WONOGIRI',
    "description" TEXT NOT NULL DEFAULT 'Satu Portal untuk Materi, LKPD, dan Pengumpulan Tugas Diklat.',
    "submissionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "archiveVisible" BOOLEAN NOT NULL DEFAULT true,
    "maxFileSizeMb" INTEGER NOT NULL DEFAULT 15,
    "allowedMimeTypes" TEXT[] NOT NULL DEFAULT ARRAY['application/pdf', 'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png']::TEXT[],
    "allowedExtensions" TEXT[] NOT NULL DEFAULT ARRAY['.pdf', '.zip', '.docx', '.pptx', '.xlsx', '.jpg', '.jpeg', '.png']::TEXT[],
    "submissionDriveAccess" TEXT NOT NULL DEFAULT 'PRIVATE',
    "rootFolderId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiklatModuleSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiklatTraining" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "period" TEXT NOT NULL DEFAULT '',
    "year" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "acceptsSubmissions" BOOLEAN NOT NULL DEFAULT false,
    "archiveVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "driveFolderId" TEXT,
    "materialsFolderId" TEXT,
    "lkpdFolderId" TEXT,
    "submissionsFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiklatTraining_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiklatTaskType" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deadline" TIMESTAMP(3),
    "maxFileSizeMb" INTEGER,
    "allowedMimeTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "driveFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiklatTaskType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiklatDriveFile" (
    "id" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "driveFolderId" TEXT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "kind" TEXT NOT NULL,
    "webUrl" TEXT,
    "publicAccess" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT NOT NULL DEFAULT 'STORED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiklatDriveFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiklatDocument" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "driveFileId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiklatDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiklatSubmission" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "taskTypeId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nip" TEXT,
    "institution" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STORED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiklatSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiklatTraining_slug_key" ON "DiklatTraining"("slug");
CREATE INDEX "DiklatTraining_status_year_idx" ON "DiklatTraining"("status", "year");
CREATE INDEX "DiklatTraining_sortOrder_createdAt_idx" ON "DiklatTraining"("sortOrder", "createdAt");
CREATE INDEX "DiklatTaskType_trainingId_active_sortOrder_idx" ON "DiklatTaskType"("trainingId", "active", "sortOrder");
CREATE UNIQUE INDEX "DiklatDriveFile_driveFileId_key" ON "DiklatDriveFile"("driveFileId");
CREATE INDEX "DiklatDriveFile_kind_verificationStatus_idx" ON "DiklatDriveFile"("kind", "verificationStatus");
CREATE UNIQUE INDEX "DiklatDocument_driveFileId_key" ON "DiklatDocument"("driveFileId");
CREATE INDEX "DiklatDocument_trainingId_type_status_sortOrder_idx" ON "DiklatDocument"("trainingId", "type", "status", "sortOrder");
CREATE UNIQUE INDEX "DiklatSubmission_reference_key" ON "DiklatSubmission"("reference");
CREATE UNIQUE INDEX "DiklatSubmission_idempotencyKey_key" ON "DiklatSubmission"("idempotencyKey");
CREATE UNIQUE INDEX "DiklatSubmission_driveFileId_key" ON "DiklatSubmission"("driveFileId");
CREATE INDEX "DiklatSubmission_trainingId_submittedAt_idx" ON "DiklatSubmission"("trainingId", "submittedAt");
CREATE INDEX "DiklatSubmission_taskTypeId_submittedAt_idx" ON "DiklatSubmission"("taskTypeId", "submittedAt");
CREATE INDEX "DiklatSubmission_institution_submittedAt_idx" ON "DiklatSubmission"("institution", "submittedAt");
CREATE INDEX "DiklatSubmission_status_submittedAt_idx" ON "DiklatSubmission"("status", "submittedAt");

ALTER TABLE "DiklatTaskType" ADD CONSTRAINT "DiklatTaskType_trainingId_fkey"
    FOREIGN KEY ("trainingId") REFERENCES "DiklatTraining"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiklatDocument" ADD CONSTRAINT "DiklatDocument_trainingId_fkey"
    FOREIGN KEY ("trainingId") REFERENCES "DiklatTraining"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiklatDocument" ADD CONSTRAINT "DiklatDocument_driveFileId_fkey"
    FOREIGN KEY ("driveFileId") REFERENCES "DiklatDriveFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiklatSubmission" ADD CONSTRAINT "DiklatSubmission_trainingId_fkey"
    FOREIGN KEY ("trainingId") REFERENCES "DiklatTraining"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiklatSubmission" ADD CONSTRAINT "DiklatSubmission_taskTypeId_fkey"
    FOREIGN KEY ("taskTypeId") REFERENCES "DiklatTaskType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiklatSubmission" ADD CONSTRAINT "DiklatSubmission_driveFileId_fkey"
    FOREIGN KEY ("driveFileId") REFERENCES "DiklatDriveFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
