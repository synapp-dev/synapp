import { generateMetadataFromSegments } from "@/utils/metadata";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { FileText } from "lucide-react";

export const metadata = generateMetadataFromSegments(["admin", "audit-logs"]);

export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Review platform activity and investigate operational changes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Audit trail workspace</CardTitle>
              <CardDescription>
                This page is set up and ready for audit log tooling.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Next step: connect event sources and filtering controls for
            user/admin actions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
