CREATE TABLE IF NOT EXISTS "monthly_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"year_month" text NOT NULL,
	"hourly_rate" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_rates_year_month_format" CHECK ("monthly_rates"."year_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "monthly_rates_rate_range" CHECK ("monthly_rates"."hourly_rate" >= 0 and "monthly_rates"."hourly_rate" <= 1000000)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"default_hourly_rate" integer NOT NULL,
	"note" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_name_length" CHECK (char_length("projects"."name") between 1 and 80),
	CONSTRAINT "projects_color_format" CHECK ("projects"."color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "projects_default_rate_range" CHECK ("projects"."default_hourly_rate" >= 0 and "projects"."default_hourly_rate" <= 1000000)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"memo" text,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "time_entries_time_order" CHECK ("time_entries"."ended_at" is null or "time_entries"."ended_at" > "time_entries"."started_at")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monthly_rates" ADD CONSTRAINT "monthly_rates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "monthly_rates_project_month" ON "monthly_rates" USING btree ("project_id","year_month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "one_open_entry_per_user" ON "time_entries" USING btree ("user_id") WHERE "time_entries"."ended_at" is null and "time_entries"."deleted_at" is null;