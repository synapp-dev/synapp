"use client";

import { useEffect, useRef, useState } from "react";
import Marquee from "react-fast-marquee";

import { cn } from "@workspace/ui/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export interface OverflowMarqueeTextProps {
  text: string;
  className?: string;
  /** Marquee speed; matches bullyproof stage cards. */
  speed?: number;
}

/**
 * Renders static truncated text when it fits; otherwise scrolls with
 * react-fast-marquee (same overflow detection pattern as bullyproof stage cards).
 */
export function OverflowMarqueeText({
  text,
  className,
  speed = 30,
}: OverflowMarqueeTextProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isMounted, setIsMounted] = useState(false);
  const [shouldMarquee, setShouldMarquee] = useState(false);
  const shouldMarqueeRef = useRef(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const checkOverflow = () => {
      if (!textRef.current || !containerRef.current) return;
      const needsMarquee =
        !prefersReducedMotion &&
        textRef.current.scrollWidth > containerRef.current.clientWidth;
      if (needsMarquee !== shouldMarqueeRef.current) {
        shouldMarqueeRef.current = needsMarquee;
        setShouldMarquee(needsMarquee);
      }
    };

    const timeoutId = setTimeout(checkOverflow, 0);
    window.addEventListener("resize", checkOverflow);

    const container = containerRef.current;
    const observer =
      container && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(checkOverflow)
        : null;
    if (container && observer) observer.observe(container);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkOverflow);
      observer?.disconnect();
    };
  }, [text, isMounted, prefersReducedMotion]);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 overflow-hidden">
      {isMounted ? (
        <span
          ref={textRef}
          className={cn(
            className,
            "pointer-events-none invisible absolute whitespace-nowrap",
          )}
          aria-hidden
        >
          {text}
        </span>
      ) : null}
      {isMounted && shouldMarquee ? (
        <Marquee
          speed={speed}
          gradient={false}
          pauseOnHover
          className={className}
        >
          <span className="px-4">{text}</span>
        </Marquee>
      ) : (
        <span className={cn(className, "block truncate")}>{text}</span>
      )}
    </div>
  );
}
