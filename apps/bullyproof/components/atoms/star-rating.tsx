import { Star } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface StarRatingProps {
  correctAnswers: number;
  totalQuestions: number;
  passingThreshold: number; // percentage (0-100)
  maxStars?: number; // default 5
  className?: string;
  size?: string; // default "h-4 w-4"
}

export function StarRating({
  correctAnswers,
  totalQuestions,
  passingThreshold,
  maxStars = 5,
  className,
  size = "h-4 w-4",
}: StarRatingProps) {
  // Calculate filled stars: round to nearest integer
  const filledStars = Math.round((correctAnswers / totalQuestions) * maxStars);
  const outlineStars = maxStars - filledStars;

  // Calculate score percentage to determine if passed
  const scorePercentage =
    totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const isPassed = scorePercentage >= passingThreshold;

  // Color: red if below threshold, gold/amber if passing
  const starColor = isPassed ? "text-amber-500" : "text-red-500";
  const outlineColor = "text-muted-foreground";

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: filledStars }).map((_, index) => (
        <Star
          key={`filled-${index}`}
          className={cn(size, "fill-current", starColor)}
        />
      ))}
      {Array.from({ length: outlineStars }).map((_, index) => (
        <Star
          key={`outline-${index}`}
          className={cn(size, "fill-none", outlineColor)}
        />
      ))}
    </div>
  );
}
