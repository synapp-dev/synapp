"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Video, Lock, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";

export default function ResourcesVideosPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const [schoolId, setSchoolId] = React.useState<string>("");
  const router = useRouter();

  React.useEffect(() => {
    params.then(({ school_id }) => setSchoolId(school_id));
  }, [params]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/schools/${schoolId}/resources`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Video className="h-8 w-8" />
            Videos
          </h1>
          <p className="text-muted-foreground mt-2">
            Video resources and educational content
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Video className="h-16 w-16 text-muted-foreground" />
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <Badge variant="secondary" className="mb-4">
              Coming Soon
            </Badge>
            <h2 className="text-xl font-semibold mb-2">Videos Coming Soon</h2>
            <p className="text-muted-foreground">
              This section will contain video resources and educational content
              for your school.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
