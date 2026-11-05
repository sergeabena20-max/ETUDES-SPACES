-- Track the last successful heartbeat from the authenticated browser.
ALTER TABLE "public"."Session"
ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
