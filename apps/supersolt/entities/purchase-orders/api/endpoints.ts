import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  OrderGuidePeriodPreset,
  OrderGuideResponse,
  PurchaseOrderDetailDto,
  PurchaseOrderListResponse,
  PoStatus,
} from "@/entities/purchase-orders/model/types";

export const purchaseOrdersApi = {
  get: {
    list(input: {
      organisationSlug: string;
      venueSlug: string;
      status?: PoStatus | "all";
      supplierId?: string;
      search?: string;
      fromDate?: string;
      toDate?: string;
    }): Promise<ApiResult<PurchaseOrderListResponse>> {
      const params = new URLSearchParams();
      if (input.status) params.set("status", input.status);
      if (input.supplierId) params.set("supplierId", input.supplierId);
      if (input.search) params.set("search", input.search);
      if (input.fromDate) params.set("fromDate", input.fromDate);
      if (input.toDate) params.set("toDate", input.toDate);
      const qs = params.toString();
      const path = `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/purchase-orders`;
      return apiFetch<PurchaseOrderListResponse>(qs ? `${path}?${qs}` : path);
    },
    detail(input: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
    }): Promise<ApiResult<PurchaseOrderDetailDto>> {
      return apiFetch<PurchaseOrderDetailDto>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/purchase-orders/${input.poId}`
      );
    },
    orderGuide(input: {
      organisationSlug: string;
      venueSlug: string;
      period?: OrderGuidePeriodPreset;
      refresh?: boolean;
    }): Promise<ApiResult<OrderGuideResponse>> {
      const params = new URLSearchParams();
      if (input.period) params.set("period", input.period);
      if (input.refresh) params.set("refresh", "1");
      const qs = params.toString();
      const path = `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/order-guide`;
      return apiFetch<OrderGuideResponse>(qs ? `${path}?${qs}` : path);
    },
  },
  post: {
    create(
      organisationSlug: string,
      venueSlug: string,
      payload: {
        supplierId: string;
        expectedDeliveryDate?: string | null;
        notes?: string | null;
        lines: Array<{
          supplierProductId?: string | null;
          ingredientId?: string | null;
          productName: string;
          quantityOrdered: number;
          unitPriceCents: number;
        }>;
      }
    ): Promise<ApiResult<PurchaseOrderDetailDto>> {
      return apiFetch<PurchaseOrderDetailDto>(
        `/organisations/${organisationSlug}/venues/${venueSlug}/purchase-orders`,
        { method: "POST", body: JSON.stringify(payload) }
      );
    },
    action(
      organisationSlug: string,
      venueSlug: string,
      poId: string,
      action: string,
      body?: unknown
    ): Promise<ApiResult<PurchaseOrderDetailDto>> {
      return apiFetch<PurchaseOrderDetailDto>(
        `/organisations/${organisationSlug}/venues/${venueSlug}/purchase-orders/${poId}/${action}`,
        { method: "POST", body: body ? JSON.stringify(body) : undefined }
      );
    },
    bulkApprove(
      organisationSlug: string,
      venueSlug: string,
      poIds: string[]
    ): Promise<ApiResult<{ approved: string[]; failed: Array<{ poId: string; message: string }> }>> {
      return apiFetch(
        `/organisations/${organisationSlug}/venues/${venueSlug}/purchase-orders/bulk-approve`,
        { method: "POST", body: JSON.stringify({ poIds }) }
      );
    },
    bulkSend(
      organisationSlug: string,
      venueSlug: string,
      poIds: string[]
    ): Promise<
      ApiResult<{
        sent: string[];
        pendingApproval: string[];
        failed: Array<{ poId: string; message: string }>;
      }>
    > {
      return apiFetch(
        `/organisations/${organisationSlug}/venues/${venueSlug}/purchase-orders/bulk-send`,
        { method: "POST", body: JSON.stringify({ poIds }) }
      );
    },
    bulkClose(
      organisationSlug: string,
      venueSlug: string,
      poIds: string[]
    ): Promise<
      ApiResult<{ closed: string[]; failed: Array<{ poId: string; message: string }> }>
    > {
      return apiFetch(
        `/organisations/${organisationSlug}/venues/${venueSlug}/purchase-orders/bulk-close`,
        { method: "POST", body: JSON.stringify({ poIds }) }
      );
    },
    orderGuideRefresh(
      organisationSlug: string,
      venueSlug: string,
      period?: OrderGuidePeriodPreset
    ): Promise<ApiResult<OrderGuideResponse>> {
      return apiFetch<OrderGuideResponse>(
        `/organisations/${organisationSlug}/venues/${venueSlug}/order-guide`,
        {
          method: "POST",
          body: JSON.stringify({ action: "refresh", periodPreset: period }),
        }
      );
    },
    createPosFromGuide(
      organisationSlug: string,
      venueSlug: string,
      selections: Array<{
        supplierId: string;
        lines: Array<{
          supplierProductId: string;
          ingredientId: string;
          productName: string;
          quantityPacks: number;
          unitPriceCents: number;
        }>;
      }>
    ): Promise<ApiResult<{ poIds: string[] }>> {
      return apiFetch(
        `/organisations/${organisationSlug}/venues/${venueSlug}/order-guide`,
        {
          method: "POST",
          body: JSON.stringify({ action: "create-pos", selections }),
        }
      );
    },
  },
  patch: {
    update(
      organisationSlug: string,
      venueSlug: string,
      poId: string,
      payload: unknown
    ): Promise<ApiResult<PurchaseOrderDetailDto>> {
      return apiFetch<PurchaseOrderDetailDto>(
        `/organisations/${organisationSlug}/venues/${venueSlug}/purchase-orders/${poId}`,
        { method: "PATCH", body: JSON.stringify(payload) }
      );
    },
  },
};
