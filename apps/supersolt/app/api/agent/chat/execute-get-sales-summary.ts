import {
  buildSalesMixReportUrl,
  getSalesSummaryInputSchema,
  type GetSalesSummaryOutput,
} from "@/entities/ai-agent-chat/lib/sales-summary-tool-schema";
import { AuthError } from "@/server/auth/errors";
import type { RequestAuthContext } from "@/server/auth/context";
import { getSalesInsightsSummary } from "@/server/sales/sales-insights-summary.service";

function salesSummaryLog(
  event:
    | "agent.tool.sales_summary_started"
    | "agent.tool.sales_summary_finished"
    | "agent.tool.sales_summary_denied",
  payload: Record<string, unknown>,
) {
  console.info(JSON.stringify({ event, ...payload }));
}

export type ExecuteGetSalesSummaryArgs = {
  ctx: RequestAuthContext;
  rawInput: unknown;
  requestId?: string | null;
};

export async function executeGetSalesSummary({
  ctx,
  rawInput,
  requestId,
}: ExecuteGetSalesSummaryArgs): Promise<GetSalesSummaryOutput> {
  const parsed = getSalesSummaryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    salesSummaryLog("agent.tool.sales_summary_denied", {
      request_id: requestId ?? undefined,
      reason_code: "invalid_input",
    });
    return {
      error: {
        code: "INVALID_INPUT",
        message:
          "Some sales summary details were invalid. Check the organisation and venue slugs and use YYYY-MM-DD dates.",
      },
    };
  }

  const input = parsed.data;
  salesSummaryLog("agent.tool.sales_summary_started", {
    request_id: requestId ?? undefined,
    from: input.from,
    to: input.to,
  });

  try {
    const summary = await getSalesInsightsSummary(ctx, input);
    salesSummaryLog("agent.tool.sales_summary_finished", {
      request_id: requestId ?? undefined,
      data_source: summary.dataSource,
      orders: summary.totals.orders,
      mix_items: summary.totalMixItems,
    });
    return {
      summary,
      reportUrl: buildSalesMixReportUrl(input),
    };
  } catch (error) {
    if (error instanceof AuthError) {
      salesSummaryLog("agent.tool.sales_summary_denied", {
        request_id: requestId ?? undefined,
        reason_code: error.status === 404 ? "venue_not_found" : "denied",
        status: error.status,
      });
      const denied = error.status === 403 || error.status === 401;
      return {
        error: {
          code: denied
            ? "ACCESS_DENIED"
            : error.status === 404
              ? "VENUE_NOT_FOUND"
              : "INVALID_INPUT",
          message: denied
            ? "You don't have access to that organisation or venue."
            : error.message,
        },
      };
    }
    console.error("[agent/chat] sales summary", error);
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not load the sales summary. Try again shortly.",
      },
    };
  }
}
