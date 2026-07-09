"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSchoolStore } from "@/stores/school-store";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import { useSchoolCertificationStatus } from "@/entities/school/model/store";
import { usePageTitle } from "@/hooks/use-page-title";
import { ACTION_FEATURES } from "@/lib/feature-keys";
import { RoleBadges } from "@/components/atoms/role-badges";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertTriangle, ArrowLeft, BadgeCheck, Loader2, Search } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";

interface CertificationPageClientProps {
  schoolSlug: string;
}

export function CertificationPageClient({
  schoolSlug,
}: CertificationPageClientProps) {
  usePageTitle(["schools", "settings", "certification"]);
  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const [slug, setSlug] = useState(schoolSlug);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSlug(schoolSlug);
  }, [schoolSlug]);

  const { data: school, isLoading } = useSchoolBySlugQuery(slug, {
    enabled: !!slug,
  });
  const schoolId = school?.id ?? currentSchool?.id ?? null;
  const {
    rows,
    isLoading: isLoadingCertification,
    error: certificationError,
  } = useSchoolCertificationStatus(schoolId, { enabled: !!schoolId });

  if (isLoading || !school) {
    return (
      <>
        <FeatureGuard
          feature={ACTION_FEATURES.VIEW_SCHOOL_CERTIFICATION}
          schoolId={schoolId ?? undefined}
        />
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </>
    );
  }

  const settingsPath = `/schools/${slug}/settings`;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredRows =
    normalizedSearch.length === 0
      ? rows
      : rows.filter((row) => {
          const searchHaystack = [
            row.userName,
            row.userEmail,
            row.roles.map((r) => r.roleName).join(" "),
          ]
            .join(" ")
            .toLowerCase();
          return searchHaystack.includes(normalizedSearch);
        });

  const formatDate = (date: string | null) => {
    if (!date) return "Not completed";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: "not_started" | "in_progress" | "completed") => {
    if (status === "completed") {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if (status === "in_progress") {
      return (
        <Badge className="bg-blue-500 text-white border-blue-500 hover:bg-blue-600">
          In Progress
        </Badge>
      );
    }
    return <Badge variant="destructive">Not Started</Badge>;
  };

  return (
    <FeatureGuard
      feature={ACTION_FEATURES.VIEW_SCHOOL_CERTIFICATION}
      schoolId={school.id}
    >
      <div className="h-[calc(100dvh-4rem-1.5rem)] min-h-0 overflow-hidden flex flex-col gap-4 pb-4">
        <div className="flex items-center gap-4 flex-shrink-0">
          <Button variant="ghost" size="icon" asChild>
            <Link href={settingsPath} aria-label="Back to Settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div   className="flex items-center gap-2">
              <BadgeCheck className="h-6 w-6" />
              <h1 className="text-3xl font-bold">Certification</h1>
            </div>
            <p className="text-muted-foreground">
              View teachers&apos; AMAYDA certification status and completion progress.
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {isLoadingCertification ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : certificationError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load certification data</AlertTitle>
              <AlertDescription>
                {certificationError instanceof Error
                  ? certificationError.message
                  : "Something went wrong while loading certification data."}
              </AlertDescription>
            </Alert>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No teachers found for this school.
            </p>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="relative w-full max-w-sm flex-shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search users..."
                  className="pl-9"
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <Table className="w-full table-fixed">
                  <TableHeader className="bg-background">
                    <TableRow>
                      <TableHead className="w-[30%]">Teacher</TableHead>
                      <TableHead className="w-[28%]">Access Level</TableHead>
                      <TableHead className="w-[12%]">Status</TableHead>
                      <TableHead className="w-[18%]">Progress</TableHead>
                      <TableHead className="w-[12%]">Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                  <Table className="w-full table-fixed">
                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow
                          key={row.userId}
                          className={
                            row.isApTeacher && !row.isCompleted
                              ? "border-l-4 border-l-amber-500 !bg-amber-100 hover:!bg-amber-100 dark:!bg-amber-900/40 dark:hover:!bg-amber-900/40"
                              : undefined
                          }
                        >
                          <TableCell className="w-[30%]">
                            <div className="flex items-start gap-3">
                              {row.isApTeacher && !row.isCompleted && (
                                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                              )}
                              <div className="flex flex-col">
                                <span className="font-medium">{row.userName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {row.userEmail}
                                </span>
                                {row.isApTeacher && !row.isCompleted && (
                                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                    AP teacher without completed certification
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[28%]">
                            <RoleBadges roles={row.roles} variant="pill" size="sm" highestOnly />
                          </TableCell>
                          <TableCell className="w-[12%]">{getStatusBadge(row.status)}</TableCell>
                          <TableCell className="w-[18%]">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                {row.progressPercentage}% ({row.completedTopics}/
                                {row.totalTopics || 0} topics)
                              </span>
                              <Progress
                                value={row.progressPercentage}
                                className="h-2"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="w-[12%]">{formatDate(row.completedAt)}</TableCell>
                        </TableRow>
                      ))}
                      {filteredRows.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-10 text-center text-sm text-muted-foreground"
                          >
                            No users match your search.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FeatureGuard>
  );
}
