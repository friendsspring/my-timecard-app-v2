import { describe, expect, it } from "vitest";

import {
  allocateInclusiveLineTotals,
  applyInvoiceTemplate,
  computeExclusiveFromSubtotal,
  formatHoursForInvoice,
  resolvePdfFilename,
  sanitizeFilenamePart,
} from "@/lib/billing/invoice";

describe("computeExclusiveFromSubtotal", () => {
  it("税抜100なら税10・税込110", () => {
    expect(computeExclusiveFromSubtotal(100)).toEqual({
      subtotalExcl: 100,
      tax: 10,
      totalIncl: 110,
    });
  });

  it("税抜101なら消費税は四捨五入で10、税込111", () => {
    expect(computeExclusiveFromSubtotal(101)).toEqual({
      subtotalExcl: 101,
      tax: 10,
      totalIncl: 111,
    });
  });
});

describe("allocateInclusiveLineTotals", () => {
  it("空配列は total 0", () => {
    expect(allocateInclusiveLineTotals([])).toEqual({
      inclusiveLines: [],
      total: 0,
      S: 0,
    });
  });

  it("S=0 は各行0・total 0", () => {
    expect(allocateInclusiveLineTotals([0, 0])).toEqual({
      inclusiveLines: [0, 0],
      total: 0,
      S: 0,
    });
  });

  it("2行同額: 税込合計110に按分し行の和が一致", () => {
    const { inclusiveLines, total, S } = allocateInclusiveLineTotals([50, 50]);
    expect(S).toBe(100);
    expect(total).toBe(110);
    expect(inclusiveLines.reduce((a, b) => a + b, 0)).toBe(110);
    expect(inclusiveLines[0]).toBe(55);
    expect(inclusiveLines[1]).toBe(55);
  });

  it("按分後も行合計が T と一致（端数は最大剰余法）", () => {
    const { inclusiveLines, total } = allocateInclusiveLineTotals([33, 67]);
    expect(total).toBe(Math.round(100 * 1.1));
    expect(inclusiveLines.reduce((a, b) => a + b, 0)).toBe(total);
  });
});

describe("applyInvoiceTemplate", () => {
  it("プレースホルダを置換", () => {
    const ctx = { yearMonth: "2026-05", clientName: "A/B 株式会社" };
    expect(applyInvoiceTemplate("{YYYYMM}_{YYYY}-{MM}_{CLIENT}", ctx)).toBe(
      "202605_2026-05_A_B_株式会社",
    );
  });
});

describe("sanitizeFilenamePart", () => {
  it("危険文字を置換", () => {
    expect(sanitizeFilenamePart('foo:bar\\baz')).toBe("foo_bar_baz");
  });
});

describe("resolvePdfFilename", () => {
  it("拡張子補完とパス除去", () => {
    expect(resolvePdfFilename("202605_client")).toBe("202605_client.pdf");
    expect(resolvePdfFilename("/tmp/x.pdf")).toBe("x.pdf");
  });
});

describe("formatHoursForInvoice", () => {
  it("小数2桁＋単位", () => {
    expect(formatHoursForInvoice(3.5)).toBe("3.50 時間");
  });
});
