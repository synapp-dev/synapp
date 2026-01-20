import { useQueryClient } from "@tanstack/react-query";
import { invalidateQueriesForEndpoint } from "@/utils/mutation-invalidation";

/**
 * Hook that provides automatic mutation invalidation helpers.
 * 
 * @example
 * ```typescript
 * const { invalidateAfterMutation } = useMutationInvalidation();
 * 
 * const result = await topicsApi.put.update(topicId, payload);
 * if (result.data) {
 *   invalidateAfterMutation(`/topics/${topicId}`);
 * }
 * ```
 */
export function useMutationInvalidation() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidates queries after a successful mutation.
     * 
     * @param endpoint - The API endpoint path (e.g., "/topics/123")
     * @param params - Optional additional parameters for placeholder replacement
     */
    invalidateAfterMutation: (
      endpoint: string,
      params?: Record<string, string>
    ) => {
      invalidateQueriesForEndpoint(queryClient, endpoint, params);
    },
  };
}
