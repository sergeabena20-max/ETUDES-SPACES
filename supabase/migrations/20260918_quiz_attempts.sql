-- Persist quiz attempts for student history and statistics.
CREATE TABLE IF NOT EXISTS public."QuizAttempt" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "quizId" text NOT NULL,
  "score" integer NOT NULL,
  "total" integer NOT NULL,
  "durationSec" integer,
  "answers" jsonb,
  "completedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE,
  CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "QuizAttempt_userId_completedAt_idx" ON public."QuizAttempt" ("userId","completedAt");
CREATE INDEX IF NOT EXISTS "QuizAttempt_quizId_completedAt_idx" ON public."QuizAttempt" ("quizId","completedAt");
ALTER TABLE public."QuizAttempt" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."QuizAttempt" FROM anon, authenticated;
GRANT ALL ON TABLE public."QuizAttempt" TO service_role;
