import { QueryClient } from "@tanstack/react-query";

/**
 * Maps API endpoints to React Query keys that should be invalidated when mutations succeed.
 * 
 * Pattern matching:
 * - Use {id} as placeholder for dynamic IDs
 * - Use {topicId} for topic-specific endpoints
 * - Use {stageId} for stage-specific endpoints
 * 
 * The function will replace placeholders with actual values from the endpoint path.
 */
const ENDPOINT_TO_QUERY_KEYS: Record<string, string[][]> = {
  // Topics mutations
  "/topics": [["topics"]], // POST - invalidate all topics
  "/topics/{id}": [["topics"], ["topics", "by-id", "{id}"]], // PUT/DELETE
  "/topic-slides": [["topics"]], // POST - invalidate topics (slides changed)
  "/topic-slides/{id}": [["topics"]], // PUT/DELETE
  "/topic-slides/bulk-save": [["topics"]], // POST
  
  // Stages mutations
  "/stages": [["stages"]], // POST
  "/stages/{id}": [["stages"], ["stages", "{id}"]], // PUT/DELETE
  
  // Lessons mutations
  "/lessons": [["lessons"]], // POST
  "/lessons/{id}": [["lessons"], ["lessons", "{id}"]], // PUT/DELETE
  
  // Classes mutations
  "/classes": [["classes"]], // POST
  "/classes/{id}": [["classes"]], // PUT/DELETE
  "/classes/delete": [["classes"]], // DELETE batch
  
  // Certification mutations
  "/certification/topics/{topicId}/slides/bulk": [
    ["certification", "topics"]
  ],
  "/certification/topics/{topicId}": [
    ["certification", "topics"],
    ["certification", "topics", "by-id", "{topicId}"]
  ],
  "/certification/stages": [["certification", "stages"]],
  "/certification/stages/{id}": [
    ["certification", "stages"],
    ["certification", "stages", "{id}"]
  ],
  
  // Users mutations
  "/users": [["users"]],
  "/users/{id}": [["users"], ["users", "{id}"]],
  
  // Other mutations can be added here
};

/**
 * Extracts dynamic parameters from an endpoint path.
 * For example: "/topics/123" with pattern "/topics/{id}" returns { id: "123" }
 */
function extractParams(
  endpoint: string,
  pattern: string
): Record<string, string> {
  const params: Record<string, string> = {};
  const patternParts = pattern.split("/");
  const endpointParts = endpoint.split("/");

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    if (patternPart.startsWith("{") && patternPart.endsWith("}")) {
      const paramName = patternPart.slice(1, -1);
      if (endpointParts[i]) {
        params[paramName] = endpointParts[i];
      }
    }
  }

  return params;
}

/**
 * Finds matching query keys for an endpoint by matching against patterns.
 */
function findMatchingQueryKeys(
  endpoint: string,
  params?: Record<string, string>
): string[][] {
  const queryKeys: string[][] = [];

  // Try to find exact match first
  if (ENDPOINT_TO_QUERY_KEYS[endpoint]) {
    return ENDPOINT_TO_QUERY_KEYS[endpoint];
  }

  // Try pattern matching
  for (const [pattern, keys] of Object.entries(ENDPOINT_TO_QUERY_KEYS)) {
    // Check if pattern matches endpoint structure
    const patternParts = pattern.split("/");
    const endpointParts = endpoint.split("/");

    if (patternParts.length !== endpointParts.length) {
      continue;
    }

    let matches = true;
    const extractedParams: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const endpointPart = endpointParts[i];

      if (patternPart.startsWith("{") && patternPart.endsWith("}")) {
        // This is a parameter placeholder
        const paramName = patternPart.slice(1, -1);
        extractedParams[paramName] = endpointPart;
      } else if (patternPart !== endpointPart) {
        // Literal parts must match exactly
        matches = false;
        break;
      }
    }

    if (matches) {
      // Merge extracted params with provided params
      const finalParams = { ...extractedParams, ...params };

      // Replace placeholders in query keys with actual values
      const resolvedKeys = keys.map((key) =>
        key.map((part) => {
          if (part.startsWith("{") && part.endsWith("}")) {
            const paramName = part.slice(1, -1);
            return finalParams[paramName] || part;
          }
          return part;
        })
      );

      queryKeys.push(...resolvedKeys);
    }
  }

  return queryKeys;
}

/**
 * Invalidates React Query cache for queries related to the given endpoint.
 * 
 * @param queryClient - The React Query client instance
 * @param endpoint - The API endpoint path (e.g., "/topics/123" or "/topics")
 * @param params - Optional additional parameters to use for placeholder replacement
 * 
 * @example
 * ```typescript
 * const result = await topicsApi.put.update(topicId, payload);
 * if (result.data) {
 *   invalidateQueriesForEndpoint(queryClient, `/topics/${topicId}`);
 * }
 * ```
 */
export function invalidateQueriesForEndpoint(
  queryClient: QueryClient,
  endpoint: string,
  params?: Record<string, string>
): void {
  // Remove leading /api if present (some endpoints might include it)
  const normalizedEndpoint = endpoint.replace(/^\/api/, "");

  // Find matching query keys
  const queryKeys = findMatchingQueryKeys(normalizedEndpoint, params);

  // Invalidate all matching queries
  // React Query will automatically refetch them, which will update stores via hooks
  queryKeys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
}

/**
 * Helper function to invalidate queries after a successful mutation.
 * This can be used in mutation handlers to automatically invalidate related queries.
 * 
 * @example
 * ```typescript
 * const result = await topicsApi.put.update(topicId, payload);
 * if (result.data) {
 *   invalidateAfterMutation(queryClient, `/topics/${topicId}`);
 * }
 * ```
 */
export function invalidateAfterMutation(
  queryClient: QueryClient,
  endpoint: string,
  params?: Record<string, string>
): void {
  invalidateQueriesForEndpoint(queryClient, endpoint, params);
}
