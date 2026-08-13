-- Prevent duplicate payroll periods with the exact same date range. Any
-- pre-existing duplicates must be cleaned up before this migration runs, or
-- the CREATE UNIQUE INDEX below will fail.
--
-- A non-unique index with this name may already exist from an earlier
-- drizzle-kit push, so it must be dropped first or CREATE UNIQUE INDEX
-- IF NOT EXISTS will silently no-op and leave duplicates unenforced.

DROP INDEX IF EXISTS "idx_payroll_period_dates";

CREATE UNIQUE INDEX IF NOT EXISTS "idx_payroll_period_dates"
  ON "payroll_period" ("date_from", "date_to");
