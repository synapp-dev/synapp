/**
 * Splits digest prose into plain and highlight segments so the numbers an
 * operator scans for (dollars, percentages, counts, dates) can be bolded.
 */

export type DigestSegment = {
  text: string;
  highlight: boolean;
};

const MONTH = String.raw`(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*`;

const HIGHLIGHT_RE = new RegExp(
  [
    String.raw`\$\d{1,3}(?:,\d{3})*(?:\.\d+)?[kKmM]?`, // $4,999 / $3.6k
    String.raw`\d{4}-\d{2}-\d{2}`, // 2026-07-12
    String.raw`\d{1,2} ${MONTH}(?: \d{4})?`, // 12 Jul 2026
    String.raw`${MONTH} \d{4}`, // August 2025
    String.raw`${MONTH} \d{1,2}(?:,? \d{4})?`, // Jul 12, 2026
    String.raw`\d{1,3}(?:,\d{3})*(?:\.\d+)?%?`, // 23.6% / 581 / 1.2
  ].join("|"),
  "g",
);

export function segmentDigestLine(line: string): DigestSegment[] {
  const segments: DigestSegment[] = [];
  const re = new RegExp(HIGHLIGHT_RE);
  let cursor = 0;
  for (let match = re.exec(line); match; match = re.exec(line)) {
    if (match.index > cursor) {
      segments.push({ text: line.slice(cursor, match.index), highlight: false });
    }
    segments.push({ text: match[0], highlight: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < line.length) {
    segments.push({ text: line.slice(cursor), highlight: false });
  }
  return segments;
}
