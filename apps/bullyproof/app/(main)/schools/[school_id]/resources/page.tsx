"use client";

import * as React from "react";
import { useSchoolStore } from "@/stores/school-store";
import { LibraryBig } from "lucide-react";

export default function ResourcesPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const [schoolSlug, setSchoolSlug] = React.useState<string>("");
  const currentSchool = useSchoolStore((state) => state.currentSchool);

  React.useEffect(() => {
    params.then(({ school_id }) => setSchoolSlug(school_id));
  }, [params]);

  return (
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

      <div className="bg-card rounded-lg p-8 border border-border">
        <div className="text-center py-12">
          <LibraryBig className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Resources Coming Soon</h2>
          <p className="text-muted-foreground">
            This section will contain educational resources, materials, and
            tools for your school.
          </p>
        </div>
      </div>
    </div>
  );
}
