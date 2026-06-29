/** Average adult reading speed (words/min) — same constant Landmark used. */
const WORDS_PER_MINUTE = 238;

export type ReadTime = {
  words: number;
  characters: number;
  minutes: number;
};

/** Recursively collects all text nodes from a TipTap/ProseMirror doc. */
function collectText(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  const n = node as { text?: unknown; content?: unknown };
  if (typeof n.text === "string") out.push(n.text);
  if (Array.isArray(n.content)) {
    for (const child of n.content) collectText(child, out);
  }
}

/** Word/character counts + estimated minutes from a TipTap bodyJson doc. */
export function readTimeFromDoc(doc: unknown): ReadTime {
  const parts: string[] = [];
  collectText(doc, parts);
  const text = parts.join(" ");
  const characters = text.replace(/\s/g, "").length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return { words, characters, minutes };
}
