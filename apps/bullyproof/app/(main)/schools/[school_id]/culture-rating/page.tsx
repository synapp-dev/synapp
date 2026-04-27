import { redirect } from "next/navigation";

export default async function SchoolCultureRatingPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  redirect(`/schools/${school_id}/performance`);
}
