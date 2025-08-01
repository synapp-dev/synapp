"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
} from "@workspace/ui/components/sidebar";

interface NavItemChild {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
  items?: NavItemChild[];
}

// Helper to check if any descendant is active
function isDescendantActive(items: NavItemChild[], pathname: string): boolean {
  return items.some((child) => {
    // Check if current pathname exactly matches this child's path
    if (pathname === child.href) return true;

    // Check if current pathname starts with this child's path (for nested routes)
    if (pathname.startsWith(child.href + "/")) return true;

    return false;
  });
}

export function NavItem({ href, icon: Icon, children, items }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  const hasActiveChild = items ? isDescendantActive(items, pathname) : false;
  const isOpen = isActive || hasActiveChild;
  const hasChildren = items && items.length > 0;

  return (
    <Collapsible open={isOpen} asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            asChild
            tooltip={children as string}
            isActive={isActive || hasActiveChild}
            className={[
              hasActiveChild
                ? "border-l-2 border-muted-foreground font-bold transition-all"
                : "",
              !isActive && !hasActiveChild
                ? "text-foreground/75 hover:text-foreground transition-colors"
                : "",
              isActive ? "text-foreground" : "",
            ].join(" ")}
          >
            <Link href={href}>
              <Icon className="w-4 h-4" />
              <span>{children}</span>
              {hasChildren && (
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              )}
            </Link>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {hasChildren && (
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <SidebarMenuSub>
              {items?.map((child) => (
                <NavItemChild
                  key={`${child.href}-${child.children}`}
                  {...child}
                  pathname={pathname}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavItemChild({
  href,
  icon: Icon,
  children,
  pathname,
}: NavItemChild & { pathname: string }) {
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={children as string}
        isActive={isActive}
        className={[
          isActive
            ? "text-foreground"
            : "text-foreground/75 hover:text-foreground transition-colors",
        ].join(" ")}
      >
        <Link href={href}>
          <Icon
            className="w-3 h-3 min-w-3 min-h-3 shrink-0"
            style={{ width: 12, height: 12 }}
          />
          <span className="text-xs">{children}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
