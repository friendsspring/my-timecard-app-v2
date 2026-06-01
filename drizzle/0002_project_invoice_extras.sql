CREATE TABLE IF NOT EXISTS "project_invoice_extras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"year_month" text NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_invoice_extras_year_month_format" CHECK ("project_invoice_extras"."year_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "project_invoice_extras_label_length" CHECK (char_length("project_invoice_extras"."label") between 1 and 120),
	CONSTRAINT "project_invoice_extras_amount_range" CHECK ("project_invoice_extras"."amount" >= 0 and "project_invoice_extras"."amount" <= 100000000)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_invoice_extras" ADD CONSTRAINT "project_invoice_extras_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_invoice_extras_project_month" ON "project_invoice_extras" USING btree ("project_id","year_month");