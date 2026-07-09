"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarArrowDown,
  Check,
  Clock,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { DOMAIN_CONFIG } from "@/components/molecules/task-row";
import {
  useCheckin,
  useCheckinComplete,
  useCheckinRespond,
} from "@/hooks/checkin/use-checkin";
import { useCheckinStore } from "@/entities/checkin/model/store";
import { scoreQueryKey } from "@/hooks/scoring/use-score";
import { addDays } from "@/lib/scoring/compute";
import type {
  CheckinAnswer,
  CheckinItem,
  CheckinRespondInput,
} from "@/entities/checkin/model/types";
import type { TaskDomain } from "@/entities/tasks/model/types";

// Same pillar hues as the board columns so the app reads as one system.
const PILLAR_DOT: Record<TaskDomain, string> = {
  identity: "bg-violet-500",
  health: "bg-emerald-500",
  work: "bg-blue-500",
  social: "bg-amber-500",
  finance: "bg-rose-500",
};

function dateLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  return format(parseISO(date), "EEEE d MMMM");
}

/** Current local time as HH:mm, for the track-time default. */
function nowHhmm(): string {
  return format(new Date(), "HH:mm");
}

function PillarChip({ domain }: { domain: TaskDomain }) {
  const config = DOMAIN_CONFIG[domain];
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium">
      <span className={cn("h-2 w-2 rounded-full", PILLAR_DOT[domain])} />
      {config.label}
    </span>
  );
}

function TimeStep({
  onConfirm,
  onBack,
}: {
  onConfirm: (time: string) => void;
  onBack: () => void;
}) {
  const [time, setTime] = useState(nowHhmm);
  return (
    <motion.div
      key="time"
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -24, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 space-y-3"
    >
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Clock className="h-4 w-4" />
        What time?
      </p>
      <Input
        type="time"
        value={time}
        onChange={(event) => setTime(event.target.value)}
        className="h-12 text-base"
      />
      <div className="space-y-2">
        <Button
          className="h-12 w-full text-base"
          onClick={() => onConfirm(time)}
        >
          <Check className="mr-1.5 h-5 w-5" />
          Confirm
        </Button>
        <Button
          variant="outline"
          className="h-12 w-full text-base"
          onClick={() => onConfirm(nowHhmm())}
        >
          Just now
        </Button>
        <Button
          variant="ghost"
          className="h-10 w-full text-sm text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
      </div>
    </motion.div>
  );
}

function ItemCard({
  item,
  today,
  onAnswer,
}: {
  item: CheckinItem;
  today: string;
  onAnswer: (item: CheckinItem, answer: CheckinAnswer, completedTime?: string) => void;
}) {
  const [askTime, setAskTime] = useState(false);

  function handleDid() {
    if (item.trackTime) setAskTime(true);
    else onAnswer(item, "did");
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {dateLabel(item.date, today)}
      </p>
      <p className="mt-2 text-xl font-semibold leading-snug">{item.title}</p>
      {item.domains.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.domains.map((domain) => (
            <PillarChip key={domain} domain={domain} />
          ))}
        </div>
      ) : null}

      <AnimatePresence mode="popLayout" initial={false}>
        {askTime ? (
          <TimeStep
            key="time"
            onConfirm={(time) => onAnswer(item, "did", time)}
            onBack={() => setAskTime(false)}
          />
        ) : (
          <motion.div
            key="answer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-6 space-y-2"
          >
            {item.kind === "missed" ? (
              <>
                <Button className="h-12 w-full text-base" onClick={handleDid}>
                  <Check className="mr-1.5 h-5 w-5" />
                  Yes, I did it
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full text-base text-muted-foreground hover:text-rose-500"
                  onClick={() => onAnswer(item, "missed")}
                >
                  <X className="mr-1.5 h-5 w-5" />
                  No, I missed it
                </Button>
              </>
            ) : item.kind === "today" ? (
              <>
                <Button className="h-12 w-full text-base" onClick={handleDid}>
                  <Check className="mr-1.5 h-5 w-5" />
                  Done
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full text-base"
                  onClick={() => onAnswer(item, "not_yet")}
                >
                  Not yet
                </Button>
                <Button
                  variant="ghost"
                  className="h-12 w-full text-base text-muted-foreground"
                  onClick={() => onAnswer(item, "drop")}
                >
                  <Trash2 className="mr-1.5 h-5 w-5" />
                  Skip
                </Button>
              </>
            ) : (
              <>
                <Button className="h-12 w-full text-base" onClick={handleDid}>
                  <Check className="mr-1.5 h-5 w-5" />
                  Done
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full text-base"
                  onClick={() => onAnswer(item, "move_today")}
                >
                  <CalendarArrowDown className="mr-1.5 h-5 w-5" />
                  Move to today
                </Button>
                <Button
                  variant="ghost"
                  className="h-12 w-full text-base text-muted-foreground"
                  onClick={() => onAnswer(item, "drop")}
                >
                  <Trash2 className="mr-1.5 h-5 w-5" />
                  Drop it
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Full-screen "Just checking in" flow, mounted once in the main layout.
 * Auto-opens when unresolved items exist and no check-in was stamped today;
 * any close (finish or mid-flow X) stamps the day so it never nags twice.
 */
export function CheckinWizard() {
  const { data } = useCheckin();
  const respond = useCheckinRespond();
  const complete = useCheckinComplete();
  const queryClient = useQueryClient();
  const open = useCheckinStore((state) => state.open);
  const openWizard = useCheckinStore((state) => state.openWizard);
  const closeWizard = useCheckinStore((state) => state.closeWizard);

  const [queue, setQueue] = useState<CheckinItem[]>([]);
  const [index, setIndex] = useState(0);
  const wasOpen = useRef(false);
  const stamped = useRef(false);
  const dismissedToday = useRef(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const unresolved = useMemo(
    () => data?.groups.flatMap((group) => group.items) ?? [],
    [data]
  );

  // Auto-show once per local day: unresolved items and a stale check-in stamp.
  useEffect(() => {
    if (!data || open || dismissedToday.current) return;
    if (unresolved.length === 0) return;
    const lastDate = data.lastCheckinAt
      ? format(new Date(data.lastCheckinAt), "yyyy-MM-dd")
      : null;
    if (lastDate === null || lastDate < today) openWizard();
  }, [data, open, unresolved, today, openWizard]);

  // Snapshot the queue when the wizard opens so "n of N" stays stable while
  // optimistic answers drain the server list.
  useEffect(() => {
    if (open && !wasOpen.current) {
      setQueue(unresolved);
      setIndex(0);
      stamped.current = false;
    } else if (open && queue.length === 0 && index === 0 && unresolved.length > 0) {
      setQueue(unresolved);
    }
    wasOpen.current = open;
  }, [open, unresolved, queue.length, index]);

  // Dialog-like surface: hold the document scroll while it is up.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const finished = queue.length > 0 && index >= queue.length;

  // Reaching the end stamps the check-in even if the tab closes on the
  // celebration screen.
  useEffect(() => {
    if (open && finished && !stamped.current) {
      stamped.current = true;
      complete.mutate();
    }
  }, [open, finished, complete]);

  function answer(
    item: CheckinItem,
    value: CheckinAnswer,
    completedTime?: string
  ) {
    const input: CheckinRespondInput = { taskId: item.taskId, answer: value };
    if (value === "move_today") input.clientDate = today;
    if (completedTime) input.completedTime = completedTime;
    respond.mutate(input, {
      // Answers move the ring, so refresh the score straight away.
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: scoreQueryKey }),
    });
    setIndex((current) => current + 1);
  }

  function dismiss() {
    dismissedToday.current = true;
    if (!stamped.current && queue.length > 0) {
      stamped.current = true;
      complete.mutate();
    }
    closeWizard();
  }

  const current = !finished ? queue[index] : undefined;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Just checking in
              </p>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground"
                aria-label="Close check-in"
                onClick={dismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {queue.length > 0 ? (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {queue.map((item, dotIndex) => (
                    <span
                      key={item.taskId}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        dotIndex < index
                          ? "w-1.5 bg-primary"
                          : dotIndex === index
                            ? "w-5 bg-primary"
                            : "w-1.5 bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {Math.min(index + 1, queue.length)} of {queue.length}
                </p>
              </div>
            ) : null}

            <div className="flex flex-1 flex-col justify-center">
              <AnimatePresence mode="popLayout" initial={false}>
                {current ? (
                  <motion.div
                    key={current.taskId}
                    initial={{ x: 48, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -48, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ItemCard item={current} today={today} onAnswer={answer} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="done"
                    className="flex flex-col items-center gap-3 text-center"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <motion.span
                      initial={{ rotate: -12, scale: 0.6 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 12,
                        delay: 0.1,
                      }}
                      className="rounded-full bg-primary/10 p-4 text-primary"
                    >
                      <Sparkles className="h-8 w-8" />
                    </motion.span>
                    <p className="text-xl font-semibold">All caught up</p>
                    <p className="max-w-xs text-sm text-muted-foreground">
                      {queue.length > 0
                        ? "Every loose end is settled. Fresh slate for today."
                        : "Nothing needs a decision right now."}
                    </p>
                    <Button className="mt-2 h-11 w-40" onClick={dismiss}>
                      Done
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
