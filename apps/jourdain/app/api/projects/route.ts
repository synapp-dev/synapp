import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/api/route-auth";
import { createProject, listProjects } from "@/lib/projects/service";
import { PROJECT_STATUSES } from "@/entities/projects/model/types";

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullish(),
  status: z.enum(PROJECT_STATUSES).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected #rrggbb")
    .nullish(),
  orderIndex: z.number().int().optional(),
});

export async function GET() {
  const { supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  try {
    const projects = await listProjects(supabase);
    return NextResponse.json({ data: projects, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : "Failed to list projects",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, supabase, errorResponse } = await requireRequestUser();
  if (errorResponse) return errorResponse;

  const parsed = createProjectSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { message: parsed.error.issues[0]?.message ?? "Invalid body" },
      },
      { status: 400 }
    );
  }

  try {
    const project = await createProject(supabase, user.id, parsed.data);
    return NextResponse.json({ data: project, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : "Failed to create project",
        },
      },
      { status: 500 }
    );
  }
}
