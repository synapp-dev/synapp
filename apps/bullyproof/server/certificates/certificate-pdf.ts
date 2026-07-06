import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Brand palette mirrored from packages/ui globals.css. */
const BRAND_PRIMARY = rgb(0x03 / 255, 0x84 / 255, 0x93 / 255); // #038493
const BRAND_SECONDARY = rgb(0xea / 255, 0x6f / 255, 0x4d / 255); // #ea6f4d
const INK = rgb(0.13, 0.15, 0.18);
const MUTED = rgb(0.42, 0.45, 0.5);

export type CourseCertificateInput = {
  firstName: string;
  lastName: string;
  courseName: string;
  certificateType: string | null;
  completedAt: string;
};

function formatCompletionDate(completedAt: string): string {
  const date = new Date(completedAt);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-AU", { month: "long" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Renders the AP completion certificate as an A4 landscape PDF.
 * Layout mirrors the on-screen TopicCertificate card.
 */
export async function renderCourseCertificatePdf(
  input: CourseCertificateInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // A4 landscape in points
  const page = doc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaLight = await doc.embedFont(StandardFonts.Helvetica);

  doc.setTitle(`AP Certificate - ${input.firstName} ${input.lastName}`.trim());
  doc.setAuthor("Bullyproof Australia");
  doc.setSubject(input.courseName);

  // Outer border frame
  const margin = 28;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2,
    borderColor: BRAND_PRIMARY,
    borderWidth: 2.5,
  });
  page.drawRectangle({
    x: margin + 8,
    y: margin + 8,
    width: width - (margin + 8) * 2,
    height: height - (margin + 8) * 2,
    borderColor: BRAND_PRIMARY,
    borderWidth: 0.75,
    opacity: 0.55,
  });

  const centerX = width / 2;
  const drawCentered = (
    text: string,
    y: number,
    size: number,
    font = helvetica,
    color = INK
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: centerX - textWidth / 2, y, size, font, color });
  };

  // Header
  drawCentered("BULLYPROOF AUSTRALIA", height - 110, 16, helveticaBold, BRAND_PRIMARY);
  drawCentered("Certificate of Completion", height - 160, 34, helveticaBold, INK);

  // Recipient
  drawCentered("This certifies that", height - 215, 13, helvetica, MUTED);
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  drawCentered(fullName, height - 262, 40, helveticaBold, INK);

  // Divider
  page.drawLine({
    start: { x: centerX - 140, y: height - 282 },
    end: { x: centerX + 140, y: height - 282 },
    thickness: 1,
    color: BRAND_SECONDARY,
  });

  // Program line
  drawCentered(
    `has successfully completed the ${input.courseName}`,
    height - 312,
    15,
    helveticaLight,
    INK
  );
  if (input.certificateType) {
    drawCentered(input.certificateType, height - 334, 12, helvetica, MUTED);
  }

  // AP Certified chip
  const chipText = "AP CERTIFIED";
  const chipTextSize = 13;
  const chipTextWidth = helveticaBold.widthOfTextAtSize(chipText, chipTextSize);
  const chipPaddingX = 16;
  const chipWidth = chipTextWidth + chipPaddingX * 2;
  const chipHeight = 30;
  const chipY = height - 396;
  page.drawRectangle({
    x: centerX - chipWidth / 2,
    y: chipY,
    width: chipWidth,
    height: chipHeight,
    color: BRAND_SECONDARY,
  });
  page.drawText(chipText, {
    x: centerX - chipTextWidth / 2,
    y: chipY + (chipHeight - chipTextSize) / 2 + 1.5,
    size: chipTextSize,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  // Completion date
  drawCentered(
    `Completed on ${formatCompletionDate(input.completedAt)}`,
    height - 434,
    12,
    helvetica,
    MUTED
  );

  // Footer
  drawCentered(
    "Amayda Program  |  Bullyproof Australia",
    margin + 34,
    11,
    helvetica,
    MUTED
  );

  return doc.save();
}
