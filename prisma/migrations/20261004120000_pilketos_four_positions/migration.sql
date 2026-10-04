CREATE TYPE "PilketosVotePosition" AS ENUM (
  'KETUA_UMUM',
  'KETUA_1',
  'KETUA_3',
  'KETUA_4',
  'LEGACY_X',
  'LEGACY_XI'
);

ALTER TABLE "PilketosVote"
ADD COLUMN "position" "PilketosVotePosition" NOT NULL DEFAULT 'LEGACY_X';

UPDATE "PilketosVote"
SET "position" = 'LEGACY_XI'
WHERE "grade" = 'XI';

ALTER TABLE "PilketosVote"
ALTER COLUMN "position" DROP DEFAULT;

DROP INDEX "PilketosVote_electionId_studentId_grade_key";

CREATE UNIQUE INDEX "PilketosVote_electionId_studentId_position_key"
ON "PilketosVote"("electionId", "studentId", "position");