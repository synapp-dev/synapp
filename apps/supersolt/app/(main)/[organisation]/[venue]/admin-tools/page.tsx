import { redirect } from "next/navigation";
import { buildScopedPath } from "@/lib/build-scoped-path";

export default async function LegacyAdminToolsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  redirect(buildScopedPath(organisation, venue, "settings/devkit"));
}
