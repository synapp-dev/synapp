import {
  Activity,
  Eye,
  GraduationCap,
  Key,
  Rocket,
  Star,
  ToggleRight,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { SchoolDetailTabId } from "./types";

export type SchoolDetailNavItem = {
  id: SchoolDetailTabId | "delete";
  name: string;
  icon: LucideIcon;
  disabled?: boolean;
};

/** Tabs shown in the mobile section picker (excludes delete). */
export const schoolDetailMobileNavItems: SchoolDetailNavItem[] = [
  { id: "onboarding", name: "Onboarding", icon: Rocket },
  { id: "activation", name: "Activation", icon: ToggleRight },
  { id: "details", name: "Details", icon: Eye },
  { id: "users", name: "Users", icon: Users },
  { id: "classes", name: "Classes", icon: GraduationCap },
  { id: "activity", name: "Activity", icon: Activity, disabled: true },
  { id: "culture", name: "Culture", icon: Star },
  { id: "license", name: "License", icon: Key },
];
