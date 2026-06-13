"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { PeopleDetailDto } from "@/server/workforce/people.service";

export function usePeopleDetail(organisation: string, userOrganisationId: string) {
  const [employee, setEmployee] = useState<PeopleDetailDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get(organisation, userOrganisationId);
      setEmployee(data.employee);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load employee");
      setEmployee(null);
    } finally {
      setIsLoading(false);
    }
  }, [organisation, userOrganisationId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { employee, loadError, isLoading, reload };
}
