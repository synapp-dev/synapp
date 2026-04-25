import { redirect } from "next/navigation";

export default async function CatalogIndexPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  redirect(`/${organisation}/${venue}/catalog/items`);
}
