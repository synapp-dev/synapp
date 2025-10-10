"use client";

import React from "react";
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

  // Build breadcrumb items
  const breadcrumbItems = [];
  let currentPath = "";

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    currentPath += `/${segment}`;

    // Special handling for school slug
    if (i === 1 && segment && currentSchool) {
      // Replace school slug with actual school name
      breadcrumbItems.push({
        label: currentSchool.name,
        href: currentPath,
        isLast: i === pathSegments.length - 1,
      });
    } else {
      // Use the segment as-is, but capitalize it
      const label = segment
        ? segment.charAt(0).toUpperCase() + segment.slice(1)
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
                <BreadcrumbLink
                  href={item.href}
                  className="text-lg font-semibold"
                >
                  {item.label}
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
