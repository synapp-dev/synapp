import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

export default async function CaseRootPage({ params }: Props) {
  const { caseSlug } = await params;
  redirect(`/cases/${caseSlug}/overview`);
}
