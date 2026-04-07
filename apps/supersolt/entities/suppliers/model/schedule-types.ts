export type DeliveryScheduleEntry = {
  day: number;
  is_order_day: boolean;
  order_by_time: string | null;
  delivery_day: number | null;
};

export type ScheduleOverrideEntry = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  note: string;
};

export function getDefaultDeliverySchedule(): DeliveryScheduleEntry[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day: i,
    is_order_day: false,
    order_by_time: null,
    delivery_day: null,
  }));
}
