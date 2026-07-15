"use client";

import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Server,
  Mail,
  Database,
  Key,
  Cloud,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { StaggeredAnimation } from "@workspace/ui/components/atoms/staggered-animation";

interface SystemHealthCardsProps {
  systemHealth: {
    serverUptime: {
      title: string;
      status: string;
      value: string;
      description: string;
    };
    emailDelivery: {
      title: string;
      status: string;
      value: string;
      description: string;
    };
    databaseUsage: {
      title: string;
      status: string;
      value: string;
      description: string;
    };
    authTokens: {
      title: string;
      status: string;
      value: string;
      description: string;
    };
    supabaseConnection: {
      title: string;
      status: string;
      value: string;
      description: string;
    };
  };
}

export function SystemHealthCards({ systemHealth }: SystemHealthCardsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "down":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 hover:bg-green-100"
          >
            Healthy
          </Badge>
        );
      case "degraded":
        return (
          <Badge
            variant="default"
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
          >
            Warning
          </Badge>
        );
      case "down":
        return (
          <Badge
            variant="default"
            className="bg-red-100 text-red-800 hover:bg-red-100"
          >
            Critical
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getIcon = (title: string) => {
    switch (title) {
      case "Server Uptime":
        return <Server className="h-4 w-4" />;
      case "Email Delivery Rate":
        return <Mail className="h-4 w-4" />;
      case "Database Usage":
        return <Database className="h-4 w-4" />;
      case "Authentication Tokens":
        return <Key className="h-4 w-4" />;
      case "Supabase Connection":
        return <Cloud className="h-4 w-4" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  const healthItems = [
    { key: "serverUptime", data: systemHealth.serverUptime },
    { key: "emailDelivery", data: systemHealth.emailDelivery },
    { key: "databaseUsage", data: systemHealth.databaseUsage },
    { key: "authTokens", data: systemHealth.authTokens },
    // { key: "supabaseConnection", data: systemHealth.supabaseConnection },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {healthItems.map((item, index) => (
        <StaggeredAnimation key={item.key} index={index}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getIcon(item.data.title)}
                  <span>{item.data.title}</span>
                </div>
                {getStatusBadge(item.data.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {item.data.title !== "Database Usage" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {item.data.value}
                      </span>
                      {getStatusIcon(item.data.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.data.description}
                    </p>
                  </>
                )}

                {item.data.title === "Database Usage" && (
                  <div className="space-y-1">
                    <Progress
                      value={parseInt(item.data.value)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {item.data.value} of 100% capacity
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>
      ))}
    </div>
  );
}
