"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Card } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

import { PageHeader } from "@/components/molecules/page-header";
import { REQUEST_KIND_LIST } from "@/lib/requests/config";
import { useRequests } from "@/hooks/requests/use-requests";
import { RequestList } from "@/app/(main)/requests/components/request-list";
import { KindIcon } from "@/app/(main)/requests/components/request-visuals";
import type { RequestScope } from "@/entities/requests/api/endpoints";

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
      ))}
    </div>
  );
}

function ScopeList({
  scope,
  emptyTitle,
  emptyHint,
}: {
  scope: RequestScope;
  emptyTitle: string;
  emptyHint?: string;
}) {
  const { data, isLoading, error } = useRequests(scope);

  if (isLoading) return <ListSkeleton />;
  if (error) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Couldn’t load requests: {error.message}
      </p>
    );
  }
  return (
    <RequestList
      items={data ?? []}
      emptyTitle={emptyTitle}
      emptyHint={emptyHint}
    />
  );
}

export function RequestsClient() {
  const inbox = useRequests("inbox");
  const inboxCount = inbox.data?.length ?? 0;

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Requests & Forms"
        subtitle="Submit and track the station’s workforce forms — leave, swaps, pay and more"
      />

      {/* New request launcher */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Start a new request</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REQUEST_KIND_LIST.map((k) => {
            const inner = (
              <Card
                className={cn(
                  "h-full flex-row items-start gap-3 p-4 transition-colors",
                  k.live
                    ? "hover:border-primary/50"
                    : "opacity-70"
                )}
              >
                <KindIcon kind={k.kind} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{k.label}</p>
                    {!k.live ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Soon
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {k.description}
                  </p>
                </div>
                {k.live ? (
                  <Plus className="size-4 shrink-0 text-muted-foreground" />
                ) : null}
              </Card>
            );

            return k.live ? (
              <Link key={k.kind} href={`/requests/new/${k.kind}`}>
                {inner}
              </Link>
            ) : (
              <div key={k.kind} aria-disabled>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* Lists */}
      <Tabs defaultValue="mine" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mine">My Requests</TabsTrigger>
          <TabsTrigger value="inbox" className="gap-1.5">
            Approvals
            {inboxCount > 0 ? (
              <span className="rounded-full bg-orange-500 px-1.5 text-[10px] font-semibold text-white">
                {inboxCount}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mine">
          <ScopeList
            scope="mine"
            emptyTitle="No requests yet"
            emptyHint="Start one from the options above."
          />
        </TabsContent>
        <TabsContent value="inbox">
          <ScopeList
            scope="inbox"
            emptyTitle="Nothing awaiting approval"
            emptyHint="Requests needing your sign-off will appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
