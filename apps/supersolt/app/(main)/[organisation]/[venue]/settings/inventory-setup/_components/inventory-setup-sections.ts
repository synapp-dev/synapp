import {
  ArrowRightLeft,
  Building2,
  CookingPot,
  Package,
  ScanBarcode,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export type InventorySetupSectionSlug =
  | "master-inventory-list"
  | "pos-items"
  | "storage-locations"
  | "suppliers"
  | "normalise"
  | "recipes";

export type InventorySetupSection = {
  slug: InventorySetupSectionSlug;
  label: string;
  icon: LucideIcon;
};

export const INVENTORY_SETUP_SECTIONS: InventorySetupSection[] = [
  { slug: "suppliers", label: "Suppliers", icon: Building2 },
  { slug: "normalise", label: "Normalise", icon: ArrowRightLeft },
  { slug: "master-inventory-list", label: "Master Inventory List", icon: Package },
  { slug: "pos-items", label: "POS Items", icon: ScanBarcode },
  { slug: "storage-locations", label: "Storage Locations", icon: Warehouse },
  { slug: "recipes", label: "Recipes", icon: CookingPot },
];

export function inventorySetupSectionFromPathname(
  pathname: string,
): InventorySetupSection | null {
  return (
    INVENTORY_SETUP_SECTIONS.find((section) =>
      pathname.includes(`/settings/inventory-setup/${section.slug}`),
    ) ?? null
  );
}
