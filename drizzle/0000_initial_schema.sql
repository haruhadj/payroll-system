CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contractual');--> statement-breakpoint
CREATE TYPE "public"."payroll_status" AS ENUM('draft', 'processed', 'released');--> statement-breakpoint
CREATE TYPE "public"."payslip_status" AS ENUM('pending', 'approved', 'paid');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'hr', 'employee');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"employee_no" text NOT NULL,
	"department" text NOT NULL,
	"position" text NOT NULL,
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"basic_salary" numeric(12, 2) NOT NULL,
	"hired_at" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employee_employee_no_unique" UNIQUE("employee_no")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"status" "payroll_status" DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"basic_pay" numeric(12, 2) NOT NULL,
	"allowances" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gross_pay" numeric(12, 2) NOT NULL,
	"sss" numeric(10, 2) NOT NULL,
	"philhealth" numeric(10, 2) NOT NULL,
	"pagibig" numeric(10, 2) NOT NULL,
	"withholding_tax" numeric(10, 2) NOT NULL,
	"net_pay" numeric(12, 2) NOT NULL,
	"status" "payslip_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'employee' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_period_id_payroll_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_period"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_period" ADD CONSTRAINT "payroll_period_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip" ADD CONSTRAINT "payslip_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip" ADD CONSTRAINT "payslip_period_id_payroll_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_period"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_account_unique" ON "account" USING btree ("account_id","provider_id");--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_employee_user_id" ON "employee" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_employee_no" ON "employee" USING btree ("employee_no");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_feedback_unique" ON "feedback" USING btree ("employee_id","period_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_employee_id" ON "feedback" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_period_id" ON "feedback" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_period_status" ON "payroll_period" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payroll_period_dates" ON "payroll_period" USING btree ("date_from","date_to");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payslip_unique" ON "payslip" USING btree ("employee_id","period_id");--> statement-breakpoint
CREATE INDEX "idx_payslip_employee_id" ON "payslip" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_payslip_period_id" ON "payslip" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "idx_payslip_status" ON "payslip" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_email" ON "user" USING btree ("email");