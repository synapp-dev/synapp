/** Query keys for content types. Stage caches key off ["stages", { contentTypeId }]. */
export const contentTypeKeys = {
  all: ["content-types"] as const,
  list: () => [...contentTypeKeys.all, "list"] as const,
};
