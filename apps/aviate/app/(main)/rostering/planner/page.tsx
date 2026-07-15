import type { Metadata } from "next";

import { RosteringClient } from "../rostering-client";

export const metadata: Metadata = { title: "Roster Planner" };

export default function RosterPlannerPage() {
  return <RosteringClient />;
}
