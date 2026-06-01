import { describe, expect, it } from "vitest";

import { buildInvoiceLines, invoiceLineDescription } from "@/lib/billing/invoice-lines";

describe("buildInvoiceLines", () => {
  it("稼働行と任意明細を合算して外税計算する", () => {
    const lines = buildInvoiceLines(
      [
        {
          kind: "hourly",
          projectId: "p1",
          projectName: "A",
          hours: 10,
          lineBase: 50_000,
        },
        {
          kind: "extra",
          projectId: "p1",
          projectName: "A",
          label: "交通費",
          hours: null,
          lineBase: 3_000,
        },
      ],
      "exclusive",
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]!.displaySubtotal).toBe(50_000);
    expect(lines[1]!.displaySubtotal).toBe(3_000);
    expect(lines.reduce((s, l) => s + l.lineBase, 0)).toBe(53_000);
  });

  it("内税は各行をそのまま税込表示する", () => {
    const lines = buildInvoiceLines(
      [
        {
          kind: "hourly",
          projectId: "p1",
          projectName: "A",
          hours: 1,
          lineBase: 11_000,
        },
        {
          kind: "extra",
          projectId: "p1",
          projectName: "A",
          label: "備品",
          hours: null,
          lineBase: 1_100,
        },
      ],
      "inclusive",
    );
    expect(lines[0]!.displaySubtotal).toBe(11_000);
    expect(lines[1]!.displaySubtotal).toBe(1_100);
  });
});

describe("invoiceLineDescription", () => {
  it("稼働行はプロジェクト名のみ", () => {
    expect(
      invoiceLineDescription({
        kind: "hourly",
        projectName: "開発",
        label: undefined,
      }),
    ).toBe("開発");
  });

  it("任意明細はプロジェクト名と項目名", () => {
    expect(
      invoiceLineDescription({
        kind: "extra",
        projectName: "開発",
        label: "交通費",
      }),
    ).toBe("開発 — 交通費");
  });
});
