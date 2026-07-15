"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rosteringApi } from "@/entities/rostering/api/endpoints";
import type {
  CreateRosterPeriodInput,
  CreateShiftInput,
  RosterPeriodStatus,
} from "@/entities/rostering/model/types";
import type { ApiResult } from "@/lib/api/fetcher.client";

function unwrap<T>(result: ApiResult<T>): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data as T;
}

export const rosteringKeys = {
  stations: ["rostering", "stations"] as const,
  employees: (stationId: string) =>
    ["rostering", "employees", stationId] as const,
  templates: (stationId: string) =>
    ["rostering", "templates", stationId] as const,
  periods: (stationId: string) => ["rostering", "periods", stationId] as const,
  periodDetail: (id: string) => ["rostering", "period", id] as const,
};

export function useStations() {
  return useQuery({
    queryKey: rosteringKeys.stations,
    queryFn: async () => unwrap(await rosteringApi.stations.list()),
  });
}

export function useEmployees(stationId: string | null) {
  return useQuery({
    queryKey: rosteringKeys.employees(stationId ?? ""),
    queryFn: async () => unwrap(await rosteringApi.employees.list(stationId!)),
    enabled: !!stationId,
  });
}

export function useShiftTemplates(stationId: string | null) {
  return useQuery({
    queryKey: rosteringKeys.templates(stationId ?? ""),
    queryFn: async () =>
      unwrap(await rosteringApi.shiftTemplates.list(stationId!)),
    enabled: !!stationId,
  });
}

export function useRosterPeriods(stationId: string | null) {
  return useQuery({
    queryKey: rosteringKeys.periods(stationId ?? ""),
    queryFn: async () =>
      unwrap(await rosteringApi.rosterPeriods.list(stationId!)),
    enabled: !!stationId,
  });
}

export function useRosterPeriodDetail(periodId: string | null) {
  return useQuery({
    queryKey: rosteringKeys.periodDetail(periodId ?? ""),
    queryFn: async () =>
      unwrap(await rosteringApi.rosterPeriods.get(periodId!)),
    enabled: !!periodId,
  });
}

export function useCreateRosterPeriod(stationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRosterPeriodInput) =>
      unwrap(await rosteringApi.rosterPeriods.create(input)),
    onSuccess: () => {
      if (stationId) {
        queryClient.invalidateQueries({
          queryKey: rosteringKeys.periods(stationId),
        });
      }
    },
  });
}

export function useSetRosterPeriodStatus(stationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; status: RosterPeriodStatus }) =>
      unwrap(await rosteringApi.rosterPeriods.setStatus(args.id, args.status)),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({
        queryKey: rosteringKeys.periodDetail(args.id),
      });
      if (stationId) {
        queryClient.invalidateQueries({
          queryKey: rosteringKeys.periods(stationId),
        });
      }
    },
  });
}

export function useCreateShift(periodId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateShiftInput) =>
      unwrap(await rosteringApi.shifts.create(input)),
    onSuccess: () => {
      if (periodId) {
        queryClient.invalidateQueries({
          queryKey: rosteringKeys.periodDetail(periodId),
        });
      }
    },
  });
}

export function useDeleteShift(periodId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) =>
      unwrap(await rosteringApi.shifts.remove(shiftId)),
    onSuccess: () => {
      if (periodId) {
        queryClient.invalidateQueries({
          queryKey: rosteringKeys.periodDetail(periodId),
        });
      }
    },
  });
}

export function useAssignEmployee(periodId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { shiftId: string; employeeId: string }) =>
      unwrap(await rosteringApi.shifts.assign(args.shiftId, args.employeeId)),
    onSuccess: () => {
      if (periodId) {
        queryClient.invalidateQueries({
          queryKey: rosteringKeys.periodDetail(periodId),
        });
      }
    },
  });
}

export function useUnassignEmployee(periodId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) =>
      unwrap(await rosteringApi.shifts.unassign(assignmentId)),
    onSuccess: () => {
      if (periodId) {
        queryClient.invalidateQueries({
          queryKey: rosteringKeys.periodDetail(periodId),
        });
      }
    },
  });
}
