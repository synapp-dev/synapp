import { forecastApi } from "@/entities/forecast/api/endpoints";
import { ingredientsApi } from "@/entities/ingredients/api/endpoints";
import { invoicesApi } from "@/entities/invoices/api/endpoints";
import { meApi } from "@/entities/me/api/endpoints";
import { menuItemsApi } from "@/entities/menu-items/api/endpoints";
import { onboardingApi } from "@/entities/onboarding/api/endpoints";
import { organisationsApi } from "@/entities/organisations/api/endpoints";
import { purchaseOrdersApi } from "@/entities/purchase-orders/api/endpoints";
import { recipesApi } from "@/entities/recipes/api/endpoints";
import { salesInsightsApi } from "@/entities/sales-insights/api/endpoints";
import { squareApi } from "@/entities/square/api/endpoints";
import { suppliersApi } from "@/entities/suppliers/api/endpoints";
import { venuesApi } from "@/entities/venues/api/endpoints";
import { leaveApi } from "@/entities/workforce/leave/api/endpoints";
import { payrollApi } from "@/entities/workforce/payroll-export/api/endpoints";
import { timesheetsApi } from "@/entities/workforce/timesheets/api/endpoints";
import { awardRatesApi } from "@/entities/workforce/award-rate-library/api/endpoints";
import { peopleApi } from "@/entities/workforce/people/api/endpoints";
import { xeroApi } from "@/entities/xero/api/endpoints";

export const api = {
  ...meApi,
  ...onboardingApi,
  ...organisationsApi,
  ...venuesApi,
  ...ingredientsApi,
  ...suppliersApi,
  ...recipesApi,
  ...menuItemsApi,
  ...purchaseOrdersApi,
  ...invoicesApi,
  ...forecastApi,
  ...salesInsightsApi,
  ...squareApi,
  ...xeroApi,
  ...timesheetsApi,
  ...leaveApi,
  ...payrollApi,
  ...awardRatesApi,
  ...peopleApi,
};
