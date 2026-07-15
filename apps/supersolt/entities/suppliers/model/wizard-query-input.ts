/**
 * The exact suppliers-list query input SupplierConfigurationWizard fires on
 * first render. Shared between the wizard's useSuppliersQuery call, the
 * configure page's RSC prefetch, and that page's guard test so the
 * server-hydrated cache key can never drift from the client's.
 *
 * Note: the wizard passes no `search`/`category`/`archived`/`hasProducts`, so
 * they are `undefined` in the query key (hashKey drops undefined values).
 */
export const WIZARD_SUPPLIERS_LIST_FILTERS = {
  search: undefined,
  category: undefined,
  status: "active",
  archived: undefined,
  hasProducts: undefined,
  inventorySource: true,
  sort: "name",
  page: 1,
  pageSize: 200,
} as const;
