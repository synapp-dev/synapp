"use client";

import { useMeStore } from "@/entities/me/model/store";

export function useEffectiveUser() {
  return useMeStore((s) => s.viewAsUser ?? s.currentUser);
}
