"use client";

import {
  TrendingUp,
  TrendingDown,
  Users,
  UserCheck,
  Shield,
  UserPlus,
  Clock,
  UserX,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

interface UserManagementOverviewProps {
  userManagement: {
    totalTeachers: {
      title: string;
      value: number;
      trend: string;
      subtitle: string;
    };
    totalAdmins: {
      title: string;
      value: number;
      trend: string;
      subtitle: string;
    };
    totalGovernment: {
      title: string;
      value: number;
      trend: string;
      subtitle: string;
    };
    newAccountsThisWeek: {
      title: string;
      value: number;
      trend: string;
      subtitle: string;
    };
    invitationsPending: {
      title: string;
      value: number;
      trend: string;
      subtitle: string;
    };
    inactiveUsers: {
      title: string;
      value: number;
      trend: string;
      subtitle: string;
    };
  };
}

export function UserManagementOverview({
  userManagement,
}: UserManagementOverviewProps) {
  const getTrendIcon = (trend: string) => {
    const isPositive = trend.startsWith("+");
    return isPositive ? (
      <TrendingUp className="h-3 w-3 text-green-600" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-600" />
    );
  };

  const getTrendColor = (trend: string) => {
    const isPositive = trend.startsWith("+");
    return isPositive ? "text-green-600" : "text-red-600";
  };

  const getIcon = (title: string) => {
    switch (title) {
      case "Total Teachers":
        return <Users className="h-4 w-4" />;
      case "Total Admins":
        return <Shield className="h-4 w-4" />;
      case "Government Accounts":
        return <UserCheck className="h-4 w-4" />;
      case "New Accounts This Week":
        return <UserPlus className="h-4 w-4" />;
      case "Invitations Pending":
        return <Clock className="h-4 w-4" />;
      case "Inactive Users":
        return <UserX className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const managementItems = [
    { key: "totalTeachers", data: userManagement.totalTeachers },
    { key: "totalAdmins", data: userManagement.totalAdmins },
    { key: "totalGovernment", data: userManagement.totalGovernment },
    { key: "newAccountsThisWeek", data: userManagement.newAccountsThisWeek },
    { key: "invitationsPending", data: userManagement.invitationsPending },
    { key: "inactiveUsers", data: userManagement.inactiveUsers },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {managementItems.map((item, index) => (
        <StaggeredAnimation key={item.key} index={index}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getIcon(item.data.title)}
                  <span>{item.data.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(item.data.trend)}
                  <span
                    className={`text-xs font-medium ${getTrendColor(item.data.trend)}`}
                  >
                    {item.data.trend}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  {item.data.value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.data.subtitle}
                </p>
                {item.data.title === "Invitations Pending" &&
                  item.data.value > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Action Required
                    </Badge>
                  )}
                {item.data.title === "Inactive Users" &&
                  item.data.value > 50 && (
                    <Badge variant="destructive" className="text-xs">
                      High Inactivity
                    </Badge>
                  )}
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>
      ))}
    </div>
  );
}
