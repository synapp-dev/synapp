// Re-export shim — canonical home is entities/recipes/components/recipe-editor-drawer.
// Kept so existing route-colocated imports keep working (see
// docs/features/inventory-setup/pos-recipe-inline-create/plan.md §7.2).
export {
  RECIPE_EDITOR_TABS,
  RecipeEditorDrawerContent,
  type RecipeEditorPrefill,
  type RecipeEditorRecipe,
  type RecipeEditorTab,
} from "@/entities/recipes/components/recipe-editor-drawer";
