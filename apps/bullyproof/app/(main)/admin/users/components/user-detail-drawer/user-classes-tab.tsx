"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { AlertCircle, GraduationCap, Loader2, X } from "lucide-react";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { extractSchoolMetadata } from "./utils";
import type { School } from "@/entities/school/model/useListSchoolsQuery";
import { useClasses } from "@/entities/classes/model/store";

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
  /** When set, only show classes for this school */
  scopedSchoolId?: string;
  /** When true, show assign/remove controls. Default true for admin drawer. */
  canEdit?: boolean;
}

export function UserClassesTab({
  user,
  schools,
  scopedSchoolId,
  canEdit = true,
}: UserClassesTabProps) {
  const queryClient = useQueryClient();

  // Fetch classes for this user (optional schoolId filter)
  const {
    data: userClasses = [],
    isLoading,
    error: fetchError,
  } = useQuery<UserClass[]>({
    queryKey: ["user-classes", user.id, scopedSchoolId ?? "all"],
    queryFn: async () => {
      const url =
        scopedSchoolId !== undefined
          ? `/users/${user.id}/classes?schoolId=${scopedSchoolId}`
          : `/users/${user.id}/classes`;
      const result = await apiFetch<UserClass[]>(url);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch classes");
      }
      return result.data || [];
    },
  });

  // Classes at the scoped school (for assign dropdown when canEdit)
  const { classes: schoolClasses = [] } = useClasses(
    scopedSchoolId ? { schoolId: scopedSchoolId } : undefined
  );

  const [assignSelectValue, setAssignSelectValue] = useState("");

  const toggleClassMutation = useMutation({
    mutationFn: async ({
      classId,
      action,
    }: {
      classId: string;
      action: "add" | "remove";
    }) => {
      const result = await apiFetch<{ success: boolean }>(
        `/users/${user.id}/classes`,
        {
          method: "POST",
          body: JSON.stringify({ classId, action }),
        }
      );
      if (result.error) {
        throw new Error(result.error.message || "Failed to update class");
      }
      return result.data;
    },
    onSuccess: () => {
      setAssignSelectValue("");
      queryClient.invalidateQueries({
        queryKey: ["user-classes", user.id],
      });
    },
  });

  // Group classes by school (filter to scoped when set)
  const classesBySchool = new Map<string, UserClass[]>();
  const userClassesToUse = scopedSchoolId
    ? userClasses.filter((cls) => cls.schoolId === scopedSchoolId)
    : userClasses;
  userClassesToUse.forEach((cls) => {
    if (!classesBySchool.has(cls.schoolId)) {
      classesBySchool.set(cls.schoolId, []);
    }
    classesBySchool.get(cls.schoolId)!.push(cls);
  });

  const userClassIds = useMemo(
    () => new Set(userClassesToUse.map((c) => c.classId)),
    [userClassesToUse]
  );
  const availableToAssign = useMemo(
    () =>
      schoolClasses.filter((c) => !userClassIds.has(c.id) && c.active !== false),
    [schoolClasses, userClassIds]
  );

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

      {canEdit && scopedSchoolId && availableToAssign.length > 0 && (
        <Card className="border">
          <CardContent className="px-4 py-4 space-y-3">
            <h3 className="text-lg font-semibold">Assign class</h3>
            <div className="flex items-center gap-2">
              <Select
                value={assignSelectValue}
                onValueChange={(classId) => {
                  if (classId) {
                    setAssignSelectValue(classId);
                    toggleClassMutation.mutate(
                      { classId, action: "add" },
                      {
                        onSettled: () => setAssignSelectValue(""),
                      }
                    );
                  }
                }}
                disabled={toggleClassMutation.isPending}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a class to assign..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToAssign.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.code ? ` (${c.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
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
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    cls.active ? "default" : "secondary"
                                  }
                                  className="ml-2"
                                >
                                  {cls.active ? "Active" : "Inactive"}
                                </Badge>
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      toggleClassMutation.mutate({
                                        classId: cls.classId,
                                        action: "remove",
                                      })
                                    }
                                    disabled={toggleClassMutation.isPending}
                                  >
                                    {toggleClassMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <X className="h-4 w-4 text-destructive" />
                                    )}
                                  </Button>
                                )}
                              </div>
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
