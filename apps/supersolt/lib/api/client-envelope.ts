"use client";

import { apiFetch } from "@/lib/api/fetcher.client";

export async function apiFetchOrThrow<T>(
  path: string,
  init?: Parameters<typeof apiFetch>[1],
): Promise<T> {
  const result = await apiFetch<T>(path, init);
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data as T;
}
