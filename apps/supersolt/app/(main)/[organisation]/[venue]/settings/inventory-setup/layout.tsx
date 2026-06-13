import { InventorySetupLayoutClient } from "@/app/(main)/[organisation]/[venue]/settings/inventory-setup/_components/inventory-setup-layout-client";

export default function InventorySetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InventorySetupLayoutClient>{children}</InventorySetupLayoutClient>;
}
