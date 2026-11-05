-- Enforce one active login session per account.
-- Keep the newest non-expired session for each user and invalidate older sessions.
DELETE FROM "public"."Session"
WHERE "expiresAt" <= CURRENT_TIMESTAMP;

WITH ranked_sessions AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS position
  FROM "public"."Session"
)
DELETE FROM "public"."Session" AS session
USING ranked_sessions AS ranked
WHERE session."id" = ranked."id"
  AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Session_userId_key"
  ON "public"."Session" ("userId");
