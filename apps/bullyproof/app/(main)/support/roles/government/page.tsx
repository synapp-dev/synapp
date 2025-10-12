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
  Users, 
  Shield, 
  FileText, 
  BarChart3,
  Download,
  Eye,
  Lock,
  AlertTriangle,
  CheckCircle,
  Database
} from "lucide-react";

export default function GovernmentPage() {
  const complianceResources = [
    {
      id: 1,
      title: "Data Privacy Compliance Report",
      type: "Compliance Report",
      description: "Comprehensive report on data privacy and protection measures",
      category: "Privacy",
      lastUpdated: "2 days ago",
    },
    {
      id: 2,
      title: "Security Audit Results",
      type: "Security Report",
      description: "Latest security audit findings and recommendations",
      category: "Security",
      lastUpdated: "1 week ago",
    },
    {
      id: 3,
      title: "Usage Analytics Summary",
      type: "Analytics Report",
      description: "Aggregated usage statistics and system performance metrics",
      category: "Analytics",
      lastUpdated: "3 days ago",
    },
    {
      id: 4,
      title: "Incident Response Protocol",
      type: "Procedure",
      description: "Documented procedures for handling security incidents",
      category: "Security",
      lastUpdated: "1 month ago",
    },
  ];

  const systemStatus = [
    { label: "Data Centers", value: "3", status: "Operational" },
    { label: "Security Level", value: "High", status: "Compliant" },
    { label: "Data Retention", value: "7 years", status: "Active" },
    { label: "Audit Trail", value: "Complete", status: "Verified" },
  ];

  const accessLevels = [
    {
      title: "Read-Only Access",
      description: "View reports and analytics without modification rights",
      icon: Eye,
      level: "Level 1",
    },
    {
      title: "Compliance Monitoring",
      description: "Access to compliance reports and audit trails",
      icon: Shield,
      level: "Level 2",
    },
    {
      title: "Full Oversight",
      description: "Complete access to all system data and controls",
      icon: Lock,
      level: "Level 3",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Government Viewer Resources</h1>
            <p className="text-muted-foreground">
              Compliance reporting and oversight tools for government agencies
            </p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {systemStatus.map((status, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{status.value}</div>
              <div className="text-sm text-muted-foreground">{status.label}</div>
              <div className="text-xs text-green-600 mt-1">{status.status}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Access Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Access Levels</CardTitle>
          <CardDescription>
            Different levels of access available for government oversight
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accessLevels.map((access, index) => {
              const Icon = access.icon;
              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{access.title}</h3>
                      <Badge variant="outline">{access.level}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{access.description}</p>
                  <Button size="sm" className="w-full">
                    Request Access
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance & Reporting</CardTitle>
          <CardDescription>
            Access to compliance reports and oversight documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complianceResources.map((resource) => (
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
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">Updated {resource.lastUpdated}</span>
                    <Button variant="ghost" size="sm" className="h-auto p-0">
                      View Report
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto p-0">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security & Privacy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Security Overview</CardTitle>
            <CardDescription>
              Current security status and measures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">All security protocols active</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Data encryption: AES-256</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <Database className="h-4 w-4" />
              <span className="text-sm">Audit logging: Complete</span>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              View Security Details
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Access</CardTitle>
            <CardDescription>
              Request access to specific data or reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Request Compliance Report
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <BarChart3 className="mr-2 h-4 w-4" />
              Request Analytics Data
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report Security Concern
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
