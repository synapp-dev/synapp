export type OutboundAttachment = {
  name: string;
  contentBase64: string;
  contentType: string;
};

export type OutboundEmail = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  attachments?: OutboundAttachment[];
};

export function isOutboundEmailConfigured(): boolean {
  return Boolean(process.env.POSTMARK_SERVER_TOKEN?.trim());
}

/**
 * Sends via Postmark's transactional API. Returns null when
 * POSTMARK_SERVER_TOKEN is unset so callers can fall back to
 * record-only mode (local dev, preview deploys).
 */
export async function sendViaPostmark(
  email: OutboundEmail,
): Promise<{ providerMessageId: string } | null> {
  const token = process.env.POSTMARK_SERVER_TOKEN?.trim();
  if (!token) return null;

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: email.from,
      To: email.to,
      ReplyTo: email.replyTo ?? email.from,
      Subject: email.subject,
      TextBody: email.textBody,
      ...(email.htmlBody ? { HtmlBody: email.htmlBody } : {}),
      MessageStream: "outbound",
      Attachments: (email.attachments ?? []).map((attachment) => ({
        Name: attachment.name,
        Content: attachment.contentBase64,
        ContentType: attachment.contentType,
      })),
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { MessageID?: string; Message?: string; ErrorCode?: number }
    | null;

  if (!response.ok || !payload?.MessageID) {
    throw new Error(
      `Postmark send failed (${response.status}): ${payload?.Message ?? "unknown error"}`,
    );
  }

  return { providerMessageId: payload.MessageID };
}
