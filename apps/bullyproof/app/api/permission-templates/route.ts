import { NextResponse } from "next/server";
import { permissionTemplatesService } from "@/server/permission-templates/permission-templates.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const templates = await permissionTemplatesService.list({ userId });
    return NextResponse.json(templates, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { name, description, rules, scope } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    const template = await permissionTemplatesService.create(
      { userId },
      {
        name,
        scope:
          scope === "platform_role" || scope === "school" ? scope : undefined,
        description: typeof description === "string" ? description : undefined,
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
    return NextResponse.json(template, { status: 201 });
  } catch (e: unknown) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Internal error";
    const status = String(msg).includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
