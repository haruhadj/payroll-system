-- Six-punch time logs: replace single time_in/time_out with AM/PM/OT segments.
ALTER TABLE "time_log" DROP COLUMN IF EXISTS "time_in";--> statement-breakpoint
ALTER TABLE "time_log" DROP COLUMN IF EXISTS "time_out";--> statement-breakpoint
ALTER TABLE "time_log" ADD COLUMN IF NOT EXISTS "am_in" timestamp;--> statement-breakpoint
ALTER TABLE "time_log" ADD COLUMN IF NOT EXISTS "am_out" timestamp;--> statement-breakpoint
ALTER TABLE "time_log" ADD COLUMN IF NOT EXISTS "pm_in" timestamp;--> statement-breakpoint
ALTER TABLE "time_log" ADD COLUMN IF NOT EXISTS "pm_out" timestamp;--> statement-breakpoint
ALTER TABLE "time_log" ADD COLUMN IF NOT EXISTS "ot_in" timestamp;--> statement-breakpoint
ALTER TABLE "time_log" ADD COLUMN IF NOT EXISTS "ot_out" timestamp;
