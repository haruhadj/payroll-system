ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "allowance" numeric(12, 2) DEFAULT '0' NOT NULL;
