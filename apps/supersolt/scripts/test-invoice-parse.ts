/**
 * Smoke test for the invoice parser after the jsonTool fix.
 * Generates a tiny synthetic invoice PDF (no deps) and runs the real
 * parseInvoiceDocument() against it — verifies grammar compilation no longer
 * times out and prints the parsed result + token usage.
 *
 *   pnpm tsx scripts/test-invoice-parse.ts
 */
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Minimal single-page PDF generator (valid xref, computed offsets, no deps).
function buildInvoicePdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  let text = "BT\n/F1 11 Tf\n50 770 Td\n14 TL\n";
  lines.forEach((line, i) => {
    text += i === 0 ? `(${esc(line)}) Tj\n` : `(${esc(line)}) '\n`;
  });
  text += "ET";
  const stream = Buffer.from(text, "latin1");

  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    `<</Length ${stream.length}>>\nstream\n${text}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not loaded from .env.local");
  }
  const { parseInvoiceDocument } = await import(
    "../server/invoices/invoice-parser.service"
  );

  const bytes = buildInvoicePdf([
    "ACME PRODUCE PTY LTD   ABN 12 345 678 901",
    "12 Market St, Footscray VIC 3011",
    "Tax Invoice  #INV-1042   Date: 01/06/2026",
    "",
    "Gourmet Tomato 10KG    qty 2    $25.00    $50.00",
    "Cos Lettuce (each)     qty 12   $1.20     $14.40",
    "Delivery freight                          $8.00",
    "",
    "Subtotal $64.40   GST $6.44   Total $70.84",
  ]);

  console.log(`Generated test PDF: ${bytes.length} bytes`);
  const t0 = Date.now();
  try {
    const { parsed, usage } = await parseInvoiceDocument({
      fileName: "test-invoice.pdf",
      mimeType: "application/pdf",
      bytes,
    });
    const ms = Date.now() - t0;
    console.log(`\n✅ PARSE SUCCEEDED in ${ms}ms (no grammar timeout)\n`);
    console.log("Supplier:", parsed.supplierName, "| ABN:", parsed.supplierAbn);
    console.log("Category:", parsed.supplierCategory, "| Confidence:", parsed.confidence);
    console.log("Invoice #:", parsed.invoiceNumber, "| Date:", parsed.invoiceDate);
    console.log("Totals: subtotal", parsed.subtotal, "gst", parsed.gstTotal, "total", parsed.total);
    console.log(`\nLine items (${parsed.lineItems.length}):`);
    for (const li of parsed.lineItems) {
      console.log(`  - ${li.description} | qty ${li.quantity} ${li.unit ?? ""} | unit ${li.unitPrice} | total ${li.lineTotal} | inventory=${li.isLikelyInventory}`);
    }
    console.log("\nToken usage:", usage);
  } catch (err) {
    const ms = Date.now() - t0;
    console.error(`\n❌ PARSE FAILED in ${ms}ms`);
    const e = err as Record<string, unknown> & { message?: string };
    console.error("message:", e?.message);
    console.error("statusCode:", e?.statusCode);
    console.error("url:", e?.url);
    console.error("responseBody:", e?.responseBody);
    if (e?.cause) console.error("cause:", e.cause);
    process.exitCode = 1;
  }
}

void main();
