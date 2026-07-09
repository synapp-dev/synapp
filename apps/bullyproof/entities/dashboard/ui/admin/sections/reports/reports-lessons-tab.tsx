"use client";

import Link from "next/link";
import { BarChart3, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useReportsOverview } from "@/entities/dashboard/ui/admin/sections/reports/reports-overview-context";
import {
  formatDate,
  formatTeacherName,
} from "@/entities/dashboard/ui/admin/sections/reports/reports-utils";
import { usePageTitle } from "@/hooks/use-page-title";

export function ReportsLessonsTab() {
  usePageTitle(["admin", "reports", "lessons"]);

  const { overview } = useReportsOverview();
  if (!overview) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.lessonsTotal}</div>
            <p className="text-xs text-muted-foreground">
              {overview.scope === "school"
                ? "Lesson records for this school"
                : "Lesson records across all schools"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lesson ratings
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.lessonRatingsTotal}
            </div>
            <p className="text-xs text-muted-foreground">
              Feedback submissions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lessons</CardTitle>
          <p className="text-sm text-muted-foreground">
            All lessons in scope, newest first (scheduled date when set,
            otherwise created).
          </p>
        </CardHeader>
        <CardContent>
          {overview.recentLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lessons in this scope yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lesson</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px] text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recentLessons.map((row) => (
                    <TableRow key={row.lessonId}>
                      <TableCell className="font-medium">
                        {row.topicTitle}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.classNames?.trim() ? row.classNames : "—"}
                      </TableCell>
                      <TableCell>
                        {formatTeacherName(
                          row.teacherFirstName,
                          row.teacherLastName,
                        )}
                      </TableCell>
                      <TableCell>{row.schoolName}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {row.status.replaceAll("_", " ")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(row.scheduledFor ?? row.createdAt)}
                        {row.scheduledFor ? (
                          <span className="ml-1 text-xs">(scheduled)</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.schoolSlug ? (
                          <Button variant="link" className="h-auto p-0" asChild>
                            <Link
                              href={`/admin/schools?school=${encodeURIComponent(row.schoolSlug)}`}
                            >
                              Open
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="link" className="h-auto p-0" asChild>
                            <Link
                              href={`/admin/schools?search=${encodeURIComponent(row.schoolName)}`}
                            >
                              Find
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
