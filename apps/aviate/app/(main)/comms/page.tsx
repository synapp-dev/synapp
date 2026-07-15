import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";

import { ComingSoon } from "@/components/molecules/coming-soon";

export const metadata: Metadata = { title: "Comms" };

export default function CommsPage() {
  return (
    <ComingSoon
      icon={MessagesSquare}
      title="Team comms"
      description="Channels for stations, departments, and shifts - announcements and threads where the roster lives. Coming soon."
    />
  );
}
