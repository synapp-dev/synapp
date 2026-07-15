"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";

import { kindConfig } from "@/lib/requests/config";
import { describePayload } from "@/lib/requests/payload";
import {
  useCancelRequest,
  useDecideRequest,
  useMyEmployee,
  useRequestDetail,
} from "@/hooks/requests/use-requests";
import { ApprovalTimeline } from "@/app/(main)/requests/components/approval-timeline";
import {
  KindIcon,
  RequestStatusBadge,
} from "@/app/(main)/requests/components/request-visuals";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd MMM yyyy · HH:mm");
  } catch {
    return iso;
  }
}

export function RequestDetailClient({ id }: { id: string }) {
  const { data: request, isLoading, error } = useRequestDetail(id);
  const { data: me } = useMyEmployee();
  const decide = useDecideRequest(id);
  const cancel = useCancelRequest(id);

  const [signature, setSignature] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (me?.fullName) setSignature(me.fullName);
  }, [me?.fullName]);

  const act = async (decision: "approved" | "declined") => {
    if (decision === "approved" && !signature.trim()) {
      toast.error("Add your name as the sign-off");
      return;
    }
    try {
      await decide.mutateAsync({ decision, signatureName: signature, note });
      setNote("");
      toast.success(
        decision === "approved" ? "Step approved" : "Request declined"
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const doCancel = async () => {
    try {
      await cancel.mutateAsync();
      toast.success("Request cancelled");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <Link
        href="/requests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All requests
      </Link>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error || !request ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "Request not found."}
          </p>
        </Card>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <KindIcon kind={request.kind} className="size-11" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {request.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {kindConfig(request.kind).label} ·{" "}
                  <span className="font-mono">{request.reference}</span>
                </p>
              </div>
            </div>
            <RequestStatusBadge status={request.status} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Left: details */}
            <div className="space-y-6">
              <Card className="gap-4 p-5">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                  <Meta label="Employee" value={request.employeeName ?? "—"} />
                  <Meta label="Station" value={request.stationIata ?? "—"} />
                  <Meta
                    label="Department"
                    value={request.departmentName ?? "—"}
                  />
                  <Meta label="Submitted" value={fmt(request.submittedAt)} />
                  {request.resolvedAt ? (
                    <Meta label="Resolved" value={fmt(request.resolvedAt)} />
                  ) : null}
                </dl>

                <Separator />

                {describePayload(request.kind, request.payload).map(
                  (section, i) => (
                    <div key={i} className="space-y-2">
                      {section.title ? (
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {section.title}
                        </p>
                      ) : null}
                      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                        {section.fields.map((f, j) => (
                          <div key={j} className="flex flex-col">
                            <dt className="text-xs text-muted-foreground">
                              {f.label}
                            </dt>
                            <dd className="font-medium">{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )
                )}

                {request.resolutionNote ? (
                  <div className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Outcome: </span>
                    {request.resolutionNote}
                  </div>
                ) : null}
              </Card>
            </div>

            {/* Right: approvals + actions */}
            <div className="space-y-4">
              {request.canAct ? (
                <Card className="gap-3 p-5">
                  <p className="text-sm font-semibold">Your decision</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="sig">Sign-off name</Label>
                    <Input
                      id="sig"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="note">Note (optional)</Label>
                    <Textarea
                      id="note"
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={decide.isPending}
                      onClick={() => act("approved")}
                    >
                      <Check className="size-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      disabled={decide.isPending}
                      onClick={() => act("declined")}
                    >
                      <X className="size-4" />
                      Decline
                    </Button>
                  </div>
                </Card>
              ) : null}

              <Card className="gap-4 p-5">
                <p className="text-sm font-semibold">Approval chain</p>
                <ApprovalTimeline
                  approvals={request.approvals}
                  currentStep={request.currentStep}
                  status={request.status}
                />
              </Card>

              {request.isOwner &&
              (request.status === "submitted" ||
                request.status === "in_review") ? (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  disabled={cancel.isPending}
                  onClick={doCancel}
                >
                  Cancel this request
                </Button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
