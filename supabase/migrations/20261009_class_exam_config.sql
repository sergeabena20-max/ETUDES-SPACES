CREATE TABLE IF NOT EXISTS public."ClassExamConfig" (
  "id" text PRIMARY KEY,
  "academicLevelId" text NOT NULL UNIQUE,
  "exercisesEnabled" boolean NOT NULL DEFAULT true,
  "pastExamsEnabled" boolean NOT NULL DEFAULT false,
  "mockExamsEnabled" boolean NOT NULL DEFAULT false,
  "isExamClass" boolean NOT NULL DEFAULT false,
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "ClassExamConfig_academicLevelId_fkey"
    FOREIGN KEY ("academicLevelId") REFERENCES public."AcademicLevel"("id") ON DELETE CASCADE
);
ALTER TABLE public."ClassExamConfig" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."ClassExamConfig" FROM anon, authenticated;
GRANT ALL ON TABLE public."ClassExamConfig" TO service_role;
