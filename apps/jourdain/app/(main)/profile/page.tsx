"use client";

import { UserRound } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function ProfilePage() {
  return (
    <ComingSoon
      title="Profile"
      description="You, at a glance: your account, your preferences, and how Jourdain is shaped around you."
      icon={UserRound}
      bullets={["Account details", "Preferences", "Connected data"]}
    />
  );
}
