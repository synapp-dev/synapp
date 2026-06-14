"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";

export type BankAccount = {
  externalId: string;
  name: string;
  accountType: string | null;
  bsb: string | null;
  currency: string | null;
  balance: number | null;
  balanceDate: string | null;
  updatedAt: string | null;
};

export type BankTransaction = {
  id: string;
  fitId: string;
  date: string | null;
  amount: number;
  type: string | null;
  description: string;
  memo: string | null;
};

export type ImportSummary = {
  accounts: number;
  inserted: number;
  duplicates: number;
};

export const bankAccountsQueryKey = ["bank-accounts"] as const;
export const bankTransactionsQueryKey = ["bank-transactions"] as const;

export function useBankAccounts() {
  return useQuery({
    queryKey: bankAccountsQueryKey,
    queryFn: async (): Promise<BankAccount[]> => {
      const result = await apiFetch<BankAccount[]>("/bank/accounts");
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useBankTransactions(accountId: string | null) {
  return useQuery({
    queryKey: [...bankTransactionsQueryKey, accountId],
    queryFn: async (): Promise<BankTransaction[]> => {
      const result = await apiFetch<BankTransaction[]>(
        `/bank/transactions?accountId=${encodeURIComponent(accountId ?? "")}`
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: accountId !== null,
    staleTime: 60_000,
  });
}

export function useImportOfx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string): Promise<ImportSummary> => {
      const result = await apiFetch<ImportSummary>("/bank/import", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountsQueryKey });
      queryClient.invalidateQueries({ queryKey: bankTransactionsQueryKey });
    },
  });
}
