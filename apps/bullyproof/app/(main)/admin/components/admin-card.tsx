"use client";

import * as React from "react";
import Link from "next/link";
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
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

interface AdminCardProps {
  title: string;
  url: string;
  iconName: string;
  description: string;
  disabled?: boolean;
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
};

export function AdminCard({
  title,
  url,
  iconName,
  description,
  disabled,
}: AdminCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const isDisabled = disabled === true;
  const Icon = iconMap[iconName];

  if (!Icon) {
    console.warn(`Icon "${iconName}" not found in iconMap`);
  }

  const cardContent = (
    <Card
      className={cn(
        "transition-all h-full",
        isDisabled
          ? "cursor-not-allowed"
          : "hover:shadow-md hover:border-primary/50 cursor-pointer"
      )}
      onMouseEnter={() => isDisabled && setIsHovered(true)}
      onMouseLeave={() => isDisabled && setIsHovered(false)}
    >
      <CardHeader className={cn(isDisabled && "opacity-50")}>
       
          <CardTitle className={cn(isDisabled && "text-muted-foreground", "flex-row flex items-center gap-2")}>
          {Icon && <Icon className="h-5 w-5" />}
            {title}
          </CardTitle>
          <CardDescription
          className={cn(isDisabled && !isHovered && "opacity-50")}
        >
          {isDisabled && isHovered ? (
            <p className="text-sm text-muted-foreground animate-slide-down-fade-in">
              Currently under development!
            </p>
          ) : (
            <p className="text-sm text-muted-foreground animate-slide-up-fade-in">
              {description}
            </p>
          )}
        </CardDescription>
    
      </CardHeader>
     
    </Card>
  );

  return isDisabled ? (
    <div key={title}>{cardContent}</div>
  ) : (
    <Link key={title} href={url}>
      {cardContent}
    </Link>
  );
}
