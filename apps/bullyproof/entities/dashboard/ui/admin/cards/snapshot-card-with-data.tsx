"use client";

import { useQuery } from "@tanstack/react-query";
import { SnapshotCard } from "./hero-card";
import { SnapshotCardSkeleton } from "./snapshot-card-skeleton";
import { SnapshotCardError } from "./snapshot-card-error";
import {
  metricsApi,
  type MetricResponse,
} from "@/entities/dashboard/api/endpoints";
import { useIsPlatformAdmin } from "@/entities/me/model/store";
import Link from "next/link";

interface SnapshotCardWithDataProps {
  metricKey:
    | "schools"
    | "teachers"
    | "lessons/completed"
    | "lessons/engagement-rate";
  link?: string;
  title: string;
  icon: string;
  subtitle: string;
  scope?: "all" | "school"; // Client-side validated before use
}

export function SnapshotCardWithData({
  link,
  metricKey,
  title,
  icon,
  subtitle,
  scope = "school",
}: SnapshotCardWithDataProps) {
  // Client-side token validation using useIsPlatformAdmin hook
  const isPlatformAdmin = useIsPlatformAdmin();

  // Validate scope parameter - if 'all' requested but not platform admin, default to 'school'
  const validatedScope = scope === "all" && isPlatformAdmin ? "all" : "school";

  // Determine which API method to call based on metricKey
  const getApiCall = () => {
    switch (metricKey) {
      case "schools":
        return metricsApi.get.schools({ scope: validatedScope });
      case "teachers":
        return metricsApi.get.teachers({ scope: validatedScope });
      case "lessons/completed":
        return metricsApi.get.lessons.completed({ scope: validatedScope });
      case "lessons/engagement-rate":
        return metricsApi.get.lessons.engagementRate({ scope: validatedScope });
      default:
        throw new Error(`Unknown metric key: ${metricKey}`);
    }
  };

  // Use React Query to fetch data lazily
  const { data, isLoading, error } = useQuery<MetricResponse>({
    queryKey: ["metrics", metricKey, validatedScope],
    queryFn: async () => {
      const result = getApiCall();
      const { data: responseData, error: responseError } = await result;
      if (responseError) {
        throw new Error(responseError.message || "Failed to fetch metric");
      }
      if (!responseData) {
        throw new Error("No data returned");
      }
      return responseData;
    },
    enabled: true, // Lazy load
    retry: 2, // Retry failed requests twice
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Handle loading state (show skeleton)
  if (isLoading) {
    return <SnapshotCardSkeleton title={title} icon={icon} />;
  }

  // Handle error state gracefully
  if (error || !data) {
    return (
      <SnapshotCardError
        title={title}
        icon={icon}
        error={error instanceof Error ? error.message : undefined}
      />
    );
  }

  // Pass fetched data to SnapshotCard component
  return (
    <Link href={link || "#"} className="w-full h-full">
      <SnapshotCard
        title={title}
        icon={icon}
        value={data.value}
        previousValue={data.previousValue}
        subtitle={subtitle}
      />
    </Link>
  );
}
