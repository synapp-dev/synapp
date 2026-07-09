"use client";

import { Calculator } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function FinanceTaxesPage() {
  return (
    <ComingSoon
      title="Taxes"
      description="Tax without the annual scramble: deductions captured year-round, everything ready at lodgment."
      icon={Calculator}
      bullets={["Deduction capture", "Document vault", "Lodgment checklist"]}
    />
  );
}
