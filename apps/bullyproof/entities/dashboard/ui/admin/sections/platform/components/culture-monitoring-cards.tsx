"use client";

import {
  TrendingUp,
  TrendingDown,
  MapPin,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

interface CultureMonitoringCardsProps {
  cultureMonitoring: {
    averageRating: {
      title: string;
      value: number;
      subtitle: string;
    };
    changeSinceLastTerm: {
      title: string;
      value: string;
      subtitle: string;
    };
    topStates: Array<{
      state: string;
      rating: number;
    }>;
    lowestSchools: Array<{
      school: string;
      rating: number;
    }>;
    scoreDistribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
  };
}

export function CultureMonitoringCards({
  cultureMonitoring,
}: CultureMonitoringCardsProps) {
  const isPositiveChange =
    cultureMonitoring.changeSinceLastTerm.value.startsWith("+");

  return (
    <div className="space-y-6">
      {/* Main Culture Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StaggeredAnimation index={0}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                <span>{cultureMonitoring.averageRating.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="text-4xl font-bold">
                  {cultureMonitoring.averageRating.value}
                </div>
                <Progress
                  value={cultureMonitoring.averageRating.value}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {cultureMonitoring.averageRating.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>

        <StaggeredAnimation index={1}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {isPositiveChange ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span>{cultureMonitoring.changeSinceLastTerm.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div
                  className={`text-3xl font-bold ${isPositiveChange ? "text-green-600" : "text-red-600"}`}
                >
                  {cultureMonitoring.changeSinceLastTerm.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {cultureMonitoring.changeSinceLastTerm.subtitle}
                </p>
                <Badge
                  variant={isPositiveChange ? "default" : "destructive"}
                  className={`text-xs ${isPositiveChange ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                >
                  {isPositiveChange ? "Improving" : "Declining"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>
      </div>

      {/* Top States */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StaggeredAnimation index={2}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span>Top 3 States</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {cultureMonitoring.topStates.map((state, index) => (
                  <div
                    key={state.state}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm font-medium">{state.state}</span>
                    </div>
                    <div className="text-sm font-semibold">{state.rating}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>

        <StaggeredAnimation index={3}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>Lowest 3 Schools</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {cultureMonitoring.lowestSchools.map((school, index) => (
                  <div
                    key={school.school}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm font-medium line-clamp-1">
                        {school.school}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-red-600">
                      {school.rating}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>

        <StaggeredAnimation index={4}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                <span>Score Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {cultureMonitoring.scoreDistribution.map((range, _index) => (
                  <div
                    key={range.range}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-muted-foreground">
                      {range.range}
                    </span>
                    <div className="flex items-center gap-2">
                      <Progress value={range.percentage} className="h-1 w-16" />
                      <span className="text-xs font-medium">
                        {range.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>
      </div>
    </div>
  );
}
