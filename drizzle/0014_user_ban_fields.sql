ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_reason" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_expires" timestamp;
