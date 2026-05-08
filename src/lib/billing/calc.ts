import { msToHours } from "@/lib/format";
import { jstMonthRangeToUtc } from "@/lib/time/jst";

export type EntryForBilling = {
  id: string;
  projectId: string;
  startedAt: Date;
  endedAt: Date | null;
};

export type ProjectForBilling = {
  id: string;
  name: string;
  color: string;
  defaultHourlyRate: number;
};

export type MonthlyRateForBilling = {
  projectId: string;
  yearMonth: string;
  hourlyRate: number;
};

export type ProjectSummary = {
  projectId: string;
  projectName: string;
  color: string;
  hours: number;
  appliedRate: number;
  rateSource: "default" | "monthly";
  amount: number;
  entriesCount: number;
};

export type MonthlySummary = {
  yearMonth: string;
  totalHours: number;
  totalAmount: number;
  perProject: ProjectSummary[];
};

/**
 * Compute the milliseconds an entry overlaps with the given [startUtc, endUtc) range.
 * Open entries (ended_at = null) are ignored (returns 0).
 */
export function overlapMs(entry: EntryForBilling, start: Date, end: Date): number {
  if (!entry.endedAt) return 0;
  const s = Math.max(entry.startedAt.getTime(), start.getTime());
  const e = Math.min(entry.endedAt.getTime(), end.getTime());
  return Math.max(0, e - s);
}

export function computeMonthlySummary(params: {
  yearMonth: string;
  projects: ProjectForBilling[];
  entries: EntryForBilling[];
  rates: MonthlyRateForBilling[];
}): MonthlySummary {
  const { yearMonth, projects, entries, rates } = params;
  const { start, end } = jstMonthRangeToUtc(yearMonth);

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const rateMap = new Map(
    rates.filter((r) => r.yearMonth === yearMonth).map((r) => [r.projectId, r.hourlyRate]),
  );

  type Bucket = { ms: number; entries: number };
  const buckets = new Map<string, Bucket>();

  for (const entry of entries) {
    const ms = overlapMs(entry, start, end);
    if (ms <= 0) continue;
    const bucket = buckets.get(entry.projectId) ?? { ms: 0, entries: 0 };
    bucket.ms += ms;
    bucket.entries += 1;
    buckets.set(entry.projectId, bucket);
  }

  const perProject: ProjectSummary[] = [];
  for (const [projectId, bucket] of buckets) {
    const project = projectMap.get(projectId);
    if (!project) continue;
    const monthly = rateMap.get(projectId);
    const appliedRate = monthly ?? project.defaultHourlyRate;
    const rateSource: ProjectSummary["rateSource"] = monthly !== undefined ? "monthly" : "default";
    const hours = msToHours(bucket.ms);
    const amount = Math.round(hours * appliedRate);
    perProject.push({
      projectId,
      projectName: project.name,
      color: project.color,
      hours,
      appliedRate,
      rateSource,
      amount,
      entriesCount: bucket.entries,
    });
  }

  perProject.sort((a, b) => b.hours - a.hours);

  const totalHours =
    Math.round(perProject.reduce((acc, p) => acc + p.hours, 0) * 100) / 100;
  const totalAmount = perProject.reduce((acc, p) => acc + p.amount, 0);

  return { yearMonth, totalHours, totalAmount, perProject };
}
