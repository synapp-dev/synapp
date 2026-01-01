"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function ResourcesPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const router = useRouter();
  const [schoolId, setSchoolId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => setSchoolId(p.school_id));
  }, [params]);

  React.useEffect(() => {
    if (!schoolId) return;

    const timer = setTimeout(() => {
      router.push(`/schools/${schoolId}/home`);
    }, 3000);

    return () => clearTimeout(timer);
  }, [schoolId, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resources</h1>
        <p className="text-muted-foreground">
          This page is currently unavailable. Redirecting...
        </p>
      </div>
    </div>
  );
}
