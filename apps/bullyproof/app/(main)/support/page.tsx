import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  HelpCircle,
  BookOpen,
  Users,
  Download,
  MessageCircle,
  Bug,
  Lightbulb,
  Activity,
  Mail,
  ArrowRight,
  Star,
  Clock,
  Shield,
} from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["support"]);

export default function SupportPage() {
  const quickLinks = [
    {
      title: "FAQ",
      description: "Find answers to common questions",
      icon: HelpCircle,
      link: "/support/faq",
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Tutorials",
      description: "Learn how to use Bullyproof",
      icon: BookOpen,
      link: "/support/tutorials",
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Role-Specific Help",
      description: "Resources for your specific role",
      icon: Users,
      link: "/support/roles",
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Download Resources",
      description: "Templates and guides",
      icon: Download,
      link: "/support/resources",
      color: "bg-orange-100 text-orange-600",
    },
  ];

  const supportActions = [
    {
      title: "System Status",
      description: "Check current system status",
      icon: Activity,
      link: "/support/status",
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Changelog",
      description: "View recent updates and releases",
      icon: Clock,
      link: "/support/changelog",
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Contact Support",
      description: "Get help from our team",
      icon: Mail,
      link: "/support/contact",
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Role-Specific Help",
      description: "Resources for your role",
      icon: Users,
      link: "/support/roles",
      color: "bg-orange-100 text-orange-600",
    },
  ];

  const systemInfo = [
    {
      title: "System Status",
      status: "All Systems Operational",
      icon: Activity,
      color: "text-green-600",
    },
    {
      title: "Last Update",
      status: "2.4.1 - January 20, 2024",
      icon: Clock,
      color: "text-blue-600",
    },
    {
      title: "Security",
      status: "SOC 2 Type II Certified",
      icon: Shield,
      color: "text-green-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to Support
            </h1>
            <p className="text-muted-foreground">
              Get help, find resources, and connect with the Bullyproof
              community
            </p>
          </div>
        </div>
      </div>

      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>
            Current system status and recent updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {systemInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <Icon className={`h-5 w-5 ${info.color}`} />
                  <div>
                    <div className="font-medium">{info.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {info.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Help</CardTitle>
          <CardDescription>
            Get started with these popular support resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Card
                  key={index}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${link.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{link.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {link.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button size="sm" className="w-full" asChild>
                      <a href={link.link}>
                        Access
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Support Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Get Support</CardTitle>
          <CardDescription>
            Report issues, request features, or connect with our team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {supportActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card
                  key={index}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">
                          {action.title}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {action.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button size="sm" className="w-full" asChild>
                      <a href={action.link}>
                        Go
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Popular Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Popular Resources</CardTitle>
            <CardDescription>Most accessed help materials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Getting Started Guide
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Teacher Training Videos
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Policy Templates
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Shield className="mr-2 h-4 w-4" />
              Security Best Practices
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>
              Need immediate help? Contact our team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Email Support
            </Button>
            <Button variant="outline" className="w-full">
              <MessageCircle className="mr-2 h-4 w-4" />
              Live Chat
            </Button>
            <Button variant="outline" className="w-full">
              <Star className="mr-2 h-4 w-4" />
              Schedule Call
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Support Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Support Highlights</CardTitle>
          <CardDescription>Recent activity and system updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="font-medium">System Status</span>
              </div>
              <div className="text-sm text-muted-foreground">
                99.9% uptime • All systems operational
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Latest Update</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Version 2.4.1 • January 20, 2024
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Active Users</span>
              </div>
              <div className="text-sm text-muted-foreground">
                2,847 users • 1,247 this week
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
