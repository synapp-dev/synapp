"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  Briefcase,
  CalendarRange,
  Clock,
  DollarSign,
  FileBadge2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import { positionBadgeClass } from "@/lib/roster/position-styles";
import type { StaffMember } from "./people-staff-model";
import {
  ROLE_BADGE_VARIANT,
  ROLE_STYLES,
  formatHourlyRate,
  formatStartDate,
  getInitials,
  onboardingStatusLabel,
} from "./people-staff-model";

type PeopleStaffSheetProps = {
  staff: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationSlug: string;
  venueSlug: string;
};

type StaffSheetTab =
  | "details"
  | "role"
  | "employment"
  | "pay"
  | "attendance"
  | "leave"
  | "hr";

const TAB_CONFIG: Array<{
  tab: StaffSheetTab;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Short label for mobile select */
  selectLabel: string;
}> = [
  { tab: "details", icon: User, label: "Details", selectLabel: "Details" },
  { tab: "role", icon: ShieldCheck, label: "Role", selectLabel: "Role" },
  { tab: "employment", icon: Briefcase, label: "Employment", selectLabel: "Employment" },
  { tab: "pay", icon: DollarSign, label: "Pay conditions", selectLabel: "Pay conditions" },
  { tab: "attendance", icon: Clock, label: "Time & attendance", selectLabel: "Time & attendance" },
  { tab: "leave", icon: CalendarRange, label: "Leave & availability", selectLabel: "Leave & availability" },
  { tab: "hr", icon: FileBadge2, label: "HR & compliance", selectLabel: "HR & compliance" },
];

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs font-medium text-muted-foreground">Coming soon</p>
    </div>
  );
}

function formatScopeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function PeopleStaffSheetBody({
  staff,
  organisationSlug,
  venueSlug,
}: {
  staff: StaffMember;
  organisationSlug: string;
  venueSlug: string;
}) {
  const [activeTab, setActiveTab] = useState<StaffSheetTab>("details");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b bg-muted/50 px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              ROLE_STYLES[staff.roleTier]
            )}
          >
            {getInitials(staff.name)}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{staff.name}</h2>
              <Badge variant={staff.status === "active" ? "default" : "secondary"}>
                {staff.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Member since {formatStartDate(staff.startDate)}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {formatScopeSlug(venueSlug)} · {formatScopeSlug(organisationSlug)}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b px-4 py-3 md:hidden">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Section</label>
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as StaffSheetTab)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAB_CONFIG.map(({ tab, selectLabel }) => (
                <SelectItem key={tab} value={tab}>
                  {selectLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="hidden w-48 shrink-0 border-r border-border/60 bg-transparent md:flex md:flex-col">
            <SidebarProvider className="min-h-0 items-start">
              <Sidebar collapsible="none" className="w-full border-0 bg-transparent p-0">
                <SidebarContent className="px-1">
                  <SidebarGroup className="p-0">
                    <SidebarGroupContent className="p-0">
                      <SidebarMenu className="p-2">
                        {TAB_CONFIG.map(({ tab, icon: Icon, label }) => (
                          <SidebarMenuItem key={tab}>
                            <SidebarMenuButton
                              isActive={activeTab === tab}
                              onClick={() => setActiveTab(tab)}
                              className={
                                activeTab === tab
                                  ? "!bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground data-[active=true]:!bg-primary data-[active=true]:!text-primary-foreground"
                                  : ""
                              }
                            >
                              <Icon className="h-4 w-4" />
                              <span>{label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </Sidebar>
            </SidebarProvider>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto pt-2 pl-4 pr-4 pb-4 md:pl-4 md:pr-6 md:pt-2">
            {activeTab === "details" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow label="Full name" value={staff.name} />
                  <InfoRow label="Start date" value={formatStartDate(staff.startDate)} />
                  <div className="sm:col-span-2">
                    <div className="mb-0.5 text-xs text-muted-foreground">Email</div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <a
                        href={`mailto:${staff.email}`}
                        className="truncate text-primary underline-offset-4 hover:underline"
                      >
                        {staff.email}
                      </a>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-0.5 text-xs text-muted-foreground">Phone</div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {staff.phone ? (
                        <a
                          href={`tel:${staff.phone}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {staff.phone}
                        </a>
                      ) : (
                        <span className="italic text-muted-foreground">Not set</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "role" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Permission</span> controls what they can access in
                  the app. <span className="font-medium text-foreground">Roster station</span> is their default job on
                  the schedule.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={ROLE_BADGE_VARIANT[staff.roleTier]} className="text-sm">
                    {staff.roleDisplayName}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">({staff.roleTier})</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow label="Permission (app)" value={staff.roleDisplayName} />
                  <InfoRow label="Permission slug" value={<code className="text-xs">{staff.roleSlug}</code>} />
                  <InfoRow label="Organisation admin" value={staff.grantsOrgAdmin ? "Yes" : "No"} />
                  <InfoRow
                    label="Roster station"
                    value={
                      staff.positionSlug && staff.positionDisplayName ? (
                        <Badge
                          variant="outline"
                          className={cn("w-fit text-xs", positionBadgeClass(staff.positionSlug))}
                        >
                          {staff.positionDisplayName}
                        </Badge>
                      ) : (
                        <span className="text-sm italic text-muted-foreground">Not set</span>
                      )
                    }
                  />
                  {staff.positionSlug ? (
                    <InfoRow label="Station slug" value={<code className="text-xs">{staff.positionSlug}</code>} />
                  ) : null}
                </div>
              </div>
            )}

            {activeTab === "employment" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Employment type, rate, onboarding, and next shift below are preview/sample fields until payroll
                  and roster data are connected.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow
                    label="Employment type"
                    value={<span className="capitalize">{staff.employmentType.replace("-", " ")}</span>}
                  />
                  <InfoRow label="Hourly rate" value={formatHourlyRate(staff.hourlyRateCents)} />
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Onboarding</span>
                      <span className="text-xs font-medium">
                        {onboardingStatusLabel(staff.onboardingStatus)} · {staff.onboardingProgress}%
                      </span>
                    </div>
                    <Progress value={staff.onboardingProgress} className="h-2" />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-0.5 text-xs text-muted-foreground">Next shift</div>
                    {staff.nextShift ? (
                      <div className="text-sm font-medium">
                        {staff.nextShift.day} · {staff.nextShift.time}
                      </div>
                    ) : (
                      <div className="text-sm italic text-muted-foreground">No upcoming shift</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pay" && (
              <PlaceholderPanel
                title="Pay conditions"
                description="Award classification, loadings, and pay rules will appear here."
              />
            )}

            {activeTab === "attendance" && (
              <PlaceholderPanel
                title="Time & attendance"
                description="Clock events, timesheets, and exceptions will appear here."
              />
            )}

            {activeTab === "leave" && (
              <PlaceholderPanel
                title="Leave & availability"
                description="Leave balances, requests, and availability will appear here."
              />
            )}

            {activeTab === "hr" && (
              <PlaceholderPanel
                title="HR & compliance"
                description="Qualifications, documents, and compliance tasks will appear here."
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export function PeopleStaffSheet({
  staff,
  open,
  onOpenChange,
  organisationSlug,
  venueSlug,
}: PeopleStaffSheetProps) {
  if (!staff) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "inset-x-1/2 right-auto top-14 flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full max-w-5xl -translate-x-1/2 flex-col overflow-hidden rounded-t-xl border p-0 md:w-[min(96vw,56rem)]"
        )}
      >
        <SheetTitle className="sr-only">{staff.name} — staff member details</SheetTitle>
        <SheetDescription className="sr-only">
          View details, role, and employment for {staff.name}.
        </SheetDescription>

        <PeopleStaffSheetBody
          key={staff.id}
          staff={staff}
          organisationSlug={organisationSlug}
          venueSlug={venueSlug}
        />
      </SheetContent>
    </Sheet>
  );
}
