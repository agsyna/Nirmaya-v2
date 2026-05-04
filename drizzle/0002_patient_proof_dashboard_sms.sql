ALTER TABLE "patients" ADD COLUMN "id_proof_file_url" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "has_cghs" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "cghs_file_url" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "has_echs" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "echs_file_url" text;--> statement-breakpoint
ALTER TYPE "public"."sms_event" ADD VALUE IF NOT EXISTS 'patient_updated';
