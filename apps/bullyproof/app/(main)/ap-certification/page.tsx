"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/hooks/use-page-title";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { certificationStages } from "@/server/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Award, BookOpen, Loader2 } from "lucide-react";

type Stage = typeof certificationStages.$inferSelect;

export default function APCertificationPage() {
  usePageTitle(["ap-certification"]);
  const [mainStage, setMainStage] = useState<Stage | null>(null);
  const [otherStages, setOtherStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const stagesResult = await certificationApi.stages.list();
        if (!stagesResult.data) {
          setError(
            stagesResult.error?.message ??
              "Failed to fetch certification stages"
          );
          return;
        }

        // Find the main stage (code "C")
        const main = stagesResult.data.find((stage) => stage.code === "C");
        if (main) {
          setMainStage(main);
        }

        // Get other stages (not "C")
        const others = stagesResult.data.filter((stage) => stage.code !== "C");
        setOtherStages(others);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStages();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            AP Certification Stages
          </h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AP Certification</h2>
      </div>

      <div className="flex flex-col gap-12">
        {/* Main Certification Stage (Code C) */}
        {mainStage && (
          <Link href={`/ap-certification/${mainStage.code}`}>
            <Card className="border-2 transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">
                        {mainStage.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-base mt-2">
                      Code: {mainStage.code}
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="bg-green-600">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Code</p>
                        <p className="text-sm font-medium">{mainStage.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Sort Index
                        </p>
                        <p className="text-sm font-medium">
                          {mainStage.sortIndex}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">ID</p>
                        <p className="text-xs font-mono">{mainStage.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Other Certification Stages (C1, C2, C3, C4) */}
        {otherStages.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                Other Certification Stages
              </h3>
              <p className="text-sm text-muted-foreground">
                Additional certification programs available on the platform.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {otherStages.map((stage) => (
                <Link key={stage.id} href={`/ap-certification/${stage.code}`}>
                  <Card className="transition-shadow hover:shadow-md cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-base">
                            {stage.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Certification program: {stage.code}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">Available</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Code: {stage.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Sort: {stage.sortIndex}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
