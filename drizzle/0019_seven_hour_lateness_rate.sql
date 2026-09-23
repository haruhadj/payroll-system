-- The agreed late-deduction formula is:
-- daily rate / 7 hours / 60 minutes.
-- Preserve any deliberately customized shift; only update the former default.
ALTER TABLE "payroll_settings"
  ALTER COLUMN "standard_time_out" SET DEFAULT '15:00';

UPDATE "payroll_settings"
  SET "standard_time_out" = '15:00'
  WHERE "standard_time_in" = '08:00'
    AND "standard_time_out" = '16:00';
