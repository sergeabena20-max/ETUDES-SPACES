ALTER TABLE public."ClassExamConfig"
  ADD COLUMN IF NOT EXISTS "continuousAssessmentEnabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "normalSessionEnabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "btsDutExamEnabled" boolean NOT NULL DEFAULT false;
