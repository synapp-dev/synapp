import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Users,
  GraduationCap,
  Shield,
  Building,
  ArrowRight,
  BookOpen,
  MessageCircle,
  Settings,
} from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["support", "roles"]);

export default function RolesPage() {
  const roles = [
    {
      id: "teachers",
      title: "Teachers",
      description:
        "Resources and guides for teachers using Bullyproof in their classrooms",
      icon: GraduationCap,
      features: [
        "Class management",
        "Student progress tracking",
        "Lesson delivery",
        "Parent communication",
      ],
      link: "/support/roles/teachers",
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: "school-admins",
      title: "School Administrators",
      description:
        "Administrative tools and best practices for school-wide implementation",
      icon: Building,
      features: [
        "School-wide analytics",
        "User management",
        "Policy configuration",
        "Reporting and compliance",
      ],
      link: "/support/roles/school-admins",
      color: "bg-green-100 text-green-600",
    },
    {
      id: "bullyproof-staff",
      title: "Bullyproof Staff",
      description:
        "Internal resources for Bullyproof team members and support staff",
      icon: Shield,
      features: [
        "System administration",
        "Customer support",
        "Technical troubleshooting",
        "Feature development",
      ],
      link: "/support/roles/bullyproof-staff",
      color: "bg-purple-100 text-purple-600",
    },
    {
      id: "government",
      title: "Government Viewers",
      description:
        "Access and reporting tools for government oversight and compliance",
      icon: Users,
      features: [
        "Compliance reporting",
        "Data access protocols",
        "Audit trails",
        "Privacy controls",
      ],
      link: "/support/roles/government",
      color: "bg-orange-100 text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Role-Specific Help
        </h1>
        <p className="text-muted-foreground">
          Find resources tailored to your specific role and responsibilities in
          Bullyproof.
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Card key={role.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${role.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{role.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {role.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Key Features:</h4>
                  <ul className="space-y-1">
                    {role.features.map((feature, index) => (
                      <li
                        key={index}
                        className="text-sm text-muted-foreground flex items-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button className="w-full" asChild>
                  <a href={role.link}>
                    View Resources
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
          <CardDescription>
            Common tasks and resources across all roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Getting Started Guide</div>
                  <div className="text-sm text-muted-foreground">
                    Essential first steps
                  </div>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Community Forum</div>
                  <div className="text-sm text-muted-foreground">
                    Connect with other users
                  </div>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Account Settings</div>
                  <div className="text-sm text-muted-foreground">
                    Manage your preferences
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
