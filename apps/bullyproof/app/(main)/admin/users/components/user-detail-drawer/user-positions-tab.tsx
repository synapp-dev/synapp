"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Separator } from "@workspace/ui/components/separator";
import { Loader2, Plus, X, AlertCircle, Save } from "lucide-react";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { extractSchoolMetadata } from "./utils";
import type { School } from "@/entities/school/model/useListSchoolsQuery";

interface UserPosition {
  id: string;
  userId: string;
  schoolId: string;
  position: string;
  createdAt: string;
  school: {
    id: string;
    name: string;
    code: string | null;
  };
}

interface UserPositionsTabProps {
  user: UserWithRolesAndSchools;
  schools: School[];
}

export function UserPositionsTab({
  user,
  schools,
}: UserPositionsTabProps) {
  const queryClient = useQueryClient();
  const [editingPositions, setEditingPositions] = useState<
    Record<string, string>
  >({});
  const [newPositions, setNewPositions] = useState<Record<string, string>>(
    {}
  );
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch positions for this user
  const {
    data: positions = [],
    isLoading,
    error: fetchError,
  } = useQuery<UserPosition[]>({
    queryKey: ["user-positions", user.id],
    queryFn: async () => {
      const result = await apiFetch<UserPosition[]>(
        `/users/${user.id}/positions`
      );
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch positions");
      }
      return result.data || [];
    },
  });

  // Group positions by school
  const positionsBySchool = new Map<string, UserPosition[]>();
  positions.forEach((pos) => {
    if (!positionsBySchool.has(pos.schoolId)) {
      positionsBySchool.set(pos.schoolId, []);
    }
    positionsBySchool.get(pos.schoolId)!.push(pos);
  });

  // Get schools that have roles but no positions yet
  const schoolsWithRoles = new Set(
    user.schoolRoles.map((sr) => sr.schoolId).filter(Boolean) as string[]
  );
  const schoolsWithPositions = new Set(positionsBySchool.keys());
  const schoolsNeedingPositions = Array.from(schoolsWithRoles).filter(
    (schoolId) => !schoolsWithPositions.has(schoolId)
  );

  const handleSavePosition = async (
    positionId: string,
    schoolId: string,
    newPosition: string
  ) => {
    if (!newPosition.trim()) {
      setError("Position cannot be empty");
      return;
    }

    setIsSaving((prev) => ({ ...prev, [positionId]: true }));
    setError(null);

    try {
      const result = await apiFetch<UserPosition>(
        `/users/${user.id}/positions`,
        {
          method: "PUT",
          body: JSON.stringify({
            id: positionId,
            position: newPosition.trim(),
          }),
        }
      );

      if (result.error) {
        throw new Error(result.error.message || "Failed to update position");
      }

      // Update local state
      setEditingPositions((prev) => {
        const updated = { ...prev };
        delete updated[positionId];
        return updated;
      });

      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["user-positions", user.id],
      });
    } catch (err: any) {
      setError(err.message || "Failed to save position");
    } finally {
      setIsSaving((prev => {
        const updated = { ...prev };
        delete updated[positionId];
        return updated;
      }));
    }
  };

  const handleAddPosition = async (schoolId: string, position: string) => {
    if (!position.trim()) {
      setError("Position cannot be empty");
      return;
    }

    setIsSaving((prev) => ({ ...prev, [`new-${schoolId}`]: true }));
    setError(null);

    try {
      const result = await apiFetch<UserPosition>(
        `/users/${user.id}/positions`,
        {
          method: "POST",
          body: JSON.stringify({
            schoolId,
            position: position.trim(),
          }),
        }
      );

      if (result.error) {
        throw new Error(result.error.message || "Failed to add position");
      }

      // Clear the new position input
      setNewPositions((prev) => {
        const updated = { ...prev };
        delete updated[schoolId];
        return updated;
      });

      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["user-positions", user.id],
      });
    } catch (err: any) {
      setError(err.message || "Failed to add position");
    } finally {
      setIsSaving((prev => {
        const updated = { ...prev };
        delete updated[`new-${schoolId}`];
        return updated;
      }));
    }
  };

  const handleDeletePosition = async (positionId: string) => {
    setIsDeleting((prev) => ({ ...prev, [positionId]: true }));
    setError(null);

    try {
      const result = await apiFetch<{ success: boolean }>(
        `/users/${user.id}/positions`,
        {
          method: "DELETE",
          body: JSON.stringify({ id: positionId }),
        }
      );

      if (result.error) {
        throw new Error(result.error.message || "Failed to delete position");
      }

      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["user-positions", user.id],
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete position");
    } finally {
      setIsDeleting((prev => {
        const updated = { ...prev };
        delete updated[positionId];
        return updated;
      }));
    }
  };

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
          Failed to load positions:{" "}
          {fetchError instanceof Error
            ? fetchError.message
            : "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  // Sort schools by creation date (oldest first)
  const sortedSchoolEntries = Array.from(positionsBySchool.entries()).sort(
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
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {positionsBySchool.size === 0 && schoolsWithRoles.size === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No positions</AlertTitle>
          <AlertDescription>
            This user has no school roles, so no positions can be assigned.
          </AlertDescription>
        </Alert>
      )}

      {positionsBySchool.size > 0 && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">School positions</h3>
          </div>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {sortedSchoolEntries.map(([schoolId, schoolPositions]) => {
                const school = schools.find((s) => s.id === schoolId);
                const schoolName = school?.name || "Unknown School";
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

                        {/* Position Inputs */}
                        <div className="space-y-2">
                          {schoolPositions.map((pos) => {
                            const isEditing =
                              editingPositions[pos.id] !== undefined;
                            const currentValue =
                              editingPositions[pos.id] ?? pos.position;
                            const isSavingThis = isSaving[pos.id] || false;
                            const isDeletingThis = isDeleting[pos.id] || false;

                            return (
                              <div
                                key={pos.id}
                                className="flex items-center gap-2"
                              >
                                <Input
                                  value={currentValue}
                                  onChange={(e) => {
                                    setEditingPositions((prev) => ({
                                      ...prev,
                                      [pos.id]: e.target.value,
                                    }));
                                    setError(null);
                                  }}
                                  onBlur={() => {
                                    if (
                                      currentValue.trim() !== pos.position &&
                                      currentValue.trim()
                                    ) {
                                      handleSavePosition(
                                        pos.id,
                                        pos.schoolId,
                                        currentValue
                                      );
                                    } else {
                                      // Reset if unchanged
                                      setEditingPositions((prev) => {
                                        const updated = { ...prev };
                                        delete updated[pos.id];
                                        return updated;
                                      });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    } else if (e.key === "Escape") {
                                      setEditingPositions((prev) => {
                                        const updated = { ...prev };
                                        delete updated[pos.id];
                                        return updated;
                                      });
                                    }
                                  }}
                                  placeholder="Enter position"
                                  disabled={isSavingThis || isDeletingThis}
                                  className="flex-1"
                                />
                                {isEditing && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (
                                        currentValue.trim() !== pos.position &&
                                        currentValue.trim()
                                      ) {
                                        handleSavePosition(
                                          pos.id,
                                          pos.schoolId,
                                          currentValue
                                        );
                                      } else {
                                        setEditingPositions((prev) => {
                                          const updated = { ...prev };
                                          delete updated[pos.id];
                                          return updated;
                                        });
                                      }
                                    }}
                                    disabled={isSavingThis}
                                  >
                                    {isSavingThis ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeletePosition(pos.id)}
                                  disabled={isDeletingThis || isSavingThis}
                                >
                                  {isDeletingThis ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4 text-destructive" />
                                  )}
                                </Button>
                              </div>
                            );
                          })}

                          {/* Add new position input if less than 2 positions */}
                          {schoolPositions.length < 2 && (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newPositions[schoolId] || ""}
                                onChange={(e) => {
                                  setNewPositions((prev) => ({
                                    ...prev,
                                    [schoolId]: e.target.value,
                                  }));
                                  setError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const value = newPositions[schoolId] || "";
                                    if (value.trim()) {
                                      handleAddPosition(schoolId, value);
                                    }
                                  } else if (e.key === "Escape") {
                                    setNewPositions((prev) => {
                                      const updated = { ...prev };
                                      delete updated[schoolId];
                                      return updated;
                                    });
                                  }
                                }}
                                placeholder="Add position..."
                                disabled={
                                  isSaving[`new-${schoolId}`] || false
                                }
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const value = newPositions[schoolId] || "";
                                  if (value.trim()) {
                                    handleAddPosition(schoolId, value);
                                  }
                                }}
                                disabled={
                                  !newPositions[schoolId]?.trim() ||
                                  isSaving[`new-${schoolId}`] ||
                                  false
                                }
                              >
                                {isSaving[`new-${schoolId}`] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          )}
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

      {/* Schools with roles but no positions */}
      {schoolsNeedingPositions.length > 0 && (
        <>
          {positionsBySchool.size > 0 && <Separator className="my-8" />}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add positions</h3>
          </div>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {schoolsNeedingPositions.map((schoolId) => {
                const school = schools.find((s) => s.id === schoolId);
                const schoolName = school?.name || "Unknown School";
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

                        {/* Add position input */}
                        <div className="flex items-center gap-2">
                          <Input
                            value={newPositions[schoolId] || ""}
                            onChange={(e) => {
                              setNewPositions((prev) => ({
                                ...prev,
                                [schoolId]: e.target.value,
                              }));
                              setError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const value = newPositions[schoolId] || "";
                                if (value.trim()) {
                                  handleAddPosition(schoolId, value);
                                }
                              } else if (e.key === "Escape") {
                                setNewPositions((prev) => {
                                  const updated = { ...prev };
                                  delete updated[schoolId];
                                  return updated;
                                });
                              }
                            }}
                            placeholder="Add position..."
                            disabled={isSaving[`new-${schoolId}`] || false}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const value = newPositions[schoolId] || "";
                              if (value.trim()) {
                                handleAddPosition(schoolId, value);
                              }
                            }}
                            disabled={
                              !newPositions[schoolId]?.trim() ||
                              isSaving[`new-${schoolId}`] ||
                              false
                            }
                          >
                            {isSaving[`new-${schoolId}`] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
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
