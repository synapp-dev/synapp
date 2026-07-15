export type InlineTextSegment = { text: string; bold: boolean };

/**
 * Minimal inline-markdown support for assistant chat text: `**bold**` spans.
 * Markers are stripped from the output. An unterminated `**` (mid-stream)
 * bolds the remainder so live-streaming text never shows raw asterisks.
 */
export function parseInlineBoldSegments(text: string): InlineTextSegment[] {
  const segments: InlineTextSegment[] = [];
  let bold = false;
  let cursor = 0;
  while (cursor < text.length) {
    const marker = text.indexOf("**", cursor);
    if (marker === -1) {
      segments.push({ text: text.slice(cursor), bold });
      break;
    }
    if (marker > cursor) {
      segments.push({ text: text.slice(cursor, marker), bold });
    }
    bold = !bold;
    cursor = marker + 2;
  }
  return segments.filter((s) => s.text.length > 0);
}

/** The text with `**` markers removed (what the user actually reads). */
export function stripInlineBoldMarkers(text: string): string {
  return parseInlineBoldSegments(text)
    .map((s) => s.text)
    .join("");
}
