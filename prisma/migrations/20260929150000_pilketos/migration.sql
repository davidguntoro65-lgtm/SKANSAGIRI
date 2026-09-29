CREATE TYPE "PilketosElectionStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

CREATE TABLE "PilketosElection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "PilketosElectionStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilketosElection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PilketosCandidate" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "candidateNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "photoData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilketosCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PilketosVote" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "userId" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilketosVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PilketosElection_id_key" ON "PilketosElection"("id");
CREATE INDEX "PilketosElection_status_academicYear_idx" ON "PilketosElection"("status", "academicYear");
CREATE UNIQUE INDEX "PilketosCandidate_electionId_candidateNo_key" ON "PilketosCandidate"("electionId", "candidateNo");
CREATE INDEX "PilketosCandidate_electionId_createdAt_idx" ON "PilketosCandidate"("electionId", "createdAt");
CREATE UNIQUE INDEX "PilketosVote_electionId_studentId_key" ON "PilketosVote"("electionId", "studentId");
CREATE INDEX "PilketosVote_candidateId_idx" ON "PilketosVote"("candidateId");

ALTER TABLE "PilketosCandidate" ADD CONSTRAINT "PilketosCandidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "PilketosElection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilketosVote" ADD CONSTRAINT "PilketosVote_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "PilketosElection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilketosVote" ADD CONSTRAINT "PilketosVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "PilketosCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilketosVote" ADD CONSTRAINT "PilketosVote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "CoreStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilketosVote" ADD CONSTRAINT "PilketosVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CoreUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;