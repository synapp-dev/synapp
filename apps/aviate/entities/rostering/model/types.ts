import type { Enums, Tables } from "@/types/supabase";

export type Station = Tables<"stations"> & {
  departments: Tables<"departments">[];
};

export type Department = Tables<"departments">;

export type Employee = Tables<"employees">;

export type RosterPeriod = Tables<"roster_periods">;

export type ShiftTemplate = Tables<"shift_templates">;

export type ShiftAssignment = Tables<"shift_assignments"> & {
  employee: Pick<
    Employee,
    "id" | "full_name" | "employee_code" | "job_title" | "department_id"
  > | null;
};

export type Shift = Tables<"shifts"> & {
  assignments: ShiftAssignment[];
};

export type RosterPeriodDetail = RosterPeriod & {
  shifts: Shift[];
};

export type RosterPeriodStatus = Enums<"roster_period_status">;

export interface CreateRosterPeriodInput {
  stationId: string;
  name: string;
  startsOn: string;
  endsOn: string;
}

export interface CreateShiftInput {
  rosterPeriodId: string;
  departmentId: string | null;
  templateId?: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  requiredHeadcount: number;
  notes?: string;
}
