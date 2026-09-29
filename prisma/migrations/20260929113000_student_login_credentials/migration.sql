ALTER TABLE "CoreUser"
ADD COLUMN "passwordChangeRecommended" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CoreStudent"
ADD COLUMN "nis" TEXT;

CREATE UNIQUE INDEX "CoreStudent_nis_key" ON "CoreStudent"("nis");