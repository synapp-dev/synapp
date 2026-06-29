import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { canManageUsers } from "@/entities/admin/lib/users-admin-access";
import {
  PROTECTED_SUPERUSER_EMAIL,
  ROLE_DEVELOPER,
} from "@/entities/admin/lib/rbac-constants";
import {
  getDirectSlugsForProfile,
  getProfileById,
  getProfileByUserId,
  grantSlugsToProfile,
  revokeSlugsFromProfile,
} from "@/entities/admin/lib/users-admin-server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slugs: z.array(z.string().min(1).max(64)).min(1).max(64),
});

type Ctx = { params: Promise<{ profileId: string }> };

async function authorize() {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorized", status: 401 as const };
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!canManageUsers(slugs)) return { error: "Forbidden", status: 403 as const };
  const actor = await getProfileByUserId(userId);
  return { userId, actor };
}

async function parseBody(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return null;
  }
  const parsed = bodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export async function POST(request: Request, ctx: Ctx) {
  const auth = await authorize();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { profileId } = await ctx.params;
  const target = await getProfileById(profileId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const body = await parseBody(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await grantSlugsToProfile(
    profileId,
    body.slugs,
    auth.actor?.profileId ?? null,
  );
  const slugs = await getDirectSlugsForProfile(profileId);
  return NextResponse.json({ slugs });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const auth = await authorize();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { profileId } = await ctx.params;
  const target = await getProfileById(profileId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const body = await parseBody(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Guardrails: protect Full Admin (developer) on yourself and on the owner.
  if (body.slugs.includes(ROLE_DEVELOPER)) {
    if (target.email === PROTECTED_SUPERUSER_EMAIL) {
      return NextResponse.json(
        { error: "The platform owner's Full Admin can't be revoked." },
        { status: 403 },
      );
    }
    if (auth.actor && target.userId === auth.actor.userId) {
      return NextResponse.json(
        { error: "You can't remove your own Full Admin." },
        { status: 403 },
      );
    }
  }

  await revokeSlugsFromProfile(profileId, body.slugs);
  const slugs = await getDirectSlugsForProfile(profileId);
  return NextResponse.json({ slugs });
}
