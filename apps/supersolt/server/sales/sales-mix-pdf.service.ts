import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

import type { SalesMixReportData } from "./sales-insights-summary.service";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

// Brand palette lifted from the Supersolt logo mark (matches po-pdf.service).
const INK = rgb(0.137, 0.122, 0.125); // #231f20
const MUTED = rgb(0.44, 0.46, 0.49);
const GREEN = rgb(0.737, 0.859, 0.545); // #bcdb8b
const LINE = rgb(0.9, 0.906, 0.914);
const HEADER_BG = rgb(0.972, 0.976, 0.968);

// Standard fonts only cover WinAnsi; translate common punctuation from POS
// item names (dashes, curly quotes) before stripping what can't be encoded.
function sanitize(text: string): string {
  return text
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
}

function formatReportDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The Supersolt mark (rounded square + two green bars), from the brand SVG. */
function drawSupersoltMark(page: PDFPage, x: number, yTop: number, size: number): void {
  const scale = size / 150.55;
  page.drawSvgPath(
    "M25,0 H125.55 A25,25 0 0 1 150.55,25 V119 A25,25 0 0 1 125.55,144 H25 A25,25 0 0 1 0,119 V25 A25,25 0 0 1 25,0 Z",
    { x, y: yTop, scale, color: INK },
  );
  page.drawSvgPath(
    "M55.41,35.74c-10.02,0-18.13,8.12-18.13,18.13s8.12,18.13,18.13,18.13h57.96v-36.27h-57.96Z",
    { x, y: yTop, scale, color: GREEN },
  );
  page.drawSvgPath(
    "M95.13,71.99c10.02,0,18.13,8.12,18.13,18.13s-8.12,18.13-18.13,18.13h-57.96v-36.27h57.96Z",
    { x, y: yTop, scale, color: GREEN },
  );
}

type DrawContext = {
  doc: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
};

function drawText(
  ctx: DrawContext,
  text: string,
  options: {
    x: number;
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
    alignRight?: boolean;
    maxWidth?: number;
  },
): void {
  const font = options.font ?? ctx.regular;
  const size = options.size ?? 9;
  let value = sanitize(text);
  if (options.maxWidth && font.widthOfTextAtSize(value, size) > options.maxWidth) {
    let kept = value;
    while (
      kept.length > 1 &&
      font.widthOfTextAtSize(`${kept}...`, size) > options.maxWidth
    ) {
      kept = kept.slice(0, -1).trimEnd();
    }
    value = `${kept}...`;
  }
  const x = options.alignRight
    ? options.x - font.widthOfTextAtSize(value, size)
    : options.x;
  ctx.page.drawText(value, {
    x,
    y: ctx.y,
    size,
    font,
    color: options.color ?? INK,
  });
}

function drawRule(
  ctx: DrawContext,
  color = LINE,
  thickness = 0.5,
  fromX = MARGIN,
  toX = PAGE_WIDTH - MARGIN,
): void {
  ctx.page.drawLine({
    start: { x: fromX, y: ctx.y },
    end: { x: toX, y: ctx.y },
    thickness,
    color,
  });
}

const COL = {
  item: MARGIN,
  qty: PAGE_WIDTH - MARGIN - 168,
  share: PAGE_WIDTH - MARGIN - 96,
  revenue: PAGE_WIDTH - MARGIN,
};

function drawTableHeader(ctx: DrawContext): void {
  ctx.page.drawRectangle({
    x: MARGIN - 6,
    y: ctx.y - 6,
    width: PAGE_WIDTH - 2 * MARGIN + 12,
    height: 20,
    color: HEADER_BG,
  });
  const header = { size: 7.5, font: ctx.bold, color: MUTED };
  drawText(ctx, "ITEM", { x: COL.item, ...header });
  drawText(ctx, "QTY", { x: COL.qty, ...header, alignRight: true });
  drawText(ctx, "SHARE", { x: COL.share, ...header, alignRight: true });
  drawText(ctx, "REVENUE", { x: COL.revenue, ...header, alignRight: true });
  ctx.y -= 9;
  drawRule(ctx, INK, 0.8);
  ctx.y -= 15;
}

function ensureRoom(ctx: DrawContext, needed: number): void {
  if (ctx.y - needed > MARGIN + 50) return;
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
  drawTableHeader(ctx);
}

export async function buildSalesMixPdf(data: SalesMixReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const rangeLabel =
    data.from === data.to
      ? formatReportDate(data.from)
      : `${formatReportDate(data.from)} - ${formatReportDate(data.to)}`;
  doc.setTitle(`Sales mix - ${data.venueName} - ${rangeLabel}`);
  doc.setAuthor(data.organisationName);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: DrawContext = {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    regular,
    bold,
    y: PAGE_HEIGHT - MARGIN,
  };

  // Header: venue identity left, report identity right
  drawText(ctx, data.venueName, { x: MARGIN, size: 15, font: bold });
  drawText(ctx, "SALES MIX REPORT", {
    x: PAGE_WIDTH - MARGIN,
    size: 13,
    font: bold,
    alignRight: true,
  });
  ctx.y -= 15;
  drawText(ctx, data.organisationName, { x: MARGIN, size: 8.5, color: MUTED });
  drawText(ctx, rangeLabel, {
    x: PAGE_WIDTH - MARGIN,
    size: 10,
    alignRight: true,
  });
  if (data.dataSource === "demo") {
    ctx.y -= 13;
    drawText(ctx, "Demo data - Square is not connected for this venue.", {
      x: MARGIN,
      size: 8.5,
      color: MUTED,
    });
  }
  ctx.y -= 14;
  drawRule(ctx, GREEN, 2.5);
  ctx.y -= 24;

  // KPI band
  const kpis: Array<[string, string]> = [
    ["REVENUE", money(data.totals.revenueCents)],
    ["ORDERS", data.totals.orders.toLocaleString("en-AU")],
    ["AVG CHECK", money(data.totals.avgCheckCents)],
    [
      "REFUNDS",
      `${data.totals.refundCount} (${money(data.totals.refundCents)})`,
    ],
  ];
  const kpiWidth = (PAGE_WIDTH - 2 * MARGIN) / kpis.length;
  const kpiTop = ctx.y;
  kpis.forEach(([label, value], index) => {
    ctx.y = kpiTop;
    const x = MARGIN + index * kpiWidth;
    drawText(ctx, label, { x, size: 7.5, font: bold, color: MUTED });
    ctx.y -= 15;
    drawText(ctx, value, { x, size: 12, font: bold });
  });
  ctx.y = kpiTop - 34;

  drawTableHeader(ctx);

  for (const row of data.rows) {
    ensureRoom(ctx, 17);
    drawText(ctx, row.mapped ? row.label : `${row.label} (unmapped)`, {
      x: COL.item,
      size: 9,
      maxWidth: COL.qty - COL.item - 60,
    });
    drawText(ctx, formatQuantity(row.quantity), {
      x: COL.qty,
      size: 9,
      alignRight: true,
    });
    drawText(ctx, `${row.revenueSharePct.toFixed(1)}%`, {
      x: COL.share,
      size: 9,
      alignRight: true,
    });
    drawText(ctx, money(row.revenueCents), {
      x: COL.revenue,
      size: 9,
      alignRight: true,
    });
    ctx.y -= 8;
    drawRule(ctx);
    ctx.y -= 12;
  }

  if (data.rows.length === 0) {
    drawText(ctx, "No item-level sales in this period.", {
      x: MARGIN,
      size: 9,
      color: MUTED,
    });
    ctx.y -= 20;
  }

  ensureRoom(ctx, 40);
  ctx.y -= 6;
  drawRule(ctx);
  ctx.y -= 18;
  drawSupersoltMark(ctx.page, MARGIN, ctx.y + 12, 12);
  drawText(ctx, "Generated with Supersolt", {
    x: MARGIN + 17,
    size: 7.5,
    color: MUTED,
  });
  drawText(ctx, `${data.venueName} - ${rangeLabel}`, {
    x: PAGE_WIDTH - MARGIN,
    size: 7.5,
    color: MUTED,
    alignRight: true,
  });

  return doc.save();
}
