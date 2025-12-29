"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

export function NavMain({
  items,
  title,
  enableStaggeredAnimation = false,
  startIndex = 0,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    exact?: boolean;
    // Special flags for custom rendering
    disableActiveStyle?: boolean;
    liveStyle?: boolean;
    items?: {
      title: string;
      url: string;
      icon?: LucideIcon;
      exact?: boolean;
    }[];
  }[];
  title?: string;
  enableStaggeredAnimation?: boolean;
  startIndex?: number;
}) {
  const pathname = usePathname();

  const isUrlActive = (url: string, exact?: boolean) => {
    if (!url) return false;
    try {
      if (exact) {
        return pathname === url;
      }
      return (
        pathname === url ||
        pathname.startsWith(url + "/") ||
        pathname.startsWith(url + "?")
      );
    } catch {
      return false;
    }
  };

  return (
    <SidebarGroup className="gap-0">
      {title &&
        (enableStaggeredAnimation ? (
          <StaggeredAnimation index={startIndex} fadeDirection="left">
            <div className="flex items-center gap-2 mb-1 w-full max-w-fit">
              <SidebarGroupLabel className="text-xs font-sans mb-1 bg-muted-foreground/10 h-fit w-fit text-muted-foreground py-0.5">
                {title}
              </SidebarGroupLabel>
              <Separator className="mb-1 w-2/3" />
            </div>
          </StaggeredAnimation>
        ) : (
          <div className="flex items-center gap-2 mb-1 w-full max-w-fit">
            <SidebarGroupLabel className="text-xs font-sans mb-1 bg-muted-foreground/10 h-fit w-fit text-muted-foreground py-0.5">
              {title}
            </SidebarGroupLabel>
            <Separator className="mb-1 w-2/3" />
          </div>
        ))}
      <SidebarMenu>
        {items.map((item, index) => {
          // Calculate the animation index: if there's a title, items start after it, otherwise use startIndex
          const itemIndex = title ? startIndex + 1 + index : startIndex + index;
          const itemActive =
            item.isActive ||
            isUrlActive(item.url, item.exact) ||
            (item.items ?? []).some((s) => isUrlActive(s.url, s.exact));
          const itemActiveEffective = item.disableActiveStyle
            ? false
            : itemActive;

          const menuItem = (
            <Collapsible
              asChild
              defaultOpen={itemActive}
              className="group/collapsible"
              key={item.title}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <Link href={item.url} suppressHydrationWarning>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={
                        item.liveStyle
                          ? "border border-orange-500/30 bg-orange-500/10 text-orange-700 font-medium hover:bg-orange-500/15"
                          : itemActiveEffective
                            ? "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground"
                            : undefined
                      }
                    >
                      {item.icon && <item.icon />}

                      <span>{item.title}</span>
                      {item.liveStyle && (
                        <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                      )}
                      {item.items && (
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      )}
                    </SidebarMenuButton>
                  </Link>
                </CollapsibleTrigger>
                {item.items && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const subActive = isUrlActive(subItem.url);
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={
                                subActive
                                  ? "gap-1 bg-primary/60 text-primary-foreground hover:bg-primary/60 hover:text-primary-foreground"
                                  : "gap-1"
                              }
                            >
                              <Link href={subItem.url}>
                                {subItem.icon && (
                                  <subItem.icon className="text-muted-foreground/50" />
                                )}
                                <span className="text-xs">{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );

          if (enableStaggeredAnimation) {
            return (
              <StaggeredAnimation
                key={item.title}
                index={itemIndex}
                fadeDirection="left"
              >
                {menuItem}
              </StaggeredAnimation>
            );
          }

          return menuItem;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
