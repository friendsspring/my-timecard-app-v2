import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type InvoicePdfProps = {
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

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "NotoSansJP", color: "#111" },
  title: { fontSize: 20, marginBottom: 20 },
  metaRow: { flexDirection: "row", marginBottom: 6 },
  metaLabel: { width: 88, color: "#555" },
  metaValue: { flex: 1 },
  sectionTitle: { fontSize: 11, marginTop: 16, marginBottom: 8, fontWeight: 700 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 700,
  },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  colName: { width: "42%" },
  colHours: { width: "28%", textAlign: "right" },
  colAmount: { width: "30%", textAlign: "right" },
  footer: { marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#ccc" },
  footerRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 },
  footerLabel: { width: 120, textAlign: "right", color: "#555" },
  footerValue: { width: 100, textAlign: "right" },
  bank: { marginTop: 16, padding: 10, backgroundColor: "#f5f5f5", fontSize: 9 },
  note: { marginTop: 8, fontSize: 8, color: "#666" },
});

export function InvoicePdfDocument(props: InvoicePdfProps) {
  const subtotalLabel = props.taxMode === "exclusive" ? "小計（税抜）" : "小計（税込）";
  return (
    <Document title={`請求書 ${props.yearMonth}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>請求書</Text>

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
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>請求先</Text>
          <Text style={styles.metaValue}>{props.billToName}</Text>
        </View>

        <Text style={styles.sectionTitle}>明細</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colName}>プロジェクト</Text>
          <Text style={styles.colHours}>稼働時間</Text>
          <Text style={styles.colAmount}>{subtotalLabel}</Text>
        </View>
        {props.lines.length === 0 ? (
          <Text style={{ color: "#888", marginTop: 8 }}>（対象プロジェクトなし）</Text>
        ) : (
          props.lines.map((line, i) => (
            <View key={`${line.projectName}-${i}`} style={styles.tableRow} wrap={false}>
              <Text style={styles.colName}>{line.projectName}</Text>
              <Text style={styles.colHours}>{line.hours}</Text>
              <Text style={styles.colAmount}>{line.subtotal}</Text>
            </View>
          ))
        )}

        <View style={styles.footer}>
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
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>税込合計</Text>
                <Text style={[styles.footerValue, { fontWeight: 700 }]}>{props.exclusive.total}</Text>
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
                <Text style={styles.footerLabel}>合計（税込）</Text>
                <Text style={[styles.footerValue, { fontWeight: 700 }]}>{props.inclusive.total}</Text>
              </View>
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>（うち消費税等）</Text>
                <Text style={styles.footerValue}>{props.inclusive.implicitTax}</Text>
              </View>
            </>
          ) : null}
        </View>

        {props.bankInfo ? (
          <View style={styles.bank}>
            <Text style={{ fontWeight: 700, marginBottom: 4 }}>お振込先</Text>
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
