import type { gmail_v1 } from "googleapis";
import type { PersonEmailThread } from "@/entities/people/model/types";

const METADATA_HEADERS = ["From", "To", "Subject", "Date"];

// How many distinct threads to surface, and how many messages to scan to find
// them. Gmail returns messages newest-first, so scanning a small window keeps
// the representative (latest) message per thread without extra round-trips.
const MAX_THREADS = 8;
const SCAN_MESSAGES = 30;

function header(
  message: gmail_v1.Schema$Message,
  name: string
): string {
  const headers = message.payload?.headers ?? [];
  const match = headers.find(
    (entry) => entry.name?.toLowerCase() === name.toLowerCase()
  );
  return match?.value ?? "";
}

/** Pull a human display name out of a "Name <addr@host>" From header. */
function senderName(from: string): string {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const [, name, email] = match;
    return name?.trim() || email?.trim() || from.trim();
  }
  return from.trim();
}

/** Decode the HTML entities Gmail leaves in message snippets. */
function decodeSnippet(snippet: string): string {
  return snippet
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function mapMessage(message: gmail_v1.Schema$Message): PersonEmailThread {
  const labels = message.labelIds ?? [];
  const internal = message.internalDate ? Number(message.internalDate) : NaN;
  const date = Number.isFinite(internal)
    ? new Date(internal).toISOString()
    : (header(message, "Date") ?? "");

  return {
    threadId: message.threadId ?? message.id ?? "",
    messageId: message.id ?? "",
    subject: header(message, "Subject") || "(no subject)",
    fromName: senderName(header(message, "From")),
    date,
    snippet: decodeSnippet(message.snippet ?? ""),
    unread: labels.includes("UNREAD"),
    outbound: labels.includes("SENT"),
    link: `https://mail.google.com/mail/u/0/#all/${message.threadId ?? message.id ?? ""}`,
  };
}

/** Gmail search query matching any message to or from the given addresses. */
function buildQuery(emails: string[]): string {
  const clauses = emails
    .map((email) => email.trim())
    .filter(Boolean)
    .flatMap((email) => [`from:${email}`, `to:${email}`]);
  return clauses.join(" OR ");
}

/**
 * Recent email threads involving a person, newest first. Returns the latest
 * message per thread (subject, sender, snippet, read/direction flags).
 */
export async function listPersonEmailThreads(
  gmail: gmail_v1.Gmail,
  emails: string[]
): Promise<PersonEmailThread[]> {
  const query = buildQuery(emails);
  if (!query) return [];

  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: SCAN_MESSAGES,
  });

  // messages.list is newest-first, so the first id seen for a thread is its
  // latest message — exactly the one we want to summarise.
  const seen = new Set<string>();
  const representatives: string[] = [];
  for (const item of list.data.messages ?? []) {
    const threadId = item.threadId ?? item.id;
    if (!item.id || !threadId || seen.has(threadId)) continue;
    seen.add(threadId);
    representatives.push(item.id);
    if (representatives.length >= MAX_THREADS) break;
  }

  const messages = await Promise.all(
    representatives.map((id) =>
      gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: METADATA_HEADERS,
      })
    )
  );

  return messages.map((response) => mapMessage(response.data));
}
