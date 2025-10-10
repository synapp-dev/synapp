import { redirect } from "next/navigation";

export default function SchoolPage({
  params,
}: {
  params: { school_id: string };
}) {
  redirect(`/schools/${params.school_id}/home`);
}
