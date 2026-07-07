"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { Category } from "@/lib/finance/categorise";
import type { FinanceTransaction } from "@/lib/finance/stats";

export type Budget = {
  id: string;
  category: string;
  monthlyLimit: number;
  createdAt: string;
  updatedAt: string;
};

export const financeTransactionsQueryKey = ["finance-transactions"] as const;
export const budgetsQueryKey = ["finance-budgets"] as const;

export function useFinanceTransactions() {
  return useQuery({
    queryKey: financeTransactionsQueryKey,
    queryFn: async (): Promise<FinanceTransaction[]> => {
      const result = await apiFetch<FinanceTransaction[]>(
        "/finance/transactions"
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 60_000,
  });
}

export function useRecategorise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (force: boolean): Promise<{ updated: number }> => {
      const result = await apiFetch<{ updated: number }>("/finance/categorise", {
        method: "POST",
        body: JSON.stringify({ force }),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeTransactionsQueryKey });
    },
  });
}

export function useSetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      transactionId: string;
      category: Category;
      savePattern?: string;
    }): Promise<{ updated: number }> => {
      const result = await apiFetch<{ updated: number }>(
        `/finance/transactions/${encodeURIComponent(input.transactionId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            category: input.category,
            savePattern: input.savePattern,
          }),
        }
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeTransactionsQueryKey });
    },
  });
}

export function useBudgets() {
  return useQuery({
    queryKey: budgetsQueryKey,
    queryFn: async (): Promise<Budget[]> => {
      const result = await apiFetch<Budget[]>("/finance/budgets");
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useUpsertBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category: Category;
      monthlyLimit: number;
    }): Promise<Budget> => {
      const result = await apiFetch<Budget>("/finance/budgets", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetsQueryKey });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (budgetId: string): Promise<void> => {
      const result = await apiFetch<{ ok: boolean }>(
        `/finance/budgets/${encodeURIComponent(budgetId)}`,
        { method: "DELETE" }
      );
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetsQueryKey });
    },
  });
}
