"use client";

import { useEffect } from "react";
import { PlatformAdminGuard } from "@/components/molecules/platform-admin-guard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { GraduationCap, BookOpenText, Loader2 } from "lucide-react";
import { useStages } from "@/entities/stages/model/store";
import { useCertificationCourses } from "@/entities/certification/model/store";

export default function AdminContentPage() {
  const router = useRouter();
  
  // Use cached React Query hooks instead of manual fetching
  const { stages: curriculumStages, isLoading: isLoadingCurriculum, refetch: refetchCurriculum } = useStages();
  const { courses: certificationCourses, isLoading: isLoadingCertification, refetch: refetchCertification } = useCertificationCourses();

  // Trigger background refetch on mount to ensure complete data
  // This ensures that even if we navigated from a page that only cached
  // partial data, we'll fetch all stages in the background while showing cached data
  useEffect(() => {
    // Refetch in the background without blocking the UI
    // The cached data will display immediately, and the UI will update when fresh data arrives
    refetchCurriculum();
    refetchCertification();
  }, [refetchCurriculum, refetchCertification]);

  return (
    <>
      <PlatformAdminGuard />
      <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Content Management
        </h1>
        <p className="text-muted-foreground">
          Manage curriculum and certification content
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer h-full"
          onClick={() => router.push("/admin/content/certification")}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <CardTitle>Certification</CardTitle>
                <CardDescription>
                  Manage certification content and requirements
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {isLoadingCertification && certificationCourses.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading courses...</span>
                </div>
              ) : certificationCourses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {certificationCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/admin/content/certification/${course.code}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 px-3 py-1.5 text-sm font-medium"
                      >
                        {course.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No certification courses found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer h-full"
          onClick={() => router.push("/admin/content/curriculum")}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <BookOpenText className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <CardTitle>Curriculum</CardTitle>
                <CardDescription>
                  Manage curriculum stages, topics, and lessons
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {isLoadingCurriculum && curriculumStages.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading stages...</span>
                </div>
              ) : curriculumStages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {curriculumStages.map((stage) => (
                    <Link
                      key={stage.id}
                      href={`/admin/content/curriculum/${stage.code}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-green-100 hover:text-green-700 px-3 py-1.5 text-sm font-medium"
                      >
                        {stage.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No curriculum stages found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
