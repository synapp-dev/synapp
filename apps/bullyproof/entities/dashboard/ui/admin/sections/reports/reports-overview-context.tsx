"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  reportsApi,
  type AdminReportsOverviewDto,
} from "@/entities/reports/api/endpoints";
import { useSchools, type School } from "@/entities/school/model/store";

type ReportsOverviewContextValue = {
  overview: AdminReportsOverviewDto | null;
  loadError: string | null;
  overviewLoading: boolean;
  schoolIdFromUrl: string;
  setSchoolFilter: (nextId: string) => void;
  schoolOptions: School[];
  schoolsLoading: boolean;
};

const ReportsOverviewContext = createContext<
  ReportsOverviewContextValue | undefined
>(undefined);

export function ReportsOverviewProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const schoolIdFromUrl = searchParams.get("schoolId")?.trim() ?? "";

  const { schools, isLoading: schoolsLoading } = useSchools({});

  const [overview, setOverview] = useState<AdminReportsOverviewDto | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const setSchoolFilter = useCallback(
    (nextId: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (!nextId) {
        params.delete("schoolId");
      } else {
        params.set("schoolId", nextId);
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    let alive = true;

    async function run() {
      setOverviewLoading(true);
      setLoadError(null);
      const result = await reportsApi.get.overview(
        schoolIdFromUrl || undefined
      );
      if (!alive) return;
      if (result.error) {
        setOverview(null);
        setLoadError(result.error.message ?? "Failed to load reports");
      } else {
        setOverview(result.data);
      }
      setOverviewLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [schoolIdFromUrl]);

  const schoolOptions = useMemo(
    () =>
      [...schools].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [schools]
  );

  const value = useMemo(
    () => ({
      overview,
      loadError,
      overviewLoading,
      schoolIdFromUrl,
      setSchoolFilter,
      schoolOptions,
      schoolsLoading,
    }),
    [
      overview,
      loadError,
      overviewLoading,
      schoolIdFromUrl,
      setSchoolFilter,
      schoolOptions,
      schoolsLoading,
    ]
  );

  return (
    <ReportsOverviewContext.Provider value={value}>
      {children}
    </ReportsOverviewContext.Provider>
  );
}

export function useReportsOverview(): ReportsOverviewContextValue {
  const ctx = useContext(ReportsOverviewContext);
  if (!ctx) {
    throw new Error(
      "useReportsOverview must be used within ReportsOverviewProvider"
    );
  }
  return ctx;
}
