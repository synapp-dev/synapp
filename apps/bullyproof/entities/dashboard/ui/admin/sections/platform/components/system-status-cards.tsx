"use client";

import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { StaggeredAnimation } from "@workspace/ui/components/atoms/staggered-animation";

interface SystemStatusCardsProps {
  systemStatus: {
    authentication: {
      status: string;
      title: string;
      description: string;
      lastCheck: string;
    };
    lms: {
      status: string;
      title: string;
      description: string;
      lastCheck: string;
    };
    lessonDelivery: {
      status: string;
      title: string;
      description: string;
      lastCheck: string;
    };
    reporting: {
      status: string;
      title: string;
      description: string;
      lastCheck: string;
    };
    cultureFramework: {
      status: string;
      title: string;
      description: string;
      lastCheck: string;
    };
  };
}

export function SystemStatusCards({ systemStatus }: SystemStatusCardsProps) {
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
            Operational
          </Badge>
        );
      case "degraded":
        return (
          <Badge
            variant="default"
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
          >
            Degraded
          </Badge>
        );
      case "down":
        return (
          <Badge
            variant="default"
            className="bg-red-100 text-red-800 hover:bg-red-100"
          >
            Down
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getAlertVariant = (status: string) => {
    switch (status) {
      case "operational":
        return "default";
      case "degraded":
        return "destructive";
      case "down":
        return "destructive";
      default:
        return "default";
    }
  };

  const statusItems = [
    { key: "authentication", data: systemStatus.authentication },
    { key: "lms", data: systemStatus.lms },
    { key: "lessonDelivery", data: systemStatus.lessonDelivery },
    { key: "reporting", data: systemStatus.reporting },
    // { key: "cultureFramework", data: systemStatus.cultureFramework },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statusItems.map((item, index) => (
        <StaggeredAnimation key={item.key} index={index}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.data.status)}
                  <span>{item.data.title}</span>
                </div>
                {getStatusBadge(item.data.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Alert variant={getAlertVariant(item.data.status)}>
                <AlertDescription className="text-sm">
                  {item.data.description}
                </AlertDescription>
              </Alert>
              <p className="text-xs text-muted-foreground mt-2">
                Last check: {new Date(item.data.lastCheck).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </StaggeredAnimation>
      ))}
    </div>
  );
}
