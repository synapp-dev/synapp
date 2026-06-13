"use client";

import { ChevronRight, Lock, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { StaggeredAnimation } from "@/lib/ui/staggered-animation";

export type NavLockStatus = "unlocked" | "locked" | "hidden";

export type NavMainSubItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  exact?: boolean;
  lockStatus?: NavLockStatus;
};

export type NavMainItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  exact?: boolean;
  isActive?: boolean;
  lockStatus?: NavLockStatus;
  items?: NavMainSubItem[];
};

export type LockedNavTarget = {
  title: string;
  url: string;
};

function TitleSection({ title }: { title: string }) {
  return (
    <div className="mb-1 flex w-full max-w-fit items-center gap-2">
      <SidebarGroupLabel className="text-muted-foreground mb-1 h-fit w-fit bg-muted-foreground/10 py-0.5 text-xs font-sans">
        {title}
      </SidebarGroupLabel>
      <Separator className="mb-1 w-2/3" />
    </div>
  );
}

export function NavMain({
  title,
  items,
  enableStaggeredAnimation = false,
  staggerBaseDelay = 0,
  staggerIncrementDelay = 0.08,
  className,
  onLockedNavClick,
}: {
  title?: string;
  items: NavMainItem[];
  enableStaggeredAnimation?: boolean;
  staggerBaseDelay?: number;
  staggerIncrementDelay?: number;
  className?: string;
  onLockedNavClick?: (target: LockedNavTarget) => void;
}) {
  const pathname = usePathname();

  const isUrlActive = useCallback((url: string, exact?: boolean) => {
    if (!url || url === "#") {
      return false;
    }

    if (exact) {
      return pathname === url;
    }

    return (
      pathname === url ||
      pathname.startsWith(`${url}/`) ||
      pathname.startsWith(`${url}?`)
    );
  }, [pathname]);

  const activeParentTitle = useMemo(() => {
    const activeParent = items.find((item) => {
      if (!item.items?.length) {
        return false;
      }

      return (
        item.isActive ||
        isUrlActive(item.url, item.exact) ||
        item.items.some((subItem) => isUrlActive(subItem.url, subItem.exact))
      );
    });

    return activeParent?.title ?? null;
  }, [items, isUrlActive]);

  const [openItem, setOpenItem] = useState<string | null>(activeParentTitle);

  useEffect(() => {
    setOpenItem(activeParentTitle);
  }, [activeParentTitle]);

  return (
    <SidebarGroup className={cn("gap-0", className)}>
      {title ? <TitleSection title={title} /> : null}
      <SidebarMenu>
        {items.map((item, index) => {
          const hasChildren = Boolean(item.items?.length);
          const routeActive =
            item.isActive ||
            isUrlActive(item.url, item.exact) ||
            (item.items ?? []).some((subItem) =>
              isUrlActive(subItem.url, subItem.exact)
            );
          const isOpen = openItem === item.title;
          const itemActive = routeActive || isOpen;

          const itemLocked = item.lockStatus === "locked";
          const parentLockedWithNoVisibleChildren =
            itemLocked && !hasChildren;

          const menuItem = !hasChildren ? (
              <SidebarMenuItem key={item.title}>
                {parentLockedWithNoVisibleChildren ? (
                  <SidebarMenuButton
                    isActive={itemActive}
                    tooltip={item.title}
                    className="opacity-70"
                    onClick={() =>
                      onLockedNavClick?.({ title: item.title, url: item.url })
                    }
                  >
                    {item.icon ? <item.icon className="h-4 w-4" /> : null}
                    <span>{item.title}</span>
                    <Lock className="ml-auto h-3.5 w-3.5 opacity-60" />
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={itemActive}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      {item.icon ? <item.icon className="h-4 w-4" /> : null}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
          ) : (
            <Collapsible
              asChild
              open={isOpen}
              onOpenChange={(nextOpen) =>
                setOpenItem(nextOpen ? item.title : null)
              }
              className="group/collapsible"
              key={item.title}
            >
              <SidebarMenuItem>
                {itemLocked ? (
                  <SidebarMenuButton
                    isActive={itemActive}
                    tooltip={item.title}
                    className="opacity-70"
                    onClick={() =>
                      onLockedNavClick?.({ title: item.title, url: item.url })
                    }
                  >
                    {item.icon ? <item.icon className="h-4 w-4" /> : null}
                    <span>{item.title}</span>
                    <Lock className="ml-auto h-3.5 w-3.5 opacity-60" />
                  </SidebarMenuButton>
                ) : (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={itemActive} tooltip={item.title}>
                      {item.icon ? <item.icon className="h-4 w-4" /> : null}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                )}
                {!itemLocked ? (
                <CollapsibleContent className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-360 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:grid-rows-[1fr]">
                  <div className="min-h-0 overflow-hidden">
                    <SidebarMenuSub className="w-full origin-left scale-x-0 pt-1 transition-transform duration-360 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=open]/collapsible:scale-x-100">
                      {item.items?.map((subItem, index) => {
                        const subActive = isUrlActive(subItem.url, subItem.exact);
                        const subLocked = subItem.lockStatus === "locked";

                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <StaggeredAnimation
                              index={index}
                              baseDelay={0}
                              incrementDelay={isOpen ? 0.05 : 0}
                              fadeDirection="left"
                            >
                              {subLocked ? (
                                <SidebarMenuSubButton
                                  className={cn("opacity-70")}
                                  onClick={() =>
                                    onLockedNavClick?.({
                                      title: subItem.title,
                                      url: subItem.url,
                                    })
                                  }
                                >
                                  {subItem.icon ? (
                                    <subItem.icon className="h-3 w-3 text-muted-foreground/70" />
                                  ) : null}
                                  <span className="text-xs">{subItem.title}</span>
                                  <Lock className="ml-auto h-3 w-3 opacity-60" />
                                </SidebarMenuSubButton>
                              ) : (
                                <SidebarMenuSubButton asChild isActive={subActive}>
                                  <Link href={subItem.url}>
                                    {subItem.icon ? (
                                      <subItem.icon className="h-3 w-3 text-muted-foreground/70" />
                                    ) : null}
                                    <span className="text-xs">{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              )}
                            </StaggeredAnimation>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </div>
                </CollapsibleContent>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );

          if (!enableStaggeredAnimation) {
            return menuItem;
          }

          return (
            <StaggeredAnimation
              key={item.title}
              index={index}
              baseDelay={staggerBaseDelay}
              incrementDelay={staggerIncrementDelay}
              fadeDirection="left"
            >
              {menuItem}
            </StaggeredAnimation>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
