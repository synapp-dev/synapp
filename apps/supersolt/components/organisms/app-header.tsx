"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  OrganisationLogoAvatar,
  organisationLogoBoxClassNameSm,
} from "@/components/branding/organisation-logo-avatar";
import { SupersoltLogo } from "@/components/branding/supersolt-logo";
import { usePathname } from "next/navigation";
import { Bot, Building2 } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { InventorySetupImportHeaderButton } from "@/entities/inventory-setup/components/inventory-setup-import-header-button";
import { CommandMenu } from "@/components/shell/command-menu";
import { shouldShowAgentRightShell } from "@/entities/ai-agent-chat/lib/agent-right-shell-pathname";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";
import { RightSidebarTrigger } from "@workspace/ui/components/right-sidebar-trigger";

import { getScopedContextFromPathname } from "@/entities/access/scoped-navigation-context";
import { buildScopedPath } from "@/lib/build-scoped-path";

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

type ScopedVenueInfo = {
  venueName: string | null;
  organisationLogoUrl: string | null;
};

function getScopedContext(pathname: string) {
  return getScopedContextFromPathname(pathname);
}

function buildBreadcrumbs(
  pathname: string,
  venueName: string | null,
): BreadcrumbEntry[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const scoped = getScopedContext(pathname);
  const crumbs: BreadcrumbEntry[] = [];

  if (scoped) {
    const scopePrefix = `/${scoped.organisationSlug}/${scoped.venueSlug}`;
    crumbs.push({
      label: venueName ?? formatSegment(scoped.venueSlug),
      href: scopePrefix,
    });

    const sectionSegments = segments.slice(2);
    sectionSegments.forEach((segment, index) => {
      const sectionPath = sectionSegments.slice(0, index + 1).join("/");
      crumbs.push({
        label: formatSegment(segment),
        href: `${scopePrefix}/${sectionPath}`,
      });
    });
  } else {
    segments.forEach((segment, index) => {
      crumbs.push({
        label: formatSegment(segment),
        href: "/" + segments.slice(0, index + 1).join("/"),
      });
    });
  }

  return crumbs;
}

function useScopedVenueInfo(
  organisationSlug: string | undefined,
  venueSlug: string | undefined,
): ScopedVenueInfo {
  const { data: organisations = [] } = useAccessibleVenueGroupsQuery();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return useMemo(() => {
    if (!mounted || !organisationSlug || !venueSlug) {
      return {
        venueName: null,
        organisationLogoUrl: null,
      };
    }

    for (const org of organisations) {
      if (org.slug !== organisationSlug) continue;
      const venue = org.venues.find((v) => v.slug === venueSlug);
      if (venue) {
        return {
          venueName: venue.name,
          organisationLogoUrl: org.logoUrl,
        };
      }
    }

    return {
      venueName: null,
      organisationLogoUrl: null,
    };
  }, [mounted, organisations, organisationSlug, venueSlug]);
}

export function AppHeader() {
  const pathname = usePathname();
  const scoped = useMemo(() => getScopedContext(pathname), [pathname]);
  const scopedVenueInfo = useScopedVenueInfo(
    scoped?.organisationSlug,
    scoped?.venueSlug,
  );

  const crumbs = useMemo(
    () => buildBreadcrumbs(pathname, scopedVenueInfo.venueName),
    [pathname, scopedVenueInfo.venueName],
  );
  const dashboardHref = scoped
    ? buildScopedPath(scoped.organisationSlug, scoped.venueSlug, "dashboard")
    : "/dashboard";

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
                  <Link href={dashboardHref}>
                    <SupersoltLogo variant="mark" className="h-5 w-auto mt-1" />
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>
                  <SupersoltLogo variant="mark" className="h-5 w-auto mt-1" />
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              const isScopedVenueCrumb = Boolean(scoped) && index === 0;
              const crumbLabel = isScopedVenueCrumb ? (
                <span className="inline-flex items-center gap-1.5">
                  <OrganisationLogoAvatar
                    logoUrl={scopedVenueInfo.organisationLogoUrl}
                    fallbackIcon={Building2}
                    className={organisationLogoBoxClassNameSm}
                    fallbackClassName="h-2.5 w-2.5 text-muted-foreground"
                  />
                  <span>{crumb.label}</span>
                </span>
              ) : (
                crumb.label
              );

              return (
                <Fragment key={crumb.href}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{crumbLabel}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumbLabel}</Link>
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
        <InventorySetupImportHeaderButton />
        <CommandMenu />
        <div className="mx-2 h-0.5 w-0.5 rounded-full bg-muted-foreground" />
        <ThemeToggle />
        {shouldShowAgentRightShell(pathname) ? (
          <RightSidebarTrigger className="-mr-1">
            <Bot />
          </RightSidebarTrigger>
        ) : null}
      </div>
    </header>
  );
}
