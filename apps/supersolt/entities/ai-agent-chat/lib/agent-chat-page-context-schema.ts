import { z } from "zod";

const MAX_PATHNAME_LEN = 2048;
const MAX_PAGE_LABEL_LEN = 200;

const pathnameField = z
  .string()
  .max(MAX_PATHNAME_LEN)
  .transform((s) => s.replace(/[\r\n\u0000]/g, " ").trim())
  .refine((s) => s.length > 0, { message: "empty" });

const pageLabelField = z
  .string()
  .max(MAX_PAGE_LABEL_LEN)
  .transform((s) => s.replace(/[\r\n\u0000]/g, " ").trim())
  .refine((s) => s.length > 0, { message: "empty" });

export type SafeAgentChatPageContext = {
  pathname?: string;
  pageLabel?: string;
};

/**
 * Parses optional page context from the chat request body.
 * Invalid or oversized values are omitted — chat must never fail solely on these fields.
 */
export function parseAgentChatPageContextFromBody(
  body: Record<string, unknown>,
): SafeAgentChatPageContext {
  const out: SafeAgentChatPageContext = {};

  const rawPath = body.pathname;
  const pathResult = pathnameField.safeParse(rawPath);
  if (pathResult.success && pathResult.data.startsWith("/")) {
    out.pathname = pathResult.data;
  }

  const rawLabel = body.pageLabel;
  const labelResult = pageLabelField.safeParse(rawLabel);
  if (labelResult.success) {
    out.pageLabel = labelResult.data;
  }

  return out;
}

export function buildPageContextSystemAppend(
  ctx: SafeAgentChatPageContext,
): string | null {
  if (!ctx.pathname && !ctx.pageLabel) return null;
  const parts: string[] = [];
  if (ctx.pathname) {
    parts.push(`The user is currently viewing this in-app path: ${ctx.pathname}.`);
  }
  if (ctx.pageLabel) {
    parts.push(`Page / section label (from client): ${ctx.pageLabel}.`);
  }
  return parts.join(" ");
}
