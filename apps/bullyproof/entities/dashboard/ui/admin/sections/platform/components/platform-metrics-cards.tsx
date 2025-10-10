"use client";

import { SnapshotCard } from "@/entities/dashboard/ui/admin/cards/hero-card";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

interface PlatformMetricsCardsProps {
  platformMetrics: {
    totalUsers: {
      title: string;
      icon: string;
      value: {
        amount: number;
        type: "number" | "percentage";
      };
      previousValue: {
        amount: number;
        type: "number" | "percentage";
      };
      subtitle: string;
    };
    activeUsers: {
      title: string;
      icon: string;
      value: {
        amount: number;
        type: "number" | "percentage";
      };
      previousValue: {
        amount: number;
        type: "number" | "percentage";
      };
      subtitle: string;
    };
    totalLogins: {
      title: string;
      icon: string;
      value: {
        amount: number;
        type: "number" | "percentage";
      };
      previousValue: {
        amount: number;
        type: "number" | "percentage";
      };
      subtitle: string;
    };
    lessonDeliveries: {
      title: string;
      icon: string;
      value: {
        amount: number;
        type: "number" | "percentage";
      };
      previousValue: {
        amount: number;
        type: "number" | "percentage";
      };
      subtitle: string;
    };
    certificatesIssued: {
      title: string;
      icon: string;
      value: {
        amount: number;
        type: "number" | "percentage";
      };
      previousValue: {
        amount: number;
        type: "number" | "percentage";
      };
      subtitle: string;
    };
    avgSessionDuration: {
      title: string;
      icon: string;
      value: {
        amount: number;
        type: "number" | "percentage";
      };
      previousValue: {
        amount: number;
        type: "number" | "percentage";
      };
      subtitle: string;
    };
  };
}

export function PlatformMetricsCards({
  platformMetrics,
}: PlatformMetricsCardsProps) {
  const metrics = [
    { key: "totalUsers", data: platformMetrics.totalUsers },
    { key: "activeUsers", data: platformMetrics.activeUsers },
    { key: "totalLogins", data: platformMetrics.totalLogins },
    { key: "lessonDeliveries", data: platformMetrics.lessonDeliveries },
    { key: "certificatesIssued", data: platformMetrics.certificatesIssued },
    { key: "avgSessionDuration", data: platformMetrics.avgSessionDuration },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => (
        <StaggeredAnimation key={metric.key} index={index}>
          <SnapshotCard
            title={metric.data.title}
            icon={metric.data.icon}
            value={metric.data.value}
            previousValue={metric.data.previousValue}
            subtitle={metric.data.subtitle}
          />
        </StaggeredAnimation>
      ))}
    </div>
  );
}
