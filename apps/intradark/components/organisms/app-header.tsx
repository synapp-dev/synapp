"use client";

import { Fragment, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ThemeToggle } from "@workspace/ui/components/atoms/theme-toggle";
import { RightSidebarTrigger } from "@workspace/ui/components/right-sidebar-trigger";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { CommandMenu } from "@/components/molecules/command-menu";
import { buildBreadcrumbTrail } from "@/lib/main-nav-routes";

export function AppHeader() {
  const pathname = usePathname();
  const { crumbs } = useMemo(() => buildBreadcrumbTrail(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mr-2 shrink-0 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="shrink-0">
              {crumbs.length > 0 ? (
                <BreadcrumbLink asChild>
                  <Link href="/" className="inline-flex items-end gap-0">
                    <span className="sr-only">Home</span>
                    <Image
                      src="/images/logos/intradark-symbol-blue.svg"
                      alt=""
                      width={20}
                      height={20}
                      className="mb-0.5 h-3 w-3 animate-spin-slow"
                      aria-hidden
                    />
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>
                  <span className="sr-only">Home</span>
                  <Image
                    src="/images/logos/intradark-symbol-blue.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="mb-0.5 h-3 w-3 animate-spin-slow"
                    aria-hidden
                  />
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              const Icon = crumb.icon;
              const content = (
                <span className="inline-flex items-center gap-1.5">
                  {Icon ? (
                    <Icon
                      className="size-3.5 shrink-0 opacity-80"
                      aria-hidden
                    />
                  ) : null}
                  {crumb.iconOnlyDisplay ? null : (
                    <span className="truncate">{crumb.label}</span>
                  )}
                </span>
              );

              return (
                <Fragment key={crumb.href}>
                  <BreadcrumbSeparator className="shrink-0" />
                  <BreadcrumbItem className="min-w-0 max-w-[12rem] sm:max-w-[16rem]">
                    {isLast ? (
                      <BreadcrumbPage
                        title={crumb.label}
                        aria-label={
                          crumb.iconOnlyDisplay ? crumb.label : undefined
                        }
                        className="inline-flex min-w-0 items-center gap-1.5 font-normal"
                      >
                        {content}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          href={crumb.href}
                          className="inline-flex min-w-0 items-center gap-1.5"
                          title={crumb.label}
                          aria-label={
                            crumb.iconOnlyDisplay ? crumb.label : undefined
                          }
                        >
                          {content}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex shrink-0 items-center gap-2 px-4">
        <CommandMenu />
        <div className="mx-2 h-0.5 w-0.5 rounded-full bg-muted-foreground" />
        <ThemeToggle />
        <RightSidebarTrigger />
      </div>
    </header>
  );
}
