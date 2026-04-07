import { ScopedPlaceholderPage } from "@/app/(main)/[organisation]/[venue]/_components/scoped-placeholder-page";

export default async function ScopedSettingsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return (
    <ScopedPlaceholderPage
      title="Venue Settings"
      description="Empty."
      organisation={organisation}
      venue={venue}
    />
  );
}
