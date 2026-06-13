import { MemberEditPage } from "@/entities/organisations/members/components/member-edit-page";

type PageProps = {
  params: Promise<{ memberId: string }>;
};

export default async function SettingsMemberEditPage({ params }: PageProps) {
  const { memberId } = await params;
  return <MemberEditPage memberId={memberId} />;
}
