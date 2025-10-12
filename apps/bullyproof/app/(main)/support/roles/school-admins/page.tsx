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
  Building, 
  Users, 
  Settings, 
  BarChart3,
  Shield,
  FileText,
  Download,
  MessageCircle,
  AlertTriangle
} from "lucide-react";

export default function SchoolAdminsPage() {
  const adminResources = [
    {
      id: 1,
      title: "School-Wide Analytics Dashboard",
      type: "Guide",
      description: "Understanding and using the comprehensive analytics dashboard",
      category: "Analytics",
    },
    {
      id: 2,
      title: "User Management Best Practices",
      type: "Video",
      description: "How to effectively manage teachers, students, and permissions",
      category: "User Management",
    },
    {
      id: 3,
      title: "Compliance and Reporting",
      type: "Article",
      description: "Meeting regulatory requirements and generating compliance reports",
      category: "Compliance",
    },
    {
      id: 4,
      title: "Security Configuration",
      type: "Guide",
      description: "Setting up security policies and access controls",
      category: "Security",
    },
  ];

  const quickStats = [
    { label: "Active Teachers", value: "24", change: "+3 this month" },
    { label: "Total Students", value: "487", change: "+12 this week" },
    { label: "Classes Active", value: "18", change: "2 new this month" },
    { label: "System Health", value: "98%", change: "All systems operational" },
  ];

  const adminActions = [
    {
      title: "Manage Users",
      description: "Add, remove, or modify user accounts and permissions",
      icon: Users,
      action: "User Management",
    },
    {
      title: "View Analytics",
      description: "Access comprehensive school-wide analytics and reports",
      icon: BarChart3,
      action: "View Analytics",
    },
    {
      title: "System Settings",
      description: "Configure school-wide settings and policies",
      icon: Settings,
      action: "Settings",
    },
    {
      title: "Security Center",
      description: "Monitor security and manage access controls",
      icon: Shield,
      action: "Security",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 text-green-600 rounded-lg">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">School Administrator Resources</h1>
            <p className="text-muted-foreground">
              Administrative tools and resources for managing your school's Bullyproof implementation
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-xs text-green-600 mt-1">{stat.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{action.title}</CardTitle>
                    <CardDescription className="text-xs">{action.description}</CardDescription>
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

      {/* Learning Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Administrative Resources</CardTitle>
          <CardDescription>
            Guides and tutorials for school administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adminResources.map((resource) => (
              <div key={resource.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="p-2 bg-muted rounded">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{resource.title}</h3>
                    <Badge variant="outline">{resource.type}</Badge>
                    <Badge variant="secondary">{resource.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                  <Button variant="ghost" size="sm" className="h-auto p-0">
                    View Resource
                  </Button>
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
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system status and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">All systems operational</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Scheduled maintenance: Sunday 2AM-4AM</span>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              View Detailed Status
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Downloads</CardTitle>
            <CardDescription>
              Common administrative documents and templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              User Management Guide
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Compliance Checklist
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Security Policy Template
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
