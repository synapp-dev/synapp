"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

type ArticleShareButtonProps = {
  title: string;
  /** "icon" for the rail, "button" for the inline meta bar. */
  variant?: "icon" | "button";
  className?: string;
};

/** Native share sheet where available, clipboard copy fallback. */
export function ArticleShareButton({
  title,
  variant = "button",
  className,
}: ArticleShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const Icon = copied ? Check : Share2;

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={share}
        className={cn("text-muted-foreground hover:text-foreground", className)}
        aria-label="Share"
      >
        <Icon className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={share}
      className={cn(
        "text-muted-foreground hover:text-foreground gap-1.5",
        className,
      )}
    >
      <Icon className="size-4" />
      {copied ? "Copied" : "Share"}
    </Button>
  );
}
