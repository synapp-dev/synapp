import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { GraduationCap, BookOpenText } from "lucide-react";

export default function AdminContentPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Content Management
        </h1>
        <p className="text-muted-foreground">
          Manage curriculum and certification content
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/admin/content/certification">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Certification</CardTitle>
                  <CardDescription>
                    Manage certification content and requirements
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure certification programs and track completion
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/content/curriculum">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <BookOpenText className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Curriculum</CardTitle>
                  <CardDescription>
                    Manage curriculum stages, topics, and lessons
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Organize and structure educational content by stages and years
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
