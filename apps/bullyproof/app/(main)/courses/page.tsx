"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FeatureGuard } from "@/components/molecules/feature-guard";

export default function CoursesPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/courses/amayda-program");
  }, [router]);

  return (
    <FeatureGuard feature="/courses">
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </FeatureGuard>
  );
}
