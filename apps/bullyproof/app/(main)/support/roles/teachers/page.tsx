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
  GraduationCap,
  Users,
  BookOpen,
  MessageCircle,
  Settings,
  BarChart3,
  FileText,
  Video,
  Download,
} from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments([
  "support",
  "roles",
  "teachers",
]);

export default function TeachersPage() {
  const resources = [
    {
      id: 1,
      title: "Setting Up Your First Class",
      type: "Video Tutorial",
      duration: "8 min",
      description:
        "Learn how to create and manage your first class in Bullyproof",
      difficulty: "Beginner",
    },
    {
      id: 2,
      title: "Student Progress Tracking",
      type: "Guide",
      duration: "12 min",
      description:
        "Understand how to monitor and track student progress effectively",
      difficulty: "Intermediate",
    },
    {
      id: 3,
      title: "Parent Communication Best Practices",
      type: "Article",
      duration: "6 min",
      description:
        "Tips for effective communication with parents about student progress",
      difficulty: "Beginner",
    },
    {
      id: 4,
      title: "Using Analytics in Your Classroom",
      type: "Video Tutorial",
      duration: "15 min",
      description: "Advanced analytics features to improve your teaching",
      difficulty: "Advanced",
    },
  ];

  const quickActions = [
    {
      title: "Create New Class",
      description: "Set up a new class and invite students",
      icon: Users,
      action: "Create Class",
    },
    {
      title: "View Student Progress",
      description: "Check individual and class-wide progress",
      icon: BarChart3,
      action: "View Progress",
    },
    {
      title: "Send Parent Updates",
      description: "Communicate with parents about student progress",
      icon: MessageCircle,
      action: "Send Updates",
    },
    {
      title: "Download Reports",
      description: "Generate and download progress reports",
      icon: Download,
      action: "Download",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Teacher Resources
            </h1>
            <p className="text-muted-foreground">
              Everything you need to effectively use Bullyproof in your
              classroom
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
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

      {/* Learning Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Resources</CardTitle>
          <CardDescription>
            Tutorials, guides, and best practices for teachers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 bg-muted rounded">
                  {resource.type === "Video Tutorial" ? (
                    <Video className="h-5 w-5" />
                  ) : resource.type === "Guide" ? (
                    <BookOpen className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{resource.title}</h3>
                    <Badge variant="outline">{resource.type}</Badge>
                    <Badge variant="secondary">{resource.difficulty}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {resource.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{resource.duration}</span>
                    <Button variant="ghost" size="sm" className="h-auto p-0">
                      Start Learning
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Get support from our team and community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <MessageCircle className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Teacher Community
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teacher Tips</CardTitle>
            <CardDescription>
              Quick tips to maximize your Bullyproof experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Pro Tip</p>
                <p className="text-sm text-blue-700">
                  Use the progress dashboard to identify students who need
                  additional support early.
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-900">
                  Best Practice
                </p>
                <p className="text-sm text-green-700">
                  Set up regular parent communication schedules to keep families
                  informed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
