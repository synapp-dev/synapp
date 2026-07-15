/**
 * Sales intelligence payload: server-computed insight aggregates for the sales
 * insights page. Everything here is derived in SQL/service code from the Square
 * mirror, menu costing, daily_sales and weather history; the client only renders.
 */

export type MenuMatrixQuadrant = "star" | "plowhorse" | "puzzle" | "dog";

export type MenuMatrixItem = {
  menuItemId: string;
  label: string;
  sectionName: string;
  /** Units sold in the period. */
  quantity: number;
  /** Gross line revenue in the period, cents. */
  revenueCents: number;
  /** Distinct orders containing the item. */
  orderCount: number;
  /** Realized unit price with GST stripped for gst-inclusive items, cents. */
  unitNetPriceCents: number;
  costPerServeCents: number;
  /** unitNetPriceCents minus costPerServeCents. */
  unitContributionCents: number;
  /** Contribution as a share of net price, 0-100. */
  marginPercent: number;
  quadrant: MenuMatrixQuadrant;
};

export type MenuMatrixPayload = {
  items: MenuMatrixItem[];
  /** Kasavana-Smith popularity cutoff: 70% of the mean units per item. */
  popularityThresholdQty: number;
  /** Sales-weighted average unit contribution, cents (the margin cutoff). */
  avgContributionCents: number;
  /** Mapped items that sold but have no recipe cost, so they sit outside the matrix. */
  needsCostingCount: number;
  needsCostingRevenueCents: number;
  /** Revenue on unmapped POS lines in the period (excluded from the matrix). */
  unmappedRevenueCents: number;
};

export type SalesPairing = {
  aId: string;
  aLabel: string;
  bId: string;
  bLabel: string;
  /** Orders containing both items. */
  pairCount: number;
  aOrderCount: number;
  bOrderCount: number;
  /** Observed co-occurrence vs what independence would predict. */
  lift: number;
  /** pairCount / aOrderCount, with A the higher-volume anchor item. */
  attachRate: number;
};

export type SalesAttachOpportunity = {
  menuItemId: string;
  itemLabel: string;
  /** Menu section the item's buyers skip relative to the venue average. */
  sectionName: string;
  itemOrders: number;
  /** Share of the item's orders that include the section, 0-1. */
  attachRate: number;
  /** Share of all orders that include the section, 0-1. */
  venueAttachRate: number;
  /** Rough value of closing half the attach gap over the period, cents. */
  estValueCents: number;
};

export type SalesPairingsPayload = {
  pairs: SalesPairing[];
  opportunities: SalesAttachOpportunity[];
  /** Orders in the period containing at least one mapped item. */
  basketOrders: number;
  multiItemShare: number;
};

export type SalesHeatmapCell = {
  /** 0 = Sunday, matching Postgres extract(dow). */
  dow: number;
  hour: number;
  orders: number;
  netCents: number;
  /** Distinct calendar days contributing to the cell. */
  days: number;
};

export type SalesHeatmapPayload = {
  cells: SalesHeatmapCell[];
  peak: SalesHeatmapCell | null;
  /** Peak cell's share of period revenue, 0-1. */
  peakShare: number | null;
  /** Lowest-revenue trading cell seen on at least two days. */
  quietest: SalesHeatmapCell | null;
};

export type SalesFulfillmentDay = {
  date: string;
  dineInCents: number;
  pickUpCents: number;
  deliveryCents: number;
  revenueCents: number;
};

export type SalesFulfillmentPayload = {
  days: SalesFulfillmentDay[];
  totalDineInCents: number;
  totalPickUpCents: number;
  totalDeliveryCents: number;
};

export type SalesRecordKind =
  | "best_day_ever"
  | "best_weekday_ever"
  | "top_decile_day";

export type SalesRecordItem = {
  date: string;
  kind: SalesRecordKind;
  revenueCents: number;
  label: string;
};

export type SalesRecordsPayload = {
  records: SalesRecordItem[];
  allTimeBestDate: string | null;
  allTimeBestRevenueCents: number | null;
  historyDays: number;
};

export type WeatherLensBucket = {
  bucket: "light_rain" | "heavy_rain";
  /** Learned revenue multiplier vs a dry day, weekday-normalised. */
  revenueMultiplier: number;
  sampleDays: number;
};

export type SalesWeatherLensPayload = {
  /** False until enough paired history exists to trust the multipliers. */
  ready: boolean;
  learned: WeatherLensBucket[];
  /** Actual minus weather-adjusted revenue for the period, cents. Negative = weather cost you. */
  periodImpactCents: number | null;
  rainDaysInPeriod: number;
};

export type SalesIntelligenceMeta = {
  dataSource: "square" | "demo";
  venueTimezone: string;
  totalOrders: number;
  totalNetCents: number;
};

export type SalesIntelligencePayload = {
  meta: SalesIntelligenceMeta;
  /** Deterministic, server-built narrative bullets, most interesting first. */
  observations: string[];
  matrix: MenuMatrixPayload | null;
  pairings: SalesPairingsPayload | null;
  heatmap: SalesHeatmapPayload | null;
  fulfillment: SalesFulfillmentPayload | null;
  records: SalesRecordsPayload | null;
  weatherLens: SalesWeatherLensPayload | null;
};
