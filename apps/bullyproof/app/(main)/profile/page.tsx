"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Award, Calendar, Download, Mail } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useMeStore } from "@/entities/me/model/store";
import { apiFetch } from "@/lib/api/fetcher.client";

type MyCertificate = {
  courseId: string;
  courseName: string;
  certificateType: string | null;
  completedAt: string | null;
  certificateIssuedAt: string | null;
};

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Profile() {
  usePageTitle(["profile"]);
  const currentUser = useMeStore((state) => state.currentUser);

  const { data: certificates = [], isLoading: isLoadingCertificates } =
    useQuery<MyCertificate[]>({
      queryKey: ["me", "certificates"],
      queryFn: async () => {
        const result = await apiFetch<{ certificates: MyCertificate[] }>(
          "/me/certificates"
        );
        if (result.error) throw new Error(result.error.message);
        return result.data?.certificates ?? [];
      },
    });

  const fullName =
    currentUser?.fullName ||
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.email ||
    "";
  const initials =
    [currentUser?.firstName?.[0], currentUser?.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    currentUser?.email?.[0]?.toUpperCase() ||
    "?";
  const joinedDate = formatDate(currentUser?.createdAt);
  const platformRoles = Array.isArray(currentUser?.platformRoles)
    ? (currentUser?.platformRoles as string[])
    : [];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Profile</h1>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={currentUser?.avatarUrl ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </div>
            {currentUser ? (
              <CardTitle>{fullName}</CardTitle>
            ) : (
              <Skeleton className="h-6 w-32 mx-auto" />
            )}
            {platformRoles.length > 0 && (
              <div className="flex justify-center gap-2 mt-2 flex-wrap">
                {platformRoles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role.replaceAll("_", " ")}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {currentUser?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{currentUser.email}</span>
              </div>
            )}
            {joinedDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Joined {joinedDate}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificates Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[color:var(--brand-bullyproof-secondary)]" />
              Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCertificates ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Certificates you earn from AP Certification courses will appear
                here, ready to download.
              </p>
            ) : (
              <div className="space-y-3">
                {certificates.map((certificate) => {
                  const completed = formatDate(certificate.completedAt);
                  return (
                    <div
                      key={certificate.courseId}
                      className="flex items-center justify-between gap-4 border rounded-lg p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {certificate.courseName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {completed ? `Completed ${completed}` : "Completed"}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={`/api/certification/courses/${certificate.courseId}/certificate`}
                        >
                          <Download className="h-4 w-4 mr-1.5" />
                          Download
                        </a>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
