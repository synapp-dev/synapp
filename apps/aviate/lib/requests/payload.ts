/**
 * Turns a request's opaque jsonb payload into labelled field groups the detail
 * view can render, without every kind needing a bespoke display component.
 */

import { format, parseISO } from "date-fns";

import type { RequestKind } from "@/lib/requests/config";

export type PayloadField = { label: string; value: string };
export type PayloadSection = { title?: string; fields: PayloadField[] };

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json {
  return value && typeof value === "object" ? (value as Json) : {};
}

function str(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function fmtDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  try {
    return format(parseISO(value), "EEE dd MMM yyyy");
  } catch {
    return value;
  }
}

const PAY_HOLIDAY_LABEL: Record<string, string> = {
  as_normal: "As normal (as pay days fall due)",
  prepay: "Pre-payment of holiday pay & loading",
};

export function describePayload(
  kind: RequestKind,
  payloadJson: unknown
): PayloadSection[] {
  const p = asRecord(payloadJson);

  switch (kind) {
    case "leave_application":
      return [
        {
          fields: [
            { label: "Leave type", value: str(p.leaveType) },
            { label: "First day", value: fmtDate(p.startDate) },
            { label: "Last day", value: fmtDate(p.endDate) },
            { label: "Number of hours", value: str(p.hours) },
            { label: "Date of return", value: fmtDate(p.returnDate) },
            {
              label: "Public holidays in leave",
              value: str(p.publicHolidays ?? 0),
            },
            {
              label: "Medical certificate attached",
              value: str(p.certificateAttached),
            },
            {
              label: "Pay holidays",
              value:
                PAY_HOLIDAY_LABEL[String(p.payHolidays)] ?? str(p.payHolidays),
            },
            { label: "Reason", value: str(p.reason) },
          ],
        },
      ];

    case "shift_swap":
    case "line_swap":
      return [
        {
          title: "Rostered shift",
          fields: [
            { label: "Date", value: fmtDate(p.rosteredDate) },
            { label: "Time", value: str(p.rosteredTime) },
          ],
        },
        {
          title: "Requested shift",
          fields: [
            { label: "Counterparty", value: str(p.requesteeName) },
            { label: "Date", value: fmtDate(p.requestedDate) },
            { label: "Time", value: str(p.requestedTime) },
          ],
        },
        { fields: [{ label: "Reason", value: str(p.reason) }] },
      ];

    case "change_of_details": {
      const categories = Array.isArray(p.categories)
        ? (p.categories as string[])
        : [];
      const sections: PayloadSection[] = [
        {
          fields: [
            {
              label: "Change categories",
              value: categories.length ? categories.join(", ") : "—",
            },
          ],
        },
      ];
      if (categories.includes("bank")) {
        const bank = asRecord(p.bank);
        sections.push({
          title: "Bank details",
          fields: [
            { label: "Institution", value: str(bank.institution) },
            { label: "BSB", value: str(bank.bsb) },
            { label: "Account name", value: str(bank.accountName) },
            {
              label: "Account number",
              value: bank.accountNumber ? "•••• (on file)" : "—",
            },
          ],
        });
      }
      if (categories.includes("personal")) {
        const personal = asRecord(p.personal);
        sections.push({
          title: "Personal details",
          fields: [
            { label: "Contact number", value: str(personal.phone) },
            { label: "Email", value: str(personal.email) },
            { label: "Address", value: str(personal.address) },
          ],
        });
      }
      return sections;
    }

    case "pay_query":
      return [
        {
          fields: [
            { label: "Payslip date", value: fmtDate(p.payslipDate) },
            { label: "Normal hours incorrect", value: str(p.normalHoursIncorrect) },
            { label: "Double hours incorrect", value: str(p.doubleHoursIncorrect) },
            { label: "Sunday hours incorrect", value: str(p.sundayHoursIncorrect) },
            { label: "Description", value: str(p.description) },
          ],
        },
      ];

    case "uniform_order": {
      const lines = Array.isArray(p.lines) ? (p.lines as Json[]) : [];
      return [
        {
          title: "Items",
          fields: lines.map((line) => ({
            label: `${str(line.garment)} · ${str(line.colour)}`,
            value: `Size ${str(line.size)} × ${str(line.qty)}`,
          })),
        },
        { fields: [{ label: "Comments", value: str(p.comments) }] },
      ];
    }

    default: {
      // Generic fallback: one field per top-level scalar.
      return [
        {
          fields: Object.entries(p)
            .filter(([, v]) => typeof v !== "object")
            .map(([k, v]) => ({ label: k, value: str(v) })),
        },
      ];
    }
  }
}
