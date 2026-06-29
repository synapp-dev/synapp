import { NextResponse } from "next/server";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { canManageUsers } from "@/entities/admin/lib/users-admin-access";
import { listAdminUsers } from "@/entities/admin/lib/users-admin-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!canManageUsers(slugs)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const pageRaw = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageRaw) ? pageRaw : 1;

  const result = await listAdminUsers({ q, page });
  return NextResponse.json(result);
}
