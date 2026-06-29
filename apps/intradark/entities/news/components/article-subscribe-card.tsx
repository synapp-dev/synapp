"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, BellRing, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { setNewsSubscriptionAction } from "../actions/news-subscribe-actions";
import type { NewsSubscriptionState } from "../lib/subscribe/queries";

/**
 * Substack-style subscribe box, intradark-native: instead of email it toggles
 * the Steam news DM pref (notify_news). Degrades to sign-in / link-Steam
 * prompts, and nudges to add the bot when the pref is on but the bot isn't a
 * friend yet.
 */
export function ArticleSubscribeCard({
  state,
  className,
}: {
  state: NewsSubscriptionState;
  className?: string;
}) {
  const [subscribed, setSubscribed] = useState(state.subscribed);
  const [pending, startTransition] = useTransition();

  const shell = (children: React.ReactNode) => (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card/40 p-5 text-center",
        "sm:flex-row sm:items-center sm:justify-between sm:text-left",
        className,
      )}
    >
      {children}
    </div>
  );

  const headingLines = (extra?: React.ReactNode) => (
    <div className="space-y-1">
      <p className="flex items-center justify-center gap-2 font-semibold sm:justify-start">
        <BellRing className="size-4 text-primary" />
        Get new posts on Steam
      </p>
      <p className="text-sm text-muted-foreground">
        Intradark DMs you when we publish. No email, ever.
      </p>
      {extra}
    </div>
  );

  if (!state.signedIn) {
    return shell(
      <>
        {headingLines()}
        <Button asChild className="shrink-0">
          <Link href="/auth">Sign in to subscribe</Link>
        </Button>
      </>,
    );
  }

  if (!state.steamLinked) {
    return shell(
      <>
        {headingLines()}
        <Button asChild className="shrink-0">
          <Link href="/api/auth/steam">Link Steam</Link>
        </Button>
      </>,
    );
  }

  const toggle = () => {
    const next = !subscribed;
    setSubscribed(next);
    startTransition(async () => {
      const result = await setNewsSubscriptionAction(next);
      if (!result.ok) {
        setSubscribed(!next);
        toast.error(result.message);
        return;
      }
      toast.success(next ? "Subscribed — new posts will hit your DMs" : "Unsubscribed");
    });
  };

  return shell(
    <>
      {headingLines(
        subscribed && !state.botAdded ? (
          <p className="text-xs text-amber-400/90">
            Add the Intradark bot on Steam to start receiving DMs.
          </p>
        ) : null,
      )}
      <Button
        type="button"
        variant={subscribed ? "outline" : "default"}
        onClick={toggle}
        disabled={pending}
        className="shrink-0 gap-1.5"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : subscribed ? (
          <Check className="size-4" />
        ) : (
          <Bell className="size-4" />
        )}
        {subscribed ? "Subscribed" : "Subscribe"}
      </Button>
    </>,
  );
}
