import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type InvoicePdfProps = {
  /** サーバー上の絶対パス（存在するときのみ表示） */
  logoSrc?: string;
  taxMode: "inclusive" | "exclusive";
  issuerName: string;
  billToName: string;
  subject: string;
  invoiceDate: string;
  yearMonth: string;
  bankInfo: string | null;
  lines: { projectName: string; hours: string; subtotal: string }[];
  exclusive?: { subtotal: string; tax: string; total: string };
  inclusive?: { total: string; implicitTax: string; subtotalBody: string };
};

const C = {
  accent: "#4f46e5",
  accentSoft: "#eef2ff",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  surface: "#f8fafc",
  surface2: "#f1f5f9",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontSize: 9.5,
    fontFamily: "NotoSansJP",
    color: C.ink,
    backgroundColor: C.white,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: C.accent,
  },
  headerMainRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  /** 枠線なし。タイトルとの余白のみ */
  logoWrap: {
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: { width: 44, height: 44, objectFit: "contain" },
  titleColumn: { flex: 1, minWidth: 0 },
  headerBlock: { marginBottom: 22 },
  titleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: 0.3 },
  yearBadge: {
    fontSize: 8,
    color: C.accent,
    fontWeight: 600,
    letterSpacing: 0.8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: C.accentSoft,
    borderRadius: 4,
  },
  metaCard: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    backgroundColor: C.surface,
    padding: 14,
    marginBottom: 20,
  },
  metaRow: { flexDirection: "row", marginBottom: 8 },
  metaRowLast: { flexDirection: "row", marginBottom: 0 },
  metaLabel: { width: 76, color: C.muted, fontSize: 8.5, paddingTop: 1 },
  metaValue: { flex: 1, fontSize: 10, lineHeight: 1.45 },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: C.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  tableShell: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.surface2,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  th: { fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: 0.4 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0,
  },
  colName: { width: "42%", fontSize: 9.5 },
  colHours: { width: "28%", textAlign: "right", fontSize: 9.5, color: C.muted },
  colAmount: { width: "30%", textAlign: "right", fontSize: 9.5, fontWeight: 600 },
  emptyHint: { padding: 16, textAlign: "center", color: C.muted, fontSize: 9 },
  footer: { marginTop: 18 },
  footerInner: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    backgroundColor: C.surface,
  },
  footerRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 6 },
  footerRowLast: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 0 },
  footerLabel: { width: 128, textAlign: "right", color: C.muted, fontSize: 9 },
  footerValue: { width: 104, textAlign: "right", fontSize: 10 },
  totalHighlight: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: C.accentSoft,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  totalLabel: { fontSize: 10, fontWeight: 700, color: C.ink, marginRight: 12 },
  totalValue: { fontSize: 13, fontWeight: 700, color: C.accent, minWidth: 100, textAlign: "right" },
  bank: {
    marginTop: 18,
    padding: 12,
    backgroundColor: C.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.line,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    fontSize: 9,
  },
  bankTitle: { fontWeight: 700, marginBottom: 6, fontSize: 9, color: C.ink },
  note: { marginTop: 14, fontSize: 7.5, color: C.muted, lineHeight: 1.5 },
});

export function InvoicePdfDocument(props: InvoicePdfProps) {
  const subtotalLabel = props.taxMode === "exclusive" ? "小計（税抜）" : "小計（税込）";
  const ym = props.yearMonth;

  return (
    <Document title={`請求書 ${props.yearMonth}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />

        <View style={styles.headerBlock}>
          <View style={styles.headerMainRow}>
            {props.logoSrc ? (
              <View style={styles.logoWrap}>
                <Image src={props.logoSrc} style={styles.logoImage} />
              </View>
            ) : null}
            <View style={styles.titleColumn}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>請求書</Text>
                <Text style={styles.yearBadge}>{ym}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>請求日</Text>
            <Text style={styles.metaValue}>{props.invoiceDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>件名</Text>
            <Text style={styles.metaValue}>{props.subject}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>請求元</Text>
            <Text style={styles.metaValue}>{props.issuerName}</Text>
          </View>
          <View style={styles.metaRowLast}>
            <Text style={styles.metaLabel}>請求先</Text>
            <Text style={styles.metaValue}>{props.billToName}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>明細</Text>
        <View style={styles.tableShell}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colName, styles.th]}>プロジェクト</Text>
            <Text style={[styles.colHours, styles.th]}>稼働時間</Text>
            <Text style={[styles.colAmount, styles.th]}>{subtotalLabel}</Text>
          </View>
          {props.lines.length === 0 ? (
            <Text style={styles.emptyHint}>（対象プロジェクトなし）</Text>
          ) : (
            props.lines.map((line, i) => {
              const isLast = i === props.lines.length - 1;
              return (
                <View key={`${line.projectName}-${i}`} style={isLast ? styles.tableRowLast : styles.tableRow} wrap={false}>
                  <Text style={styles.colName}>{line.projectName}</Text>
                  <Text style={styles.colHours}>{line.hours}</Text>
                  <Text style={styles.colAmount}>{line.subtotal}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerInner}>
            {props.taxMode === "exclusive" && props.exclusive ? (
              <>
                <View style={styles.footerRow}>
                  <Text style={styles.footerLabel}>税抜合計</Text>
                  <Text style={styles.footerValue}>{props.exclusive.subtotal}</Text>
                </View>
                <View style={styles.footerRow}>
                  <Text style={styles.footerLabel}>消費税（10%）</Text>
                  <Text style={styles.footerValue}>{props.exclusive.tax}</Text>
                </View>
                <View style={styles.totalHighlight}>
                  <Text style={styles.totalLabel}>税込合計</Text>
                  <Text style={styles.totalValue}>{props.exclusive.total}</Text>
                </View>
              </>
            ) : null}
            {props.taxMode === "inclusive" && props.inclusive ? (
              <>
                <View style={styles.footerRow}>
                  <Text style={styles.footerLabel}>税抜相当計</Text>
                  <Text style={styles.footerValue}>{props.inclusive.subtotalBody}</Text>
                </View>
                <View style={styles.footerRow}>
                  <Text style={styles.footerLabel}>（うち消費税等）</Text>
                  <Text style={styles.footerValue}>{props.inclusive.implicitTax}</Text>
                </View>
                <View style={styles.totalHighlight}>
                  <Text style={styles.totalLabel}>合計（税込）</Text>
                  <Text style={styles.totalValue}>{props.inclusive.total}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {props.bankInfo ? (
          <View style={styles.bank}>
            <Text style={styles.bankTitle}>お振込先</Text>
            <Text>{props.bankInfo}</Text>
          </View>
        ) : null}

        <Text style={styles.note}>
          ※ 単価は記載せず、小計のみ表示しています。内税の場合、明細小計は税込按分です。
        </Text>
      </Page>
    </Document>
  );
}
