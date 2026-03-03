import { Badge } from "@workspace/ui/components/badge";

export type SchoolStatus = "onboarding" | "ready" | "active" | "certification";

type SchoolStatusStyle = {
  label: string;
  className: string;
};

const SCHOOL_STATUS_STYLES: Record<SchoolStatus, SchoolStatusStyle> = {
  onboarding: {
    label: "Onboarding",
    className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  },
  ready: {
    label: "Ready",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  active: {
    label: "Active",
    className:
      "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90",
  },
  certification: {
    label: "Certification",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  },
};

export function getSchoolStatusStyle(status: SchoolStatus): SchoolStatusStyle {
  return SCHOOL_STATUS_STYLES[status];
}

export function SchoolStatusBadge({ status }: { status: SchoolStatus }) {
  const style = getSchoolStatusStyle(status);

  return (
    <Badge variant="default" className={style.className}>
      {style.label}
    </Badge>
  );
}
