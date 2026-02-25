import { NextResponse } from "next/server";
import { permissionTemplatesService } from "@/server/permission-templates/permission-templates.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const template = await permissionTemplatesService.getById({ userId }, id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json(template, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { name, description, rules, scope } = body;
    const template = await permissionTemplatesService.update(
      { userId },
      id,
      {
        name: typeof name === "string" ? name : undefined,
        scope:
          scope === "platform_role" || scope === "school" ? scope : undefined,
        description:
          description !== undefined
            ? (typeof description === "string" ? description : null)
            : undefined,
        rules: Array.isArray(rules)
          ? rules.map(
              (r: {
                featureKey: string;
                level: string;
                roleKey?: string;
                enabled?: boolean;
                visible?: boolean | null;
              }) => ({
                featureKey: r.featureKey,
                level: r.level as "school" | "school_role" | "role",
                roleKey: r.roleKey,
                enabled: typeof r.enabled === "boolean" ? r.enabled : undefined,
                visible:
                  r.visible === null
                    ? null
                    : typeof r.visible === "boolean"
                      ? r.visible
                      : undefined,
              })
            )
          : undefined,
      }
    );
    return NextResponse.json(template, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await permissionTemplatesService.delete({ userId }, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
