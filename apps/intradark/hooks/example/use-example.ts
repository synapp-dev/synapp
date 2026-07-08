import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Example API function
const fetchExampleData = async (): Promise<unknown> => {
  const response = await fetch("/api/example");
  if (!response.ok) {
    throw new Error("Failed to fetch example data");
  }
  return response.json();
};

// Example mutation function
const createExampleData = async (data: unknown): Promise<unknown> => {
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
  return response.json();
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
