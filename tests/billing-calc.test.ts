import { describe, expect, it } from "vitest";
import { computeMonthlySummary, overlapMs } from "@/lib/billing/calc";
import { jstMonthRangeToUtc } from "@/lib/time/jst";

const project = {
  id: "p1",
  name: "Project A",
  color: "#6366f1",
  defaultHourlyRate: 5000,
};
const project2 = {
  id: "p2",
  name: "Project B",
  color: "#10b981",
  defaultHourlyRate: 3000,
};

function utc(iso: string) {
  return new Date(iso);
}

describe("overlapMs", () => {
  const { start, end } = jstMonthRangeToUtc("2026-05");

  it("ignores open entries", () => {
    expect(
      overlapMs(
        { id: "e", projectId: "p1", startedAt: start, endedAt: null },
        start,
        end,
      ),
    ).toBe(0);
  });

  it("returns 0 when entry is fully outside the range", () => {
    expect(
      overlapMs(
        {
          id: "e",
          projectId: "p1",
          startedAt: utc("2026-04-01T00:00:00Z"),
          endedAt: utc("2026-04-15T00:00:00Z"),
        },
        start,
        end,
      ),
    ).toBe(0);
  });

  it("clamps to start/end for partial overlap", () => {
    const result = overlapMs(
      {
        id: "e",
        projectId: "p1",
        startedAt: utc("2026-04-30T22:00:00Z"),
        endedAt: utc("2026-05-01T01:00:00Z"),
      },
      start,
      end,
    );
    // 2026-05-01 00:00 JST = 2026-04-30 15:00 UTC. Entry: 22:00-01:00 (3h).
    // Overlap with [start=2026-04-30T15:00Z, end=2026-05-31T15:00Z): 22:00-01:00 = 3h.
    expect(result).toBe(3 * 60 * 60 * 1000);
  });

  it("handles entry crossing month boundary at the end (May -> June)", () => {
    // JST 2026-05-31 23:00 ~ 2026-06-01 02:00 (crossing JST midnight)
    const startedAt = utc("2026-05-31T14:00:00Z"); // = JST 23:00
    const endedAt = utc("2026-05-31T17:00:00Z"); // = JST 02:00 (next day)

    const overlap = overlapMs({ id: "e", projectId: "p1", startedAt, endedAt }, start, end);
    // [start, end) = [2026-04-30T15:00Z, 2026-05-31T15:00Z) (May in JST)
    // Entry: 14:00 - 17:00 UTC. Overlap with end=15:00 UTC -> 14:00..15:00 = 1h.
    expect(overlap).toBe(60 * 60 * 1000);
  });
});

describe("computeMonthlySummary", () => {
  it("aggregates entries by project and applies default rate when no monthly override", () => {
    const summary = computeMonthlySummary({
      yearMonth: "2026-05",
      projects: [project, project2],
      entries: [
        {
          id: "1",
          projectId: "p1",
          startedAt: utc("2026-05-01T01:00:00Z"),
          endedAt: utc("2026-05-01T05:00:00Z"),
        },
        {
          id: "2",
          projectId: "p1",
          startedAt: utc("2026-05-02T01:00:00Z"),
          endedAt: utc("2026-05-02T03:00:00Z"),
        },
        {
          id: "3",
          projectId: "p2",
          startedAt: utc("2026-05-03T01:00:00Z"),
          endedAt: utc("2026-05-03T02:00:00Z"),
        },
      ],
      rates: [],
    });

    const p1 = summary.perProject.find((p) => p.projectId === "p1")!;
    const p2 = summary.perProject.find((p) => p.projectId === "p2")!;

    expect(p1.hours).toBe(6);
    expect(p1.appliedRate).toBe(5000);
    expect(p1.rateSource).toBe("default");
    expect(p1.amount).toBe(30_000);
    expect(p1.entriesCount).toBe(2);

    expect(p2.hours).toBe(1);
    expect(p2.appliedRate).toBe(3000);
    expect(p2.amount).toBe(3000);

    expect(summary.totalHours).toBeCloseTo(7, 5);
    expect(summary.totalAmount).toBe(33_000);
  });

  it("applies monthly rate override when present for the target month", () => {
    const summary = computeMonthlySummary({
      yearMonth: "2026-05",
      projects: [project],
      entries: [
        {
          id: "1",
          projectId: "p1",
          startedAt: utc("2026-05-01T01:00:00Z"),
          endedAt: utc("2026-05-01T05:00:00Z"),
        },
      ],
      rates: [
        { projectId: "p1", yearMonth: "2026-05", hourlyRate: 6000 },
        { projectId: "p1", yearMonth: "2026-04", hourlyRate: 9000 },
      ],
    });
    const p1 = summary.perProject[0]!;
    expect(p1.appliedRate).toBe(6000);
    expect(p1.rateSource).toBe("monthly");
    expect(p1.amount).toBe(24_000);
  });

  it("ignores open entries", () => {
    const summary = computeMonthlySummary({
      yearMonth: "2026-05",
      projects: [project],
      entries: [
        {
          id: "1",
          projectId: "p1",
          startedAt: utc("2026-05-10T01:00:00Z"),
          endedAt: null,
        },
      ],
      rates: [],
    });
    expect(summary.perProject).toHaveLength(0);
    expect(summary.totalHours).toBe(0);
    expect(summary.totalAmount).toBe(0);
  });

  it("splits an entry that crosses a JST month boundary into the correct month", () => {
    // JST 2026-04-30 22:00 -> 2026-05-01 02:00 (cross midnight)
    // start UTC = 2026-04-30T13:00Z, end UTC = 2026-04-30T17:00Z
    const startedAt = utc("2026-04-30T13:00:00Z");
    const endedAt = utc("2026-04-30T17:00:00Z");

    const may = computeMonthlySummary({
      yearMonth: "2026-05",
      projects: [project],
      entries: [{ id: "1", projectId: "p1", startedAt, endedAt }],
      rates: [],
    });
    // May starts at JST 2026-05-01T00:00 = UTC 2026-04-30T15:00. Overlap is 15:00..17:00 = 2h.
    expect(may.perProject[0]!.hours).toBe(2);

    const april = computeMonthlySummary({
      yearMonth: "2026-04",
      projects: [project],
      entries: [{ id: "1", projectId: "p1", startedAt, endedAt }],
      rates: [],
    });
    // April ends at UTC 2026-04-30T15:00. Overlap is 13:00..15:00 = 2h.
    expect(april.perProject[0]!.hours).toBe(2);
  });
});
