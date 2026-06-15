CREATE TYPE "public"."time_log_source" AS ENUM('manual', 'biometric');--> statement-breakpoint
CREATE TYPE "public"."holiday_type" AS ENUM('regular', 'special_non_working');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"time_in" text NOT NULL,
	"time_out" text NOT NULL,
	"break_minutes" integer DEFAULT 60 NOT NULL,
	"work_days" text[] DEFAULT '{"mon","tue","wed","thu","fri"}' NOT NULL,
	"is_night_shift" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "time_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"time_in" timestamp,
	"time_out" timestamp,
	"source" "time_log_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "holiday" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"type" "holiday_type" DEFAULT 'regular' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "holiday_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"ot_rate" numeric(5, 2) DEFAULT '1.25' NOT NULL,
	"rest_day_rate" numeric(5, 2) DEFAULT '1.30' NOT NULL,
	"rest_day_ot_rate" numeric(5, 2) DEFAULT '1.69' NOT NULL,
	"night_diff_rate" numeric(5, 2) DEFAULT '0.10' NOT NULL,
	"regular_holiday_rate" numeric(5, 2) DEFAULT '2.00' NOT NULL,
	"special_holiday_rate" numeric(5, 2) DEFAULT '1.30' NOT NULL,
	"working_days_per_month" integer DEFAULT 22 NOT NULL,
	"work_hours_per_day" numeric(4, 2) DEFAULT '8' NOT NULL,
	"late_grace_period_minutes" integer DEFAULT 0 NOT NULL,
	"night_diff_start" text DEFAULT '22:00' NOT NULL,
	"night_diff_end" text DEFAULT '06:00' NOT NULL,
	"thirteenth_month_every_cutoff" boolean DEFAULT false NOT NULL,
	"sss_enabled" boolean DEFAULT true NOT NULL,
	"philhealth_enabled" boolean DEFAULT true NOT NULL,
	"pagibig_enabled" boolean DEFAULT true NOT NULL,
	"tax_enabled" boolean DEFAULT true NOT NULL,
	"philhealth_rate" numeric(6, 4) DEFAULT '0.0275' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "schedule_id" uuid;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "deduct_sss" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "deduct_philhealth" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "deduct_pagibig" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "deduct_tax" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "late_per_minute_override" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_schedule_id_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_time_log_unique" ON "time_log" ("employee_id","log_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_time_log_employee_id" ON "time_log" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_time_log_date" ON "time_log" ("log_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_holiday_date" ON "holiday" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employee_schedule_id" ON "employee" ("schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employee_active" ON "employee" ("is_active");
