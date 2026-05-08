import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6366f1"),
    defaultHourlyRate: integer("default_hourly_rate").notNull(),
    note: text("note"),
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

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
export type MonthlyRate = typeof monthlyRates.$inferSelect;
export type NewMonthlyRate = typeof monthlyRates.$inferInsert;
