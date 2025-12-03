import Link from "next/link";
import {
  Building2,
  Users,
  GraduationCap,
  Presentation,
  BarChart3,
  FileText,
  HelpCircle,
  BookOpenText,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["admin"]);

const adminItems = [
  {
    title: "Content",
    url: "/admin/content",
    icon: BookOpenText,
    description: "Manage curriculum content and resources",
  },
  {
    title: "Schools",
    url: "/admin/schools",
    icon: Building2,
    description: "View and manage school accounts",
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    description: "Manage user accounts and permissions",
  },
  {
    title: "Classes",
    url: "/admin/classes",
    icon: GraduationCap,
    description: "View and manage class rosters",
  },
  {
    title: "Lessons",
    url: "/admin/lessons",
    icon: Presentation,
    description: "Monitor and manage lesson delivery",
  },
  {
    title: "Culture Ratings",
    url: "/admin/culture-ratings",
    icon: BarChart3,
    description: "View culture rating analytics and reports",
  },
  {
    title: "Audit Logs",
    url: "/admin/audit-logs",
    icon: FileText,
    description: "Review system activity and changes",
  },
  {
    title: "Support Tools",
    url: "/admin/support-tools",
    icon: HelpCircle,
    description: "Access support and troubleshooting tools",
  },
];

export default function AdminPage() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.title} href={item.url}>
              <Card
                className={cn(
                  "transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full"
                )}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
