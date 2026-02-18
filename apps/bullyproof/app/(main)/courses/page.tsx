"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { certificationApi } from "@/entities/certification/api/endpoints";
import { createSlug } from "@/utils/slug";

export default function CoursesPage() {
  const router = useRouter();

  useEffect(() => {
    const redirectToFirstCourse = async () => {
      const result = await certificationApi.courses.list({ limit: 1, offset: 0 });
      const firstCourse = result.data?.[0];
      if (firstCourse?.name) {
        router.push(`/courses/${createSlug(firstCourse.name)}`);
        return;
      }
      // Backward-compatible fallback if course list is temporarily unavailable.
      router.push("/courses/amayda-program");
    };

    redirectToFirstCourse();
  }, [router]);

  return (
    <FeatureGuard feature="/ap-certification">
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </FeatureGuard>
  );
}
