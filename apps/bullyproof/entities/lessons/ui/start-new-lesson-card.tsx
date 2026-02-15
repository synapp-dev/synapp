"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Plus } from "lucide-react";

type StartNewLessonCardProps =
  | { href: string; onClick?: never }
  | { href?: never; onClick: () => void };

/** Start New Lesson card matching LessonCard layout - use with href (Link) or onClick (button) */
export function StartNewLessonCard({ href, onClick }: StartNewLessonCardProps) {
  const cardContent = (
    <Card className="hover:shadow-md transition-shadow h-full overflow-visible p-0 gap-0 flex flex-col relative border-0 shadow-none bg-primary/5">
      {/* CardHeader - matching LessonCard */}
      <CardHeader className="py-3 px-4 bg-card/80 border border-b-0 rounded-t-lg flex flex-row justify-between items-center border-primary/30 border-dashed">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          New
        </span>
      </CardHeader>
      {/* CardContent - Thumbnail area with plus icon */}
      <CardContent className="p-0 bg-card/80 border-x border-primary/30 border-dashed rounded-lg relative z-[1]">
        <div className="w-full aspect-video bg-muted flex items-center justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Plus className="h-8 w-8 text-primary" />
          </div>
        </div>
      </CardContent>
      {/* CardFooter - matching LessonCard */}
      <CardFooter className="flex flex-col p-4 pt-3 gap-2 bg-card/80 border border-t-0 rounded-b-lg items-start border-primary/30 border-dashed">
        <p className="text-xs font-medium text-muted-foreground">
          Get started
        </p>
        <div className="flex items-center gap-2 min-w-0">
          <CardTitle className="text-base font-semibold text-primary capitalize line-clamp-2 flex-1 text-left">
            Start New Lesson
          </CardTitle>
        </div>
        {/* Placeholder to match LessonCard classes row */}
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="min-w-16 h-5 border border-dashed border-muted-foreground/10 rounded-full inline-flex" />
        </div>
      </CardFooter>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block w-full text-left cursor-pointer">
        {cardContent}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className="block w-full text-left cursor-pointer"
    >
      {cardContent}
    </button>
  );
}
