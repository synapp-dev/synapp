import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

function bodyToHtml(doc: unknown): string {
  try {
    return generateHTML((doc ?? {}) as JSONContent, [StarterKit]);
  } catch {
    return "";
  }
}

export function NewsArticleBodyHtml({ doc }: { doc: unknown }) {
  const html = bodyToHtml(doc);
  return (
    <div
      className="prose prose-lg prose-neutral dark:prose-invert max-w-none text-foreground [&_a]:text-primary [&_a]:underline"
      // eslint-disable-next-line react/no-danger -- trusted staff-authored TipTap JSON only
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
