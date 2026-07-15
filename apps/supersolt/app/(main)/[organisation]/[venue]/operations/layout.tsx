import { Phase2LockedPage } from "@/app/(main)/[organisation]/[venue]/_components/phase2-locked-page";
import { isPhase2ModulesEnabled } from "@/lib/phase2-modules";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  if (!isPhase2ModulesEnabled()) {
    return <Phase2LockedPage title="Operations" />;
  }
  return children;
}
