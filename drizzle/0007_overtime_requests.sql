-- Overtime requests: filed by employees, approved by admin/HR.
CREATE TABLE IF NOT EXISTS "overtime_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"time_from" text NOT NULL,
	"time_to" text NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"status" "leave_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"approved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "overtime_request" ADD CONSTRAINT "overtime_request_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_request" ADD CONSTRAINT "overtime_request_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_overtime_request_employee_id" ON "overtime_request" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_overtime_request_status" ON "overtime_request" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_overtime_request_date" ON "overtime_request" ("date");
