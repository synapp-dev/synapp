"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Users, CheckCircle2, Clock, TrendingUp, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Badge } from "@workspace/ui/components/badge";
import { apiFetch } from "@/lib/api/fetcher.client";
import { CartesianGrid, Area, AreaChart, XAxis, Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type Granularity = "hour" | "day" | "week" | "month";

interface CourseResults {
  totalUsers: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  completionRate: number;
  avgProgress: number;
  avgCompletedTopics: number;
  avgCompletionTime: string | null;
  totalTopics: number;
  completionDates: Array<{ date: string; completions: number }>;
  completionTimestamps?: string[];
}

interface CourseProgressDetail {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  schools: string[];
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercentage: number;
  completedTopics: number;
  totalTopics: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

interface ProgressDetailsResponse {
  progressDetails: CourseProgressDetail[];
}

interface CertificationCourseResultsProps {
  courseId: string;
}

export function CertificationCourseResults({
  courseId,
}: CertificationCourseResultsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize granularity from query params or default to "hour"
  const getInitialGranularity = (): Granularity => {
    const granularityParam = searchParams?.get("granularity");
    if (granularityParam && ["hour", "day", "week", "month"].includes(granularityParam)) {
      return granularityParam as Granularity;
    }
    return "hour";
  };
  
  const [results, setResults] = useState<CourseResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<Granularity>(getInitialGranularity());
  const [progressDetails, setProgressDetails] = useState<CourseProgressDetail[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const STATUS_COLORS = {
    completed: "rgb(34, 197, 94)", // green-500
    inProgress: "rgb(59, 130, 246)", // blue-500
    notStarted: "rgb(239, 68, 68)", // red-500
  } as const;

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiFetch<CourseResults>(
          `/certification/courses/${courseId}/results`
        );

        if (result.error) {
          setError(result.error.message || "Failed to fetch course results");
          return;
        }

        if (result.data) {
          setResults(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch course results:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch course results");
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchResults();
    }
  }, [courseId]);

  useEffect(() => {
    const fetchProgressDetails = async () => {
      setIsLoadingDetails(true);
      setDetailsError(null);

      try {
        const result = await apiFetch<ProgressDetailsResponse>(
          `/certification/courses/${courseId}/progress-details`
        );

        if (result.error) {
          setDetailsError(result.error.message || "Failed to fetch progress details");
          return;
        }

        if (result.data) {
          setProgressDetails(result.data.progressDetails);
        }
      } catch (err) {
        console.error("Failed to fetch progress details:", err);
        setDetailsError(err instanceof Error ? err.message : "Failed to fetch progress details");
      } finally {
        setIsLoadingDetails(false);
      }
    };

    if (courseId) {
      fetchProgressDetails();
    }
  }, [courseId]);

  // Wrapper function to update both state and URL when granularity changes
  const handleGranularityChange = (newGranularity: Granularity) => {
    setGranularity(newGranularity);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("granularity", newGranularity);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Sync granularity with query params on mount and when query params change
  useEffect(() => {
    const granularityParam = searchParams?.get("granularity");
    if (granularityParam && ["hour", "day", "week", "month"].includes(granularityParam)) {
      const newGranularity = granularityParam as Granularity;
      if (newGranularity !== granularity) {
        setGranularity(newGranularity);
      }
    } else if (!granularityParam && granularity !== "hour") {
      // If no granularity param, set to default and update URL
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("granularity", "hour");
      router.replace(`?${params.toString()}`, { scroll: false });
      setGranularity("hour");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Transform completion data based on granularity - must be called before any conditional returns
  const chartData = useMemo(() => {
    // Use completionTimestamps if available, otherwise fall back to completionDates
    const timestamps = results?.completionTimestamps;
    const dates = results?.completionDates;

    if (!timestamps && !dates) {
      return [];
    }

    // If we have timestamps, use them for granular grouping
    if (timestamps && timestamps.length > 0) {
      const grouped = new Map<string, number>();

      timestamps.forEach((timestamp) => {
        const date = new Date(timestamp);
        let key: string;

        switch (granularity) {
          case "hour":
            // Group by hour: YYYY-MM-DD HH:00
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
            break;
          case "day":
            // Group by day: YYYY-MM-DD
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            break;
          case "week":
            // Group by week: YYYY-MM-DD (start of week, Monday)
            const weekStart = new Date(date);
            const day = weekStart.getDay();
            const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
            weekStart.setDate(diff);
            key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
            break;
          case "month":
            // Group by month: YYYY-MM
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            break;
          default:
            key = date.toISOString().split("T")[0];
        }

        grouped.set(key, (grouped.get(key) || 0) + 1);
      });

      return Array.from(grouped.entries())
        .map(([date, completions]) => ({ date, completions }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Fallback to completionDates (only supports day granularity)
    if (dates && dates.length > 0) {
      if (granularity === "day") {
        return dates.map((item) => ({
          date: item.date,
          completions: item.completions,
        }));
      }
      // For other granularities, we need timestamps, so return empty
      return [];
    }

    return [];
  }, [results?.completionTimestamps, results?.completionDates, granularity]);

  const chartConfig = {
    completions: {
      label: "Completions",
      color: "var(--brand-bullyproof-primary)",
    },
  } satisfies ChartConfig;

  const pieChartConfig = {
    completed: {
      label: "Completed",
      color: STATUS_COLORS.completed,
    },
    inProgress: {
      label: "In Progress",
      color: STATUS_COLORS.inProgress,
    },
    notStarted: {
      label: "Not Started",
      color: STATUS_COLORS.notStarted,
    },
  } satisfies ChartConfig;

  const totalCompletions = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.completions, 0),
    [chartData]
  );

  const pieChartData = useMemo(() => {
    if (!results) return [];
    return [
      {
        status: "completed",
        value: results.completed,
        fill: STATUS_COLORS.completed,
      },
      {
        status: "inProgress",
        value: results.inProgress,
        fill: STATUS_COLORS.inProgress,
      },
      {
        status: "notStarted",
        value: results.notStarted,
        fill: STATUS_COLORS.notStarted,
      },
    ].filter((item) => item.value > 0);
  }, [results]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt || !completedAt) {
      return "N/A";
    }
    
    try {
      const start = new Date(startedAt).getTime();
      const end = new Date(completedAt).getTime();
      const diffMs = end - start;
      
      if (diffMs < 0) return "N/A";
      
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    } catch {
      return "N/A";
    }
  };

  const columns = useMemo<ColumnDef<CourseProgressDetail>[]>(() => [
    {
      accessorKey: "userName",
      header: "User Name",
      cell: ({ row }) => {
        const detail = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{detail.userName}</span>
            <span className="text-xs text-muted-foreground">{detail.userEmail}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "schools",
      header: "School(s)",
      cell: ({ row }) => {
        const schools = row.original.schools;
        if (!schools || schools.length === 0) {
          return <span className="text-muted-foreground">No school</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {schools.map((school, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {school}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        type StatusConfig = { label: string; variant: "destructive" | "default" | "secondary"; className?: string };
        const statusConfig: Record<string, StatusConfig> = {
          not_started: { label: "Not Started", variant: "destructive" },
          in_progress: { label: "In Progress", variant: "default", className: "bg-blue-500 text-white border-blue-500 hover:bg-blue-600" },
          completed: { label: "Completed", variant: "secondary" },
        };
        const config = statusConfig[status] || statusConfig.not_started;
        return (
          <Badge variant={config.variant} className={config.className ? `capitalize ${config.className}` : "capitalize"}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "progressPercentage",
      header: "Progress",
      cell: ({ row }) => {
        const detail = row.original;
        if (detail.progressPercentage === 100) {
          return null;
        }
        return (
          <div className="flex flex-col gap-1 w-32">
            <div className="flex items-center justify-between text-xs">
              <span>{detail.progressPercentage}%</span>
            </div>
            <Progress value={detail.progressPercentage} className="h-2" />
          </div>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const detail = row.original;
        const duration = formatDuration(detail.startedAt, detail.completedAt);
        return (
          <Badge variant="outline" className="text-xs">
            {duration}
          </Badge>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: progressDetails,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="">
      <Card className="grid grid-cols-5 px-6 border-none shadow-none">
        <div className="flex items-center justify-between col-span-3">
          <div className="flex flex-col items-center justify-center flex-1">
            <h2 className="text-6xl font-bold">{results.totalUsers}</h2>
            <p className="text-sm text-muted-foreground mt-2">Total Enrolments</p>
          </div>
          <div className="flex flex-col gap-5 w-fit">
            <div className="flex flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: STATUS_COLORS.completed }}
                />
                <p className="text-sm font-medium" style={{ color: STATUS_COLORS.completed }}>
                  Completed
                </p>
              </div>
              <h3 className="text-3xl font-bold" style={{ color: STATUS_COLORS.completed }}>
                {results.completed}
              </h3>
            </div>
            <div className="flex flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: STATUS_COLORS.inProgress }}
                />
                <p className="text-sm font-medium" style={{ color: STATUS_COLORS.inProgress }}>
                  In Progress
                </p>
              </div>
              <h3 className="text-3xl font-bold" style={{ color: STATUS_COLORS.inProgress }}>
                {results.inProgress}
              </h3>
            </div>
            <div className="flex flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: STATUS_COLORS.notStarted }}
                />
                <p className="text-sm font-medium" style={{ color: STATUS_COLORS.notStarted }}>
                  Not Started
                </p>
              </div>
              <h3 className="text-3xl font-bold" style={{ color: STATUS_COLORS.notStarted }}>
                {results.notStarted}
              </h3>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center col-span-2 ml-20">
          {/* Status Pie Chart */}
          {pieChartData.length > 0 && (
            <ChartContainer
              config={pieChartConfig}
              className="[&_.recharts-pie-label-text]:fill-foreground aspect-auto h-[250px] w-full"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="status"
                  label={(entry) => {
                    const percentage = results
                      ? Math.round((entry.value / results.totalUsers) * 100)
                      : 0;
                    return `${percentage}%`;
                  }}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </div>
      </Card>

      {/* Completion Dates Chart - Full width row */}
      {chartData.length > 0 ? (
        <Card className="p-6 gap-4">
            <CardHeader className="flex flex-row items-center justify-between  !p-0 px-6 pb-3 pt-6">
              <div className="flex flex-col gap-0">
                <CardTitle className="text-base">Completion Timestamps</CardTitle>
                <CardDescription className="text-xs">
                  Showing course completions over time
                </CardDescription>
              </div>
              {/* Granularity Tabs - Top Right */}
              <Tabs value={granularity} onValueChange={(value) => handleGranularityChange(value as Granularity)}>
                <TabsList className="h-8 grid grid-cols-4">
                  <TabsTrigger value="hour" className="text-xs px-2">Hour</TabsTrigger>
                  <TabsTrigger value="day" className="text-xs px-2">Day</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs px-2">Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-2">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px]"
              >
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  // left: -20,
                  // right: -20,
                }}
              >
                <defs>
                  <linearGradient id="fillCompletions" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-completions)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-completions)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={16}
                  minTickGap={granularity === "hour" ? 8 : granularity === "day" ? 16 : 32}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    // Parse the date string based on granularity
                    let date: Date;
                    let timeText = "";
                    let dateText = "";
                    
                    if (granularity === "hour") {
                      // Format: YYYY-MM-DD HH:00
                      const [datePart, timePart] = payload.value.split(" ");
                      const [year, month, day] = datePart.split("-");
                      const [hour] = timePart.split(":");
                      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour));
                      timeText = date.toLocaleString("en-US", {
                        hour: "numeric",
                        hour12: true,
                      });
                      dateText = date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    } else if (granularity === "day") {
                      date = new Date(payload.value + "T00:00:00");
                      dateText = date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    } else if (granularity === "week") {
                      date = new Date(payload.value + "T00:00:00");
                      dateText = date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    } else {
                      // month: YYYY-MM
                      const [year, month] = payload.value.split("-");
                      date = new Date(parseInt(year), parseInt(month) - 1, 1);
                      dateText = date.toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      });
                    }

                    return (
                      <g transform={`translate(${x},${y})`}>
                        {timeText && (
                          <text
                            x={0}
                            y={0}
                            dy={-8}
                            textAnchor="middle"
                            fill="#666"
                            fontSize={12}
                            className="fill-muted-foreground"
                          >
                            {timeText}
                          </text>
                        )}
                        <text
                          x={0}
                          y={0}
                          dy={granularity === "hour" ? 6 : 0}
                          textAnchor="middle"
                          fill="#666"
                          fontSize={10}
                          opacity={0.6}
                          className="fill-muted-foreground"
                        >
                          {dateText}
                        </text>
                      </g>
                    );
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[175px]"
                      nameKey="completions"
                      labelFormatter={(value) => {
                        let date: Date;
                        if (granularity === "hour") {
                          // Format: YYYY-MM-DD HH:00
                          const [datePart, timePart] = value.split(" ");
                          const [year, month, day] = datePart.split("-");
                          const [hour] = timePart.split(":");
                          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour));
                          return date.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          });
                        } else if (granularity === "day") {
                          date = new Date(value + "T00:00:00");
                          return date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        } else if (granularity === "week") {
                          date = new Date(value + "T00:00:00");
                          const weekEnd = new Date(date);
                          weekEnd.setDate(date.getDate() + 6);
                          return `${date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })} - ${weekEnd.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`;
                        } else {
                          const [year, month] = value.split("-");
                          date = new Date(parseInt(year), parseInt(month) - 1, 1);
                          return date.toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          });
                        }
                      }}
                    />
                  }
                />
                <Area
                  dataKey="completions"
                  type="monotone"
                  fill="url(#fillCompletions)"
                  fillOpacity={0.4}
                  stroke="var(--color-completions)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
            </CardContent>
          </Card>
        ) : null}

      {/* Progress Details Table */}
      <Card className="p-6 mt-6">
        {/* <CardHeader className="!p-0 px-6 pb-3 pt-6">
          <div className="flex flex-col gap-0">
            <CardTitle className="text-base">Course Progress Details</CardTitle>
            <CardDescription className="text-xs">
              Detailed progress information for all enrolled users
            </CardDescription>
          </div>
        </CardHeader> */}
        <CardContent className="p-0">
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailsError ? (
            <div className="py-6 px-6">
              <p className="text-sm text-destructive">{detailsError}</p>
            </div>
          ) : progressDetails.length === 0 ? (
            <div className="py-6 px-6">
              <p className="text-sm text-muted-foreground">No progress data available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
