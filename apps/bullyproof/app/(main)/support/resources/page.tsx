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
  Download,
  FileText,
  Image,
  Video,
  Archive,
  BookOpen,
  Shield,
  Users,
  Settings,
  BarChart3,
} from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["support", "resources"]);

export default function ResourcesPage() {
  const resourceCategories = [
    {
      id: 1,
      title: "Policy Templates",
      description: "Ready-to-use policy templates for schools",
      count: 12,
      icon: FileText,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: 2,
      title: "Training Materials",
      description: "Educational resources for staff training",
      count: 8,
      icon: BookOpen,
      color: "bg-green-100 text-green-600",
    },
    {
      id: 3,
      title: "Compliance Documents",
      description: "Forms and documents for regulatory compliance",
      count: 15,
      icon: Shield,
      color: "bg-red-100 text-red-600",
    },
    {
      id: 4,
      title: "User Guides",
      description: "Step-by-step guides for different user roles",
      count: 6,
      icon: Users,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  const featuredResources = [
    {
      id: 1,
      title: "Bullyproof Implementation Guide",
      type: "PDF Guide",
      size: "2.4 MB",
      description:
        "Comprehensive guide for implementing Bullyproof in your school",
      downloads: 1247,
      updated: "2 weeks ago",
      icon: FileText,
    },
    {
      id: 2,
      title: "Teacher Training Video Series",
      type: "Video Collection",
      size: "156 MB",
      description: "Complete video training series for teachers and staff",
      downloads: 892,
      updated: "1 month ago",
      icon: Video,
    },
    {
      id: 3,
      title: "Parent Communication Templates",
      type: "Document Pack",
      size: "1.2 MB",
      description:
        "Ready-to-use email and letter templates for parent communication",
      downloads: 2156,
      updated: "3 days ago",
      icon: FileText,
    },
    {
      id: 4,
      title: "Analytics Dashboard Guide",
      type: "Interactive Guide",
      size: "5.1 MB",
      description:
        "Interactive guide to understanding and using analytics features",
      downloads: 634,
      updated: "1 week ago",
      icon: BarChart3,
    },
  ];

  const quickDownloads = [
    {
      title: "School Setup Checklist",
      description: "Step-by-step checklist for initial school setup",
      icon: Settings,
      downloads: 2341,
    },
    {
      title: "Privacy Policy Template",
      description: "Customizable privacy policy template for schools",
      icon: Shield,
      downloads: 1876,
    },
    {
      title: "User Role Permissions Guide",
      description: "Complete guide to user roles and permissions",
      icon: Users,
      downloads: 1456,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 text-green-600 rounded-lg">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Downloadable Resources
            </h1>
            <p className="text-muted-foreground">
              Templates, guides, and documents to help you get the most out of
              Bullyproof
            </p>
          </div>
        </div>
      </div>

      {/* Resource Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {resourceCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription>
                      {category.count} resources
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  {category.description}
                </p>
                <Button size="sm" className="w-full">
                  Browse Resources
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Featured Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Featured Resources</CardTitle>
          <CardDescription>
            Most popular and recently updated resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {featuredResources.map((resource) => {
              const Icon = resource.icon;
              return (
                <div
                  key={resource.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 bg-muted rounded">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{resource.title}</h3>
                      <Badge variant="outline">{resource.type}</Badge>
                      <Badge variant="secondary">{resource.size}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {resource.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{resource.downloads} downloads</span>
                      <span>Updated {resource.updated}</span>
                      <Button variant="ghost" size="sm" className="h-auto p-0">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Downloads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickDownloads.map((download, index) => {
          const Icon = download.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{download.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {download.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {download.downloads} downloads
                  </span>
                  <Button size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resource Request */}
      <Card>
        <CardHeader>
          <CardTitle>Can't Find What You Need?</CardTitle>
          <CardDescription>
            Request specific resources or templates that would help your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We're always looking to add new resources that help our schools
              succeed. If you need a specific template, guide, or document that
              isn't available, let us know and we'll work to create it for you.
            </p>
            <Button className="w-full">Request New Resource</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
