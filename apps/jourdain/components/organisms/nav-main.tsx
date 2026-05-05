"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
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
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

export type NavMainSubItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  exact?: boolean;
};

export type NavMainItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  exact?: boolean;
  isActive?: boolean;
  items?: NavMainSubItem[];
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
}: {
  title?: string;
  items: NavMainItem[];
  enableStaggeredAnimation?: boolean;
  staggerBaseDelay?: number;
  staggerIncrementDelay?: number;
  className?: string;
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

          const menuItem = !hasChildren ? (
            <SidebarMenuItem key={item.title}>
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
            </SidebarMenuItem>
          ) : (
            <Collapsible
              asChild
              id={`nav-collapsible-${(title ?? "nav")
                .toLowerCase()
                .replace(/\s+/g, "-")}-${item.title
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
              open={isOpen}
              onOpenChange={(nextOpen) =>
                setOpenItem(nextOpen ? item.title : null)
              }
              className="group/collapsible"
              key={item.title}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton isActive={itemActive} tooltip={item.title}>
                    {item.icon ? <item.icon className="h-4 w-4" /> : null}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-360 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:grid-rows-[1fr]">
                  <div className="min-h-0 overflow-hidden">
                    <SidebarMenuSub className="w-full origin-left scale-x-0 pt-1 transition-transform duration-360 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=open]/collapsible:scale-x-100">
                      {item.items?.map((subItem, subIndex) => {
                        const subActive = isUrlActive(subItem.url, subItem.exact);

                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <StaggeredAnimation
                              index={subIndex}
                              baseDelay={0}
                              incrementDelay={isOpen ? 0.05 : 0}
                              fadeDirection="left"
                            >
                              <SidebarMenuSubButton asChild isActive={subActive}>
                                <Link href={subItem.url}>
                                  {subItem.icon ? (
                                    <subItem.icon className="h-3 w-3 text-muted-foreground/70" />
                                  ) : null}
                                  <span className="text-xs">{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </StaggeredAnimation>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </div>
                </CollapsibleContent>
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
