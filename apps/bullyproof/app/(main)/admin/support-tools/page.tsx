import { generateMetadataFromSegments } from "@/utils/metadata";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { LifeBuoy } from "lucide-react";

export const metadata = generateMetadataFromSegments([
  "admin",
  "support-tools",
]);

export default function AdminSupportToolsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Support Tools</h1>
        <p className="text-muted-foreground">
          Centralized tools for diagnostics, troubleshooting, and support
          operations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Support operations workspace</CardTitle>
              <CardDescription>
                This page is available for internal support workflows.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Next step: add quick actions for common incident and user support
            tasks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
