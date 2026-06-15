ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "ot_pay" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "night_diff_pay" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "rest_day_pay" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "holiday_pay" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "late_deduction" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "loan_deduction" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "thirteenth_month_pay" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "days_worked" numeric(6, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "late_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN IF NOT EXISTS "ot_hours" numeric(6, 2) DEFAULT '0' NOT NULL;
