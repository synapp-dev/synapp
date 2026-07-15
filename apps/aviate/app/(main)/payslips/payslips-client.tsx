"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

import { PageHeader } from "@/components/molecules/page-header";
import { PAYSLIPS, STATUS_TONE, aud, type Payslip } from "@/lib/aviate-demo";

export function PayslipsClient() {
  const [selectedId, setSelectedId] = React.useState(PAYSLIPS[0]!.id);
  const selected =
    PAYSLIPS.find((p) => p.id === selectedId) ?? PAYSLIPS[0]!;

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="My Payslips"
        subtitle="Access your historical payroll and breakdown statements"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Statements table */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Recent Statements</h2>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">
                      Pay Period
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Gross Pay
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Deductions
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Net Pay</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {PAYSLIPS.map((p) => {
                    const active = p.id === selected.id;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className={cn(
                          "cursor-pointer border-b transition-colors last:border-0",
                          active
                            ? "bg-orange-50 dark:bg-orange-500/10"
                            : "hover:bg-muted/40"
                        )}
                      >
                        <td className="relative px-4 py-3.5 font-medium">
                          {active ? (
                            <span className="absolute inset-y-0 left-0 w-1 bg-orange-500" />
                          ) : null}
                          {p.period}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          {aud(p.gross)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-rose-600 dark:text-rose-400">
                          {aud(p.deductions)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                          {aud(p.net)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            className={cn(
                              "border-transparent capitalize",
                              STATUS_TONE.positive
                            )}
                          >
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Breakdown panel */}
        <StatementBreakdown payslip={selected} />
      </div>
    </div>
  );
}

function StatementBreakdown({ payslip }: { payslip: Payslip }) {
  return (
    <Card className="h-fit gap-0 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Statement Breakdown</h2>
        <Button
          size="sm"
          className="bg-orange-500 text-white hover:bg-orange-600"
          onClick={() =>
            toast.success(`Payslip ${payslip.period} download started`)
          }
        >
          <Download className="size-4" />
          PDF
        </Button>
      </div>

      <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Pay Period
        </p>
        <p className="font-semibold">{payslip.period}</p>
      </div>

      <SectionLabel>Earnings</SectionLabel>
      {payslip.earnings.map((line) => (
        <Line key={line.label} label={line.label} amount={aud(line.amount)} />
      ))}
      <TotalLine label="Gross Earnings" amount={aud(payslip.gross)} />

      <SectionLabel>Deductions &amp; Taxes</SectionLabel>
      {payslip.taxes.map((line) => (
        <Line
          key={line.label}
          label={line.label}
          amount={`- ${aud(line.amount)}`}
          negative
        />
      ))}
      <TotalLine
        label="Total Deductions"
        amount={`- ${aud(payslip.deductions)}`}
        negative
      />

      <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-100 px-4 py-3 dark:bg-emerald-500/15">
        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
          Net Pay (Take Home)
        </span>
        <span className="font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
          {aud(payslip.net)}
        </span>
      </div>
    </Card>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function Line({
  label,
  amount,
  negative,
}: {
  label: string;
  amount: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          negative ? "text-rose-600 dark:text-rose-400" : ""
        )}
      >
        {amount}
      </span>
    </div>
  );
}

function TotalLine({
  label,
  amount,
  negative,
}: {
  label: string;
  amount: string;
  negative?: boolean;
}) {
  return (
    <div className="mt-1 flex items-center justify-between border-t pt-2.5 text-sm font-semibold">
      <span>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          negative ? "text-rose-600 dark:text-rose-400" : ""
        )}
      >
        {amount}
      </span>
    </div>
  );
}
