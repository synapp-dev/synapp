import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/utils/supabase/server";
import { deleteProject, updateProject } from "@/lib/projects/service";
import { PROJECT_STATUSES } from "@/entities/projects/model/types";

const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullish(),
    status: z.enum(PROJECT_STATUSES).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Expected #rrggbb")
      .nullish(),
    orderIndex: z.number().int().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Empty update",
  });

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const { projectId } = await params;
  const parsed = updateProjectSchema.safeParse(
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
    const project = await updateProject(supabase, projectId, parsed.data);
    return NextResponse.json({ data: project, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : "Failed to update project",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return unauthorized();

  const { projectId } = await params;
  try {
    await deleteProject(supabase, projectId);
    return NextResponse.json({ data: { id: projectId }, error: null });
  } catch (err) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            err instanceof Error ? err.message : "Failed to delete project",
        },
      },
      { status: 500 }
    );
  }
}
