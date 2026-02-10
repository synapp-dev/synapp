"use client";

import * as React from "react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { LibraryBig, FileText, Video, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

export default function ResourcesPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  return (
    <>
      <FeatureGuard feature="/school/resources" />
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <LibraryBig className="h-8 w-8" />
          Resources
        </h1>
        <p className="text-muted-foreground mt-2">
          Access educational resources and materials for your school.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Info Packs Folder - Disabled */}
        <Card className="opacity-50 cursor-not-allowed h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>Info Packs</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Coming Soon
                  </Badge>
                </div>
                <CardDescription>
                  Educational information packs and resources
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This section will be available soon.
            </p>
          </CardContent>
        </Card>

        {/* Videos Folder - Disabled */}
        <Card className="opacity-50 cursor-not-allowed h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <Video className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>Videos</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Coming Soon
                  </Badge>
                </div>
                <CardDescription>
                  Video resources and educational content
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This section will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
