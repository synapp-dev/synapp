import Link from "next/link";
import { format, parseISO } from "date-fns";

import { Card } from "@workspace/ui/components/card";
import { Empty } from "@workspace/ui/components/empty";

import { kindConfig } from "@/lib/requests/config";
import type { RequestListItem } from "@/entities/requests/model/types";
import {
  KindIcon,
  RequestStatusBadge,
} from "@/app/(main)/requests/components/request-visuals";

function whenLabel(item: RequestListItem): string {
  const iso = item.resolvedAt ?? item.submittedAt;
  try {
    return format(parseISO(iso), "dd MMM yyyy");
  } catch {
    return "";
  }
}

export function RequestList({
  items,
  emptyTitle,
  emptyHint,
}: {
  items: RequestListItem[];
  emptyTitle: string;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return (
      <Empty className="rounded-xl border border-dashed py-14">
        <p className="font-medium">{emptyTitle}</p>
        {emptyHint ? (
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link key={item.id} href={`/requests/${item.id}`} className="block">
          <Card className="flex-row items-center gap-4 p-4 transition-colors hover:border-primary/50">
            <KindIcon kind={item.kind} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{item.title}</p>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {kindConfig(item.kind).label}
                {item.employeeName ? ` · ${item.employeeName}` : ""}
                {item.currentStepLabel
                  ? ` · Awaiting ${item.currentStepLabel}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <RequestStatusBadge status={item.status} />
              <span className="font-mono text-[11px] text-muted-foreground">
                {item.reference}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {whenLabel(item)}
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
