import { Lock } from "lucide-react";

type Phase2LockedPageProps = {
  title: string;
};

/** Shown when a Phase 2 module route is opened directly while the gate is off. */
export function Phase2LockedPage({ title }: Phase2LockedPageProps) {
  return (
    <section className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Lock className="size-5" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">
        {title} is coming in Phase 2
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">
        This module isn&apos;t available yet. It will unlock when Phase 2 rolls
        out for your venue.
      </p>
    </section>
  );
}
