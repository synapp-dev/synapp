"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import { buildScopedPath } from "@/lib/build-scoped-path";
import {
  payrollApi,
  type PayrollPagePayload,
  type PayRunSummaryDto,
} from "@/entities/workforce/payroll-export/api/endpoints";

type PayrollExportPageProps = {
  organisation: string;
  venue: string;
};

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function PayrollExportPage({ organisation, venue }: PayrollExportPageProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<PayrollPagePayload | null>(null);
  const [activeRun, setActiveRun] = useState<PayRunSummaryDto | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");

  const integrationsHref = buildScopedPath(organisation, venue, "settings/integrations");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await payrollApi.fetchPage(organisation, venue);
      setPage(data);
      setActiveRun(data.activePayRun);
      if (!selectedPeriodId && data.periods[0]) {
        setSelectedPeriodId(data.periods[0].payPeriodId);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load payroll");
    } finally {
      setLoading(false);
    }
  }, [organisation, venue, selectedPeriodId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPeriod = useMemo(
    () => page?.periods.find((p) => p.payPeriodId === selectedPeriodId) ?? null,
    [page, selectedPeriodId],
  );

  async function runStep(fn: () => Promise<PayRunSummaryDto | unknown>, success: string) {
    setBusy(true);
    try {
      const result = await fn();
      if (result && typeof result === "object" && "id" in result) {
        setActiveRun(result as PayRunSummaryDto);
      }
      toast.success(success);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return null;
  }

  const run = activeRun;
  const editable =
    run?.status === "draft" ||
    run?.status === "returned_for_revision" ||
    !run;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll Export</h1>
        <p className="text-sm text-muted-foreground">
          Prepare pay runs, run compliance checks, and approve payment via Xero.
        </p>
      </div>

      {!page.xeroConnected && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connect Xero</CardTitle>
            <CardDescription>
              Xero is required for paying staff and lodging STP with the ATO.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={integrationsHref}>Settings → Integrations</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pay periods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {page.periods.map((p) => (
              <Button
                key={p.payPeriodId}
                size="sm"
                variant={p.payPeriodId === selectedPeriodId ? "default" : "outline"}
                onClick={() => setSelectedPeriodId(p.payPeriodId)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {selectedPeriod && (
            <p className="text-sm text-muted-foreground">
              {selectedPeriod.approvedTimesheetCount} approved timesheet
              {selectedPeriod.approvedTimesheetCount === 1 ? "" : "s"} · Period status:{" "}
              {selectedPeriod.status}
              {selectedPeriod.payRunStatus ? (
                <>
                  {" "}
                  · Run: <Badge variant="secondary">{statusLabel(selectedPeriod.payRunStatus)}</Badge>
                </>
              ) : null}
            </p>
          )}

          {selectedPeriod && selectedPeriod.approvedTimesheetCount === 0 && (
            <p className="text-sm">
              No timesheets approved for this period yet.{" "}
              <Link
                href={buildScopedPath(organisation, venue, "workforce/timesheets")}
                className="underline"
              >
                Approve timesheets
              </Link>{" "}
              before preparing payroll.
            </p>
          )}

          {page.canPrepare && selectedPeriod && selectedPeriod.approvedTimesheetCount > 0 && editable && (
            <Button
              disabled={busy}
              onClick={() =>
                runStep(
                  () => payrollApi.prepare(organisation, selectedPeriod.payPeriodId),
                  "Pay run prepared",
                )
              }
            >
              Prepare payroll
            </Button>
          )}
        </CardContent>
      </Card>

      {run && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pay run summary</CardTitle>
            <CardDescription>
              {run.periodStart} → {run.periodEnd} · Pay date {run.payDate} ·{" "}
              <Badge>{statusLabel(run.status)}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {run.ownerReturnNotes && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                Owner notes: {run.ownerReturnNotes}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Gross</p>
                <p className="font-medium">{formatMoney(run.totalGrossCents)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Super</p>
                <p className="font-medium">{formatMoney(run.totalSuperCents)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PAYG</p>
                <p className="font-medium">{formatMoney(run.totalPaygCents)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net</p>
                <p className="font-medium">{formatMoney(run.totalNetCents)}</p>
              </div>
            </div>

            {run.lineItems.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.lineItems.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.staffName}</TableCell>
                      <TableCell className="text-right">{line.hoursTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatMoney(line.grossCents)}</TableCell>
                      <TableCell className="text-right">{formatMoney(line.netCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex flex-wrap gap-2">
              {(run.status === "draft" || run.status === "returned_for_revision") && page.canPrepare && (
                <>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      runStep(
                        () => payrollApi.preflight(organisation, run.id),
                        "Pre-flight passed",
                      )
                    }
                  >
                    Run pre-flight
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      runStep(
                        () => payrollApi.calculate(organisation, run.id),
                        "Calculation complete",
                      )
                    }
                  >
                    Run calculation
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy || run.lineItems.length === 0}
                    onClick={() =>
                      runStep(
                        () => payrollApi.submit(organisation, run.id),
                        "Sent for Owner approval",
                      )
                    }
                  >
                    Send for Owner approval
                  </Button>
                </>
              )}

              {run.status === "pending_owner_approval" && page.canApprove && (
                <>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      runStep(() => payrollApi.approve(organisation, run.id), "Pay run approved")
                    }
                  >
                    Approve
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => setReturnOpen(true)}>
                    Return to manager
                  </Button>
                </>
              )}

              {(run.status === "approved" || run.status === "xero_push_pending") && page.canExecute && (
                <Button disabled={busy} onClick={() => setConfirmPayOpen(true)}>
                  {run.status === "xero_push_pending" ? "Retry push to Xero" : "Approve and pay"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmPayOpen} onOpenChange={setConfirmPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve and pay</DialogTitle>
            <DialogDescription>
              This will push the pay run to Xero, pay your staff, generate payslips, and lodge STP
              with the ATO. This action cannot be undone automatically.
            </DialogDescription>
          </DialogHeader>
          {run && (
            <div className="space-y-1 text-sm">
              <p>Net to staff: {formatMoney(run.totalNetCents)}</p>
              <p>Employees: {run.employeeCount}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPayOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !run}
              onClick={() => {
                if (!run) return;
                setConfirmPayOpen(false);
                const action =
                  run.status === "xero_push_pending"
                    ? () => payrollApi.retryXero(organisation, run.id, venue)
                    : () => payrollApi.execute(organisation, run.id, venue);
                void runStep(
                  action,
                  run.status === "xero_push_pending"
                    ? "Retry sent to Xero"
                    : "Pay run sent to Xero",
                );
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to manager</DialogTitle>
            <DialogDescription>Add notes explaining what needs to be fixed.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="Notes for the venue manager…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !run || !returnNotes.trim()}
              onClick={() => {
                if (!run) return;
                setReturnOpen(false);
                void runStep(
                  () => payrollApi.returnToManager(organisation, run.id, returnNotes.trim()),
                  "Returned to manager",
                );
                setReturnNotes("");
              }}
            >
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
