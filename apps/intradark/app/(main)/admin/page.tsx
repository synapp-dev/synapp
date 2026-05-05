import Link from "next/link";
import { notFound } from "next/navigation";
import { Map, Newspaper, SquareStack } from "lucide-react";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import {
  hasAnyAdminSlug,
  hasCapability,
  hasRoleSlug,
} from "@/entities/admin/lib/role-slugs";
import {
  ADMIN_AREA_SLUGS,
  ROLE_DEVELOPER,
  ROLE_NEWS_EDITOR,
  ROLE_SANDBOX_ACCESS,
} from "@/entities/admin/lib/rbac-constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default async function AdminHomePage() {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getRoleSlugsForUser(userId);
  if (!hasAnyAdminSlug(slugs, ADMIN_AREA_SLUGS)) notFound();

  const showSandbox = hasCapability(slugs, ROLE_SANDBOX_ACCESS);
  const showNews = hasCapability(slugs, ROLE_NEWS_EDITOR);
  const showUtilityMaps = hasRoleSlug(slugs, ROLE_DEVELOPER);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Staff tools gated by role. Unauthorized routes return 404.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {showSandbox ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <SquareStack className="h-5 w-5" />
                Sandbox
              </CardTitle>
              <CardDescription>
                UX simulators without real users or OAuth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/sandbox"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open sandbox →
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {showNews ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Newspaper className="h-5 w-5" />
                News
              </CardTitle>
              <CardDescription>
                Editor routes ship with the news feature; placeholder card.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-muted-foreground">
                Wire to `/news/admin` or `/admin/news` when implemented.
              </span>
            </CardContent>
          </Card>
        ) : null}

        {showUtilityMaps ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Map className="h-5 w-5" />
                Utility maps
              </CardTitle>
              <CardDescription>
                Canonical <code className="text-xs">maps</code> table and storage-backed radar
                assets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/utility"
                className="text-primary text-sm font-medium hover:underline"
              >
                Open utility admin →
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
