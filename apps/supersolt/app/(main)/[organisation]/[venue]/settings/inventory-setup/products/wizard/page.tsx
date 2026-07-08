import { ProductsRecipeWizardPage } from "@/entities/pos-catalog-import/components/products-recipe-wizard-page";

export default async function ProductsRecipeWizardRoute({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <ProductsRecipeWizardPage organisation={organisation} venue={venue} />;
}
