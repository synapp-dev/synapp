import { useCallback } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

export function useAuthFetch() {
  const supabase = createBrowserClient();

  return useCallback(
    async (input: RequestInfo, init: RequestInit = {}) => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      const headers = new Headers(init.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return fetch(input, { ...init, headers });
    },
    [supabase]
  );
}
