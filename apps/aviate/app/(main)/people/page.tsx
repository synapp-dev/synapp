import type { Metadata } from "next";
import { Users } from "lucide-react";

import { ComingSoon } from "@/components/molecules/coming-soon";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <ComingSoon
      icon={Users}
      title="People"
      description="Employee directory with roles, stations, departments, and certification expiry tracking. Coming soon."
    />
  );
}
