import "server-only";

import { and, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { jstMonthRangeToUtc } from "@/lib/time/jst";
import { computeMonthlySummary, type MonthlySummary } from "@/lib/billing/calc";

export async function getMonthlySummary(yearMonth: string): Promise<MonthlySummary> {
  const user = await requireUser();
  const { start, end } = jstMonthRangeToUtc(yearMonth);

  const [projects, entries, rates] = await Promise.all([
    db.select().from(schema.projects).where(eq(schema.projects.userId, user.id)),
    db
      .select()
      .from(schema.timeEntries)
      .where(
        and(
          eq(schema.timeEntries.userId, user.id),
          isNull(schema.timeEntries.deletedAt),
          isNotNull(schema.timeEntries.endedAt),
          lt(schema.timeEntries.startedAt, end),
          or(
            isNull(schema.timeEntries.endedAt),
            gt(schema.timeEntries.endedAt, start),
          )!,
        ),
      ),
    db
      .select()
      .from(schema.monthlyRates)
      .where(
        and(
          eq(schema.monthlyRates.userId, user.id),
          eq(schema.monthlyRates.yearMonth, yearMonth),
        ),
      ),
  ]);

  return computeMonthlySummary({
    yearMonth,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      defaultHourlyRate: p.defaultHourlyRate,
    })),
    entries: entries.map((e) => ({
      id: e.id,
      projectId: e.projectId,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
    })),
    rates: rates.map((r) => ({
      projectId: r.projectId,
      yearMonth: r.yearMonth,
      hourlyRate: r.hourlyRate,
    })),
  });
}
