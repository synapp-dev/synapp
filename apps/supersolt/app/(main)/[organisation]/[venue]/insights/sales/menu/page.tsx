import { SalesMenuPageClient } from "@/entities/sales-insights/components/sales-menu-page";

export default async function SalesMenuPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <SalesMenuPageClient organisation={organisation} venue={venue} />;
}
