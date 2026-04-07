"use client";

import { useEffect } from "react";
import { meApi } from "@/entities/me/api/endpoints";
import { useMeStore } from "@/entities/me/model/store";

export function MeLoader() {
  const setCurrentUser = useMeStore((state) => state.setCurrentUser);
  const setLoading = useMeStore((state) => state.setLoading);
  const setError = useMeStore((state) => state.setError);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentUser = async () => {
      setLoading(true);
      setError(null);

      const result = await meApi.get.currentUser();

      if (cancelled) {
        return;
      }

      if (result.error) {
        setCurrentUser(null);
        setError(result.error.message);
      } else {
        setCurrentUser(result.data);
      }

      setLoading(false);
    };

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [setCurrentUser, setError, setLoading]);

  return null;
}
