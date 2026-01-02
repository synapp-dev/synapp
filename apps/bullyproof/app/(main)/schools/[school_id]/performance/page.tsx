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
import { Progress } from "@workspace/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { generateMetadataFromSegments } from "@/utils/metadata";
import { redirect } from "next/navigation";

export const metadata = generateMetadataFromSegments([
  "schools",
  "performance",
]);
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

export default async function PerformancePage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const { data: school } = await schoolServerApi.get.schoolBySlug(school_id);
  
  // Redirect to home page - this page is disabled
  redirect(`/schools/${school_id}/home`);

  // Mock performance data
  const performanceMetrics = {
    overallScore: 87,
    bullyingIncidents: 3,
    studentEngagement: 92,
    teacherSatisfaction: 89,
    parentSatisfaction: 85,
    lessonCompletion: 94,
    attendanceRate: 96,
    behaviorImprovement: 78,
  };

  const trends = {
    bullyingTrend: -25, // 25% decrease
    engagementTrend: 12, // 12% increase
    satisfactionTrend: 8, // 8% increase
    completionTrend: 15, // 15% increase
  };

  const gradePerformance = [
    { grade: "Grade 2", score: 92, trend: 5, students: 156 },
    { grade: "Grade 3", score: 88, trend: 8, students: 142 },
    { grade: "Grade 4", score: 91, trend: 3, students: 138 },
    { grade: "Grade 5", score: 85, trend: -2, students: 145 },
    { grade: "Grade 6", score: 89, trend: 6, students: 152 },
    { grade: "Grade 7", score: 87, trend: 4, students: 148 },
  ];

  const recentAchievements = [
    {
      id: 1,
      title: "Zero Bullying Incidents",
      description: "No bullying incidents reported this week",
      date: "2024-01-15",
      type: "safety",
      impact: "high",
    },
    {
      id: 2,
      title: "95% Lesson Completion",
      description: "Exceeded target completion rate",
      date: "2024-01-14",
      type: "academic",
      impact: "medium",
    },
    {
      id: 3,
      title: "Parent Satisfaction Up",
      description: "Parent satisfaction increased by 8%",
      date: "2024-01-12",
      type: "satisfaction",
      impact: "high",
    },
  ];

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? TrendingUp : TrendingDown;
  };

  const getTrendColor = (trend: number) => {
    return trend > 0 ? "text-green-600" : "text-red-600";
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Performance Dashboard - {school?.name}
          </h1>
          <p className="text-muted-foreground">
            Track your school's anti-bullying program effectiveness
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select defaultValue="last-month">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-quarter">Last Quarter</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics.overallScore}%
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+5% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Bullying Incidents
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {performanceMetrics.bullyingIncidents}
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-green-600" />
              <span className="text-green-600">-25% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Student Engagement
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics.studentEngagement}%
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lesson Completion
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics.lessonCompletion}%
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+15% from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Performance Trends</span>
            </CardTitle>
            <CardDescription>
              Key metrics over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bullying Incidents</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">-25%</span>
                  <TrendingDown className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <Progress value={75} className="h-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Student Engagement</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">+12%</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <Progress value={92} className="h-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Teacher Satisfaction
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">+8%</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <Progress value={89} className="h-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lesson Completion</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">+15%</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <Progress value={94} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Grade Performance</span>
            </CardTitle>
            <CardDescription>Performance scores by grade level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gradePerformance.map((grade) => {
                const TrendIcon = getTrendIcon(grade.trend);
                return (
                  <div
                    key={grade.grade}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium w-16">
                        {grade.grade}
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${grade.score}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {grade.score}%
                      </span>
                      <div className="flex items-center space-x-1">
                        <TrendIcon
                          className={`h-3 w-3 ${getTrendColor(grade.trend)}`}
                        />
                        <span
                          className={`text-xs ${getTrendColor(grade.trend)}`}
                        >
                          {grade.trend > 0 ? "+" : ""}
                          {grade.trend}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Attendance & Behavior</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Attendance Rate</span>
              <span className="text-sm font-medium">
                {performanceMetrics.attendanceRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Behavior Improvement</span>
              <span className="text-sm font-medium">
                {performanceMetrics.behaviorImprovement}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Parent Satisfaction</span>
              <span className="text-sm font-medium">
                {performanceMetrics.parentSatisfaction}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Academic Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Lesson Completion</span>
              <span className="text-sm font-medium">
                {performanceMetrics.lessonCompletion}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Student Engagement</span>
              <span className="text-sm font-medium">
                {performanceMetrics.studentEngagement}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Teacher Satisfaction</span>
              <span className="text-sm font-medium">
                {performanceMetrics.teacherSatisfaction}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Safety Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Bullying Incidents</span>
              <span className="text-sm font-medium text-green-600">
                {performanceMetrics.bullyingIncidents}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Incident Resolution</span>
              <span className="text-sm font-medium">100%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Safety Score</span>
              <span className="text-sm font-medium">95%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Recent Achievements</span>
          </CardTitle>
          <CardDescription>
            Latest accomplishments and milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-start space-x-4 p-4 border rounded-lg"
              >
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{achievement.title}</h4>
                    <Badge className={getImpactColor(achievement.impact)}>
                      {achievement.impact} impact
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{achievement.date}</span>
                    <Badge variant="outline" className="text-xs">
                      {achievement.type}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recommended Actions</span>
          </CardTitle>
          <CardDescription>
            Areas for improvement and next steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Target className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Focus on Grade 5 Performance</h4>
                <p className="text-sm text-muted-foreground">
                  Grade 5 shows a slight decline in performance. Consider
                  additional support and resources.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  View Details
                </Button>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Enhance Parent Engagement</h4>
                <p className="text-sm text-muted-foreground">
                  Parent satisfaction could be improved with more communication
                  and involvement opportunities.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
