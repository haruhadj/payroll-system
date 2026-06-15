-- Settings parity: tax frequency, flat amounts + actual-rate toggles, company profile.
DO $$ BEGIN
	CREATE TYPE "tax_frequency" AS ENUM('daily', 'weekly', 'semi_monthly', 'monthly');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "admin_email" text;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "hr_email" text;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "withholding_tax_frequency" "tax_frequency" DEFAULT 'semi_monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "overtime_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "overtime_actual_rate" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "holiday_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "holiday_actual_rate" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "night_diff_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "night_diff_actual_rate" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "leave_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "leave_actual_rate" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "late_amount_per_minute" numeric(10, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "sunday_holiday_paid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN IF NOT EXISTS "enable_clock_in_out" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_profile" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"address" text,
	"email" text,
	"phone" text,
	"website" text,
	"logo_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
