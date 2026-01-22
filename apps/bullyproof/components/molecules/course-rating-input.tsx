"use client";

import { Star } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";

interface CourseRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: string; // default "h-6 w-6"
  className?: string;
}

export function CourseRatingInput({
  value,
  onChange,
  disabled = false,
  size = "h-6 w-6",
  className,
}: CourseRatingInputProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoveredRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoveredRating(null);
    }
  };

  const displayRating = hoveredRating ?? value;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const isFilled = rating <= displayRating;
        const isHovered = hoveredRating !== null && rating <= hoveredRating;

        return (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            disabled={disabled}
            className={cn(
              "transition-all duration-150",
              !disabled && "cursor-pointer hover:scale-110",
              disabled && "cursor-not-allowed opacity-60"
            )}
            aria-label={`Rate ${rating} out of 5 stars`}
          >
            <Star
              className={cn(
                size,
                isFilled
                  ? "fill-current text-amber-500"
                  : "fill-none text-muted-foreground",
                isHovered && !disabled && "text-amber-400"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
