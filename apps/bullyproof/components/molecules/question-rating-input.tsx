"use client";

import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";

interface QuestionRatingInputProps {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function QuestionRatingInput({
  label,
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  className,
}: QuestionRatingInputProps) {
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

  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div
        className="flex items-center gap-2"
        onMouseLeave={handleMouseLeave}
      >
        {range.map((rating) => {
          const isSelected = value !== null && rating <= value;
          const isHovered = hoveredRating !== null && rating <= hoveredRating;

          return (
            <button
              key={rating}
              type="button"
              onClick={() => handleClick(rating)}
              onMouseEnter={() => handleMouseEnter(rating)}
              disabled={disabled}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-all duration-150",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:border-primary/50",
                isHovered && !disabled && !isSelected && "border-primary/30",
                !disabled && "cursor-pointer",
                disabled && "cursor-not-allowed opacity-60"
              )}
              aria-label={`Rate ${rating} out of ${max}`}
            >
              {rating}
            </button>
          );
        })}
      </div>
      {value !== null && (
        <p className="text-xs text-muted-foreground">
          Selected: {value} / {max}
        </p>
      )}
    </div>
  );
}
