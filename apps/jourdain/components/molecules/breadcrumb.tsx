"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@workspace/ui/components/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { CornerDownRight, ChevronDown } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  agent: "Agent",
  dashboard: "Dashboard",
  calendar: "Calendar",
  knowledge: "Knowledge",
  review: "Review",
  identity: "Identity",
  vision: "Vision",
  values: "Values",
  standards: "Standards",
  archetypes: "Archetypes",
  narrative: "Narrative",
  "emotional-patterns": "Emotional Patterns",
  "strengths-weaknesses": "Strengths & Weaknesses",
  interests: "Interests",
  beliefs: "Beliefs",
  boundaries: "Boundaries",
  "life-domains": "Life Domains",
  health: "Health",
  vitals: "Vitals",
  "body-composition": "Body Composition",
  cardiovascular: "Cardiovascular",
  respiratory: "Respiratory",
  temperature: "Temperature",
  metabolic: "Metabolic",
  sleep: "Sleep",
  recovery: "Recovery",
  gym: "Gym",
  diet: "Diet",
  work: "Work",
  direction: "Direction",
  projects: "Projects",
  tasks: "Tasks",
  meetings: "Meetings",
  communication: "Communication",
  crm: "CRM",
  documents: "Documents",
  systems: "Systems",
  performance: "Performance",
  social: "Social",
  relationships: "Relationships",
  events: "Events",
  birthdays: "Birthdays",
  conversations: "Conversations",
  "follow-ups": "Follow-ups",
  network: "Network",
  finance: "Finance",
  accounts: "Accounts",
  cashflow: "Cashflow",
  income: "Income",
  expenses: "Expenses",
  budget: "Budget",
  savings: "Savings",
  investments: "Investments",
  "assets-liabilities": "Assets & Liabilities",
  debts: "Debts",
  taxes: "Taxes",
  subscriptions: "Subscriptions",
  insurance: "Insurance",
  goals: "Goals",
  home: "Home",
  settings: "Settings",
  profile: "Profile",
};

function truncateBreadcrumbLabel(label: string): string {
  if (label.length <= 25) {
    return label;
  }
  return `${label.slice(0, 22)}...`;
}

function formatSegmentLabel(segment: string): string {
  const mapped = SEGMENT_LABELS[segment];
  if (mapped) {
    return mapped;
  }
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function labelForSegment(segment: string): string {
  return truncateBreadcrumbLabel(formatSegmentLabel(segment));
}

export function Breadcrumb() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pathSegments = pathname.split("/").filter(Boolean);

  const breadcrumbItems =
    pathSegments.length === 0
      ? [
          {
            label: "Dashboard",
            href: "/dashboard",
            isLast: true,
          },
        ]
      : pathSegments.map((segment, i) => {
          const href = `/${pathSegments.slice(0, i + 1).join("/")}`;
          return {
            label: labelForSegment(segment),
            href,
            isLast: i === pathSegments.length - 1,
          };
        });

  const shouldCollapse = breadcrumbItems.length > 4;
  const firstItem = breadcrumbItems[0];
  const lastItem = breadcrumbItems[breadcrumbItems.length - 1];
  const middleItems = shouldCollapse ? breadcrumbItems.slice(1, -1) : [];
  const allItemsBeforeLast = breadcrumbItems.slice(0, -1);

  return (
    <BreadcrumbRoot className="min-w-0">
      <BreadcrumbList className="min-w-0">
        {firstItem && (
          <>
            <BreadcrumbItem className="hidden min-w-0 md:block">
              {firstItem.isLast ? (
                <BreadcrumbPage className="truncate text-lg font-semibold">
                  {firstItem.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    href={firstItem.href}
                    className="truncate text-lg font-semibold"
                  >
                    {firstItem.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!firstItem.isLast && (
              <BreadcrumbSeparator className="hidden md:inline-flex" />
            )}
          </>
        )}

        {!shouldCollapse &&
          breadcrumbItems.slice(1).map((item) => (
            <React.Fragment key={item.href}>
              <BreadcrumbItem className="hidden min-w-0 md:block">
                {item.isLast ? (
                  <BreadcrumbPage className="truncate text-lg font-semibold">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      href={item.href}
                      className="truncate text-lg font-semibold"
                    >
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!item.isLast && (
                <BreadcrumbSeparator className="hidden md:inline-flex" />
              )}
            </React.Fragment>
          ))}

        {shouldCollapse && middleItems.length > 0 && isMounted && (
          <>
            <BreadcrumbItem className="hidden md:inline-flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-lg font-semibold transition-colors hover:text-foreground"
                    aria-label="Show more breadcrumb items"
                  >
                    <BreadcrumbEllipsis />
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {middleItems.map((item, index) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 text-lg font-semibold"
                        style={{ paddingLeft: `${(index + 1) * 1.25}rem` }}
                      >
                        <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:inline-flex" />
          </>
        )}

        {shouldCollapse && lastItem && !firstItem?.isLast && (
          <BreadcrumbItem className="hidden min-w-0 md:block">
            <BreadcrumbPage className="truncate text-lg font-semibold">
              {lastItem.label}
            </BreadcrumbPage>
          </BreadcrumbItem>
        )}

        {allItemsBeforeLast.length > 0 && isMounted && (
          <>
            <BreadcrumbItem className="hidden sm:inline-flex md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-lg font-semibold transition-colors hover:text-foreground"
                    aria-label="Show more breadcrumb items"
                  >
                    <BreadcrumbEllipsis />
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {allItemsBeforeLast.map((item, index) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 text-lg font-semibold"
                        style={{ paddingLeft: `${(index + 1) * 1.25}rem` }}
                      >
                        <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:inline-flex md:hidden" />
          </>
        )}

        {lastItem && (
          <BreadcrumbItem className="min-w-0 md:hidden">
            <BreadcrumbPage className="truncate text-lg font-semibold">
              {lastItem.label}
            </BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
