CREATE TYPE "public"."leave_type" AS ENUM('vacation', 'sick', 'emergency', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."loan_type" AS ENUM('sss', 'pagibig', 'company', 'other');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('active', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_credit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "leave_type" NOT NULL,
	"balance" numeric(6, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "leave_type" NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"days" numeric(5, 2) NOT NULL,
	"status" "leave_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"approved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "loan_type" DEFAULT 'company' NOT NULL,
	"principal" numeric(12, 2) NOT NULL,
	"balance" numeric(12, 2) NOT NULL,
	"amortization" numeric(12, 2) NOT NULL,
	"status" "loan_status" DEFAULT 'active' NOT NULL,
	"start_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leave_credit" ADD CONSTRAINT "leave_credit_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_leave_credit_unique" ON "leave_credit" ("employee_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_leave_credit_employee_id" ON "leave_credit" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_leave_request_employee_id" ON "leave_request" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_leave_request_status" ON "leave_request" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_leave_request_dates" ON "leave_request" ("date_from","date_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_loan_employee_id" ON "loan" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_loan_status" ON "loan" ("status");
