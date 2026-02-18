"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ChevronsRight, Sparkles } from "lucide-react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

type StartNewLessonCardProps =
  | { href: string; onClick?: never }
  | { href?: never; onClick: () => void };

/** Start New Lesson card matching LessonCard layout - use with href (Link) or onClick (button) */
export function StartNewLessonCard({ href, onClick }: StartNewLessonCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [bpHoverNudgeY, setBpHoverNudgeY] = useState(0);
  const [bpHoverScale, setBpHoverScale] = useState(1);
  const bpHoverStopOffsetY = -10;
  const particlesContainerRef = useRef<any>(null);
  const thumbnailContentRef = useRef<HTMLDivElement | null>(null);
  const bpManImageRef = useRef<HTMLImageElement | null>(null);
  const bpManShadowRef = useRef<HTMLDivElement | null>(null);
  const motionRateRef = useRef(1);
  const motionRafRef = useRef<number | null>(null);

  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async (container: any) => {
    particlesContainerRef.current = container;
  }, []);

  const handleCardMouseEnter = useCallback(() => {
    setIsHovered(true);
    setBpHoverScale(1.16);

    const container = thumbnailContentRef.current;
    const image = bpManImageRef.current;
    if (!container || !image) return;

    const containerRect = container.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const deltaY =
      containerRect.top +
      containerRect.height / 2 -
      (imageRect.top + imageRect.height / 2);

    setBpHoverNudgeY(deltaY + bpHoverStopOffsetY);
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    setIsHovered(false);
    setBpHoverNudgeY(0);
    setBpHoverScale(1);
  }, []);

  const starParticlesOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: {
        color: { value: "transparent" },
      },
      motion: {
        disable: false,
      },
      fpsLimit: 120,
      detectRetina: true,
      interactivity: {
        events: {
          onClick: { enable: false },
          onHover: { enable: false },
          resize: { enable: true, delay: 0.5 },
        },
      },
      particles: {
        number: {
          value: 20,
          density: { enable: false },
        },
        color: {
          value: [
            "#038493",
            "#ea6f4d",
          ],
        },
        shape: {
          type: "star",
          options: {
            star: { sides: 5 },
          },
        },
        opacity: {
          value: {
            min: 0.1,
            max: 0.26,
          },
        },
        size: {
          value: {
            min: 2,
            max: 8,
          },
        },
        move: {
          enable: true,
          direction: "bottom",
          random: false,
          straight: true,
          speed: {
            min: 1.6,
            max: 2.7,
          },
          outModes: {
            default: "out",
            top: "out",
            bottom: "out",
            left: "out",
            right: "out",
          },
        },
        rotate: {
          value: {
            min: 0,
            max: 360,
          },
          direction: "random",
          animation: {
            enable: true,
            speed: {
              min: 8,
              max: 24,
            },
            sync: false,
          },
        },
      },
      pauseOnBlur: true,
      pauseOnOutsideViewport: true,
    }) as any,
    []
  );
  const bpManFloatStyle = useMemo(
    () =>
      ({
        "--bp-float-start": isHovered ? "1.6px" : "3px",
        "--bp-float-peak": isHovered ? "-3.2px" : "-6px",
      }) as CSSProperties,
    [isHovered]
  );

  useEffect(() => {
    const targetRate = isHovered ? 0.14 : 1;
    const startRate = motionRateRef.current;
    const durationMs = isHovered ? 360 : 520;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = isHovered
        ? 1 - Math.pow(1 - progress, 2) // ease-out so slowdown starts immediately
        : 1 - Math.pow(1 - progress, 3); // ease-out when speeding back up
      const rate = startRate + (targetRate - startRate) * easedProgress;
      motionRateRef.current = rate;

      // BP man + shadow: smoothly decelerate without restarting keyframes.
      [bpManImageRef.current, bpManShadowRef.current].forEach((node) => {
        if (!node) return;
        node.getAnimations().forEach((animation) => {
          const playback = isHovered
            ? progress >= 1
              ? 0.62 // after settle: noticeably faster hover bob
              : Math.max(0.01, rate * 0.2) // during settle: nearly frozen
            : Math.max(0.01, rate);
          animation.playbackRate = playback;
        });
      });

      const container = particlesContainerRef.current;
      if (container) {
        // Keep particle positions stable while smoothly slowing all particle updates.
        if (container.retina && typeof container.retina.reduceFactor === "number") {
          container.retina.reduceFactor = Math.max(rate, 0.08);
        }
        // Also scale engine FPS so rotation eases down with movement.
        container.fpsLimit = 30 + rate * 90;

        // Explicitly scale per-particle rotation velocity so star spin slows too.
        const particleArray = container.particles?.array as any[] | undefined;
        if (Array.isArray(particleArray)) {
          particleArray.forEach((particle) => {
            const rotateObj =
              particle?.rotate && typeof particle.rotate === "object"
                ? particle.rotate
                : particle?.rotation && typeof particle.rotation === "object"
                  ? particle.rotation
                  : null;

            if (!rotateObj) return;

            if (
              typeof rotateObj.__baseVelocity !== "number" &&
              typeof rotateObj.velocity === "number"
            ) {
              rotateObj.__baseVelocity = rotateObj.velocity;
            }

            if (
              typeof rotateObj.__baseVelocity === "number" &&
              typeof rotateObj.velocity === "number"
            ) {
              rotateObj.velocity = rotateObj.__baseVelocity * rate;
            }
          });
        }
      }

      if (progress < 1) {
        motionRafRef.current = requestAnimationFrame(step);
      } else {
        motionRateRef.current = targetRate;
        motionRafRef.current = null;
      }
    };

    if (motionRafRef.current !== null) {
      cancelAnimationFrame(motionRafRef.current);
      motionRafRef.current = null;
    }
    motionRafRef.current = requestAnimationFrame(step);

    return () => {
      if (motionRafRef.current !== null) {
        cancelAnimationFrame(motionRafRef.current);
        motionRafRef.current = null;
      }
    };
  }, [isHovered]);

  const cardContent = (
    <Card
      className="group hover:shadow-md transition-all h-full overflow-visible p-0 gap-0 flex flex-col relative border-0 shadow-none bg-[var(--brand-bullyproof-primary)]/5"
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
    >
      {/* CardHeader - matching LessonCard */}
      <CardHeader className="py-3 px-4 bg-card/80 border border-b-0 rounded-t-lg flex flex-row justify-between items-center border-[var(--brand-bullyproof-primary)] border-dotted transition-colors group-hover:bg-[var(--brand-bullyproof-primary)]">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 transition-colors group-hover:text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-bullyproof-primary)] transition-colors group-hover:bg-secondary" />
          New
        </span>
      </CardHeader>
      {/* CardContent - Thumbnail area */}
      <CardContent className="p-0 flex-1 flex items-center justify-center bg-card/80 border-x border-[var(--brand-bullyproof-primary)] border-dotted relative z-[1]">
        <div className="w-full aspect-video rounded-t-md rounded-b-none bg-[var(--brand-bullyproof-primary)]/10 group-hover:bg-[var(--brand-bullyproof-primary)]/30 transition-colors flex items-center justify-center overflow-hidden">
          <div
            ref={thumbnailContentRef}
            className="relative h-full w-full flex items-center justify-center overflow-hidden"
          >
            <Particles
              className="pointer-events-none absolute inset-0 z-10 opacity-85 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:[filter:grayscale(1)_saturate(0)_brightness(6)_contrast(2.25)_drop-shadow(0_0_5px_rgba(255,255,255,1))]"
              init={particlesInit}
              loaded={particlesLoaded}
              options={starParticlesOptions}
            />
            <div
              className="relative z-20 h-full w-full flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                transform: `translateY(${bpHoverNudgeY}px) scale(${bpHoverScale})`,
              }}
            >
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f9ed5c]/65 blur-2xl opacity-0 group-hover:animate-[bp-hover-glow_1.9s_cubic-bezier(0.22,1,0.36,1)_infinite]" />
              <div
                ref={bpManShadowRef}
                className="pointer-events-none absolute left-1/2 bottom-2 h-3 w-24 -translate-x-1/2 rounded-full bg-black/20 blur-md animate-[bp-man-shadow_1.9s_cubic-bezier(0.42,0,0.58,1)_infinite]"
              />
              <Image
                ref={bpManImageRef}
                src="/images/bp-man/bp-man-wand.svg"
                alt="Start new lesson"
                width={192}
                height={192}
                className="relative z-50 h-44 w-44 object-contain animate-[bp-man-float_1.9s_cubic-bezier(0.42,0,0.58,1)_infinite] transition-[filter] duration-500 ease-out group-hover:drop-shadow-[0_0_28px_#f9ed5c]"
                style={bpManFloatStyle}
                priority={false}
              />
            </div>
          </div>
        </div>
      </CardContent>
      {/* CardFooter - matching LessonCard */}
      <CardFooter className="flex flex-col p-4 pt-3 gap-2 bg-card/80 border border-t-0 rounded-b-lg items-start border-[var(--brand-bullyproof-primary)] border-dotted transition-colors group-hover:bg-[var(--brand-bullyproof-primary)]">
        <div className="w-full flex items-center gap-2" aria-hidden="true">
          <div className="h-1.5 w-[2.4rem] rounded-sm bg-muted-foreground/5" />
          <div className="h-1.5 w-[3.15rem] rounded-sm bg-muted-foreground/5" />
        </div>
        <div className="relative w-full min-w-0">
          <span className="pointer-events-none absolute inset-y-0 left-[-1rem] right-[9.6rem] z-0 rounded-r-md rounded-l-none bg-white/92 -translate-x-[125%] transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0" />
          <CardTitle className="relative z-20 text-xl group-hover:text-2xl text-[var(--brand-bullyproof-primary)] capitalize flex-1 text-left transition-[font-size] duration-300 ease-out">
            <span className="inline-flex w-full items-center">
              <span className="inline-flex w-5 mr-1.5 items-center overflow-hidden transition-all duration-300 ease-out group-hover:w-0 group-hover:mr-0 group-hover:opacity-0">
                <Sparkles className="h-5 w-5 shrink-0" />
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="font-normal">Start</span>
                <span className="font-extrabold">New Lesson</span>
              </span>
              <span
                className="relative ml-4 h-6 w-8 overflow-hidden opacity-0 transition-opacity duration-200 ease-out group-hover:delay-500 group-hover:opacity-100 [mask-image:linear-gradient(to_right,transparent,black_22%,black_78%,transparent)]"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent, black 22%, black 78%, transparent)",
                }}
              >
                <ChevronsRight strokeWidth={2.8} className="absolute left-0 top-[-1px] h-7 w-7 text-white group-hover:animate-[bp-chevron-loop_1.9s_linear_infinite]" />
                <ChevronsRight
                  strokeWidth={2.8}
                  className="absolute left-[3px] top-[-1px] h-7 w-7 text-white group-hover:animate-[bp-chevron-loop_1.9s_linear_infinite]"
                  style={{ animationDelay: "-0.95s" }}
                />
              </span>
            </span>
          </CardTitle>
        </div>
        {/* Placeholder to match LessonCard classes row */}
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="min-w-16 h-5 border border-dotted border-[var(--brand-bullyproof-primary)]/30 rounded-full inline-flex transition-colors group-hover:border-secondary/40" />
        </div>
      </CardFooter>
      <style jsx>{`
        @keyframes bp-man-float {
          0%,
          100% {
            transform: translateY(var(--bp-float-start, 3px));
          }
          50% {
            transform: translateY(var(--bp-float-peak, -6px));
          }
        }
        @keyframes bp-man-shadow {
          0%,
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateX(-50%) scale(0.82);
            opacity: 0.14;
          }
        }
        @keyframes bp-hover-glow {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          18% {
            opacity: 0.72;
            transform: translate(-50%, -50%) scale(0.95);
          }
          75% {
            opacity: 0.12;
            transform: translate(-50%, -50%) scale(2.2);
          }
          90%,
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2.4);
          }
        }
        @keyframes bp-chevron-loop {
          0% {
            transform: translateX(-130%);
          }
          100% {
            transform: translateX(140%);
          }
        }
      `}</style>
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
