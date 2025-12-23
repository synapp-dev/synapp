"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSchoolStore } from "@/stores/school-store";
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";

export function Breadcrumb() {
  const pathname = usePathname();
  const currentSchool = useSchoolStore((state) => state.currentSchool);

  // Split the pathname into segments
  const pathSegments = pathname.split("/").filter(Boolean);

  // Check if we're in a schools/[slug] route
  const isSchoolRoute =
    pathSegments[0] === "schools" && pathSegments.length > 1;

  // Build breadcrumb items
  const breadcrumbItems = [];
  let currentPath = "";

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    currentPath += `/${segment}`;

    // Special handling for school slug - only if we're in schools/[slug] route
    if (isSchoolRoute && i === 1 && segment && currentSchool) {
      // Replace school slug with actual school name
      breadcrumbItems.push({
        label: currentSchool.name,
        href: currentPath,
        isLast: i === pathSegments.length - 1,
      });
    } else {
      // Format the segment: split by hyphens, capitalize each word, join with spaces
      const label = segment
        ? segment
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "";
      breadcrumbItems.push({
        label,
        href: currentPath,
        isLast: i === pathSegments.length - 1,
      });
    }
  }

  return (
    <BreadcrumbRoot>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.href}>
            <BreadcrumbItem>
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
            {!item.isLast && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
