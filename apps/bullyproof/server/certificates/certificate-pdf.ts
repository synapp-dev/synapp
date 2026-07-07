import { PDFDocument, PDFFont, StandardFonts, degrees, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { CERTIFICATE_TEMPLATE_BASE64 } from "./assets/certificate-template";
import { SCRIPT_FONT_BASE64 } from "./assets/script-font";

/**
 * Renders the client-supplied Certificate of Completion artwork with the
 * recipient's name and completion date overlaid.
 *
 * The template page is 612x792 with /Rotate 90 (landscape display), so all
 * overlay text is drawn rotated 90 degrees in raw page space. Calibration
 * anchors come from the sample recipient text the artwork shipped with:
 *   name  (48pt script):  x 301.2-356.8, advance y 401.2-611.6 (centre 506.4)
 *   date  (11.3pt Arial): x 486.2-498.7, advance y 202.7-291.6 (centre 247.2)
 */

const INK = rgb(0x23 / 255, 0x1f / 255, 0x20 / 255); // matches artwork text

const NAME_BASELINE_X = 348;
const NAME_CENTER_Y = 506.4;
const NAME_MAX_ADVANCE = 420; // stay inside the underline
const NAME_SIZE = 48;

const DATE_BASELINE_X = 496;
const DATE_CENTER_Y = 247.2;
const DATE_SIZE = 11.5;

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

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

async function embedNameFont(doc: PDFDocument): Promise<PDFFont> {
  if (SCRIPT_FONT_BASE64.length > 0) {
    doc.registerFontkit(fontkit);
    return doc.embedFont(base64ToBytes(SCRIPT_FONT_BASE64), { subset: true });
  }
  // Fallback until a script font is provided: closest built-in to the artwork.
  return doc.embedFont(StandardFonts.TimesRomanItalic);
}

export async function renderCourseCertificatePdf(
  input: CourseCertificateInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(base64ToBytes(CERTIFICATE_TEMPLATE_BASE64));
  const page = doc.getPage(0);

  const nameFont = await embedNameFont(doc);
  const dateFont = await doc.embedFont(StandardFonts.Helvetica);

  const fullName = `${input.firstName} ${input.lastName}`.trim();
  doc.setTitle(`Certificate of Completion - ${fullName}`);
  doc.setAuthor("Bullyproof Australia");
  doc.setSubject(input.courseName);

  // Shrink long names so they stay on the underline.
  let nameSize = NAME_SIZE;
  let nameWidth = nameFont.widthOfTextAtSize(fullName, nameSize);
  if (nameWidth > NAME_MAX_ADVANCE) {
    nameSize = Math.max(24, (NAME_SIZE * NAME_MAX_ADVANCE) / nameWidth);
    nameWidth = nameFont.widthOfTextAtSize(fullName, nameSize);
  }

  // Rotated 90 degrees: text advances along +y, baseline is a vertical line
  // at constant x. Centre the advance on the sample text's centre.
  page.drawText(fullName, {
    x: NAME_BASELINE_X,
    y: NAME_CENTER_Y - nameWidth / 2,
    size: nameSize,
    font: nameFont,
    color: INK,
    rotate: degrees(90),
  });

  const dateText = formatCompletionDate(input.completedAt);
  const dateWidth = dateFont.widthOfTextAtSize(dateText, DATE_SIZE);
  page.drawText(dateText, {
    x: DATE_BASELINE_X,
    y: DATE_CENTER_Y - dateWidth / 2,
    size: DATE_SIZE,
    font: dateFont,
    color: INK,
    rotate: degrees(90),
  });

  return doc.save();
}
