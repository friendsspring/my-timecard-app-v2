import { describe, expect, it } from "vitest";
import {
  formatYearMonthJa,
  fromJstDatetimeLocal,
  jstMonthRangeToUtc,
  shiftYearMonth,
  toJstDatetimeLocal,
  toJstYearMonth,
} from "@/lib/time/jst";

describe("jst utilities", () => {
  it("converts a UTC date to JST year-month", () => {
    // UTC midnight is already May 1 in JST? UTC 2026-04-30T15:00 = JST 2026-05-01T00:00
    expect(toJstYearMonth(new Date("2026-04-30T15:00:00Z"))).toBe("2026-05");
    expect(toJstYearMonth(new Date("2026-04-30T14:59:59Z"))).toBe("2026-04");
  });

  it("returns JST month boundaries in UTC", () => {
    const { start, end } = jstMonthRangeToUtc("2026-05");
    expect(start.toISOString()).toBe("2026-04-30T15:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-31T15:00:00.000Z");
  });

  it("handles December rollover", () => {
    const { start, end } = jstMonthRangeToUtc("2026-12");
    expect(start.toISOString()).toBe("2026-11-30T15:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T15:00:00.000Z");
  });

  it("rejects invalid year-month", () => {
    expect(() => jstMonthRangeToUtc("invalid")).toThrow();
    expect(() => jstMonthRangeToUtc("2026-13")).toThrow();
  });

  it("shifts year-month forward and backward", () => {
    expect(shiftYearMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftYearMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftYearMonth("2026-05", 7)).toBe("2026-12");
    expect(shiftYearMonth("2026-05", 8)).toBe("2027-01");
  });

  it("formats year-month as Japanese label", () => {
    expect(formatYearMonthJa("2026-05")).toBe("2026年5月");
    expect(formatYearMonthJa("2026-12")).toBe("2026年12月");
  });

  it("converts datetime-local <-> UTC via JST", () => {
    const back = fromJstDatetimeLocal("2026-05-08T15:30");
    expect(back.toISOString()).toBe("2026-05-08T06:30:00.000Z");

    const localStr = toJstDatetimeLocal(new Date("2026-05-08T06:30:00.000Z"));
    expect(localStr).toBe("2026-05-08T15:30");
  });
});
