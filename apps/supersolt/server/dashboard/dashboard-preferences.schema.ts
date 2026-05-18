import { z } from "zod";

export const dashboardTimeWindowSchema = z.enum([
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "custom",
]);

export const dashboardVenueScopeModeSchema = z.enum([
  "all",
  "single",
  "selected",
]);

export const dashboardPreferencesPatchSchema = z
  .object({
    timeWindow: dashboardTimeWindowSchema,
    venueScopeMode: dashboardVenueScopeModeSchema,
    selectedVenueIds: z.array(z.string().uuid()).max(40).optional(),
    customRangeStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    customRangeEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.timeWindow === "custom") {
      if (!val.customRangeStart || !val.customRangeEnd) {
        ctx.addIssue({
          code: "custom",
          message: "custom_range_requires_start_and_end",
          path: ["customRangeStart"],
        });
      }
    } else if (val.customRangeStart != null || val.customRangeEnd != null) {
      ctx.addIssue({
        code: "custom",
        message: "custom_range_only_when_time_window_custom",
        path: ["customRangeStart"],
      });
    }

    if (val.venueScopeMode === "single") {
      if (!val.selectedVenueIds?.length) {
        ctx.addIssue({
          code: "custom",
          message: "single_scope_requires_one_venue",
          path: ["selectedVenueIds"],
        });
      } else if (val.selectedVenueIds.length !== 1) {
        ctx.addIssue({
          code: "custom",
          message: "single_scope_requires_exactly_one_venue",
          path: ["selectedVenueIds"],
        });
      }
    }

    if (val.venueScopeMode === "selected") {
      if (!val.selectedVenueIds?.length) {
        ctx.addIssue({
          code: "custom",
          message: "selected_scope_requires_venues",
          path: ["selectedVenueIds"],
        });
      }
    }

    if (val.venueScopeMode === "all" && val.selectedVenueIds?.length) {
      ctx.addIssue({
        code: "custom",
        message: "all_scope_must_not_include_venue_ids",
        path: ["selectedVenueIds"],
      });
    }
  });

export type DashboardPreferencesPatch = z.infer<
  typeof dashboardPreferencesPatchSchema
>;
