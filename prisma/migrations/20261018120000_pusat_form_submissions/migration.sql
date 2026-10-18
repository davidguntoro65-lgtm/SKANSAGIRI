CREATE TABLE "PusatFormSubmission" (
    "id" TEXT NOT NULL,
    "formKey" TEXT NOT NULL,
    "studentId" TEXT,
    "studentNis" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "studentClass" TEXT NOT NULL DEFAULT '',
    "guardianName" TEXT NOT NULL,
    "guardianRelationship" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BARU',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PusatFormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PusatFormSubmission_formKey_createdAt_idx"
    ON "PusatFormSubmission"("formKey", "createdAt");
CREATE INDEX "PusatFormSubmission_status_createdAt_idx"
    ON "PusatFormSubmission"("status", "createdAt");
CREATE INDEX "PusatFormSubmission_studentId_idx"
    ON "PusatFormSubmission"("studentId");

ALTER TABLE "PusatFormSubmission"
    ADD CONSTRAINT "PusatFormSubmission_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "CoreStudent"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
