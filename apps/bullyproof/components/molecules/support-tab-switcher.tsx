import { SupportTabSwitcherClient } from "@/components/molecules/support-tab-switcher-client";

interface SupportTabSwitcherProps {
  className?: string;
}

export function SupportTabSwitcher({
  className,
}: SupportTabSwitcherProps) {
  return (
    <SupportTabSwitcherClient className={className} />
  );
}
