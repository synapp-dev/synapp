import { Suspense } from "react";
import { SchoolsSection } from "@/entities/dashboard/ui/admin/sections/schools/schools-section";

export default function AdminSchoolsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SchoolsSection />
    </Suspense>
  );
}
