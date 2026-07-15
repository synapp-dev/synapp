import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  CreateRosterPeriodInput,
  CreateShiftInput,
  Employee,
  RosterPeriod,
  RosterPeriodDetail,
  RosterPeriodStatus,
  Shift,
  ShiftAssignment,
  ShiftTemplate,
  Station,
} from "@/entities/rostering/model/types";

export const rosteringApi = {
  stations: {
    list(): Promise<ApiResult<Station[]>> {
      return apiFetch<Station[]>("/stations");
    },
  },
  employees: {
    list(stationId: string): Promise<ApiResult<Employee[]>> {
      return apiFetch<Employee[]>(`/employees?stationId=${stationId}`);
    },
  },
  shiftTemplates: {
    list(stationId: string): Promise<ApiResult<ShiftTemplate[]>> {
      return apiFetch<ShiftTemplate[]>(`/shift-templates?stationId=${stationId}`);
    },
  },
  rosterPeriods: {
    list(stationId: string): Promise<ApiResult<RosterPeriod[]>> {
      return apiFetch<RosterPeriod[]>(`/roster-periods?stationId=${stationId}`);
    },
    get(id: string): Promise<ApiResult<RosterPeriodDetail>> {
      return apiFetch<RosterPeriodDetail>(`/roster-periods/${id}`);
    },
    create(input: CreateRosterPeriodInput): Promise<ApiResult<RosterPeriod>> {
      return apiFetch<RosterPeriod>("/roster-periods", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    setStatus(
      id: string,
      status: RosterPeriodStatus
    ): Promise<ApiResult<RosterPeriod>> {
      return apiFetch<RosterPeriod>(`/roster-periods/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
  },
  shifts: {
    create(input: CreateShiftInput): Promise<ApiResult<Shift>> {
      return apiFetch<Shift>("/shifts", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    remove(id: string): Promise<ApiResult<{ id: string }>> {
      return apiFetch<{ id: string }>(`/shifts/${id}`, { method: "DELETE" });
    },
    assign(
      shiftId: string,
      employeeId: string
    ): Promise<ApiResult<ShiftAssignment>> {
      return apiFetch<ShiftAssignment>(`/shifts/${shiftId}/assignments`, {
        method: "POST",
        body: JSON.stringify({ employeeId }),
      });
    },
    unassign(assignmentId: string): Promise<ApiResult<{ id: string }>> {
      return apiFetch<{ id: string }>(`/shift-assignments/${assignmentId}`, {
        method: "DELETE",
      });
    },
  },
};
