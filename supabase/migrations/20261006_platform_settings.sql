CREATE TABLE IF NOT EXISTS public."PlatformSetting" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "label" text NOT NULL,
  "description" text,
  "category" text NOT NULL DEFAULT 'GENERAL',
  "type" text NOT NULL DEFAULT 'STRING',
  "value" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "PlatformSetting_category_enabled_idx" ON public."PlatformSetting" ("category","enabled");
ALTER TABLE public."PlatformSetting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PlatformSetting" FROM anon, authenticated;
GRANT ALL ON TABLE public."PlatformSetting" TO service_role;

INSERT INTO public."PlatformSetting" ("id","key","label","description","category","type","value","enabled")
VALUES
  ('setting-quiz-timer-enabled','QUIZ_TIMER_ENABLED','Chronomètre des tests','Afficher un chronomètre pendant les tests.','QUIZZES','BOOLEAN','true',true),
  ('setting-quiz-timer-seconds','QUIZ_TIMER_SECONDS','Durée par défaut des tests','Durée maximale en secondes. Mettre 0 pour une durée illimitée.','QUIZZES','NUMBER','1800',true)
ON CONFLICT ("key") DO NOTHING;
