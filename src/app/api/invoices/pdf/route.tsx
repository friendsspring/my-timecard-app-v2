import path from "node:path";
import fs from "node:fs";

import { Font, renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/guard";
import { loadInvoicePreview, previewToPdfProps } from "@/actions/invoice";
import { applyInvoiceTemplate, resolvePdfFilename } from "@/lib/billing/invoice";
import { InvoicePdfDocument } from "@/lib/billing/pdf/invoice-pdf-document";

export const runtime = "nodejs";

let fontRegistered = false;

function ensureInvoiceFont() {
  if (fontRegistered) return;
  const localTtf = path.join(process.cwd(), "public/fonts/NotoSansJP-Regular.ttf");
  const localOtf = path.join(process.cwd(), "public/fonts/NotoSansCJKjp-Regular.otf");
  let src =
    "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf";
  if (fs.existsSync(localTtf)) src = localTtf;
  else if (fs.existsSync(localOtf)) src = localOtf;
  Font.register({ family: "NotoSansJP", src });
  fontRegistered = true;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const billingClientId = req.nextUrl.searchParams.get("billingClientId");
  const yearMonth = req.nextUrl.searchParams.get("yearMonth");
  if (!billingClientId || !yearMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const preview = await loadInvoicePreview(user.id, { billingClientId, yearMonth });
  if (!preview) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const filename = resolvePdfFilename(
    applyInvoiceTemplate(preview.pdfFilenameTemplate, { yearMonth, clientName: preview.billToName }),
  );

  try {
    ensureInvoiceFont();
    const pdfProps = previewToPdfProps(preview);
    const buffer = await renderToBuffer(<InvoicePdfDocument {...pdfProps} />);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    console.error("invoice pdf failed", e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
