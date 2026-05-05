import Link from "next/link";

import { SANDBOX_CHILDREN } from "@/entities/sandbox/registry";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function AdminSandboxIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sandbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          UX simulators for flows that normally need real users or OAuth. Access
          requires the <code className="rounded bg-muted px-1 py-0.5 text-xs">sandbox.access</code>{" "}
          role.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SANDBOX_CHILDREN.map((c) => (
          <Card key={c.slug} className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">
                <Link
                  href={c.href}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {c.title}
                </Link>
              </CardTitle>
              <CardDescription>{c.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={c.href}
                className="text-sm font-medium text-primary hover:underline"
              >
                Open →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
