"use client";

import { FolderOpen } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function WorkDocumentsPage() {
  return (
    <ComingSoon
      title="Documents"
      description="Contracts, proposals, and key files versioned, organised, and findable in seconds."
      icon={FolderOpen}
      bullets={["Document vault", "Templates", "Fast search"]}
    />
  );
}
