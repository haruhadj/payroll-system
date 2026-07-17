CREATE TYPE "public"."time_log_source" AS ENUM('manual', 'self');--> statement-breakpoint
CREATE TABLE "time_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"time_in" timestamp,
	"time_out" timestamp,
	"source" "time_log_source" DEFAULT 'manual' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_time_log_unique" ON "time_log" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "idx_time_log_employee_id" ON "time_log" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_time_log_date" ON "time_log" USING btree ("date");--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN "enable_clock_in_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN "standard_time_in" text DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN "standard_time_out" text DEFAULT '17:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN "late_grace_period_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD COLUMN "late_deduction_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN "late_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payslip" ADD COLUMN "late_deduction" numeric(12, 2) DEFAULT '0' NOT NULL;
