import { Suspense } from "react";
import { SchoolsSection } from "@/entities/dashboard/ui/admin/sections/schools/schools-section";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["admin", "schools"]);

export default function AdminSchoolsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SchoolsSection />
    </Suspense>
  );
}
