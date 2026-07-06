"use client";

import { Suspense } from "react";
import {
  Sheet,
  SheetContent,
} from "@workspace/ui/components/sheet";
import { Loader2 } from "lucide-react";
import { SchoolDetailDrawerContent } from "../school-detail/school-detail-drawer-content";
import type { SchoolDetailDrawerProps } from "../school-detail/types";

export type { SchoolDetailDrawerProps, SchoolDetailTabId } from "../school-detail/types";
export { formatSchoolLevel } from "../school-detail/format-school-level";

export function SchoolDetailDrawer(props: SchoolDetailDrawerProps) {
  return (
    <Suspense
      fallback={
        <Sheet open={props.open} onOpenChange={props.onOpenChange}>
          <SheetContent
            side="bottom"
            className="h-[95vh] w-full max-w-6xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </SheetContent>
        </Sheet>
      }
    >
      <SchoolDetailDrawerContent {...props} />
    </Suspense>
  );
}
