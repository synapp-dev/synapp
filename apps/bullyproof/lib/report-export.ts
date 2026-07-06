/**
 * Client-side report export helpers: CSV and PDF downloads built from
 * already-fetched report data. Shared by admin reports and the government
 * dashboard.
 */

export type ExportTable = {
  title: string;
  rows: Array<Record<string, string | number | null>>;
};

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number | null): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadCsv(filename: string, tables: ExportTable[]): void {
  const sections: string[] = [];
  for (const table of tables) {
    const lines: string[] = [];
    if (tables.length > 1) {
      lines.push(csvEscape(table.title));
    }
    const headers = table.rows[0] ? Object.keys(table.rows[0]) : [];
    if (headers.length > 0) {
      lines.push(headers.map(csvEscape).join(","));
      for (const row of table.rows) {
        lines.push(headers.map((h) => csvEscape(row[h] ?? null)).join(","));
      }
    } else {
      lines.push("(no data)");
    }
    sections.push(lines.join("\r\n"));
  }
  const csv = sections.join("\r\n\r\n");
  triggerDownload(
    new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }),
    filename.endsWith(".csv") ? filename : `${filename}.csv`
  );
}

export async function downloadPdf(
  filename: string,
  documentTitle: string,
  tables: ExportTable[]
): Promise<void> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  doc.setTitle(documentTitle);
  doc.setAuthor("Bullyproof Australia");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // A4 landscape
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const rowHeight = 18;
  const headerFill = rgb(0.93, 0.95, 0.96);
  const lineColor = rgb(0.85, 0.87, 0.89);
  const ink = rgb(0.13, 0.15, 0.18);
  const muted = rgb(0.42, 0.45, 0.5);

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const newPage = () => {
    page = doc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const fit = (text: string, size: number, maxWidth: number): string => {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return `${cut}...`;
  };

  // Document header
  page.drawText(documentTitle, { x: margin, y: y - 16, size: 16, font: bold, color: ink });
  const stamp = `Generated ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`;
  const stampWidth = font.widthOfTextAtSize(stamp, 9);
  page.drawText(stamp, {
    x: pageWidth - margin - stampWidth,
    y: y - 14,
    size: 9,
    font,
    color: muted,
  });
  y -= 40;

  for (const table of tables) {
    const headers = table.rows[0] ? Object.keys(table.rows[0]) : [];
    const columnWidth = headers.length > 0 ? contentWidth / headers.length : contentWidth;

    if (y < margin + rowHeight * 3) newPage();

    // Section title
    page.drawText(table.title, { x: margin, y: y - 12, size: 12, font: bold, color: ink });
    y -= 22;

    if (headers.length === 0) {
      page.drawText("No data for this section.", { x: margin, y: y - 9, size: 9, font, color: muted });
      y -= 24;
      continue;
    }

    const drawRow = (cells: string[], isHeader: boolean) => {
      if (y - rowHeight < margin) {
        newPage();
      }
      if (isHeader) {
        page.drawRectangle({
          x: margin,
          y: y - rowHeight + 4,
          width: contentWidth,
          height: rowHeight,
          color: headerFill,
        });
      }
      cells.forEach((cell, index) => {
        page.drawText(fit(cell, 9, columnWidth - 10), {
          x: margin + index * columnWidth + 5,
          y: y - rowHeight + 9,
          size: 9,
          font: isHeader ? bold : font,
          color: ink,
        });
      });
      page.drawLine({
        start: { x: margin, y: y - rowHeight + 4 },
        end: { x: margin + contentWidth, y: y - rowHeight + 4 },
        thickness: 0.5,
        color: lineColor,
      });
      y -= rowHeight;
    };

    drawRow(headers, true);
    for (const row of table.rows) {
      drawRow(
        headers.map((h) => (row[h] == null ? "" : String(row[h]))),
        false
      );
    }
    y -= 18;
  }

  const bytes = await doc.save();
  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  triggerDownload(
    new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
    safeName
  );
}
