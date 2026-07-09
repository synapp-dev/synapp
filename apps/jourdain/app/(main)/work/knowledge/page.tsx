"use client";

import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function WorkKnowledgePage() {
  return (
    <ComingSoon
      title="Knowledge"
      description="A working library of notes, references, and lessons learned, attached to the projects they came from."
      icon={BookOpen}
      bullets={["Project notes", "References", "Lessons learned"]}
    />
  );
}
