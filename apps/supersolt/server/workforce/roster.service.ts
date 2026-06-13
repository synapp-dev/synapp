import { autoBuildWeek, copyPreviousWeek } from "@/server/workforce/roster-autofill.service";
import { publishWeek } from "@/server/workforce/roster-publish.service";
import { createShift, deleteShift, updateShift } from "@/server/workforce/roster-shift.service";
import { getWeek } from "@/server/workforce/roster-week.service";

export {
  type RosterAvailabilityHintDto,
  type RosterComplianceFlagDto,
  type RosterPositionDto,
  type RosterShiftDto,
  type RosterWeekPayload,
  type RosterWeekSummaryDto,
} from "@/server/workforce/roster-internal";

export const rosterService = {
  getWeek,
  createShift,
  updateShift,
  deleteShift,
  copyPreviousWeek,
  autoBuildWeek,
  publishWeek,
};
