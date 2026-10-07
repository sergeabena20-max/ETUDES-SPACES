ALTER TABLE public."Quiz"
  ADD COLUMN IF NOT EXISTS "timerEnabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "timerSeconds" integer NOT NULL DEFAULT 1800;

UPDATE public."Quiz"
SET "timerEnabled" = true,
    "timerSeconds" = 1800
WHERE "timerSeconds" IS NULL OR "timerSeconds" <= 0;

ALTER TABLE public."Quiz"
  ADD CONSTRAINT "Quiz_timerSeconds_check" CHECK ("timerSeconds" >= 0 AND "timerSeconds" <= 86400);
