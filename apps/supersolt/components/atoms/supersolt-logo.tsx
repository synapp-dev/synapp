import Image from "next/image";
import { cn } from "@workspace/ui/lib/utils";

const ASSETS = {
  wordmark: {
    light: "/images/supersolt-logowordmark-black.svg",
    dark: "/images/supersolt-logowordmark-white.svg",
    width: 360,
    height: 144,
  },
  mark: {
    light: "/images/supersolt-logo-black.svg",
    dark: "/images/supersolt-logo-white.svg",
    width: 151,
    height: 144,
  },
} as const;

export type SupersoltLogoVariant = keyof typeof ASSETS;

export type SupersoltLogoProps = {
  variant: SupersoltLogoVariant;
  /** Applied to both images (layout / size). Theme swap is built in. */
  className?: string;
  /** Passed to both `Image`s — hints LCP when true. */
  priority?: boolean;
  /**
   * Accessible name when the logo is meaningful (default: "Supersolt").
   * Use `decorative` for footer / purely visual uses.
   */
  alt?: string;
  /** Hides from assistive tech; no `role="img"`. */
  decorative?: boolean;
};

/**
 * Local SuperSolt SVG logos via `next/image`.
 * `unoptimized` keeps SVGs reliable (sharp/optimizer paths vary by version).
 */
export function SupersoltLogo({
  variant,
  className,
  priority,
  alt = "Supersolt",
  decorative,
}: SupersoltLogoProps) {
  const { light, dark, width, height } = ASSETS[variant];

  const imgs = (
    <>
      <Image
        src={light}
        alt=""
        width={width}
        height={height}
        className={cn(className, "dark:hidden")}
        priority={priority}
        unoptimized
      />
      <Image
        src={dark}
        alt=""
        width={width}
        height={height}
        className={cn(className, "hidden dark:block")}
        priority={priority}
        unoptimized
        aria-hidden
      />
    </>
  );

  if (decorative) {
    return (
      <span className="inline-flex items-center justify-center" aria-hidden>
        {imgs}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={alt}
      className="inline-flex items-center justify-center"
    >
      {imgs}
    </span>
  );
}
