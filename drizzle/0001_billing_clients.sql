CREATE TABLE IF NOT EXISTS "billing_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"issuer_name" text NOT NULL,
	"tax_mode" text NOT NULL,
	"pdf_filename_template" text NOT NULL,
	"bank_info" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_clients_name_length" CHECK (char_length("billing_clients"."name") between 1 and 120),
	CONSTRAINT "billing_clients_subject_length" CHECK (char_length("billing_clients"."subject") between 1 and 500),
	CONSTRAINT "billing_clients_issuer_length" CHECK (char_length("billing_clients"."issuer_name") between 1 and 120),
	CONSTRAINT "billing_clients_tax_mode" CHECK ("billing_clients"."tax_mode" in ('inclusive', 'exclusive')),
	CONSTRAINT "billing_clients_template_length" CHECK (char_length("billing_clients"."pdf_filename_template") between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "billing_client_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_clients_user_name" ON "billing_clients" USING btree ("user_id","name");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_billing_client_id_billing_clients_id_fk" FOREIGN KEY ("billing_client_id") REFERENCES "public"."billing_clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
