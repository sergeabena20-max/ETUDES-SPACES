CREATE TABLE IF NOT EXISTS public."PasswordResetToken" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" text NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "tokenHash" text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"
  ON public."PasswordResetToken" ("userId");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx"
  ON public."PasswordResetToken" ("expiresAt");

ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PasswordResetToken" FROM anon, authenticated;
