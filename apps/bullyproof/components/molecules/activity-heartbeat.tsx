"use client";

import { useEffect, useRef } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

const HEARTBEAT_INTERVAL_MS = 60_000; // 1 minute

/**
 * Client-side heartbeat that updates last_seen_at for the current user.
 * Runs only when authenticated. Fires on sign-in, then every minute.
 * RPC throttles writes to 5 min. Renders nothing.
 */
export function ActivityHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    const sendHeartbeat = () => {
      supabase.rpc("update_my_last_seen").then(({ error }) => {
        if (error) {
          if (process.env.NODE_ENV === "development" && error.code !== "PGRST301") {
            console.debug("[ActivityHeartbeat]", error.message);
          }
        }
      });
    };

    const startHeartbeat = () => {
      sendHeartbeat();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    };

    const stopHeartbeat = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Check session and start if authenticated
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) startHeartbeat();
    });

    // Listen for auth changes: start on sign-in, stop on sign-out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    });

    return () => {
      subscription.unsubscribe();
      stopHeartbeat();
    };
  }, []);

  return null;
}
