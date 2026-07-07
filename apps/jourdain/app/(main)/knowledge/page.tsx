import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function KnowledgePage() {
  return (
    <ComingSoon
      title="Knowledge"
      description="Your personal knowledge base: everything you learn, captured once and resurfaced when it matters."
      icon={BookOpen}
      bullets={["Notes and highlights", "Topic maps", "Spaced resurfacing"]}
    />
  );
}
