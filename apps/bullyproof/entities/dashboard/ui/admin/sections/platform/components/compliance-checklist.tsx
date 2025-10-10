"use client";

import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  FileText,
  Eye,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

interface ComplianceChecklistProps {
  compliance: {
    st4sAuth: {
      title: string;
      status: string;
      description: string;
    };
    st4sStorage: {
      title: string;
      status: string;
      description: string;
    };
    st4sAccess: {
      title: string;
      status: string;
      description: string;
    };
    auditLogCount: {
      title: string;
      value: number;
      subtitle: string;
    };
    lastSecurityReview: {
      title: string;
      value: string;
      status: string;
      subtitle: string;
    };
    anomaliesDetected: {
      title: string;
      value: number;
      subtitle: string;
    };
  };
}

export function ComplianceChecklist({ compliance }: ComplianceChecklistProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 hover:bg-green-100"
          >
            Compliant
          </Badge>
        );
      case "passed":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 hover:bg-green-100"
          >
            Passed
          </Badge>
        );
      case "warning":
        return (
          <Badge
            variant="default"
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
          >
            Warning
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getIcon = (title: string) => {
    switch (title) {
      case "ST4S Authentication":
        return <Shield className="h-4 w-4" />;
      case "ST4S Data Storage":
        return <FileText className="h-4 w-4" />;
      case "ST4S Data Access":
        return <Eye className="h-4 w-4" />;
      case "Audit Log Count":
        return <FileText className="h-4 w-4" />;
      case "Last Security Review":
        return <Shield className="h-4 w-4" />;
      case "Anomalies Detected":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const complianceItems = [
    { key: "st4sAuth", data: compliance.st4sAuth },
    { key: "st4sStorage", data: compliance.st4sStorage },
    { key: "st4sAccess", data: compliance.st4sAccess },
    { key: "auditLogCount", data: compliance.auditLogCount },
    { key: "lastSecurityReview", data: compliance.lastSecurityReview },
    { key: "anomaliesDetected", data: compliance.anomaliesDetected },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {complianceItems.map((item, index) => (
        <StaggeredAnimation key={item.key} index={index}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getIcon(item.data.title)}
                  <span>{item.data.title}</span>
                </div>
                {item.data.status && getStatusBadge(item.data.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {item.data.value !== undefined ? (
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {item.data.value.toLocaleString()}
                    </span>
                    {getStatusIcon(item.data.status || "compliant")}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {item.data.value || item.data.description}
                    </span>
                    {getStatusIcon(item.data.status)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {item.data.subtitle || item.data.description}
                </p>
                {item.data.title === "Anomalies Detected" &&
                  item.data.value > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Requires Attention
                    </Badge>
                  )}
                {item.data.title === "Last Security Review" && (
                  <Badge
                    variant="default"
                    className="text-xs bg-blue-100 text-blue-800"
                  >
                    {new Date(item.data.value).toLocaleDateString()}
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
