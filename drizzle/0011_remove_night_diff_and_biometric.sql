ALTER TABLE "payslip" DROP COLUMN IF EXISTS "night_diff_pay";--> statement-breakpoint
ALTER TABLE "schedule" DROP COLUMN IF EXISTS "is_night_shift";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "night_diff_rate";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "night_diff_start";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "night_diff_end";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "night_diff_amount";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "night_diff_actual_rate";
