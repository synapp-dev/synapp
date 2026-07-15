import { Phase2LockedPage } from "@/app/(main)/[organisation]/[venue]/_components/phase2-locked-page";
import { isPhase2ModulesEnabled } from "@/lib/phase2-modules";

export default function WorkforceLayout({ children }: { children: React.ReactNode }) {
  if (!isPhase2ModulesEnabled()) {
    return <Phase2LockedPage title="Workforce" />;
  }
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
}
