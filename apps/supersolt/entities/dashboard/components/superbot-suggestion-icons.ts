import {
  Calendar,
  ClipboardList,
  type LucideIcon,
  UtensilsCrossed,
  Users,
} from "lucide-react";

import type { SuperbotSuggestionIconId } from "@/entities/dashboard/model/dummy-superbot-suggestions";

export const SUPERBOT_SUGGESTION_ICONS: Record<
  SuperbotSuggestionIconId,
  LucideIcon
> = {
  users: Users,
  calendar: Calendar,
  "clipboard-list": ClipboardList,
  utensils: UtensilsCrossed,
};
