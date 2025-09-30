import { HeaderTabSwitcherClient } from "./header-tab-switcher-client";

interface HeaderTabSwitcherProps {
  schoolSlug: string;
  className?: string;
}

export function HeaderTabSwitcher({
  schoolSlug,
  className,
}: HeaderTabSwitcherProps) {
  return (
    <HeaderTabSwitcherClient schoolSlug={schoolSlug} className={className} />
  );
}
