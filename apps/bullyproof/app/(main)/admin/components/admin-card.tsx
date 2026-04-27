"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  School,
  Users,
  GraduationCap,
  Presentation,
  BarChart3,
  FileText,
  HelpCircle,
  BookOpenText,
  Component,
  TicketCheck,
  FolderOpen,
  DatabaseZap,
  Key,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { FeatureRoleMatrixDialog } from "./feature-role-matrix-dialog";

interface AdminCardProps {
  title: string;
  url: string;
  iconName: string;
  description: string;
  featureKey: string;
  disabled?: boolean;
  accessRestricted?: boolean;
  showPermissionsButton?: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  BookOpenText,
  School,
  Users,
  GraduationCap,
  Presentation,
  BarChart3,
  FileText,
  HelpCircle,
  Component,
  TicketCheck,
  FolderOpen,
  DatabaseZap,
};

export function AdminCard({
  title,
  url,
  iconName,
  description,
  featureKey,
  disabled,
  accessRestricted = false,
  showPermissionsButton = false,
}: AdminCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDisabled = disabled === true;
  const Icon = iconMap[iconName];
  const isDialogOpen =
    showPermissionsButton &&
    searchParams.get("permissiondialog") === "open" &&
    searchParams.get("permissionkey") === featureKey;

  const setDialogOpen = React.useCallback(
    (open: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (open) {
        params.set("permissiondialog", "open");
        params.set("permissionkey", featureKey);
      } else if (params.get("permissionkey") === featureKey) {
        params.delete("permissiondialog");
        params.delete("permissionkey");
      }
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [featureKey, pathname, router, searchParams]
  );

  React.useEffect(() => {
    if (showPermissionsButton) return;
    if (
      searchParams.get("permissiondialog") === "open" &&
      searchParams.get("permissionkey") === featureKey
    ) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("permissiondialog");
      params.delete("permissionkey");
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [featureKey, pathname, router, searchParams, showPermissionsButton]);

  if (!Icon) {
    console.warn(`Icon "${iconName}" not found in iconMap`);
  }

  const cardContent = (
    <Card
      className={cn(
        "transition-all h-full min-h-[168px] w-full",
        isDisabled
          ? "cursor-not-allowed"
          : "hover:shadow-md hover:border-primary/50 cursor-pointer"
      )}
      onMouseEnter={() => isDisabled && setIsHovered(true)}
      onMouseLeave={() => isDisabled && setIsHovered(false)}
    >
      <CardHeader className={cn(isDisabled && "opacity-50")}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle
            className={cn(
              isDisabled && "text-muted-foreground",
              "flex-row flex items-center gap-2"
            )}
          >
            {Icon && <Icon className="h-5 w-5" />}
            {title}
          </CardTitle>
          {showPermissionsButton ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={`Manage role access for ${title}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDialogOpen(true);
              }}
            >
              <Key className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <CardDescription
          className={cn(
            "min-h-[3.25rem]",
            isDisabled && !isHovered && "opacity-50"
          )}
        >
          {isDisabled && isHovered ? (
            <p className="text-sm text-muted-foreground animate-slide-down-fade-in">
              {accessRestricted
                ? "You are not authorised to access this module."
                : "Currently under development!"}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground animate-slide-up-fade-in">
              {description}
            </p>
          )}
        </CardDescription>
      </CardHeader>
      {showPermissionsButton ? (
        <FeatureRoleMatrixDialog
          open={isDialogOpen}
          onOpenChange={setDialogOpen}
          featureKey={featureKey}
          featureTitle={title}
        />
      ) : null}
    </Card>
  );

  return isDisabled ? (
    <div className="h-full w-full">{cardContent}</div>
  ) : (
    <Link href={url} className="block h-full w-full">
      {cardContent}
    </Link>
  );
}
