import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronRight,
  ClipboardList,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  dummyDashboardData,
  type DashboardKpiStatus,
} from "@/entities/dashboard/model/dummy-dashboard-data";

function kpiStatusClasses(status: DashboardKpiStatus) {
  if (status === "good") {
    return "bg-emerald-500";
  }

  if (status === "watch") {
    return "bg-amber-500";
  }

  if (status === "bad") {
    return "bg-red-500";
  }

  return "bg-muted-foreground/50";
}

export default function DashboardPage() {
  const maxTrendValue = Math.max(...dummyDashboardData.trend.map((point) => point.value));

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <CardDescription className="text-xs uppercase tracking-wider">
            {dummyDashboardData.hero.metricLabel} ·{" "}
            {dummyDashboardData.hero.periodLabel}
          </CardDescription>
          <CardTitle className="text-4xl">{dummyDashboardData.hero.value}</CardTitle>
          <div className="text-sm text-muted-foreground">
            <span
              className={
                dummyDashboardData.hero.deltaDirection === "up"
                  ? "text-emerald-600"
                  : "text-red-600"
              }
            >
              {dummyDashboardData.hero.deltaDirection === "up" ? (
                <ArrowUp className="mr-1 inline h-4 w-4" />
              ) : (
                <ArrowDown className="mr-1 inline h-4 w-4" />
              )}
              {dummyDashboardData.hero.deltaPercent.toFixed(1)}%
            </span>{" "}
            {dummyDashboardData.hero.comparisonLabel}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dummyDashboardData.kpis.map((kpi) => (
          <Card key={kpi.id}>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wider">
                {kpi.title}
              </CardDescription>
              <CardTitle className="text-3xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${kpiStatusClasses(kpi.status)}`} />
                {kpi.subtitle}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>Dummy weekly revenue data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 items-end gap-3">
              {dummyDashboardData.trend.map((point) => (
                <div key={point.label} className="space-y-2 text-center">
                  <div className="flex h-36 items-end justify-center">
                    <div
                      className="w-full max-w-10 rounded-t-md bg-primary/80"
                      style={{
                        height: `${Math.max(
                          16,
                          (point.value / maxTrendValue) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">{point.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Mix</CardTitle>
            <CardDescription>Order distribution by channel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dummyDashboardData.channelMix.map((channel) => (
              <div key={channel.channel} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{channel.channel}</span>
                  <span className="font-medium">{channel.sharePercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${channel.sharePercent}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {channel.orders} orders
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alerts</CardTitle>
            <CardDescription>Priority items to review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dummyDashboardData.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <AlertTriangle
                  className={
                    alert.severity === "warning"
                      ? "mt-0.5 h-4 w-4 text-amber-500"
                      : "mt-0.5 h-4 w-4 text-blue-500"
                  }
                />
                <div className="flex-1 space-y-1">
                  <p className="text-sm">{alert.message}</p>
                  {alert.href ? (
                    <Link href={alert.href} className="text-xs text-primary underline">
                      {alert.actionLabel}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {alert.actionLabel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Shortcuts for common tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dummyDashboardData.quickActions.map((action) =>
              action.href ? (
                <Button key={action.id} asChild variant="outline" className="h-auto p-4">
                  <Link href={action.href} className="flex w-full items-center gap-3">
                    {action.id === "create-roster" ? (
                      <Calendar className="h-4 w-4" />
                    ) : action.id === "start-stock-count" ? (
                      <ClipboardList className="h-4 w-4" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="flex-1 text-left">
                      <span className="block text-sm font-medium">{action.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </Button>
              ) : (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-auto justify-start p-4"
                  disabled
                >
                  {action.id === "create-roster" ? (
                    <Calendar className="mr-3 h-4 w-4" />
                  ) : action.id === "start-stock-count" ? (
                    <ClipboardList className="mr-3 h-4 w-4" />
                  ) : (
                    <Trash2 className="mr-3 h-4 w-4" />
                  )}
                  <span className="text-left">
                    <span className="block text-sm font-medium">{action.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                </Button>
              )
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sales at a glance</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingCart className="h-4 w-4" />
            1,431 weekly orders
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Labour watch</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            4 timesheets pending approval
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Revenue trend remains positive
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
