import { AdminTabSwitcherClient } from "./admin-tab-switcher-client";

interface AdminTabSwitcherProps {
  className?: string;
}

export function AdminTabSwitcher({ className }: AdminTabSwitcherProps) {
  return <AdminTabSwitcherClient className={className} />;
}

