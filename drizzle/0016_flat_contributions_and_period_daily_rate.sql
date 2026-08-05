-- Company payroll rules: flat statutory contributions withheld on a specific
-- cutoff, and an absence/late daily rate derived from the work days actually
-- scheduled in the cutoff rather than a fixed monthly divisor.

DO $$ BEGIN
  CREATE TYPE "contribution_mode" AS ENUM ('statutory', 'flat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "contribution_cutoff" AS ENUM ('first', 'second', 'every');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "daily_rate_basis" AS ENUM ('monthly', 'period');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "payroll_settings"
  ADD COLUMN IF NOT EXISTS "daily_rate_basis" "daily_rate_basis" NOT NULL DEFAULT 'period',
  ADD COLUMN IF NOT EXISTS "contribution_mode" "contribution_mode" NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS "sss_amount" numeric(10, 2) NOT NULL DEFAULT '350',
  ADD COLUMN IF NOT EXISTS "philhealth_amount" numeric(10, 2) NOT NULL DEFAULT '250',
  ADD COLUMN IF NOT EXISTS "pagibig_amount" numeric(10, 2) NOT NULL DEFAULT '200',
  ADD COLUMN IF NOT EXISTS "sss_cutoff" "contribution_cutoff" NOT NULL DEFAULT 'first',
  ADD COLUMN IF NOT EXISTS "philhealth_cutoff" "contribution_cutoff" NOT NULL DEFAULT 'second',
  ADD COLUMN IF NOT EXISTS "pagibig_cutoff" "contribution_cutoff" NOT NULL DEFAULT 'second';

-- The per-minute late rate divides the daily rate by the configured shift
-- span, so the shift must be the real 8 hours (08:00-16:00), not the old
-- 9-hour 08:00-17:00 placeholder. Guarded on the old value so a replay of
-- this migration never overwrites a shift length set deliberately later.
ALTER TABLE "payroll_settings"
  ALTER COLUMN "standard_time_out" SET DEFAULT '16:00';

UPDATE "payroll_settings"
  SET "standard_time_out" = '16:00'
  WHERE "standard_time_out" = '17:00';
