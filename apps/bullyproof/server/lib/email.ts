/**
 * SMTP email helper for ticket notifications.
 *
 * Uses nodemailer with credentials from environment variables.
 * All sends are fire-and-forget — failures are logged but never
 * block the caller.
 *
 * Required env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 *   SMTP_FROM, TICKET_NOTIFY_EMAIL (comma-separated for multiple recipients)
 */

import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Transporter (created lazily on first use, reused thereafter)
// ---------------------------------------------------------------------------

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "[email] SMTP not configured — skipping email. Set SMTP_HOST, SMTP_USER, SMTP_PASS."
    );
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
    tls: { rejectUnauthorized: false }, // AuthSMTP uses a self-signed cert chain
  });

  return _transporter;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SchoolRole {
  schoolName: string;
  roleName: string;
}

export interface TicketEmailPayload {
  ticketId: string;
  type: string; // "bug" | "feature" | "question" | "feedback"
  description: string;
  pagePath: string;
  submitterEmail: string;
  submitterName: string;
  screenshotSignedUrl: string | null;
  createdAt: string;
  /** Platform role names e.g. ["Bullyproof Admin", "Intradark Developer"] */
  platformRoles: string[];
  /** School role assignments e.g. [{ schoolName: "ABC School", roleName: "Teacher" }] */
  schoolRoles: SchoolRole[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  question: "Question",
  feedback: "General Feedback",
};

const TYPE_COLORS: Record<string, string> = {
  bug: "#ef4444",
  feature: "#3b82f6",
  question: "#f59e0b",
  feedback: "#22c55e",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a notification email about a new feedback ticket.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendTicketNotificationEmail(
  payload: TicketEmailPayload
): Promise<void> {
  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const to = process.env.TICKET_NOTIFY_EMAIL;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!to) {
      console.warn("[email] TICKET_NOTIFY_EMAIL not set — skipping.");
      return;
    }

    const typeLabel = TYPE_LABELS[payload.type] || payload.type;
    const typeColor = TYPE_COLORS[payload.type] || "#6b7280";

    const subject = `[Bullyproof] [#${payload.ticketId.slice(0, 8)}] New ${typeLabel} — ${payload.submitterName} (${payload.submitterEmail})`;

    // ── Build user info section ──────────────────────────────────────────
    let userInfoRows = "";

    if (payload.platformRoles.length > 0) {
      const badges = payload.platformRoles
        .map(
          (r) =>
            `<span style="display:inline-block;padding:2px 8px;background:#ede9fe;color:#6d28d9;border-radius:4px;font-size:11px;font-weight:500;margin-right:4px;">${escapeHtml(r)}</span>`
        )
        .join("");
      userInfoRows += `
            <tr>
              <td style="padding:8px 16px;">
                <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Platform Roles</p>
                <div>${badges}</div>
              </td>
            </tr>`;
    }

    if (payload.schoolRoles.length > 0) {
      const schoolItems = payload.schoolRoles
        .map(
          (sr) =>
            `<span style="display:inline-block;padding:2px 8px;background:#dbeafe;color:#1d4ed8;border-radius:4px;font-size:11px;font-weight:500;margin-right:4px;margin-bottom:2px;">${escapeHtml(sr.schoolName)} — ${escapeHtml(sr.roleName)}</span>`
        )
        .join("");
      userInfoRows += `
            <tr>
              <td style="padding:8px 16px 12px;">
                <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">School Roles</p>
                <div>${schoolItems}</div>
              </td>
            </tr>`;
    }

    // ── Screenshot section ───────────────────────────────────────────────
    const screenshotSection = payload.screenshotSignedUrl
      ? `
        <tr>
          <td style="padding:12px 16px;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Screenshot</p>
            <a href="${escapeHtml(payload.screenshotSignedUrl)}" style="display:inline-block;padding:8px 16px;background:${typeColor};color:#fff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">
              View Screenshot
            </a>
          </td>
        </tr>`
      : "";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:${typeColor};padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.8);font-family:monospace;">
        #${escapeHtml(payload.ticketId)}
      </p>
      <h2 style="margin:0;color:#fff;font-size:16px;font-weight:600;">
        New ${escapeHtml(typeLabel)}
      </h2>
    </div>

    <!-- Body -->
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1f2937;">
      <!-- User info card -->
      <tr>
        <td style="padding:16px 16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:12px 16px;">
                <p style="margin:0 0 2px;font-size:13px;color:#6b7280;">From</p>
                <p style="margin:0;font-weight:600;">${escapeHtml(payload.submitterName)}</p>
                <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${escapeHtml(payload.submitterEmail)}</p>
              </td>
            </tr>
            ${userInfoRows}
            <tr>
              <td style="padding:8px 16px 12px;">
                <p style="margin:0 0 2px;font-size:13px;color:#6b7280;">Page</p>
                <code style="font-size:12px;background:#e5e7eb;padding:2px 6px;border-radius:4px;">${escapeHtml(payload.pagePath)}</code>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Description -->
      <tr>
        <td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Description</p>
          <div style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:14px;line-height:1.5;">
${escapeHtml(payload.description)}</div>
        </td>
      </tr>

      ${screenshotSection}

      <!-- Footer -->
      <tr>
        <td style="padding:12px 16px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            Ticket ID: ${escapeHtml(payload.ticketId)} &middot; ${escapeHtml(payload.createdAt)}
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`.trim();

    await transporter.sendMail({
      from,
      to, // nodemailer supports comma-separated addresses natively
      subject,
      html,
    });

    console.log(`[email] Ticket notification sent for ${payload.ticketId}`);
  } catch (err) {
    console.error("[email] Failed to send ticket notification:", err);
    // Never throw — this is fire-and-forget
  }
}
