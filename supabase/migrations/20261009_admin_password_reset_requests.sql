ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS "PasswordResetRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PasswordResetRequest_status_requestedAt_idx" ON "PasswordResetRequest"("status", "requestedAt");
CREATE INDEX IF NOT EXISTS "PasswordResetRequest_userId_status_idx" ON "PasswordResetRequest"("userId", "status");
