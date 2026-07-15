import { ForecastEventsManager } from "@/entities/forecast/components/forecast-events-manager";

export default async function SettingsCalendarPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <ForecastEventsManager organisation={organisation} venue={venue} />;
}
