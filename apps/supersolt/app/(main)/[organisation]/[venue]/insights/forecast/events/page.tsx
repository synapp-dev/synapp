import { redirect } from "next/navigation";

// The venue calendar moved to its canonical home under Settings. Keep this path working
// for any existing links or bookmarks by redirecting.
export default async function ForecastEventsRedirect({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  redirect(`/${organisation}/${venue}/settings/calendar`);
}
