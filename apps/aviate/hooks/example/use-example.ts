import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/** Shape returned by `GET/POST /api/example` in this template. */
export type ExampleApiRecord = {
  message: string;
  timestamp: string;
};

// Example API function
const fetchExampleData = async (): Promise<ExampleApiRecord> => {
  const response = await fetch("/api/example");
  if (!response.ok) {
    throw new Error("Failed to fetch example data");
  }
  return (await response.json()) as ExampleApiRecord;
};

// Example mutation function
const createExampleData = async (
  data: Record<string, unknown>
): Promise<ExampleApiRecord> => {
  const response = await fetch("/api/example", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to create example data");
  }
  return (await response.json()) as ExampleApiRecord;
};

// Example query hook
export const useExampleData = () => {
  return useQuery({
    queryKey: ["example"],
    queryFn: fetchExampleData,
  });
};

// Example mutation hook
export const useCreateExampleData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExampleData,
    onSuccess: () => {
      // Invalidate and refetch example data
      queryClient.invalidateQueries({ queryKey: ["example"] });
    },
  });
};
