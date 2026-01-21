"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSchoolStore } from "@/stores/school-store";
import { useIsPlatformAdmin } from "@/entities/me/model/store";
import { useMySchoolsQuery } from "@/entities/me/model/useMySchoolsQuery";
import { useListSchoolsQuery } from "@/entities/school/model/useListSchoolsQuery";
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

// Helper function to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper function to truncate breadcrumb labels longer than 25 characters
function truncateBreadcrumbLabel(label: string): string {
  if (label.length <= 25) {
    return label;
  }
  return label.slice(0, 22) + "...";
}

export function Breadcrumb() {
  const pathname = usePathname();
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const isPlatformAdmin = useIsPlatformAdmin();
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component only renders DropdownMenu on client to avoid hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch schools to check if user has only one school
  const { data: mySchools = [] } = useMySchoolsQuery(
    { limit: 5, random: true },
    { enabled: !isPlatformAdmin }
  );
  const { data: allSchools = [] } = useListSchoolsQuery(
    { limit: 5 },
    { enabled: isPlatformAdmin }
  );

  // Check if user has access to only one school
  const baseSchools = isPlatformAdmin ? allSchools : mySchools;
  const hasOnlyOneSchool = baseSchools.length === 1;

  // Split the pathname into segments
  const pathSegments = pathname.split("/").filter(Boolean);

  // Check if we're in a schools/[slug] route
  const isSchoolRoute =
    pathSegments[0] === "schools" && pathSegments.length > 1;

  // Check if we're in a schools/[slug]/lessons/[uuid] route
  const isLessonsRoute =
    isSchoolRoute && pathSegments.length > 2 && pathSegments[2] === "lessons";

  // Build breadcrumb items
  const breadcrumbItems = [];
  let currentPath = "";

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    currentPath += `/${segment}`;

    // Skip "schools" segment if user has only one school
    if (hasOnlyOneSchool && isSchoolRoute && i === 0 && segment === "schools") {
      continue;
    }

    // Special handling for school slug - only if we're in schools/[slug] route
    if (isSchoolRoute && i === 1 && segment && currentSchool) {
      // Replace school slug with actual school name
      breadcrumbItems.push({
        label: truncateBreadcrumbLabel(currentSchool.name),
        href: currentPath,
        isLast: i === pathSegments.length - 1,
      });
    } else if (isLessonsRoute && i === 3 && segment && isUUID(segment)) {
      // Replace lesson UUID with "Live Lesson"
      breadcrumbItems.push({
        label: "Live Lesson",
        href: currentPath,
        isLast: i === pathSegments.length - 1,
      });
    } else {
      // Format the segment: split by hyphens, capitalize each word, join with spaces
      // Special cases for course routes
      let label = "";
      if (segment === "courses") {
        label = "Courses";
      } else if (segment === "ap-certification") {
        label = "AP Certification";
      } else {
        label = segment
          ? segment
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")
          : "";
      }
      breadcrumbItems.push({
        label: truncateBreadcrumbLabel(label),
        href: currentPath,
        isLast: i === pathSegments.length - 1,
      });
    }
  }

  // Determine if we should collapse middle items (when there are 5+ items)
  const shouldCollapse = breadcrumbItems.length > 4;
  const firstItem = breadcrumbItems[0];
  const lastItem = breadcrumbItems[breadcrumbItems.length - 1];
  const middleItems = shouldCollapse ? breadcrumbItems.slice(1, -1) : [];
  const allItemsBeforeLast = breadcrumbItems.slice(0, -1);

  return (
    <BreadcrumbRoot>
      <BreadcrumbList>
        {/* Full breadcrumb - visible only on md and above */}
        {/* First item */}
        {firstItem && (
          <>
            <BreadcrumbItem className="hidden md:block">
              {firstItem.isLast ? (
                <BreadcrumbPage className="text-lg font-semibold">
                  {firstItem.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={firstItem.href} className="text-lg font-semibold">
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

        {/* Show all items when not collapsing (4 or fewer items) - visible only on md and above */}
        {!shouldCollapse &&
          breadcrumbItems.slice(1).map((item) => (
            <React.Fragment key={item.href}>
              <BreadcrumbItem className="hidden md:block">
                {item.isLast ? (
                  <BreadcrumbPage className="text-lg font-semibold">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href} className="text-lg font-semibold">
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

        {/* Ellipsis dropdown for middle items - visible on md and above when collapsing */}
        {shouldCollapse && middleItems.length > 0 && isMounted && (
          <>
            <BreadcrumbItem className="hidden md:inline-flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="text-lg font-semibold hover:text-foreground transition-colors flex items-center gap-1"
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
                        className="text-lg font-semibold flex items-center gap-2"
                        style={{ paddingLeft: `${(index + 1) * 1.25}rem` }}
                      >
                        <CornerDownRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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

        {/* Last item when collapsing - visible only on md and above */}
        {shouldCollapse && lastItem && !firstItem?.isLast && (
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbPage className="text-lg font-semibold">
              {lastItem.label}
            </BreadcrumbPage>
          </BreadcrumbItem>
        )}

        {/* Mobile: Ellipsis with dropdown - visible only between sm and md breakpoints when there are items before last */}
        {allItemsBeforeLast.length > 0 && isMounted && (
          <>
            <BreadcrumbItem className="hidden sm:inline-flex md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="text-lg font-semibold hover:text-foreground transition-colors flex items-center gap-1"
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
                        className="text-lg font-semibold flex items-center gap-2"
                        style={{ paddingLeft: `${(index + 1) * 1.25}rem` }}
                      >
                        <CornerDownRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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

        {/* Last item - visible only below md breakpoint (mobile) */}
        {lastItem && (
          <BreadcrumbItem className="md:hidden">
            <BreadcrumbPage className="text-lg font-semibold">
              {lastItem.label}
            </BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
