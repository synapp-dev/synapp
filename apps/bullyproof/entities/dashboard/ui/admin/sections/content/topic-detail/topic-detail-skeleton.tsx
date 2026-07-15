"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

// Skeleton loaders shown while the topic is loading
export function TopicDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Topic Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-start gap-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-9 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Slides Section Skeleton */}
      <div className="space-y-8">
        {/* First Row: Current Slide Preview + Slide Info */}
        <div className="grid grid-cols-5 gap-6">
          {/* Current Slide Preview Skeleton - 3/5 width */}
          <div className="col-span-3 relative aspect-video">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                <Skeleton className="w-full h-full rounded-lg" />
              </CardContent>
            </Card>
          </div>

          {/* Slide Info Panel Skeleton - 2/5 width */}
          <div className="col-span-2 h-full">
            <Card className="p-6 h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </Card>
          </div>
        </div>

        {/* Slide Gallery Skeleton */}
        <Card className="relative overflow-visible p-0 border-none shadow-none">
          <CardContent className="relative space-y-4 overflow-visible p-0 border-none">
            {/* Navigation Controls Skeleton */}
            <div className="flex items-center justify-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-20" />
            </div>

            {/* Slide Gallery Skeleton */}
            <div className="flex gap-4 overflow-x-auto py-3 px-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton
                  key={i}
                  className="h-[101px] w-[180px] flex-shrink-0 rounded-lg"
                  style={{ aspectRatio: "16 / 9" }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
