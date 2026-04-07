import { MenuItemsPageClient } from "@/app/(main)/[organisation]/[venue]/menu/menu-items/_components/menu-items-page-client";

export default async function MenuItemsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <MenuItemsPageClient organisation={organisation} venue={venue} />;
}
