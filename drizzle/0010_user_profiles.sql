-- User profiles (About, Emergency Contact) + document links (Files tab).
CREATE TABLE IF NOT EXISTS "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"username" text,
	"contact_no1" text,
	"contact_no2" text,
	"address" text,
	"biometric_id" text,
	"ice_name" text,
	"ice_contact" text,
	"ice_email" text,
	"ice_address" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_document" ADD CONSTRAINT "user_document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_document_user_id" ON "user_document" ("user_id");
