import { redirect } from "next/navigation";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;

  // Redirect to home page - this page is not accessible
  redirect(`/schools/${school_id}/home`);
}
