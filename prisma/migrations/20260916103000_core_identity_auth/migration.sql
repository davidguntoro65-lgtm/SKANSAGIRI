ALTER TABLE "Session" ADD COLUMN "coreUserId" TEXT;
ALTER TABLE "CoreUser" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "CoreUser" ADD COLUMN "activationTokenHash" TEXT;
ALTER TABLE "CoreUser" ADD COLUMN "activationExpiresAt" TIMESTAMP(3);

CREATE INDEX "Session_coreUserId_idx" ON "Session"("coreUserId");

ALTER TABLE "Session"
ADD CONSTRAINT "Session_coreUserId_fkey"
FOREIGN KEY ("coreUserId") REFERENCES "CoreUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;