/**
 * When true, inventory setup section nav ignores phase1/phase2 locks (local testing only).
 * Set in `.env.local`: NEXT_PUBLIC_INVENTORY_SETUP_UNLOCK_ALL=true
 */
export function isInventorySetupSectionsUnlockedForDev(): boolean {
  return process.env.NEXT_PUBLIC_INVENTORY_SETUP_UNLOCK_ALL === "true";
}
