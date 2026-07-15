import type { Metadata } from "next";
import { Award } from "lucide-react";

import { ComingSoon } from "@/components/molecules/coming-soon";

export const metadata: Metadata = { title: "Certifications" };

export default function CertificationsPage() {
  return (
    <ComingSoon
      icon={Award}
      title="Certifications"
      description="Track ASIC, dangerous goods, and airside driving authority per employee, with expiry alerts. Coming soon."
    />
  );
}
