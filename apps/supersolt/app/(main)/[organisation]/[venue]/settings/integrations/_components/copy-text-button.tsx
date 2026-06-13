"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Check, Copy } from "lucide-react";

type CopyTextButtonProps = {
  value: string;
  label?: string;
};

export function CopyTextButton({ value, label = "Copy" }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
