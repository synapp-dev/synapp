import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  BookOpen,
  Search,
  FileText,
  Users,
  Shield,
  BarChart3,
  Settings,
  MessageCircle,
} from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["support", "glossary"]);

export default function GlossaryPage() {
  const glossaryTerms = [
    {
      id: 1,
      term: "Analytics Dashboard",
      definition:
        "A comprehensive view of school performance metrics, student progress, and system usage statistics.",
      category: "Analytics",
      related: ["Reports", "Metrics", "Performance"],
    },
    {
      id: 2,
      term: "Bullying Incident",
      definition:
        "Any reported or detected instance of bullying behavior within the school environment, tracked and managed through the system.",
      category: "Incidents",
      related: ["Reporting", "Behavior", "Safety"],
    },
    {
      id: 3,
      term: "Class Management",
      definition:
        "Tools and features for organizing students into classes, managing class rosters, and tracking class-specific progress.",
      category: "Management",
      related: ["Students", "Teachers", "Organization"],
    },
    {
      id: 4,
      term: "Compliance Reporting",
      definition:
        "Automated generation of reports required for educational compliance and regulatory requirements.",
      category: "Compliance",
      related: ["Reports", "Regulations", "Standards"],
    },
    {
      id: 5,
      term: "Data Privacy",
      definition:
        "Protection and secure handling of student and school data in accordance with educational privacy laws.",
      category: "Security",
      related: ["Privacy", "Security", "Protection"],
    },
    {
      id: 6,
      term: "Parent Portal",
      definition:
        "Secure access point for parents to view their child's progress, receive updates, and communicate with teachers.",
      category: "Communication",
      related: ["Parents", "Updates", "Progress"],
    },
    {
      id: 7,
      term: "Progress Tracking",
      definition:
        "Monitoring and recording of student academic and behavioral progress over time.",
      category: "Tracking",
      related: ["Students", "Progress", "Monitoring"],
    },
    {
      id: 8,
      term: "Role-Based Access",
      definition:
        "Security system that grants different levels of access based on user roles (teacher, admin, parent, etc.).",
      category: "Security",
      related: ["Access", "Permissions", "Roles"],
    },
    {
      id: 9,
      term: "School Administrator",
      definition:
        "User role with full access to school settings, user management, and system configuration.",
      category: "Roles",
      related: ["Admin", "Management", "Settings"],
    },
    {
      id: 10,
      term: "Student Profile",
      definition:
        "Comprehensive record of a student's information, progress, and interactions within the system.",
      category: "Profiles",
      related: ["Students", "Records", "Information"],
    },
  ];

  const categories = [
    { name: "All", count: 10 },
    { name: "Analytics", count: 1 },
    { name: "Incidents", count: 1 },
    { name: "Management", count: 1 },
    { name: "Compliance", count: 1 },
    { name: "Security", count: 2 },
    { name: "Communication", count: 1 },
    { name: "Tracking", count: 1 },
    { name: "Roles", count: 1 },
    { name: "Profiles", count: 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Glossary & Key Terms
            </h1>
            <p className="text-muted-foreground">
              Definitions and explanations of key terms used throughout
              Bullyproof
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search terms..." className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.name}
            variant={category.name === "All" ? "default" : "outline"}
            size="sm"
          >
            {category.name} ({category.count})
          </Button>
        ))}
      </div>

      {/* Glossary Terms */}
      <div className="space-y-4">
        {glossaryTerms.map((term) => (
          <Card key={term.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{term.term}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{term.category}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{term.definition}</p>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Related Terms:</h4>
                <div className="flex flex-wrap gap-2">
                  {term.related.map((related, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {related}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
          <CardDescription>
            Common terms and their meanings for quick lookup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">User Roles</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  • <strong>Teacher:</strong> Classroom management and student
                  progress
                </div>
                <div>
                  • <strong>Admin:</strong> School-wide settings and user
                  management
                </div>
                <div>
                  • <strong>Parent:</strong> View child's progress and
                  communicate
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">System Features</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  • <strong>Analytics:</strong> Performance metrics and
                  reporting
                </div>
                <div>
                  • <strong>Tracking:</strong> Student progress monitoring
                </div>
                <div>
                  • <strong>Communication:</strong> Parent and teacher updates
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
