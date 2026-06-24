import "server-only";

import type { JSONContent } from "@tiptap/core";
import { generateJSON } from "@tiptap/html";

import { NEWS_TIPTAP_EXTENSIONS } from "@/entities/news/lib/tiptap-extensions";

import { steamBbcodeToHtml } from "./steam-bbcode";

function emptyDoc(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/** Convert Steam bbcode into a TipTap doc JSON using the shared news schema. */
export function steamBbcodeToTiptapDoc(bbcode: string): JSONContent {
  const html = steamBbcodeToHtml(bbcode);
  if (!html) return emptyDoc();
  try {
    return generateJSON(html, NEWS_TIPTAP_EXTENSIONS) as JSONContent;
  } catch {
    return emptyDoc();
  }
}
