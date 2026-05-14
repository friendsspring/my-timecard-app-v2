import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const billingClients = pgTable(
  "billing_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    issuerName: text("issuer_name").notNull(),
    taxMode: text("tax_mode", { enum: ["inclusive", "exclusive"] }).notNull(),
    pdfFilenameTemplate: text("pdf_filename_template").notNull(),
    bankInfo: text("bank_info"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    nameLength: check(
      "billing_clients_name_length",
      sql`char_length(${t.name}) between 1 and 120`,
    ),
    subjectLength: check(
      "billing_clients_subject_length",
      sql`char_length(${t.subject}) between 1 and 500`,
    ),
    issuerLength: check(
      "billing_clients_issuer_length",
      sql`char_length(${t.issuerName}) between 1 and 120`,
    ),
    taxModeCheck: check(
      "billing_clients_tax_mode",
      sql`${t.taxMode} in ('inclusive', 'exclusive')`,
    ),
    templateLength: check(
      "billing_clients_template_length",
      sql`char_length(${t.pdfFilenameTemplate}) between 1 and 200`,
    ),
    userNameIdx: index("billing_clients_user_name").on(t.userId, t.name),
  }),
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6366f1"),
    defaultHourlyRate: integer("default_hourly_rate").notNull(),
    note: text("note"),
    billingClientId: uuid("billing_client_id").references(() => billingClients.id, {
      onDelete: "set null",
    }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    nameLength: check("projects_name_length", sql`char_length(${t.name}) between 1 and 80`),
    colorFormat: check("projects_color_format", sql`${t.color} ~ '^#[0-9a-fA-F]{6}$'`),
    rateRange: check(
      "projects_default_rate_range",
      sql`${t.defaultHourlyRate} >= 0 and ${t.defaultHourlyRate} <= 1000000`,
    ),
  }),
);

export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    memo: text("memo"),
    source: text("source", { enum: ["live", "manual"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    timeOrder: check(
      "time_entries_time_order",
      sql`${t.endedAt} is null or ${t.endedAt} > ${t.startedAt}`,
    ),
    oneOpen: uniqueIndex("one_open_entry_per_user")
      .on(t.userId)
      .where(sql`${t.endedAt} is null and ${t.deletedAt} is null`),
  }),
);

export const monthlyRates = pgTable(
  "monthly_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    hourlyRate: integer("hourly_rate").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    yearMonthFormat: check(
      "monthly_rates_year_month_format",
      sql`${t.yearMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
    ),
    rateRange: check(
      "monthly_rates_rate_range",
      sql`${t.hourlyRate} >= 0 and ${t.hourlyRate} <= 1000000`,
    ),
    projectMonth: uniqueIndex("monthly_rates_project_month").on(t.projectId, t.yearMonth),
  }),
);

export type BillingClient = typeof billingClients.$inferSelect;
export type NewBillingClient = typeof billingClients.$inferInsert;
export type TaxMode = "inclusive" | "exclusive";
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
export type MonthlyRate = typeof monthlyRates.$inferSelect;
export type NewMonthlyRate = typeof monthlyRates.$inferInsert;
