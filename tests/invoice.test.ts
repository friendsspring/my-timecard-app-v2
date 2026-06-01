import { describe, expect, it } from "vitest";

import {
  allocateInclusiveLineTotals,
  applyInvoiceTemplate,
  computeExclusiveFromSubtotal,
  computeInclusiveFromTotal,
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

  it("内税は明細をそのまま税込として扱い、合計は行の和", () => {
    const { inclusiveLines, total, S } = allocateInclusiveLineTotals([50, 50]);
    expect(S).toBe(100);
    expect(total).toBe(100);
    expect(inclusiveLines.reduce((a, b) => a + b, 0)).toBe(100);
    expect(inclusiveLines[0]).toBe(50);
    expect(inclusiveLines[1]).toBe(50);
  });

  it("行の和がそのまま税込合計になる", () => {
    const { inclusiveLines, total } = allocateInclusiveLineTotals([100, 200]);
    expect(total).toBe(300);
    expect(inclusiveLines.reduce((a, b) => a + b, 0)).toBe(total);
  });
});

describe("computeInclusiveFromTotal", () => {
  it("税込合計を固定して税抜相当と税額を逆算", () => {
    expect(computeInclusiveFromTotal(62_100)).toEqual({
      subtotalExcl: 56_455,
      implicitTax: 5_645,
      totalIncl: 62_100,
    });
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
