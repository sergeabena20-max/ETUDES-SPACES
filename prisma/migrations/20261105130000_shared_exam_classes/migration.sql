-- One exam record can be visible in several school classes.
CREATE TABLE IF NOT EXISTS "ExamAcademicLevel" (
  "examId" TEXT NOT NULL,
  "academicLevelId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamAcademicLevel_pkey" PRIMARY KEY ("examId", "academicLevelId"),
  CONSTRAINT "ExamAcademicLevel_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExamAcademicLevel_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ExamAcademicLevel_academicLevelId_idx" ON "ExamAcademicLevel"("academicLevelId");

-- Preserve every existing class assignment before the application switches to the join table.
INSERT INTO "ExamAcademicLevel" ("examId", "academicLevelId")
SELECT "id", "academicLevelId" FROM "Exam"
WHERE "academicLevelId" IS NOT NULL
ON CONFLICT ("examId", "academicLevelId") DO NOTHING;

-- Merge old duplicate copies that point to the same PDF and represent the same paper.
-- Keep the oldest record as canonical; transfer its class associations and references first.
WITH ranked AS (
  SELECT "id",
         FIRST_VALUE("id") OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS canonical_id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS rn
  FROM "Exam"
  WHERE "fileUrl" IS NOT NULL AND "category" <> 'A_CLASSER'
),
dupes AS (SELECT "id", canonical_id FROM ranked WHERE rn > 1)
INSERT INTO "ExamAcademicLevel" ("examId", "academicLevelId")
SELECT d.canonical_id, eal."academicLevelId"
FROM dupes d
JOIN "ExamAcademicLevel" eal ON eal."examId" = d."id"
ON CONFLICT ("examId", "academicLevelId") DO NOTHING;

-- Repoint dependent rows before removing duplicate records.
WITH ranked AS (
  SELECT "id",
         FIRST_VALUE("id") OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS canonical_id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS rn
  FROM "Exam"
  WHERE "fileUrl" IS NOT NULL AND "category" <> 'A_CLASSER'
),
dupes AS (SELECT "id", canonical_id FROM ranked WHERE rn > 1)
UPDATE "ExamSolution" s SET "examId" = d.canonical_id
FROM dupes d WHERE s."examId" = d."id"
AND NOT EXISTS (SELECT 1 FROM "ExamSolution" x WHERE x."examId" = d.canonical_id);

-- Favorites, analytics and comments are moved; purchases/payments are intentionally
-- not auto-merged because they are financial records and need manual review.
WITH ranked AS (
  SELECT "id",
         FIRST_VALUE("id") OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS canonical_id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS rn
  FROM "Exam"
  WHERE "fileUrl" IS NOT NULL AND "category" <> 'A_CLASSER'
),
dupes AS (SELECT "id", canonical_id FROM ranked WHERE rn > 1)
UPDATE "Favorite" f SET "examId" = d.canonical_id
FROM dupes d WHERE f."examId" = d."id"
AND NOT EXISTS (SELECT 1 FROM "Favorite" x WHERE x."userId" = f."userId" AND x."examId" = d.canonical_id AND x."courseId" IS NULL);

WITH ranked AS (
  SELECT "id",
         FIRST_VALUE("id") OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS canonical_id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS rn
  FROM "Exam"
  WHERE "fileUrl" IS NOT NULL AND "category" <> 'A_CLASSER'
),
dupes AS (SELECT "id", canonical_id FROM ranked WHERE rn > 1)
UPDATE "Comment" c SET "examId" = d.canonical_id FROM dupes d WHERE c."examId" = d."id";

WITH ranked AS (
  SELECT "id",
         FIRST_VALUE("id") OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS canonical_id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS rn
  FROM "Exam"
  WHERE "fileUrl" IS NOT NULL AND "category" <> 'A_CLASSER'
),
dupes AS (SELECT "id", canonical_id FROM ranked WHERE rn > 1)
UPDATE "AnalyticsEvent" a SET "examId" = d.canonical_id FROM dupes d WHERE a."examId" = d."id";

-- Remove duplicate class links and duplicate paper rows only when there are no
-- purchases/payments attached. Financially referenced duplicates remain for review.
WITH ranked AS (
  SELECT "id",
         FIRST_VALUE("id") OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS canonical_id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE("fileUrl", ''), LOWER(TRIM("title")), COALESCE("category", ''),
                        COALESCE("year", 0), COALESCE("subjectId", ''), COALESCE("programId", '')
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS rn
  FROM "Exam"
  WHERE "fileUrl" IS NOT NULL AND "category" <> 'A_CLASSER'
),
dupes AS (SELECT "id", canonical_id FROM ranked WHERE rn > 1)
DELETE FROM "Exam" e USING dupes d
WHERE e."id" = d."id"
AND NOT EXISTS (SELECT 1 FROM "ExamPurchase" p WHERE p."examId" = e."id")
AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."examId" = e."id");

