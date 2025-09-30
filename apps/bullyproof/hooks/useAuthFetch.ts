import { useCallback } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

export function useAuthFetch() {
  const authFetch = useCallback(async (url: string, options?: RequestInit) => {
    const supabase = createBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    console.log("token", token);

    const headers = new Headers(options?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, {
      cache: "no-store",
      ...options,
      headers,
    });
  }, []);

  return authFetch;
}
