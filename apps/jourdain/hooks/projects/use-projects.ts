"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { projectsApi } from "@/entities/projects/api/endpoints";
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/entities/projects/model/types";

export const projectsQueryKey = ["projects"] as const;

export function useProjects() {
  return useQuery({
    queryKey: projectsQueryKey,
    queryFn: async (): Promise<Project[]> => {
      const result = await projectsApi.get.list();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

function applyProjectPatch(project: Project, input: UpdateProjectInput): Project {
  const next: Project = { ...project };
  if (input.name !== undefined) next.name = input.name;
  if (input.description !== undefined)
    next.description = input.description ?? null;
  if (input.status !== undefined) next.status = input.status;
  if (input.color !== undefined) next.color = input.color ?? null;
  if (input.orderIndex !== undefined) next.orderIndex = input.orderIndex;
  return next;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectInput): Promise<Project> => {
      const result = await projectsApi.post.create(input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: projectsQueryKey });
      const previous = queryClient.getQueryData<Project[]>(projectsQueryKey);
      const now = new Date().toISOString();
      const optimistic: Project = {
        id: `temp-${crypto.randomUUID()}`,
        name: input.name,
        description: input.description ?? null,
        status: input.status ?? "active",
        color: input.color ?? null,
        orderIndex: input.orderIndex ?? 0,
        createdAt: now,
        updatedAt: now,
      };
      queryClient.setQueryData<Project[]>(projectsQueryKey, (old) => [
        optimistic,
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous)
        queryClient.setQueryData(projectsQueryKey, context.previous);
      toast.error(err instanceof Error ? err.message : "Couldn't add project");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      projectId: string;
      input: UpdateProjectInput;
    }): Promise<Project> => {
      const result = await projectsApi.patch.update(args.projectId, args.input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onMutate: async ({ projectId, input }) => {
      await queryClient.cancelQueries({ queryKey: projectsQueryKey });
      const previous = queryClient.getQueryData<Project[]>(projectsQueryKey);
      queryClient.setQueryData<Project[]>(projectsQueryKey, (old) =>
        (old ?? []).map((project) =>
          project.id === projectId ? applyProjectPatch(project, input) : project
        )
      );
      return { previous };
    },
    onError: (err, _args, context) => {
      if (context?.previous)
        queryClient.setQueryData(projectsQueryKey, context.previous);
      toast.error(
        err instanceof Error ? err.message : "Couldn't update project"
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const result = await projectsApi.delete.remove(projectId);
      if (result.error) throw new Error(result.error.message);
    },
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: projectsQueryKey });
      const previous = queryClient.getQueryData<Project[]>(projectsQueryKey);
      queryClient.setQueryData<Project[]>(projectsQueryKey, (old) =>
        (old ?? []).filter((project) => project.id !== projectId)
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(projectsQueryKey, context.previous);
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete project"
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
}
