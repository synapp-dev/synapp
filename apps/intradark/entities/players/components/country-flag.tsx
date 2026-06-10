import * as FlagIcons from "country-flag-icons/react/3x2";

import { cn } from "@workspace/ui/lib/utils";

type FlagCode = keyof typeof FlagIcons;

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code, e.g. AU or NZ. */
  code: string;
  className?: string;
  title?: string;
}

/** Renders a 3×2 flag SVG from country-flag-icons; returns null for unknown codes. */
export function CountryFlag({ code, className, title }: CountryFlagProps) {
  const Flag = FlagIcons[code.toUpperCase() as FlagCode];
  if (!Flag) return null;
  return (
    <span
      className={cn(
        "inline-flex h-3 shrink-0 overflow-hidden rounded-sm border-[0.5px] border-white/25",
        className,
      )}
      title={title}
    >
      <Flag className="h-full w-auto" aria-hidden />
    </span>
  );
}
