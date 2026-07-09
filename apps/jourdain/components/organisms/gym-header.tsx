"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dumbbell } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { GymTabNav } from "./gym-tab-nav";

// The header exposes a right-hand slot that pages fill with their own actions
// (e.g. the Progress page's Demo data / Clear buttons) so everything stays on
// one row with the title + tabs.
const SlotContext = createContext<HTMLElement | null>(null);

export function GymHeader({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);

  return (
    <SlotContext.Provider value={slot}>
      <div className="flex min-h-0 flex-col gap-6">
        {/* The section title moves to the app header on mobile, so the in-page
            header is desktop-only. */}
        <div className="hidden md:block">
          <PageHeader
            title="Gym"
            icon={<Dumbbell className="h-6 w-6" />}
            actions={
              <>
                <GymTabNav />
                <div ref={setSlot} className="flex items-center gap-2" />
              </>
            }
          />
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </SlotContext.Provider>
  );
}

/** Portals its children into the header's right-hand action slot. */
export function GymHeaderActions({ children }: { children: ReactNode }) {
  const slot = useContext(SlotContext);
  if (!slot) return null;
  return createPortal(children, slot);
}
