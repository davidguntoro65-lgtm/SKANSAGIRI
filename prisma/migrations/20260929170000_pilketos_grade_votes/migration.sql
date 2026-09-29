CREATE TYPE "PilketosCandidateGrade" AS ENUM ('X', 'XI');

ALTER TABLE "PilketosCandidate"
ADD COLUMN "grade" "PilketosCandidateGrade" NOT NULL DEFAULT 'X';

ALTER TABLE "PilketosVote"
ADD COLUMN "grade" "PilketosCandidateGrade" NOT NULL DEFAULT 'X';

DROP INDEX "PilketosCandidate_electionId_candidateNo_key";
CREATE UNIQUE INDEX "PilketosCandidate_electionId_grade_candidateNo_key"
ON "PilketosCandidate"("electionId", "grade", "candidateNo");

DROP INDEX "PilketosCandidate_electionId_createdAt_idx";
CREATE INDEX "PilketosCandidate_electionId_grade_createdAt_idx"
ON "PilketosCandidate"("electionId", "grade", "createdAt");

DROP INDEX "PilketosVote_electionId_studentId_key";
CREATE UNIQUE INDEX "PilketosVote_electionId_studentId_grade_key"
ON "PilketosVote"("electionId", "studentId", "grade");

CREATE INDEX "PilketosVote_electionId_studentId_idx"
ON "PilketosVote"("electionId", "studentId");