"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";

export type XeroStatus = {
  configured: boolean;
  connected: boolean;
  organisation: string | null;
};

export type XeroBankAccount = {
  accountId: string;
  name: string;
  bankAccountNumber: string | null;
  currencyCode: string | null;
  status: string | null;
  balance: number | null;
};

export type XeroBankTransaction = {
  bankTransactionId: string;
  date: string | null;
  type: string | null;
  reference: string | null;
  contactName: string | null;
  amount: number;
  isReconciled: boolean;
  status: string | null;
};

export const xeroStatusQueryKey = ["xero-status"] as const;
export const xeroAccountsQueryKey = ["xero-accounts"] as const;
export const xeroTransactionsQueryKey = ["xero-transactions"] as const;

export function useXeroStatus() {
  return useQuery({
    queryKey: xeroStatusQueryKey,
    queryFn: async (): Promise<XeroStatus> => {
      const result = await apiFetch<XeroStatus>("/xero/status");
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useXeroBankAccounts(enabled: boolean) {
  return useQuery({
    queryKey: xeroAccountsQueryKey,
    queryFn: async (): Promise<XeroBankAccount[]> => {
      const result = await apiFetch<XeroBankAccount[]>("/xero/accounts");
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useXeroTransactions(accountId: string | null) {
  return useQuery({
    queryKey: [...xeroTransactionsQueryKey, accountId],
    queryFn: async (): Promise<XeroBankTransaction[]> => {
      const result = await apiFetch<XeroBankTransaction[]>(
        `/xero/transactions?accountId=${encodeURIComponent(accountId ?? "")}`
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: accountId !== null,
    staleTime: 60_000,
  });
}

export function useDisconnectXero() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const result = await apiFetch<{ disconnected: boolean }>(
        "/xero/disconnect",
        { method: "POST" }
      );
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: xeroStatusQueryKey });
      queryClient.invalidateQueries({ queryKey: xeroAccountsQueryKey });
    },
  });
}
