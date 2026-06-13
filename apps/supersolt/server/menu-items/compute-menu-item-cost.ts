export type MenuItemCostLink = {
  recipeCostPerServeCents: number | null;
  quantity: number;
};

/**
 * Sum of `recipe.costPerServeCents × quantity` across a menu item's linked
 * recipes. Negative/NaN inputs are guarded to contribute `0` so a malformed
 * link can never produce a negative or non-finite cost.
 */
export function computeMenuItemCostFromRecipes(links: MenuItemCostLink[]): number {
  return links.reduce((sum, link) => {
    const cost = Number(link.recipeCostPerServeCents);
    const quantity = Number(link.quantity);
    if (
      !Number.isFinite(cost) ||
      !Number.isFinite(quantity) ||
      cost < 0 ||
      quantity < 0
    ) {
      return sum;
    }
    return sum + Math.round(cost * quantity);
  }, 0);
}
