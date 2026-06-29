"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, SmilePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

import { toggleReactionAction } from "../actions/reactions-actions";
import {
  REACTION_EMOJI,
  REACTION_TYPES,
  type ReactionTargetType,
  type ReactionType,
} from "../lib/constants";
import { authorName, type ReactionAuthor, type ReactionView } from "../lib/types";
import { ReactionDetailsDialog } from "./reaction-details-dialog";

type ReactionBarProps = {
  targetType: ReactionTargetType;
  targetId: string;
  initialReactions: ReactionView[];
  viewerUserId: string | null;
  /** Used for optimistic insert so the summary name appears instantly. */
  viewerAuthor?: ReactionAuthor | null;
  canReact?: boolean;
  /** "md" is for entity-level bars (article/profile/thread); "sm" for comments. */
  size?: "sm" | "md";
  /** Text shown when there are no reactions yet (only if the viewer can react). */
  emptyPrompt?: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
};

export function ReactionBar({
  targetType,
  targetId,
  initialReactions,
  viewerUserId,
  viewerAuthor,
  canReact = false,
  size = "sm",
  emptyPrompt,
  className,
  side = "right",
}: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionView[]>(initialReactions);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingType, setPendingType] = useState<ReactionType | null>(null);
  const [, startTransition] = useTransition();

  // Re-sync to authoritative server state when the page refreshes (e.g. another
  // user's reaction lands). Toggles use local state only, so this never fires
  // mid-flight.
  useEffect(() => {
    setReactions(initialReactions);
  }, [initialReactions]);

  const currentUserReaction =
    viewerUserId != null
      ? (reactions.find((r) => r.userId === viewerUserId)?.reactType ?? null)
      : null;

  const activeTypes = REACTION_TYPES.filter((type) =>
    reactions.some((r) => r.reactType === type),
  );
  const total = reactions.length;
  // Newest reactor (list is oldest-first) drives the "{name} and N others" text.
  const latest = reactions[reactions.length - 1];

  function optimistic(next: ReactionType): ReactionView[] {
    if (viewerUserId == null) return reactions;
    const others = reactions.filter((r) => r.userId !== viewerUserId);
    if (currentUserReaction === next) return others; // toggle off
    const mine: ReactionView = {
      userId: viewerUserId,
      reactType: next,
      createdAt: new Date(0).toISOString(),
      author: viewerAuthor ?? {
        userId: viewerUserId,
        username: null,
        displayName: "You",
        avatarUrl: null,
        countryFlag: null,
        steamid64: null,
      },
    };
    return [...others, mine];
  }

  function react(next: ReactionType) {
    if (!canReact || viewerUserId == null) {
      toast.error("Sign in to react.");
      return;
    }
    const snapshot = reactions;
    setPendingType(next);
    setReactions(optimistic(next));
    startTransition(async () => {
      const result = await toggleReactionAction({ targetType, targetId, reactType: next });
      setPendingType(null);
      if (!result.ok) {
        setReactions(snapshot);
        toast.error(result.message);
        return;
      }
      setReactions(result.reactions);
    });
  }

  const emojiTextSize = size === "md" ? "text-lg" : "text-sm";

  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      {total > 0 ? (
        <ReactionDetailsDialog
          reactions={reactions}
          trigger={
            <button
              type="button"
              className="group/reaction-summary flex cursor-pointer items-center gap-1.5 p-0 text-left"
            >
              <span className="flex items-center gap-0.5">
                {activeTypes.map((type) => (
                  <span
                    key={type}
                    className={cn("animate-slide-left-fade-in", emojiTextSize)}
                  >
                    {REACTION_EMOJI[type]}
                  </span>
                ))}
              </span>
              {latest ? (
                <span className="animated-underline-1 animate-slide-right-fade-in text-xs text-muted-foreground transition-colors group-hover/reaction-summary:text-foreground">
                  {authorName(latest.author)}
                  {total > 1
                    ? ` and ${total === 2 ? "1 other" : `${total - 1} others`}`
                    : null}
                </span>
              ) : null}
            </button>
          }
        />
      ) : null}

      <div className="flex items-center gap-2">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={size === "md" ? "outline" : "ghost"}
              size="sm"
              className={cn(
                "text-muted-foreground hover:text-foreground",
                size === "sm" && "h-7 px-2",
              )}
            >
              <SmilePlus className="size-4" />
              {size === "md" ? <span className="ml-1.5 text-xs">React</span> : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent side={side} className="w-auto p-1">
            <div className="flex gap-1">
              {REACTION_TYPES.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => react(type)}
                  disabled={pendingType !== null}
                  className={cn(
                    "px-2 text-base transition-transform hover:scale-125",
                    currentUserReaction === type && "bg-secondary",
                  )}
                >
                  {pendingType === type ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    REACTION_EMOJI[type]
                  )}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {total === 0 && canReact && emptyPrompt ? (
          <span className="select-none text-xs text-muted-foreground/60">
            {emptyPrompt}
          </span>
        ) : null}
      </div>
    </div>
  );
}
