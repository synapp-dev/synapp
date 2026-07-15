/**
 * Parses the streamed morning digest into tabbed sections. The model marks
 * each section with a "@@TAB Title" line; anything before the first marker
 * (or the whole text when a model ignores the format) falls back to "Today".
 */

export type DigestTab = {
  title: string;
  text: string;
};

const TAB_MARKER = /^@@TAB[ \t]+(.+)$/;
const PARTIAL_MARKER_PREFIXES = ["@", "@@", "@@T", "@@TA", "@@TAB"];

export function parseDigestTabs(raw: string): DigestTab[] {
  const tabs: DigestTab[] = [];
  let current: DigestTab | null = null;
  let preamble: string[] = [];

  const lines = raw.split("\n");
  // A marker still streaming in on the last line would flash as body text.
  const lastLine = lines[lines.length - 1]?.trim();
  if (lastLine && PARTIAL_MARKER_PREFIXES.includes(lastLine)) {
    lines.pop();
  }

  for (const line of lines) {
    const match = TAB_MARKER.exec(line.trim());
    if (match) {
      if (current) {
        tabs.push(current);
      }
      current = { title: match[1]!.trim(), text: "" };
      continue;
    }
    if (current) {
      current.text += (current.text ? "\n" : "") + line;
    } else if (line.trim()) {
      preamble.push(line);
    } else if (preamble.length > 0) {
      preamble.push(line);
    }
  }

  if (current) {
    tabs.push(current);
  }

  if (preamble.length > 0) {
    tabs.unshift({ title: "Today", text: preamble.join("\n") });
  }

  return tabs.map((tab) => ({ title: tab.title, text: tab.text.trim() }));
}
