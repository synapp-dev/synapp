import { schoolServerApi } from "@/entities/school/api/server-endpoints";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["schools", "reports"]);
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const { data: school } = await schoolServerApi.get.schoolBySlug(school_id);

  // Mock data for reports
  const reportTypes = [
    {
      id: 1,
      name: "Bullying Trends",
      description: "Monthly analysis of bullying incidents and patterns",
      icon: TrendingUp,
      lastGenerated: "2024-01-15",
      status: "ready",
    },
    {
      id: 2,
      name: "Student Engagement",
      description: "Participation rates in anti-bullying programs",
      icon: Users,
      lastGenerated: "2024-01-14",
      status: "ready",
    },
    {
      id: 3,
      name: "Teacher Performance",
      description: "Class completion rates and teacher effectiveness",
      icon: Activity,
      lastGenerated: "2024-01-13",
      status: "generating",
    },
    {
      id: 4,
      name: "Incident Analysis",
      description: "Detailed breakdown of reported incidents",
      icon: AlertTriangle,
      lastGenerated: "2024-01-12",
      status: "ready",
    },
  ];

  const recentReports = [
    {
      id: 1,
      name: "January 2024 Bullying Report",
      type: "Bullying Trends",
      generatedBy: "System",
      date: "2024-01-15",
      size: "2.3 MB",
      status: "completed",
    },
    {
      id: 2,
      name: "Q4 2023 Engagement Summary",
      type: "Student Engagement",
      generatedBy: "Ms. Sarah Johnson",
      date: "2024-01-14",
      size: "1.8 MB",
      status: "completed",
    },
    {
      id: 3,
      name: "Teacher Performance - December",
      type: "Teacher Performance",
      generatedBy: "System",
      date: "2024-01-13",
      size: "3.1 MB",
      status: "processing",
    },
  ];

  const chartData = {
    bullyingTrends: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      data: [12, 8, 15, 6, 9, 4],
    },
    engagementByGrade: {
      "Grade 2": 78,
      "Grade 3": 85,
      "Grade 4": 92,
      "Grade 5": 88,
      "Grade 6": 95,
      "Grade 7": 89,
    },
    incidentTypes: {
      Physical: 15,
      Verbal: 28,
      Cyber: 12,
      Social: 18,
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports - {school?.name}</h1>
          <p className="text-muted-foreground">
            Generate and view comprehensive school reports
          </p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentReports.length}</div>
            <p className="text-xs text-muted-foreground">
              Generated this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ready to Download
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentReports.filter((r) => r.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">Available now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentReports.filter((r) => r.status === "processing").length}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Last Generated
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Days ago</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Types */}
      <Card>
        <CardHeader>
          <CardTitle>Report Types</CardTitle>
          <CardDescription>
            Choose from available report templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {reportTypes.map((reportType) => {
              const Icon = reportType.icon;
              return (
                <Card
                  key={reportType.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-sm">
                          {reportType.name}
                        </CardTitle>
                        <Badge
                          variant={
                            reportType.status === "ready"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {reportType.status === "ready"
                            ? "Ready"
                            : "Generating"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-3">
                      {reportType.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Last: {reportType.lastGenerated}
                      </span>
                      <Button size="sm" variant="outline">
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bullying Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Bullying Trends (6 Months)</span>
            </CardTitle>
            <CardDescription>Monthly incident count over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Incidents</span>
                <span className="text-sm text-muted-foreground">
                  -33% vs last period
                </span>
              </div>
              <div className="h-32 bg-gray-50 rounded-lg flex items-end justify-between p-4">
                {chartData.bullyingTrends.data.map((value, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center space-y-2"
                  >
                    <div
                      className="bg-blue-500 rounded-t w-8 transition-all duration-300"
                      style={{ height: `${(value / 15) * 100}%` }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {chartData.bullyingTrends.labels[index]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement by Grade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Engagement by Grade</span>
            </CardTitle>
            <CardDescription>Student participation rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(chartData.engagementByGrade).map(
                ([grade, percentage]) => (
                  <div
                    key={grade}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">{grade}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Your latest generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Generated By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.type}</Badge>
                  </TableCell>
                  <TableCell>{report.generatedBy}</TableCell>
                  <TableCell>{report.date}</TableCell>
                  <TableCell>{report.size}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        report.status === "completed" ? "default" : "secondary"
                      }
                    >
                      {report.status === "completed" ? "Ready" : "Processing"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {report.status === "completed" ? (
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Processing...
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
          <CardDescription>
            Create custom reports with specific date ranges and filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Report Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bullying-trends">
                      Bullying Trends
                    </SelectItem>
                    <SelectItem value="engagement">
                      Student Engagement
                    </SelectItem>
                    <SelectItem value="teacher-performance">
                      Teacher Performance
                    </SelectItem>
                    <SelectItem value="incident-analysis">
                      Incident Analysis
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date Range</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-week">Last Week</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="last-quarter">Last Quarter</SelectItem>
                    <SelectItem value="last-year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Include Data</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <label className="text-sm">Student demographics</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <label className="text-sm">Teacher performance</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <label className="text-sm">Incident details</label>
                  </div>
                </div>
              </div>
              <Button className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
