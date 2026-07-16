-- Replace the biometric time-clock system (schedules, time logs, holiday
-- calendar) with an exception-based absence log. School/teaching staff are
-- monthly-paid, so payroll now assumes every scheduled day is worked unless
-- an absence row exists for that employee/date.
DROP TABLE IF EXISTS "time_log" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "schedule" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "holiday" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "time_log_source";--> statement-breakpoint
DROP TYPE IF EXISTS "holiday_type";--> statement-breakpoint
ALTER TABLE "employee" DROP COLUMN IF EXISTS "schedule_id";--> statement-breakpoint
ALTER TABLE "employee" DROP COLUMN IF EXISTS "late_per_minute_override";--> statement-breakpoint
ALTER TABLE "user_profile" DROP COLUMN IF EXISTS "biometric_id";--> statement-breakpoint
ALTER TABLE "payslip" DROP COLUMN IF EXISTS "rest_day_pay";--> statement-breakpoint
ALTER TABLE "payslip" DROP COLUMN IF EXISTS "holiday_pay";--> statement-breakpoint
ALTER TABLE "payslip" DROP COLUMN IF EXISTS "late_deduction";--> statement-breakpoint
ALTER TABLE "payslip" DROP COLUMN IF EXISTS "late_minutes";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "rest_day_rate";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "regular_holiday_rate";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "special_holiday_rate";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "work_hours_per_day";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "late_grace_period_minutes";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "holiday_amount";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "holiday_actual_rate";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "late_amount_per_minute";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "sunday_holiday_paid";--> statement-breakpoint
ALTER TABLE "payroll_settings" DROP COLUMN IF EXISTS "enable_clock_in_out";--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "work_days" text[] DEFAULT '{"mon","tue","wed","thu","fri"}' NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "absence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"reason" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "absence" ADD CONSTRAINT "absence_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence" ADD CONSTRAINT "absence_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_absence_unique" ON "absence" ("employee_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_absence_employee_id" ON "absence" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_absence_date" ON "absence" ("date");
