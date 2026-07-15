"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane } from "lucide-react";

import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ThemeToggle } from "@workspace/ui/components/atoms/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { CommandMenu } from "@/components/molecules/command-menu";

function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type BreadcrumbEntry = {
  label: string;
  href: string;
};

function buildBreadcrumbs(pathname: string): BreadcrumbEntry[] {
  const segments = pathname.split("/").filter(Boolean);
  // "/dashboard" is the landing page itself; the brand crumb already points there.
  if (segments.length === 1 && segments[0] === "dashboard") return [];

  return segments.map((segment, index) => ({
    label: formatSegment(segment),
    href: `/${segments.slice(0, index + 1).join("/")}`,
  }));
}

export function AppHeader() {
  const pathname = usePathname();
  const crumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {crumbs.length > 0 ? (
                <BreadcrumbLink asChild>
                  <Link href="/dashboard" className="flex items-center gap-1.5">
                    <Plane className="size-4" />
                    <span className="font-semibold">Aviate</span>
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1.5">
                  <Plane className="size-4" />
                  <span className="font-semibold">Aviate</span>
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <Fragment key={crumb.href}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2 px-4">
        <CommandMenu />
        <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mx-2" />
        <ThemeToggle />
      </div>
    </header>
  );
}
