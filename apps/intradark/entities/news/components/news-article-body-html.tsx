import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";

import { NEWS_TIPTAP_EXTENSIONS } from "@/entities/news/lib/tiptap-extensions";

function bodyToHtml(doc: unknown): string {
  try {
    return generateHTML((doc ?? {}) as JSONContent, NEWS_TIPTAP_EXTENSIONS);
  } catch {
    return "";
  }
}

export function NewsArticleBodyHtml({ doc }: { doc: unknown }) {
  const html = bodyToHtml(doc);
  return (
    <div
      className="prose prose-lg prose-neutral dark:prose-invert max-w-none text-foreground [&_a]:text-primary [&_a]:underline [&_img]:rounded-lg [&_img]:border [&_[data-youtube-video]]:my-6 [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border"
      // eslint-disable-next-line react/no-danger -- trusted staff-authored TipTap JSON only
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
