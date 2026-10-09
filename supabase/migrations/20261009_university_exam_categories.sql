ALTER TABLE public."ClassExamConfig"
  ADD COLUMN IF NOT EXISTS "continuousAssessmentEnabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "normalSessionEnabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "btsDutExamEnabled" boolean NOT NULL DEFAULT false;

UPDATE public."ClassExamConfig" c
SET "btsDutExamEnabled" = true,
    "continuousAssessmentEnabled" = true,
    "normalSessionEnabled" = true
FROM public."AcademicLevel" a
WHERE c."academicLevelId" = a.id
  AND a.kind = 'UNIVERSITAIRE'
  AND lower(a.name) IN ('niv2', 'niveau 2');
