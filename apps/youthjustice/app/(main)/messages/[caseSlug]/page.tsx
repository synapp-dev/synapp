import { notFound } from "next/navigation";

import { MessagesChatThread } from "@/components/organisms/messages-chat-thread";
import { getDummyCaseBySlug } from "@/lib/dummy-cases";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

export default async function MessagesCasePage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  if (!c) {
    notFound();
  }

  return (
    <MessagesChatThread
      caseSlug={c.slug}
      displayName={c.displayName}
      subtitle={c.subtitle}
    />
  );
}
