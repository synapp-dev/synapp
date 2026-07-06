import type { RefObject } from "react";
import type { School } from "../components/schools-table-columns";

export type SchoolDetailTabId =
  | "onboarding"
  | "activation"
  | "details"
  | "users"
  | "classes"
  | "activity"
  | "culture"
  | "license"
  | "features";

export type SchoolDetailContextValue = {
  school: School;
  open: boolean;
  activeSection: SchoolDetailTabId;
  handleTabChange: (tab: SchoolDetailTabId) => void;
  onOpenChange: (open: boolean) => void;
  onSchoolUpdate?: () => void;
  /** Set true before navigating with `dialog=add-class` from onboarding. */
  classesDialogIntentRef: RefObject<boolean>;
  isDeleteSchoolDialogOpen: boolean;
  setIsDeleteSchoolDialogOpen: (open: boolean) => void;
};

export type SchoolDetailDrawerProps = {
  school: School | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: SchoolDetailTabId;
  onTabChange?: (tab: SchoolDetailTabId) => void;
  onSchoolUpdate?: () => void;
};
