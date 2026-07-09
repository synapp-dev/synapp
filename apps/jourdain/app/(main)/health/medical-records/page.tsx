"use client";

import { FileHeart } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function HealthMedicalRecordsPage() {
  return (
    <ComingSoon
      title="Medical Records"
      description="Your complete medical history in your own hands: results, referrals, and reports."
      icon={FileHeart}
      bullets={["Test results", "Referrals", "Visit summaries"]}
    />
  );
}
