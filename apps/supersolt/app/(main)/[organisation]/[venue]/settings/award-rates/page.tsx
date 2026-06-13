import { AwardRatesPage } from "@/entities/workforce/award-rate-library/components/award-rates-page";

export default async function SettingsAwardRatesPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  return <AwardRatesPage organisation={organisation} venue={venue} />;
}
