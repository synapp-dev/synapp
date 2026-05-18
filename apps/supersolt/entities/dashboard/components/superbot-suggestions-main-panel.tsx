import { Bot } from "lucide-react";

import type { SuperbotSuggestion } from "@/entities/dashboard/model/dummy-superbot-suggestions";
import { SUPERBOT_SUGGESTION_ICONS } from "@/entities/dashboard/components/superbot-suggestion-icons";
import {
  SLIDE_EXIT_STAGGER_MS,
  SLIDE_STAGGER_BODY,
  SLIDE_STAGGER_FOOTER,
  SLIDE_STAGGER_ICON,
  SLIDE_STAGGER_TITLE,
} from "@/entities/dashboard/components/superbot-suggestions-carousel-constants";
import { cn } from "@workspace/ui/lib/utils";

function sectionRevealClass(
  reduceMotion: boolean,
  cardReveal: number,
  stage: 1 | 2 | 3,
) {
  return cn(
    "transition-opacity duration-300 ease-out",
    reduceMotion || cardReveal >= stage ? "opacity-100" : "opacity-0",
  );
}

function slideStaggerStyle(reduceMotion: boolean, step: number) {
  if (reduceMotion) {
    return undefined;
  }
  return { animationDelay: `${step * SLIDE_EXIT_STAGGER_MS}ms` };
}

function motionPair(
  reduceMotion: boolean,
  slideExiting: boolean,
  enterClass: string,
  exitClass: string,
) {
  return cn(
    !reduceMotion && !slideExiting && enterClass,
    slideExiting && !reduceMotion && exitClass,
    slideExiting &&
      reduceMotion &&
      "opacity-0 transition-opacity duration-150",
  );
}

export type SuperbotSuggestionsMainPanelProps = {
  active: SuperbotSuggestion;
  reduceMotion: boolean;
  slideExiting: boolean;
  revealStage: 1 | 2 | 3;
  descriptionStreamLen: number;
  descriptionStreamComplete: boolean;
  navigable: boolean;
  footerContentVisible: boolean;
  /** Resolved org + venue labels for the active scope; `null` when there is no scope. */
  scopePlaceLabels: {
    organisationName: string;
    venuePart: string;
  } | null;
  className?: string;
};

export function SuperbotSuggestionsMainPanel({
  active,
  reduceMotion,
  slideExiting,
  revealStage,
  descriptionStreamLen,
  descriptionStreamComplete,
  navigable,
  footerContentVisible,
  scopePlaceLabels,
  className,
}: SuperbotSuggestionsMainPanelProps) {
  const ActiveIcon = SUPERBOT_SUGGESTION_ICONS[active.iconId];

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-[3] flex-col gap-3 px-5 py-4",
        className,
      )}
    >
      <header
        className={cn(
          sectionRevealClass(reduceMotion, revealStage, 1),
          "shrink-0 flex flex-col gap-0",
        )}
      >
        <div className="flex min-h-0 flex-row items-start gap-2">
          <div
            key={`${active.id}-icon`}
            style={slideStaggerStyle(reduceMotion, SLIDE_STAGGER_ICON)}
            className={cn(
              "flex shrink-0 pt-0.5",
              motionPair(
                reduceMotion,
                slideExiting,
                "animate-slide-left-fade-in-slow",
                "animate-slide-left-fade-out-slow",
              ),
            )}
          >
            <ActiveIcon className="h-8 w-8 text-primary" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0">
            <div
              key={`${active.id}-title`}
              style={slideStaggerStyle(reduceMotion, SLIDE_STAGGER_TITLE)}
              className={motionPair(
                reduceMotion,
                slideExiting,
                "animate-slide-down-fade-in-slow",
                "animate-slide-up-fade-out-slow",
              )}
            >
              <h3 className="min-w-0 text-2xl font-semibold capitalize leading-snug tracking-tight">
                {active.title}
              </h3>
            </div>
            {scopePlaceLabels ? (
              <p className="mt-0 text-xs leading-snug text-muted-foreground">
                {scopePlaceLabels.organisationName.trim().toLowerCase() ===
                scopePlaceLabels.venuePart.trim().toLowerCase() ? (
                  <span className="font-medium text-foreground/90">
                    {scopePlaceLabels.organisationName}
                  </span>
                ) : (
                  <>
                    <span className="text-foreground/90">
                      {scopePlaceLabels.organisationName}
                    </span>
                    <span className="mx-1 text-muted-foreground/60" aria-hidden>
                      ·
                    </span>
                    <span>{scopePlaceLabels.venuePart}</span>
                  </>
                )}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div
        className={cn(
          sectionRevealClass(reduceMotion, revealStage, 2),
          "min-h-0 flex-1 overflow-y-auto",
        )}
      >
        <div className="flex items-start gap-2">
          <Bot
            className="h-6 w-6 shrink-0 text-[color:var(--brand-supersolt-primary)]"
            aria-hidden
          />
          <div
            key={active.id}
            style={slideStaggerStyle(reduceMotion, SLIDE_STAGGER_BODY)}
            className={cn(
              "relative min-w-0 max-w-full flex-1 rounded-2xl rounded-tl-md border border-border bg-muted/45 px-3 py-2.5 shadow-md dark:bg-muted/25",
              motionPair(
                reduceMotion,
                slideExiting,
                "animate-slide-down-fade-in-slow",
                "animate-slide-down-fade-out-slow",
              ),
            )}
          >
            <span
              aria-hidden
              className="absolute right-full top-[1.25rem] mr-px block h-0 w-0 border-y-[7px] border-y-transparent border-r-[9px] border-r-muted/45 dark:border-r-muted/25"
            />
            <p
              aria-live={descriptionStreamComplete ? "polite" : "off"}
              className="relative z-10 m-0 text-sm leading-snug text-muted-foreground line-clamp-4 md:line-clamp-5"
            >
              {active.description.slice(0, descriptionStreamLen)}
              {!reduceMotion &&
              descriptionStreamLen < active.description.length ? (
                <span
                  className="ml-px inline-block h-[1.05em] w-px animate-pulse bg-muted-foreground/60 align-middle"
                  aria-hidden
                />
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <footer
        className={cn(
          sectionRevealClass(reduceMotion, revealStage, 3),
          "mt-auto shrink-0 rounded-md bg-muted/20 px-3 py-3",
        )}
      >
        <div
          key={active.id}
          style={slideStaggerStyle(reduceMotion, SLIDE_STAGGER_FOOTER)}
          className={motionPair(
            reduceMotion,
            slideExiting,
            "animate-slide-down-fade-in-slow",
            "animate-slide-down-fade-out-slow",
          )}
        >
          <div
            className={cn(
              "flex flex-col items-start gap-2 transition-opacity duration-300 ease-out",
              footerContentVisible
                ? "opacity-100"
                : "pointer-events-none invisible opacity-0",
            )}
            aria-hidden={!footerContentVisible}
          >
            {navigable ? (
              <p className="m-0 text-xs leading-snug text-muted-foreground">
                Click anywhere on this card to go to{" "}
                <span className="font-medium text-foreground">
                  {active.gridLabel}
                </span>
                .
              </p>
            ) : (
              <p className="m-0 text-xs leading-snug text-muted-foreground">
                Select an organisation and venue from the sidebar to open this
                page.
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
