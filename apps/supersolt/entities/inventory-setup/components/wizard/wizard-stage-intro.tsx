import { Lightbulb, Sparkles } from "lucide-react";
import type { WizardStageNarration } from "@/entities/inventory-setup/lib/wizard-stages";
import { SuperbotStageMessage } from "@/entities/inventory-setup/components/wizard/superbot-stage-message";

export function WizardStageIntro({
  narration,
}: {
  narration: WizardStageNarration;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SuperbotStageMessage>{narration.welcome}</SuperbotStageMessage>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-background rounded-lg border p-3">
          <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
            Why it matters
          </p>
          <p className="text-foreground/80 text-sm leading-relaxed">
            {narration.why}
          </p>
        </div>
        <div className="bg-background rounded-lg border p-3">
          <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            What I can do for you
          </p>
          <p className="text-foreground/80 text-sm leading-relaxed">
            {narration.benefit}
          </p>
        </div>
      </div>
    </div>
  );
}
