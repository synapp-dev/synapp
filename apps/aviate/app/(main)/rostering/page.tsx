import type { Metadata } from "next";

import { DutyRoster } from "./components/duty-roster";

export const metadata: Metadata = { title: "Roster" };

export default function RosteringPage() {
  return <DutyRoster />;
}
