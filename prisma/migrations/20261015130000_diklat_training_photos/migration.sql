CREATE TABLE "DiklatTrainingPhoto" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiklatTrainingPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiklatTrainingPhoto_driveFileId_key"
    ON "DiklatTrainingPhoto"("driveFileId");
CREATE INDEX "DiklatTrainingPhoto_trainingId_sortOrder_createdAt_idx"
    ON "DiklatTrainingPhoto"("trainingId", "sortOrder", "createdAt");

ALTER TABLE "DiklatTrainingPhoto"
    ADD CONSTRAINT "DiklatTrainingPhoto_trainingId_fkey"
    FOREIGN KEY ("trainingId") REFERENCES "DiklatTraining"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiklatTrainingPhoto"
    ADD CONSTRAINT "DiklatTrainingPhoto_driveFileId_fkey"
    FOREIGN KEY ("driveFileId") REFERENCES "DiklatDriveFile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "DiklatModuleSettings"
SET "maxFileSizeMb" = 40, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 1;
