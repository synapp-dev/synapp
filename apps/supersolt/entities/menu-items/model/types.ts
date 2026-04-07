export type MenuItemPriceMode = "MANUAL" | "AUTO_FROM_RECIPE";
export type MenuItemGstMode = "INC" | "EX";
export type MenuItemStatus = "active" | "inactive";

export type MenuItemRecipeComponent = {
  recipeId: string;
  recipeName: string;
  recipeCostPerServeCents: number;
  quantity: number;
};

export type MenuItemSummary = {
  id: string;
  sectionName: string;
  name: string;
  tags: string[];
  priceMode: MenuItemPriceMode;
  priceCents: number;
  gstMode: MenuItemGstMode;
  costPerServeCents: number;
  gpPercent: number;
  pluCode: string;
  showOnMenu: boolean;
  status: MenuItemStatus;
  updatedAt: string;
  recipeSummary: string;
  recipeCount: number;
};

export type MenuItemDetail = Omit<MenuItemSummary, "recipeSummary" | "recipeCount"> & {
  components: MenuItemRecipeComponent[];
};

export type MenuItemListResponse = {
  menuItems: MenuItemSummary[];
  total: number;
  sections: string[];
};

export type UpsertMenuItemInput = {
  sectionName: string;
  name: string;
  tags: string[];
  priceMode: MenuItemPriceMode;
  priceCents: number;
  gstMode: MenuItemGstMode;
  pluCode?: string | null;
  showOnMenu: boolean;
  status: MenuItemStatus;
  components: Array<{
    recipeId: string;
    quantity: number;
  }>;
};
