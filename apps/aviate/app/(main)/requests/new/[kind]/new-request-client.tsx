"use client";

import type { RequestKind } from "@/lib/requests/config";
import { LeaveApplicationForm } from "./forms/leave-application-form";
import { ShiftSwapForm } from "./forms/shift-swap-form";
import { ChangeOfDetailsForm } from "./forms/change-of-details-form";

/** Routes a live request kind to its form component. */
export function NewRequestClient({ kind }: { kind: RequestKind }) {
  switch (kind) {
    case "leave_application":
      return <LeaveApplicationForm />;
    case "shift_swap":
      return <ShiftSwapForm />;
    case "change_of_details":
      return <ChangeOfDetailsForm />;
    default:
      return null;
  }
}
