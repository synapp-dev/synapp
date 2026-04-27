"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

export function ReportsRatingsShortcut() {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/admin/ratings">
        <BarChart3 className="mr-2 h-4 w-4" />
        Lesson ratings
      </Link>
    </Button>
  );
}
