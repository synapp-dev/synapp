import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@workspace/ui/lib/utils";

const ASSETS = {
  black: "/images/square-logo-wordmark-black.svg",
  white: "/images/square-logo-wordmark-white.svg",
  width: 2000,
  height: 501.43,
} as const;

export type SquareWordmarkTone =
  /** Black on light page bg, white on dark page bg (default). */
  | "auto"
  /** White wordmark for dark surfaces (e.g. emerald hero in light mode). */
  | "on-dark"
  /** Black wordmark for light surfaces. */
  | "on-light"
  /**
   * Flips with site theme: white in light mode, black in dark mode.
   * Use when the parent surface inverts under `dark:` (net revenue hero card).
   */
  | "inverted";

export type SquareWordmarkProps = {
  tone?: SquareWordmarkTone;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
};

/**
 * Square wordmark SVGs via `next/image`.
 * Prefer `tone="on-dark"` / `on-light"` when the badge sits on a fixed surface
 * that does not follow the global theme.
 */
export function SquareWordmark({
  tone = "auto",
  className,
  priority,
  decorative,
}: SquareWordmarkProps) {
  const sizeClass = cn("h-3 w-auto", className);

  const blackImg = (
    <Image
      src={ASSETS.black}
      alt=""
      width={ASSETS.width}
      height={ASSETS.height}
      className={sizeClass}
      priority={priority}
      unoptimized
    />
  );

  const whiteImg = (
    <Image
      src={ASSETS.white}
      alt=""
      width={ASSETS.width}
      height={ASSETS.height}
      className={sizeClass}
      priority={priority}
      unoptimized
      aria-hidden
    />
  );

  let imgs: ReactNode;

  switch (tone) {
    case "on-dark":
      imgs = whiteImg;
      break;
    case "on-light":
      imgs = blackImg;
      break;
    case "inverted":
      imgs = (
        <>
          <Image
            src={ASSETS.white}
            alt=""
            width={ASSETS.width}
            height={ASSETS.height}
            className={cn(sizeClass, "dark:hidden")}
            priority={priority}
            unoptimized
          />
          <Image
            src={ASSETS.black}
            alt=""
            width={ASSETS.width}
            height={ASSETS.height}
            className={cn(sizeClass, "hidden dark:block")}
            priority={priority}
            unoptimized
            aria-hidden
          />
        </>
      );
      break;
    case "auto":
    default:
      imgs = (
        <>
          <Image
            src={ASSETS.black}
            alt=""
            width={ASSETS.width}
            height={ASSETS.height}
            className={cn(sizeClass, "dark:hidden")}
            priority={priority}
            unoptimized
          />
          <Image
            src={ASSETS.white}
            alt=""
            width={ASSETS.width}
            height={ASSETS.height}
            className={cn(sizeClass, "hidden dark:block")}
            priority={priority}
            unoptimized
            aria-hidden
          />
        </>
      );
      break;
  }

  if (decorative) {
    return (
      <span className="inline-flex items-center" aria-hidden>
        {imgs}
      </span>
    );
  }

  return (
    <span role="img" aria-label="Square" className="inline-flex items-center">
      {imgs}
    </span>
  );
}
