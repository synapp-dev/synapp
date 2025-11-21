"use client";

import { useEffect, useState } from "react";
import { useSchoolStore } from "@/stores/school-store";
import { Card, CardHeader, CardTitle } from "@workspace/ui/components/card";
import Image from "next/image";

export function SchoolCard() {
  const [mounted, setMounted] = useState(false);
  const currentSchool = useSchoolStore((state) => state.currentSchool);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted on client to avoid SSR hydration issues
  if (!mounted) {
    return (
      <div className="mb-4">
        <Card className="w-full h-fit py-12 relative">
          <CardHeader className="z-10">
            <CardTitle className="text-4xl font-extrabold flex items-center gap-2">
              Loading school...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!currentSchool) {
    return (
      <div className="mb-4">
        <Card className="w-full h-fit py-12 relative">
          <CardHeader className="z-10">
            <CardTitle className="text-4xl font-extrabold flex items-center gap-2">
              Loading school...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <Card className="w-full h-fit py-12 relative">
        {currentSchool.bannerUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={currentSchool.bannerUrl}
              alt={currentSchool.name}
              width={1000}
              height={1000}
              className="object-cover w-full h-full overflow-hidden rounded-xl opacity-20"
            />
          </div>
        )}
        <CardHeader className="z-10">
          <CardTitle className="text-4xl font-extrabold flex items-center gap-2">
            {currentSchool.avatarUrl && (
              <Image
                src={currentSchool.avatarUrl}
                alt={currentSchool.name}
                width={100}
                height={100}
                className="w-10 h-auto"
              />
            )}
            {currentSchool.name}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
