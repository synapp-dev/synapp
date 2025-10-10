"use client";

import { SystemStatusCards } from "./components/system-status-cards";
import { PlatformMetricsCards } from "./components/platform-metrics-cards";
import { ActiveUsersChart } from "./components/active-users-chart";
import { LessonsWeeklyChart } from "./components/lessons-weekly-chart";
import { UserRolesChart } from "./components/user-roles-chart";
import { SystemHealthCards } from "./components/system-health-cards";
import { UserManagementOverview } from "./components/user-management-overview";
import { LmsSummaryCards } from "./components/lms-summary-cards";
import { CultureMonitoringCards } from "./components/culture-monitoring-cards";
import { ComplianceChecklist } from "./components/compliance-checklist";
import { ActivityFeed } from "./components/activity-feed";
import platformData from "./dummy-data/platform-dummy-data.json";

export function PlatformSection() {
  const {
    systemStatus,
    platformMetrics,
    activeUsersChart,
    lessonsWeeklyChart,
    userRolesChart,
    systemHealth,
    userManagement,
    lmsSummary,
    cultureMonitoring,
    compliance,
    activityFeed,
  } = platformData;

  // Type assertions to fix TypeScript inference issues
  const typedPlatformMetrics = platformMetrics as {
    totalUsers: {
      title: string;
      icon: string;
      value: { amount: number; type: "number" | "percentage" };
      previousValue: { amount: number; type: "number" | "percentage" };
      subtitle: string;
    };
    activeUsers: {
      title: string;
      icon: string;
      value: { amount: number; type: "number" | "percentage" };
      previousValue: { amount: number; type: "number" | "percentage" };
      subtitle: string;
    };
    totalLogins: {
      title: string;
      icon: string;
      value: { amount: number; type: "number" | "percentage" };
      previousValue: { amount: number; type: "number" | "percentage" };
      subtitle: string;
    };
    lessonDeliveries: {
      title: string;
      icon: string;
      value: { amount: number; type: "number" | "percentage" };
      previousValue: { amount: number; type: "number" | "percentage" };
      subtitle: string;
    };
    certificatesIssued: {
      title: string;
      icon: string;
      value: { amount: number; type: "number" | "percentage" };
      previousValue: { amount: number; type: "number" | "percentage" };
      subtitle: string;
    };
    avgSessionDuration: {
      title: string;
      icon: string;
      value: { amount: number; type: "number" | "percentage" };
      previousValue: { amount: number; type: "number" | "percentage" };
      subtitle: string;
    };
  };

  const typedActiveUsersChart = activeUsersChart as {
    title: string;
    data: Array<{ week: string; users: number }>;
    trend: {
      percentage: string;
      direction: "up" | "down";
      description: string;
    };
  };

  return (
    <div className="space-y-8">
      {/* System Status at a Glance */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">System Status at a Glance</h2>
        <SystemStatusCards systemStatus={systemStatus} />
      </div>

      {/* Platform Usage Metrics */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Platform Usage Metrics</h2>
        <PlatformMetricsCards platformMetrics={typedPlatformMetrics} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActiveUsersChart activeUsersChart={typedActiveUsersChart} />
          <LessonsWeeklyChart lessonsWeeklyChart={lessonsWeeklyChart} />
          <UserRolesChart userRolesChart={userRolesChart} />
        </div>
      </div>

      {/* System Health & Infrastructure */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          System Health & Infrastructure
        </h2>
        <SystemHealthCards systemHealth={systemHealth} />
      </div>

      {/* User Management Overview */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">User Management Overview</h2>
        <UserManagementOverview userManagement={userManagement} />
      </div>

      {/* Learning Management Summary */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Learning Management Summary</h2>
        <LmsSummaryCards lmsSummary={lmsSummary} />
      </div>

      {/* Culture Framework Monitoring */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Culture Framework Monitoring</h2>
        <CultureMonitoringCards cultureMonitoring={cultureMonitoring} />
      </div>

      {/* Data Integrity & Compliance */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Data Integrity & Compliance</h2>
        <ComplianceChecklist compliance={compliance} />
      </div>

      {/* Activity Feed / System Log */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Activity Feed / System Log</h2>
        <ActivityFeed activityFeed={activityFeed} />
      </div>
    </div>
  );
}
