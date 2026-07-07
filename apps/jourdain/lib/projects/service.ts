import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
  UpdateProjectInput,
} from "@/entities/projects/model/types";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

const PROJECT_COLUMNS =
  "id, name, description, status, color, order_index, created_at, updated_at";

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    color: row.color,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProjects(
  supabase: SupabaseClient
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ProjectRow[]).map(toProject);
}

export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "active",
      color: input.color ?? null,
      order_index: input.orderIndex ?? 0,
    })
    .select(PROJECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toProject(data as ProjectRow);
}

export async function updateProject(
  supabase: SupabaseClient,
  projectId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) patch.status = input.status;
  if (input.color !== undefined) patch.color = input.color;
  if (input.orderIndex !== undefined) patch.order_index = input.orderIndex;

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .select(PROJECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toProject(data as ProjectRow);
}

export async function deleteProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (error) throw new Error(error.message);
}
