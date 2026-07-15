"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeader } from "@/components/molecules/page-header";
import { LEAVE_BALANCES } from "@/lib/aviate-demo";
import { useRequests } from "@/hooks/requests/use-requests";
import { RequestList } from "@/app/(main)/requests/components/request-list";

export function LeaveClient() {
  const { data, isLoading } = useRequests("mine");
  const leaveRequests = (data ?? []).filter(
    (r) => r.kind === "leave_application" || r.kind === "leave_request"
  );

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Leave & Time-Off"
        subtitle="Track your balances and submit new time-off requests"
      />

      {/* Balances */}
      <div className="grid gap-4 sm:grid-cols-3">
        {LEAVE_BALANCES.map((b) => (
          <Card key={b.type} className="gap-1 p-5">
            <p className="text-sm text-muted-foreground">{b.type}</p>
            <p className="text-3xl font-bold tracking-tight">
              {b.days}{" "}
              <span className="text-lg font-semibold text-muted-foreground">
                days
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{b.caption}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Submitted leave requests, from the requests workflow */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">My Leave Requests</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <RequestList
              items={leaveRequests}
              emptyTitle="No leave requests yet"
              emptyHint="Submit an application for leave to get started."
            />
          )}
        </section>

        {/* CTA into the leave application form */}
        <Card className="h-fit gap-3 p-5">
          <h2 className="text-base font-semibold">New leave application</h2>
          <p className="text-sm text-muted-foreground">
            Submit an application for leave. It routes to your supervisor,
            department manager, then payroll for ESP entry.
          </p>
          <Button
            asChild
            className="w-full bg-orange-500 text-white hover:bg-orange-600"
          >
            <Link href="/requests/new/leave_application">
              <Plus className="size-4" />
              Apply for leave
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/requests">
              View all my requests
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
