"use client";

import {
  ChevronRight,
  Hammer,
  Lock,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";

function DisabledMenuItem({
  title,
  icon: Icon,
  disabledMessage = "Under Construction",
}: {
  title: string;
  icon?: LucideIcon;
  disabledMessage?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { state, isMobile } = useSidebar();
  const displayState = isMobile ? "expanded" : state;
  const isCollapsed = displayState === "collapsed";
  const isLocked = disabledMessage === "Locked";
  const isUnauthorized = disabledMessage === "Unauthorized";
  const isCompleted = disabledMessage === "Completed";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={isHovered ? disabledMessage : title}
        className="opacity-50 cursor-not-allowed"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
          {isCompleted ? (
            Icon && (
              <div
                key="icon"
                className="animate-slide-left-fade-in w-4 h-4 flex items-center justify-center"
              >
                <Icon className="w-4 h-4 text-green-600" />
              </div>
            )
          ) : isHovered && !isCollapsed ? (
            <div
              key={isLocked ? "lock" : isUnauthorized ? "warning" : "hammer"}
              className="animate-slide-left-fade-in w-4 h-4 flex items-center justify-center"
            >
              {isLocked ? (
                <Lock className="w-4 h-4" />
              ) : isUnauthorized ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Hammer className="w-4 h-4 animate-spin" />
              )}
            </div>
          ) : (
            Icon && (
              <div
                key="icon"
                className="animate-slide-left-fade-in w-4 h-4 flex items-center justify-center"
              >
                <Icon className="w-4 h-4" />
              </div>
            )
          )}
        </div>
        {!isCollapsed && (
          <span
            key={isHovered ? "hover" : "default"}
            className="animate-slide-down-fade-in"
          >
            {isHovered ? disabledMessage : title}
          </span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function getButtonClassName(
  liveStyle?: boolean,
  itemActiveEffective?: boolean
): string | undefined {
  if (liveStyle) {
    return "border border-orange-500/30 bg-orange-500/5 text-orange-700 font-medium hover:bg-orange-500/10";
  }
  if (itemActiveEffective) {
    return "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:text-primary-foreground";
  }
  return undefined;
}

function MenuButtonContent({
  item,
}: {
  item: {
    icon?: LucideIcon;
    title: string;
    liveStyle?: boolean;
    badge?: number | string;
    items?: unknown[];
  };
}) {
  return (
    <>
      {item.icon && <item.icon />}
      <span>{item.title}</span>
      {item.liveStyle && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
      )}
      {item.badge !== undefined && (
        <SidebarMenuBadge
          className={item.liveStyle ? "ml-auto mr-1 bg-orange-500 text-white rounded-sm" : "ml-auto"}
        >
          {item.badge}
        </SidebarMenuBadge>
      )}
      {item.items && (
        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
      )}
    </>
  );
}

function TitleSection({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1 w-full max-w-fit">
      <SidebarGroupLabel className="text-xs font-sans mb-1 bg-muted-foreground/10 h-fit w-fit text-muted-foreground py-0.5">
        {title}
      </SidebarGroupLabel>
      <Separator className="mb-1 w-2/3" />
    </div>
  );
}

export function NavMain({
  items,
  title,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    exact?: boolean;
    disabled?: boolean;
    disabledMessage?: string;
    disableActiveStyle?: boolean;
    liveStyle?: boolean;
    badge?: number | string;
    onClick?: (e: React.MouseEvent) => void;
    items?: {
      title: string;
      url: string;
      icon?: LucideIcon;
      exact?: boolean;
    }[];
  }[];
  title?: string;
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
      {title && <TitleSection title={title} />}
      <SidebarMenu>
        {items.map((item) => {
          const itemActive =
            item.isActive ||
            isUrlActive(item.url, item.exact) ||
            (item.items ?? []).some((s) => isUrlActive(s.url, s.exact));
          const itemActiveEffective = item.disableActiveStyle
            ? false
            : itemActive;

          const menuItem = item.disabled ? (
            <DisabledMenuItem
              key={item.title}
              title={item.title}
              icon={item.icon}
              disabledMessage={item.disabledMessage}
            />
          ) : (
            <Collapsible
              asChild
              defaultOpen={itemActive}
              className="group/collapsible"
              key={item.title}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  {item.onClick ? (
                    <div onClick={item.onClick}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className={getButtonClassName(item.liveStyle, itemActiveEffective)}
                      >
                        <MenuButtonContent item={item} />
                      </SidebarMenuButton>
                    </div>
                  ) : (
                    <Link href={item.url} suppressHydrationWarning>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className={getButtonClassName(item.liveStyle, itemActiveEffective)}
                      >
                        <MenuButtonContent item={item} />
                      </SidebarMenuButton>
                    </Link>
                  )}
                </CollapsibleTrigger>
                {item.items && (
                  <CollapsibleContent className="grid transition-[grid-template-rows] duration-200 ease-out grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]">
                    <div className="min-h-0 overflow-hidden">
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const subActive = isUrlActive(subItem.url);
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                className={
                                  subActive
                                    ? "gap-1.5 bg-primary/60 text-primary-foreground hover:bg-primary/60 hover:text-primary-foreground"
                                    : "gap-1.5"
                                }
                              >
                                <Link href={subItem.url} className="flex items-center gap-1.5">
                                  {subItem.icon ? (
                                    <span className="inline-flex shrink-0 [&_svg]:!size-3.5 [&_svg]:shrink-0">
                                      <subItem.icon
                                        className={
                                          subActive
                                            ? "text-primary-foreground"
                                            : "text-muted-foreground/60"
                                        }
                                      />
                                    </span>
                                  ) : null}
                                  <span className="text-xs">{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </div>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );

          return menuItem;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
