"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Check, Circle, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import { useWizardStateMutation } from "@/entities/inventory-setup/model/useWizardStateMutation";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { buildScopedPath } from "@/lib/build-scoped-path";
import type {
  WizardStage,
  WizardSubStep,
} from "@/entities/inventory-setup/model/types";

/**
 * Shown above a section's content while the stage the operator is up to still
 * has confirmation-only sub-steps outstanding. Derived sub-steps tick
 * themselves from data; these acks are judgement calls only the operator can
 * make, and this card is the only surface that records them.
 */
export function SetupStageConfirmCard({
  stage,
  nextStageLabel,
  organisationSlug,
  venueSlug,
  canWrite,
}: {
  stage: WizardStage;
  nextStageLabel: string | null;
  organisationSlug: string;
  venueSlug: string;
  canWrite: boolean;
}) {
  const pathname = usePathname();
  const reduceMotion = usePrefersReducedMotion();
  const mutation = useWizardStateMutation({ organisationSlug, venueSlug });

  const ackSteps = stage.subSteps.filter((s) => s.kind === "ack");
  const remaining = ackSteps.filter((s) => !s.complete).length;

  const message = `${
    remaining === 1 ? "One quick confirmation" : `${remaining} quick confirmations`
  } left to finish ${stage.label}${
    nextStageLabel ? `. Then ${nextStageLabel} unlocks` : ""
  }.`;
  const visibleLen = useStreamingText(
    message,
    `setup-confirm:${stage.id}`,
    reduceMotion,
    true,
  );
  const shown = reduceMotion ? message : message.slice(0, visibleLen);
  const streaming = !reduceMotion && visibleLen < message.length;

  const pendingKey = mutation.isPending
    ? (mutation.variables?.setSubStepAck?.key ?? null)
    : null;

  const setAck = (key: string, value: boolean) => {
    mutation.mutate(
      { setSubStepAck: { key, value } },
      { onError: () => toast.error("Couldn't save that. Try again.") },
    );
  };

  return (
    <Card className="flex flex-col gap-3 border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/20">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <AgentBotAvatarVideo
            aria-hidden
            poster="/images/supersolt-bot.png"
            className="h-full w-full"
          />
        </span>
        <p
          className="text-foreground min-w-0 flex-1 text-sm font-medium"
          aria-live="polite"
        >
          {shown}
          {streaming ? (
            <span
              className="bg-muted-foreground/60 ml-px inline-block h-[1.05em] w-px animate-pulse align-middle"
              aria-hidden
            />
          ) : null}
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {ackSteps.map((subStep) => (
          <ConfirmRow
            key={subStep.key}
            subStep={subStep}
            href={
              subStep.deepLink
                ? buildScopedPath(organisationSlug, venueSlug, subStep.deepLink)
                : null
            }
            onTargetPage={
              subStep.deepLink
                ? pathname.endsWith(`/${subStep.deepLink}`)
                : false
            }
            canWrite={canWrite}
            pending={pendingKey === subStep.key}
            onSetAck={setAck}
          />
        ))}
      </ul>
    </Card>
  );
}

function ConfirmRow({
  subStep,
  href,
  onTargetPage,
  canWrite,
  pending,
  onSetAck,
}: {
  subStep: WizardSubStep;
  href: string | null;
  /** Already standing on the sub-step's deep-link target, so hide the link. */
  onTargetPage: boolean;
  canWrite: boolean;
  pending: boolean;
  onSetAck: (key: string, value: boolean) => void;
}) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2",
        subStep.complete
          ? "border-emerald-300/60 bg-emerald-100/40 dark:border-emerald-500/30 dark:bg-emerald-900/20"
          : subStep.locked
            ? "bg-background/40 border-dashed"
            : "bg-background",
      )}
    >
      {subStep.complete ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-3 w-3" aria-hidden />
        </span>
      ) : subStep.locked ? (
        <Lock
          className="text-muted-foreground h-5 w-5 shrink-0 p-0.5"
          aria-hidden
        />
      ) : (
        <Circle
          className="text-muted-foreground/50 h-5 w-5 shrink-0 p-0.5"
          aria-hidden
        />
      )}

      <span
        className={cn(
          "min-w-0 flex-1 text-sm",
          subStep.complete || subStep.locked
            ? "text-muted-foreground"
            : "text-foreground font-medium",
        )}
      >
        {subStep.label}
      </span>

      {subStep.locked ? (
        subStep.lockReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground cursor-help text-xs">
                Locked
              </span>
            </TooltipTrigger>
            <TooltipContent>{subStep.lockReason}</TooltipContent>
          </Tooltip>
        ) : null
      ) : subStep.complete ? (
        canWrite ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7 text-xs"
            disabled={pending}
            onClick={() => onSetAck(subStep.key, false)}
          >
            Undo
          </Button>
        ) : null
      ) : (
        <span className="flex shrink-0 items-center gap-1.5">
          {href && !onTargetPage ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              <Link href={href}>
                Open
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          ) : null}
          {canWrite ? (
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={pending}
              onClick={() => onSetAck(subStep.key, true)}
            >
              {pending ? "Saving…" : "Confirm"}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs"
                    disabled
                  >
                    Confirm
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Ask a manager to confirm</TooltipContent>
            </Tooltip>
          )}
        </span>
      )}
    </li>
  );
}
