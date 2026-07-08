"use client";

import { cn } from "@workspace/ui/lib/utils";

/**
 * Shared shell for the inventory-setup wizards (normalise / recipes / stock).
 *
 * Design contract, consistent across all wizards:
 *  - the card fills the viewport height (wizard routes render full-bleed with
 *    only the app breadcrumb bar above),
 *  - the BODY is the only scroll region,
 *  - header (title + progress) and footer (actions) are always visible.
 */
export function WizardViewport({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // 100dvh minus the app breadcrumb bar + page paddings.
        "flex h-[calc(100dvh-5.5rem)] min-h-[26rem] w-full flex-col",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function WizardFrame({
  header,
  footer,
  children,
  className,
  bodyClassName,
}: {
  header: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-xl border shadow-sm",
        className,
      )}
    >
      <div className="bg-card z-10 shrink-0 border-b px-5 py-3">{header}</div>
      <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>
        {children}
      </div>
      {footer ? (
        <div className="bg-muted/40 z-10 shrink-0 border-t px-5 py-3">{footer}</div>
      ) : null}
    </div>
  );
}

/** Standard header row: eyebrow + title on the left, meta / exit on the right. */
export function WizardFrameHeader({
  eyebrow,
  title,
  titleExtra,
  right,
}: {
  eyebrow: string;
  title: React.ReactNode;
  titleExtra?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {eyebrow}
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
          {titleExtra}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{right}</div>
    </div>
  );
}
