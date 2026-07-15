import { sql } from "drizzle-orm";
import type { RlsTx } from "@/server/db/drizzle";

export type ItemAggregateRow = {
  menu_item_id: string;
  name: string;
  section_name: string;
  gst_mode: string;
  cost_per_serve_cents: number;
  quantity: number;
  revenue_cents: number;
  order_count: number;
};

export type UnmappedAggregateRow = {
  line_count: number;
  revenue_cents: number;
};

export type PairRow = {
  a_id: string;
  b_id: string;
  pair_count: number;
};

export type ItemSectionRow = {
  menu_item_id: string;
  section_name: string;
  both_orders: number;
};

export type SectionStatsRow = {
  section_name: string;
  orders: number;
  revenue_cents: number;
};

export type BasketStatsRow = {
  total_orders: number;
  multi_item_orders: number;
};

export type HeatmapRow = {
  dow: number;
  hour: number;
  orders: number;
  net_cents: number;
  days: number;
};

export type DailySalesHistoryRow = {
  date: string;
  revenue_cents: number;
  orders_count: number;
  avg_check_cents: number;
  dine_in_revenue_cents: number;
  pick_up_revenue_cents: number;
  delivery_revenue_cents: number;
};

export type WeatherHistoryRow = {
  date: string;
  condition_bucket: string;
};

type RangeArgs = {
  venueId: string;
  startIso: string;
  endIso: string;
};

/**
 * Filter fragment for line-level queries: expects aliases `l`
 * (venue_square_order_lines) and `p` (venue_square_payments) in scope.
 * Non-void, non-refund payments inside the range.
 */
const lineRangeFilter = (args: RangeArgs) => sql`
  l.venue_id = ${args.venueId}
  and p.order_datetime >= ${args.startIso}
  and p.order_datetime <= ${args.endIso}
  and not p.is_void
  and not p.is_refund
`;

const linesJoinPayments = sql`
  from venue_square_order_lines l
  join venue_square_payments p
    on p.venue_id = l.venue_id
   and p.square_payment_id = l.square_payment_id
`;

/** Distinct (order, item) pairs for mapped lines in range, as a CTE body. */
const orderItemsCte = (args: RangeArgs) => sql`
  select distinct
    coalesce(l.square_order_id, l.square_payment_id) as order_key,
    l.menu_item_id
  ${linesJoinPayments}
  where ${lineRangeFilter(args)}
    and l.menu_item_id is not null
`;

export const salesIntelligenceRepo = {
  async itemAggregates(tx: RlsTx, args: RangeArgs): Promise<ItemAggregateRow[]> {
    const result = await tx.execute(sql`
      select
        l.menu_item_id,
        m.name,
        m.section_name,
        m.gst_mode,
        m.cost_per_serve_cents::int as cost_per_serve_cents,
        sum(l.quantity)::float8 as quantity,
        sum(l.gross_amount_cents)::float8 as revenue_cents,
        count(distinct coalesce(l.square_order_id, l.square_payment_id))::int as order_count
      ${linesJoinPayments}
      join menu_items m on m.id = l.menu_item_id
      where ${lineRangeFilter(args)}
        and l.menu_item_id is not null
      group by 1, 2, 3, 4, 5
    `);
    return result as unknown as ItemAggregateRow[];
  },

  async unmappedAggregate(
    tx: RlsTx,
    args: RangeArgs,
  ): Promise<UnmappedAggregateRow | null> {
    const result = await tx.execute(sql`
      select
        count(*)::int as line_count,
        coalesce(sum(l.gross_amount_cents), 0)::float8 as revenue_cents
      ${linesJoinPayments}
      where ${lineRangeFilter(args)}
        and l.menu_item_id is null
    `);
    const rows = result as unknown as UnmappedAggregateRow[];
    return rows[0] ?? null;
  },

  async itemPairs(tx: RlsTx, args: RangeArgs): Promise<PairRow[]> {
    const result = await tx.execute(sql`
      with order_items as (${orderItemsCte(args)})
      select
        a.menu_item_id as a_id,
        b.menu_item_id as b_id,
        count(*)::int as pair_count
      from order_items a
      join order_items b
        on b.order_key = a.order_key
       and a.menu_item_id < b.menu_item_id
      group by 1, 2
      having count(*) >= 3
      order by pair_count desc
      limit 200
    `);
    return result as unknown as PairRow[];
  },

  /** For each item: distinct orders that also contain another item from each other section. */
  async itemSectionCoOccurrence(
    tx: RlsTx,
    args: RangeArgs,
  ): Promise<ItemSectionRow[]> {
    const result = await tx.execute(sql`
      with order_items as (${orderItemsCte(args)}),
      order_sections as (
        select distinct oi.order_key, m.section_name
        from order_items oi
        join menu_items m on m.id = oi.menu_item_id
      )
      select
        oi.menu_item_id,
        os.section_name,
        count(distinct oi.order_key)::int as both_orders
      from order_items oi
      join menu_items mi on mi.id = oi.menu_item_id
      join order_sections os
        on os.order_key = oi.order_key
       and os.section_name <> mi.section_name
      group by 1, 2
    `);
    return result as unknown as ItemSectionRow[];
  },

  async sectionStats(tx: RlsTx, args: RangeArgs): Promise<SectionStatsRow[]> {
    const result = await tx.execute(sql`
      select
        m.section_name,
        count(distinct coalesce(l.square_order_id, l.square_payment_id))::int as orders,
        sum(l.gross_amount_cents)::float8 as revenue_cents
      ${linesJoinPayments}
      join menu_items m on m.id = l.menu_item_id
      where ${lineRangeFilter(args)}
        and l.menu_item_id is not null
      group by 1
    `);
    return result as unknown as SectionStatsRow[];
  },

  async basketStats(tx: RlsTx, args: RangeArgs): Promise<BasketStatsRow | null> {
    const result = await tx.execute(sql`
      with baskets as (
        select
          coalesce(l.square_order_id, l.square_payment_id) as order_key,
          count(distinct l.menu_item_id)::int as distinct_items
        ${linesJoinPayments}
        where ${lineRangeFilter(args)}
          and l.menu_item_id is not null
        group by 1
      )
      select
        count(*)::int as total_orders,
        (count(*) filter (where distinct_items >= 2))::int as multi_item_orders
      from baskets
    `);
    const rows = result as unknown as BasketStatsRow[];
    return rows[0] ?? null;
  },

  async hourlyHeatmap(
    tx: RlsTx,
    args: RangeArgs & { timezone: string },
  ): Promise<HeatmapRow[]> {
    const result = await tx.execute(sql`
      select
        extract(dow from p.order_datetime at time zone ${args.timezone})::int as dow,
        extract(hour from p.order_datetime at time zone ${args.timezone})::int as hour,
        count(*)::int as orders,
        sum(p.net_amount_cents)::float8 as net_cents,
        count(distinct (p.order_datetime at time zone ${args.timezone})::date)::int as days
      from venue_square_payments p
      where p.venue_id = ${args.venueId}
        and p.order_datetime >= ${args.startIso}
        and p.order_datetime <= ${args.endIso}
        and not p.is_void
        and not p.is_refund
      group by 1, 2
    `);
    return result as unknown as HeatmapRow[];
  },

  /** Full daily_sales history for the venue (records + weather fitting need all of it). */
  async dailySalesHistory(
    tx: RlsTx,
    args: { venueId: string },
  ): Promise<DailySalesHistoryRow[]> {
    const result = await tx.execute(sql`
      select
        date::text as date,
        revenue_cents::float8 as revenue_cents,
        orders_count::int as orders_count,
        avg_check_cents::float8 as avg_check_cents,
        dine_in_revenue_cents::float8 as dine_in_revenue_cents,
        pick_up_revenue_cents::float8 as pick_up_revenue_cents,
        delivery_revenue_cents::float8 as delivery_revenue_cents
      from daily_sales
      where venue_id = ${args.venueId}
      order by date
    `);
    return result as unknown as DailySalesHistoryRow[];
  },

  async weatherHistory(
    tx: RlsTx,
    args: { venueId: string },
  ): Promise<WeatherHistoryRow[]> {
    const result = await tx.execute(sql`
      select date::text as date, condition_bucket
      from venue_weather_daily
      where venue_id = ${args.venueId}
        and is_forecast = false
      order by date
    `);
    return result as unknown as WeatherHistoryRow[];
  },
};
