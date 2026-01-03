"use client";

import { useEffect, useState } from "react";
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
import { certificationApi } from "@/entities/certification/api/endpoints";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import type { certificationStages } from "@/server/db/schema";
import type { curriculumStages } from "@/server/db/schema";

type CertificationStage = typeof certificationStages.$inferSelect;
type CurriculumStage = typeof curriculumStages.$inferSelect;

export default function AdminContentPage() {
  const router = useRouter();
  const [certificationStages, setCertificationStages] = useState<
    CertificationStage[]
  >([]);
  const [curriculumStages, setCurriculumStages] = useState<CurriculumStage[]>(
    []
  );
  const [isLoadingCertification, setIsLoadingCertification] = useState(true);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(true);

  useEffect(() => {
    const fetchCertificationStages = async () => {
      try {
        const result = await certificationApi.stages.list();
        if (result.data) {
          // Sort by sortIndex to ensure correct order
          const sorted = [...result.data].sort(
            (a, b) => a.sortIndex - b.sortIndex
          );
          setCertificationStages(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch certification stages:", err);
      } finally {
        setIsLoadingCertification(false);
      }
    };

    const fetchCurriculumStages = async () => {
      try {
        const result = await curriculumApi.stages.list();
        if (result.data) {
          // Sort by sortIndex to ensure correct order
          const sorted = [...result.data].sort(
            (a, b) => a.sortIndex - b.sortIndex
          );
          setCurriculumStages(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch curriculum stages:", err);
      } finally {
        setIsLoadingCurriculum(false);
      }
    };

    fetchCertificationStages();
    fetchCurriculumStages();
  }, []);

  return (
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
              {isLoadingCertification ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading stages...</span>
                </div>
              ) : certificationStages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {certificationStages.map((stage) => (
                    <Link
                      key={stage.id}
                      href={`/admin/content/certification/${stage.code}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 px-3 py-1.5 text-sm font-medium"
                      >
                        {stage.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No certification stages found
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
              {isLoadingCurriculum ? (
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
  );
}
