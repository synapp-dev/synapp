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
  Shield,
  Settings,
  Users,
  BarChart3,
  Wrench,
  FileText,
  MessageCircle,
  AlertTriangle,
  Database,
  Code,
} from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments([
  "support",
  "roles",
  "bullyproof-staff",
]);

export default function BullyproofStaffPage() {
  const staffResources = [
    {
      id: 1,
      title: "System Administration Guide",
      type: "Internal Documentation",
      description: "Complete guide to system administration and maintenance",
      category: "Administration",
      access: "Staff Only",
    },
    {
      id: 2,
      title: "Customer Support Protocols",
      type: "Procedure",
      description: "Standard procedures for handling customer support requests",
      category: "Support",
      access: "Staff Only",
    },
    {
      id: 3,
      title: "Technical Troubleshooting",
      type: "Guide",
      description: "Common technical issues and their resolutions",
      category: "Technical",
      access: "Staff Only",
    },
    {
      id: 4,
      title: "Feature Development Workflow",
      type: "Process",
      description: "Internal process for developing and deploying new features",
      category: "Development",
      access: "Staff Only",
    },
  ];

  const systemMetrics = [
    { label: "Active Users", value: "2,847", change: "+127 this week" },
    { label: "System Uptime", value: "99.8%", change: "Last 30 days" },
    { label: "Support Tickets", value: "23", change: "Open tickets" },
    { label: "Server Load", value: "34%", change: "Current average" },
  ];

  const staffActions = [
    {
      title: "System Administration",
      description: "Access system administration tools and controls",
      icon: Settings,
      action: "Admin Panel",
    },
    {
      title: "Customer Support",
      description: "Manage support tickets and customer interactions",
      icon: MessageCircle,
      action: "Support Queue",
    },
    {
      title: "Technical Tools",
      description: "Access debugging and technical diagnostic tools",
      icon: Wrench,
      action: "Tech Tools",
    },
    {
      title: "Analytics Dashboard",
      description: "View comprehensive system analytics and metrics",
      icon: BarChart3,
      action: "Analytics",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bullyproof Staff Resources
            </h1>
            <p className="text-muted-foreground">
              Internal resources and tools for Bullyproof team members
            </p>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {systemMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="text-sm text-muted-foreground">
                {metric.label}
              </div>
              <div className="text-xs text-blue-600 mt-1">{metric.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {staffActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card
              key={index}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{action.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {action.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button size="sm" className="w-full">
                  {action.action}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Internal Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Documentation</CardTitle>
          <CardDescription>Staff-only resources and procedures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {staffResources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 bg-muted rounded">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{resource.title}</h3>
                    <Badge variant="outline">{resource.type}</Badge>
                    <Badge variant="destructive">{resource.access}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {resource.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{resource.category}</Badge>
                    <Button variant="ghost" size="sm" className="h-auto p-0">
                      View Document
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Status & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>
              Current system alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">All core services operational</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Database backup in progress</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <Database className="h-4 w-4" />
              <span className="text-sm">
                Performance optimization scheduled
              </span>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              View All Alerts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Development Tools</CardTitle>
            <CardDescription>
              Internal development and debugging tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Code className="mr-2 h-4 w-4" />
              Development Environment
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Database className="mr-2 h-4 w-4" />
              Database Management
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Wrench className="mr-2 h-4 w-4" />
              Debug Console
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
