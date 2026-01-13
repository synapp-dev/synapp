"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { AlertCircle, GraduationCap } from "lucide-react";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { extractSchoolMetadata } from "./utils";
import type { School } from "@/entities/school/model/useListSchoolsQuery";

interface UserClass {
  classId: string;
  className: string;
  classCode: string | null;
  schoolId: string;
  schoolName: string | null;
  active: boolean;
  createdAt: string;
}

interface UserClassesTabProps {
  user: UserWithRolesAndSchools;
  schools: School[];
}

export function UserClassesTab({
  user,
  schools,
}: UserClassesTabProps) {
  // Fetch classes for this user
  const {
    data: userClasses = [],
    isLoading,
    error: fetchError,
  } = useQuery<UserClass[]>({
    queryKey: ["user-classes", user.id],
    queryFn: async () => {
      const result = await apiFetch<UserClass[]>(
        `/users/${user.id}/classes`
      );
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch classes");
      }
      return result.data || [];
    },
  });

  // Group classes by school
  const classesBySchool = new Map<string, UserClass[]>();
  userClasses.forEach((cls) => {
    if (!classesBySchool.has(cls.schoolId)) {
      classesBySchool.set(cls.schoolId, []);
    }
    classesBySchool.get(cls.schoolId)!.push(cls);
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load classes:{" "}
          {fetchError instanceof Error
            ? fetchError.message
            : "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  // Sort schools by creation date (oldest first)
  const sortedSchoolEntries = Array.from(classesBySchool.entries()).sort(
    ([schoolIdA], [schoolIdB]) => {
      const schoolA = schools.find((s) => s.id === schoolIdA);
      const schoolB = schools.find((s) => s.id === schoolIdB);

      const createdAtA = schoolA?.createdAt
        ? new Date(schoolA.createdAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const createdAtB = schoolB?.createdAt
        ? new Date(schoolB.createdAt).getTime()
        : Number.MAX_SAFE_INTEGER;

      return createdAtA - createdAtB;
    }
  );

  return (
    <div className="space-y-4">
      {classesBySchool.size === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No classes</AlertTitle>
          <AlertDescription>
            This user has no classes assigned.
          </AlertDescription>
        </Alert>
      )}

      {classesBySchool.size > 0 && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Assigned classes</h3>
          </div>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {sortedSchoolEntries.map(([schoolId, schoolClasses]) => {
                const school = schools.find((s) => s.id === schoolId);
                const schoolName = school?.name || schoolClasses[0]?.schoolName || "Unknown School";
                const { stateText, sectorText, levelsText } =
                  extractSchoolMetadata(school || null);
                const metadataParts = [
                  stateText,
                  sectorText,
                  levelsText,
                ].filter(Boolean);

                return (
                  <div key={schoolId} className="space-y-2">
                    <Card className="border">
                      <CardContent className="px-4 py-4 space-y-3">
                        {/* School Title */}
                        <div className="flex flex-col -space-y-0.5">
                          <h3 className="text-lg font-semibold">
                            {schoolName}
                          </h3>
                          {metadataParts.length > 0 && (
                            <div className="flex items-center gap-1 text-muted-foreground text-[0.65rem]">
                              {metadataParts.map((part, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1"
                                >
                                  <div className="truncate capitalize">
                                    {part}
                                  </div>
                                  {index < metadataParts.length - 1 && (
                                    <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Classes List */}
                        <div className="space-y-2">
                          {schoolClasses.map((cls) => (
                            <div
                              key={cls.classId}
                              className="flex items-center justify-between p-2 rounded-md border bg-card"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {cls.className}
                                  </span>
                                  {cls.classCode && (
                                    <span className="text-xs text-muted-foreground">
                                      {cls.classCode}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Badge
                                variant={cls.active ? "default" : "secondary"}
                                className="ml-2"
                              >
                                {cls.active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
