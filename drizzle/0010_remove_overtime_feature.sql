DROP TABLE IF EXISTS "overtime_request" CASCADE;--> statement-breakpoint
ALTER TABLE "time_log" DROP COLUMN IF EXISTS "ot_in";--> statement-breakpoint
ALTER TABLE "time_log" DROP COLUMN IF EXISTS "ot_out";--> statement-breakpoint
ALTER TABLE "payslip" DROP COLUMN IF EXISTS "ot_pay";--> statement-breakpoint
ALTER TABLE "payslip" DROP COLUMN IF EXISTS "ot_hours";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "ot_rate";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "rest_day_ot_rate";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "overtime_amount";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "overtime_actual_rate";
