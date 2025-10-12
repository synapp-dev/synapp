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
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Bell
} from "lucide-react";

export default function StatusPage() {
  const services = [
    {
      name: "Web Application",
      status: "Operational",
      uptime: "99.9%",
      responseTime: "120ms",
      lastIncident: "None in the past 30 days",
      description: "Main web application and user interface",
    },
    {
      name: "Mobile App",
      status: "Operational",
      uptime: "99.8%",
      responseTime: "180ms",
      lastIncident: "None in the past 30 days",
      description: "iOS and Android mobile applications",
    },
    {
      name: "API Services",
      status: "Operational",
      uptime: "99.9%",
      responseTime: "95ms",
      lastIncident: "None in the past 30 days",
      description: "Backend API and data services",
    },
    {
      name: "Email Service",
      status: "Degraded",
      uptime: "95.2%",
      responseTime: "2.1s",
      lastIncident: "Email delivery delays - 2 hours ago",
      description: "Email notifications and communications",
    },
    {
      name: "Analytics Engine",
      status: "Operational",
      uptime: "99.7%",
      responseTime: "450ms",
      lastIncident: "None in the past 30 days",
      description: "Data processing and analytics",
    },
    {
      name: "Database",
      status: "Operational",
      uptime: "99.9%",
      responseTime: "25ms",
      lastIncident: "None in the past 30 days",
      description: "Primary database and data storage",
    },
  ];

  const recentIncidents = [
    {
      id: 1,
      title: "Email delivery delays",
      status: "Resolved",
      severity: "Medium",
      startTime: "2024-01-20 14:30 UTC",
      endTime: "2024-01-20 16:45 UTC",
      duration: "2h 15m",
      description: "Some email notifications were delayed due to email service provider issues.",
      impact: "~15% of users affected",
    },
    {
      id: 2,
      title: "Analytics dashboard slow loading",
      status: "Resolved",
      severity: "Low",
      startTime: "2024-01-18 09:15 UTC",
      endTime: "2024-01-18 11:30 UTC",
      duration: "2h 15m",
      description: "Analytics dashboard experienced slower loading times for large datasets.",
      impact: "~8% of users affected",
    },
    {
      id: 3,
      title: "Scheduled maintenance",
      status: "Completed",
      severity: "None",
      startTime: "2024-01-15 02:00 UTC",
      endTime: "2024-01-15 04:00 UTC",
      duration: "2h 0m",
      description: "Planned maintenance window for system updates and improvements.",
      impact: "All services temporarily unavailable",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Operational": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Degraded": return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "Outage": return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Operational": return "bg-green-100 text-green-600";
      case "Degraded": return "bg-yellow-100 text-yellow-600";
      case "Outage": return "bg-red-100 text-red-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 text-green-600 rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
            <p className="text-muted-foreground">
              Real-time status of all Bullyproof services and infrastructure
            </p>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle>Overall System Status</CardTitle>
          <CardDescription>
            Current operational status across all services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">All Systems Operational</div>
              <div className="text-muted-foreground">
                All core services are running normally. Last updated 2 minutes ago.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>
            Detailed status of individual services and components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {getStatusIcon(service.status)}
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted-foreground">{service.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">Uptime: {service.uptime}</div>
                    <div className="text-xs text-muted-foreground">Response: {service.responseTime}</div>
                  </div>
                  <Badge className={getStatusColor(service.status)}>
                    {service.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>
            Past incidents and their resolution status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentIncidents.map((incident) => (
              <div key={incident.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium">{incident.title}</div>
                    <div className="text-sm text-muted-foreground">{incident.description}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{incident.severity}</Badge>
                    <Badge className={getStatusColor(incident.status)}>
                      {incident.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mt-3">
                  <div>
                    <span className="font-medium">Duration:</span> {incident.duration}
                  </div>
                  <div>
                    <span className="font-medium">Impact:</span> {incident.impact}
                  </div>
                  <div>
                    <span className="font-medium">Resolved:</span> {incident.endTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Notifications</CardTitle>
            <CardDescription>
              Stay informed about system status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Bell className="mr-2 h-4 w-4" />
              Subscribe to Status Updates
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <ExternalLink className="mr-2 h-4 w-4" />
              RSS Feed
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Key performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Average Response Time</span>
              <span className="font-medium">180ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Uptime (30 days)</span>
              <span className="font-medium">99.7%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Active Users</span>
              <span className="font-medium">2,847</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Last Incident</span>
              <span className="font-medium">2 days ago</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
