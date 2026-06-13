export type ChannelRevenueBucket = "dine_in" | "pick_up" | "delivery";

/** Map POS channel strings into Notion channel split buckets. */
export function channelRevenueBucket(channel: string): ChannelRevenueBucket {
  const c = channel.trim().toLowerCase().replaceAll("_", "-");

  if (c === "delivery") {
    return "delivery";
  }

  if (c === "takeaway" || c === "pick-up" || c === "pickup" || c === "online") {
    return "pick_up";
  }

  return "dine_in";
}
