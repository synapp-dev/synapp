"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import {
  enrichFromApiRow,
  type StaffMember,
} from "@/entities/workforce/people/model/staff-model";
import type { PeopleListItem } from "@/server/workforce/people.service";

export function usePeopleList(organisation: string, venueSlug: string) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.list(organisation, { venueSlug });
      setStaffList(
        data.employees.map((row: PeopleListItem) =>
          enrichFromApiRow({
            ...row,
            userOrganisationId: row.userOrganisationId,
            employmentType: row.employmentType ?? "casual",
          }),
        ),
      );
      setStatusCounts(data.statusCounts);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load people");
      setStaffList([]);
      setStatusCounts({});
    } finally {
      setIsLoading(false);
    }
  }, [organisation, venueSlug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { staffList, statusCounts, loadError, isLoading, reload };
}
