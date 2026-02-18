"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  Download,
  Upload,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Link2,
  X,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Input } from "@workspace/ui/components/input";
import { getAuthHeaders } from "@/lib/api/fetcher.client";

type ResourceTreeFile = {
  id: string;
  displayName: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
};

type ResourceTreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  scopeType: "global" | "school";
  schoolId: string | null;
  children: ResourceTreeNode[];
  files: ResourceTreeFile[];
};

type TreeResponse = {
  canManage: boolean;
  roots: ResourceTreeNode[];
};

type StageSummary = {
  id: string;
  code: string;
  name: string;
  sortIndex: number | null;
};

type TopicSummary = {
  id: string;
  stageId: string;
  title: string;
  status?: "draft" | "published" | "archived";
};

type FileTopicLink = {
  topicId: string;
  topicTitle: string;
};

function flattenFolders(roots: ResourceTreeNode[]): Map<string, ResourceTreeNode> {
  const map = new Map<string, ResourceTreeNode>();
  const stack = [...roots];
  while (stack.length > 0) {
    const current = stack.pop() as ResourceTreeNode;
    map.set(current.id, current);
    stack.push(...current.children);
  }
  return map;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function findFolderIdBySlugPath(
  roots: ResourceTreeNode[],
  segments: string[]
): string | null {
  if (segments.length === 0) {
    return null;
  }

  let currentLevel = roots;
  let currentNode: ResourceTreeNode | null = null;
  for (const segment of segments) {
    const next = currentLevel.find((node) => node.slug === segment) ?? null;
    if (!next) {
      return null;
    }
    currentNode = next;
    currentLevel = next.children;
  }

  return currentNode?.id ?? null;
}

export function AdminResourcesClient({
  initialFolderSegments,
}: {
  initialFolderSegments: string[];
}) {
  const queryClient = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [pendingSelectedFolderId, setPendingSelectedFolderId] = React.useState<
    string | null
  >(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [isCreateRootOpen, setIsCreateRootOpen] = React.useState(false);
  const [newRootFolderName, setNewRootFolderName] = React.useState("");
  const [newRootFolderDescription, setNewRootFolderDescription] = React.useState("");
  const [isCreateSubfolderOpen, setIsCreateSubfolderOpen] = React.useState(false);
  const [newSubfolderName, setNewSubfolderName] = React.useState("");
  const [createSubfolderParentId, setCreateSubfolderParentId] = React.useState<
    string | null
  >(null);
  const [folderRenameTarget, setFolderRenameTarget] = React.useState<{
    id: string;
    currentName: string;
    nextName: string;
  } | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [fileRenameTarget, setFileRenameTarget] = React.useState<{
    id: string;
    currentName: string;
    nextName: string;
  } | null>(null);
  const [fileDeleteTarget, setFileDeleteTarget] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [fileTopicTarget, setFileTopicTarget] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedStageId, setSelectedStageId] = React.useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = React.useState("");
  const [linkedTopics, setLinkedTopics] = React.useState<FileTopicLink[]>([]);
  const [isLoadingLinkedTopics, setIsLoadingLinkedTopics] = React.useState(false);
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);

  const treeQuery = useQuery({
    queryKey: ["admin-resources-tree"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/resources/tree", {
        headers,
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to load resources");
      }
      return body as TreeResponse;
    },
  });

  const topicsQuery = useQuery({
    queryKey: ["admin-resources-topics"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/topics", {
        headers,
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to load topics");
      }
      return (body as TopicSummary[]).sort((a, b) => a.title.localeCompare(b.title));
    },
  });

  const stagesQuery = useQuery({
    queryKey: ["admin-resources-stages"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/curriculum/stages", {
        headers,
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to load stages");
      }
      return (body as StageSummary[]).sort((a, b) => {
        const aSort = typeof a.sortIndex === "number" ? a.sortIndex : Number.MAX_SAFE_INTEGER;
        const bSort = typeof b.sortIndex === "number" ? b.sortIndex : Number.MAX_SAFE_INTEGER;
        if (aSort !== bSort) return aSort - bSort;
        return a.name.localeCompare(b.name);
      });
    },
  });

  const canManage = Boolean(treeQuery.data?.canManage);
  const roots = treeQuery.data?.roots ?? [];
  const isLoadingTree = treeQuery.isLoading;

  const folderMap = React.useMemo(() => flattenFolders(roots), [roots]);
  const selectedFolder = selectedFolderId ? folderMap.get(selectedFolderId) ?? null : null;

  const folderPathSegments = React.useMemo(() => {
    if (!selectedFolder) return [];
    const parts: string[] = [];
    let current: ResourceTreeNode | null = selectedFolder;
    let safety = 0;
    while (current) {
      parts.push(current.slug);
      current = current.parentId ? folderMap.get(current.parentId) ?? null : null;
      safety += 1;
      if (safety > 200) break;
    }
    return parts.reverse();
  }, [folderMap, selectedFolder]);

  const breadcrumbs = React.useMemo(() => {
    if (!selectedFolder) return [];
    const parts: ResourceTreeNode[] = [];
    let current: ResourceTreeNode | null = selectedFolder;
    let safety = 0;
    while (current) {
      parts.push(current);
      current = current.parentId ? folderMap.get(current.parentId) ?? null : null;
      safety += 1;
      if (safety > 200) break;
    }
    return parts.reverse();
  }, [folderMap, selectedFolder]);

  const isBusy =
    treeQuery.isFetching ||
    false;

  const expandToFolder = React.useCallback(
    (folderId: string, nextMap: Map<string, ResourceTreeNode>) => {
      const toExpand: string[] = [];
      let current = nextMap.get(folderId) ?? null;
      let safety = 0;
      while (current?.parentId) {
        toExpand.push(current.parentId);
        current = nextMap.get(current.parentId) ?? null;
        safety += 1;
        if (safety > 200) break;
      }
      setExpanded((prev) => {
        const next = new Set(prev);
        toExpand.forEach((id) => next.add(id));
        return next;
      });
    },
    []
  );

  const replaceUrlForFolder = React.useCallback(
    (folderId: string | null, map: Map<string, ResourceTreeNode>) => {
      const basePath = "/admin/resources";
      if (!folderId) {
        window.history.replaceState(null, "", basePath);
        return;
      }
      const parts: string[] = [];
      let current = map.get(folderId) ?? null;
      let safety = 0;
      while (current) {
        parts.push(current.slug);
        current = current.parentId ? map.get(current.parentId) ?? null : null;
        safety += 1;
        if (safety > 200) break;
      }
      const path = parts.reverse().join("/");
      window.history.replaceState(null, "", path ? `${basePath}/${path}` : basePath);
    },
    []
  );

  React.useEffect(() => {
    if (treeQuery.error) {
      const message =
        treeQuery.error instanceof Error
          ? treeQuery.error.message
          : "Failed to load resources";
      setError(message);
    }
  }, [treeQuery.error]);

  React.useEffect(() => {
    if (roots.length === 0) {
      setSelectedFolderId(null);
      return;
    }

    const nextMap = flattenFolders(roots);
    const fromRoute = findFolderIdBySlugPath(roots, initialFolderSegments);
    const preferred =
      (pendingSelectedFolderId && nextMap.has(pendingSelectedFolderId) && pendingSelectedFolderId) ||
      (selectedFolderId && nextMap.has(selectedFolderId) && selectedFolderId) ||
      (fromRoute && nextMap.has(fromRoute) && fromRoute) ||
      null;

    if (preferred !== selectedFolderId) {
      setSelectedFolderId(preferred);
    }
    if (preferred) {
      expandToFolder(preferred, nextMap);
      replaceUrlForFolder(preferred, nextMap);
    }
    if (pendingSelectedFolderId && preferred === pendingSelectedFolderId) {
      setPendingSelectedFolderId(null);
    }
  }, [
    roots,
    selectedFolderId,
    initialFolderSegments,
    expandToFolder,
    pendingSelectedFolderId,
    replaceUrlForFolder,
  ]);

  const createFolderMutation = useMutation({
    mutationFn: async ({
      name,
      parentId,
      description,
    }: {
      name: string;
      parentId?: string | null;
      description?: string | null;
    }) => {
      const headers = await getAuthHeaders();
      headers.set("content-type", "application/json");
      const res = await fetch("/api/resources/folders", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || null,
          parentId: parentId ?? null,
          scopeType: "global",
          schoolId: null,
        }),
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to create folder");
      }
      return body as { id: string };
    },
    onSuccess: (created) => {
      setError(null);
      if (created?.id) setPendingSelectedFolderId(created.id);
      void queryClient.invalidateQueries({ queryKey: ["admin-resources-tree"] });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to create folder");
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({
      folderId,
      name,
    }: {
      folderId: string;
      name: string;
    }) => {
      const headers = await getAuthHeaders();
      headers.set("content-type", "application/json");
      const res = await fetch(`/api/resources/folders/${folderId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to rename folder");
      }
      return body;
    },
    onSuccess: (_, vars) => {
      setError(null);
      setPendingSelectedFolderId(vars.folderId);
      void queryClient.invalidateQueries({ queryKey: ["admin-resources-tree"] });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to rename folder");
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/resources/folders/${folderId}`, {
        method: "DELETE",
        headers,
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to delete folder");
      }
      return body;
    },
    onSuccess: () => {
      setError(null);
      setSelectedFolderId(null);
      setPendingSelectedFolderId(null);
      replaceUrlForFolder(null, folderMap);
      void queryClient.invalidateQueries({ queryKey: ["admin-resources-tree"] });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to delete folder");
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({
      folderId,
      file,
    }: {
      folderId: string;
      file: File;
    }) => {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      formData.set("folderId", folderId);
      formData.set("file", file);
      const res = await fetch("/api/resources/files", {
        method: "POST",
        headers,
        body: formData,
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to upload file");
      }
      return body;
    },
    onSuccess: (_, vars) => {
      setError(null);
      setPendingSelectedFolderId(vars.folderId);
      void queryClient.invalidateQueries({ queryKey: ["admin-resources-tree"] });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to upload file");
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({
      fileId,
      displayName,
    }: {
      fileId: string;
      displayName: string;
    }) => {
      const headers = await getAuthHeaders();
      headers.set("content-type", "application/json");
      const res = await fetch(`/api/resources/files/${fileId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to rename file");
      }
      return body;
    },
    onSuccess: () => {
      setError(null);
      if (selectedFolderId) setPendingSelectedFolderId(selectedFolderId);
      void queryClient.invalidateQueries({ queryKey: ["admin-resources-tree"] });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to rename file");
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/resources/files/${fileId}`, {
        method: "DELETE",
        headers,
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to delete file");
      }
      return body;
    },
    onSuccess: () => {
      setError(null);
      if (selectedFolderId) setPendingSelectedFolderId(selectedFolderId);
      void queryClient.invalidateQueries({ queryKey: ["admin-resources-tree"] });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to delete file");
    },
  });

  const assignFileTopicMutation = useMutation({
    mutationFn: async ({ fileId, topicId }: { fileId: string; topicId: string }) => {
      const headers = await getAuthHeaders();
      headers.set("content-type", "application/json");
      const res = await fetch(`/api/resources/files/${fileId}/topics`, {
        method: "POST",
        headers,
        body: JSON.stringify({ topicId }),
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to map topic");
      }
      return body;
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to map topic");
    },
  });

  const removeFileTopicMutation = useMutation({
    mutationFn: async ({ fileId, topicId }: { fileId: string; topicId: string }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/resources/files/${fileId}/topics?topicId=${encodeURIComponent(topicId)}`,
        {
          method: "DELETE",
          headers,
        }
      );
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to unmap topic");
      }
      return body;
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to unmap topic");
    },
  });

  const anyMutationPending =
    createFolderMutation.isPending ||
    renameFolderMutation.isPending ||
    deleteFolderMutation.isPending ||
    uploadFileMutation.isPending ||
    renameFileMutation.isPending ||
    deleteFileMutation.isPending ||
    assignFileTopicMutation.isPending ||
    removeFileTopicMutation.isPending;
  const anyBusy = isBusy || anyMutationPending;
  const topicOptions = topicsQuery.data ?? [];
  const stageOptions = stagesQuery.data ?? [];
  const topicsByStage = React.useMemo(() => {
    const byStage = new Map<string, TopicSummary[]>();
    for (const topic of topicOptions) {
      const existing = byStage.get(topic.stageId) ?? [];
      existing.push(topic);
      byStage.set(topic.stageId, existing);
    }
    for (const topics of byStage.values()) {
      topics.sort((a, b) => a.title.localeCompare(b.title));
    }
    return byStage;
  }, [topicOptions]);
  const selectedStageTopics = React.useMemo(
    () => (selectedStageId ? topicsByStage.get(selectedStageId) ?? [] : []),
    [selectedStageId, topicsByStage]
  );
  const linkedTopicIds = React.useMemo(
    () => new Set(linkedTopics.map((topic) => topic.topicId)),
    [linkedTopics]
  );
  const isSelectedTopicLinked =
    selectedTopicId.length > 0 && linkedTopicIds.has(selectedTopicId);

  const createFolderWithName = React.useCallback(
    async (name: string, parentId?: string | null, description?: string | null) => {
      if (!canManage || !name.trim()) return;
      await createFolderMutation.mutateAsync({ name, parentId, description });
    },
    [canManage, createFolderMutation]
  );

  const renameFolderWithName = React.useCallback(
    async (folderId: string, currentName: string, nextName: string) => {
      if (!canManage) return;
      if (!nextName.trim() || nextName.trim() === currentName) return;
      await renameFolderMutation.mutateAsync({ folderId, name: nextName });
    },
    [canManage, renameFolderMutation]
  );

  const deleteFolderById = React.useCallback(
    async (folderId: string) => {
      if (!canManage) return;
      await deleteFolderMutation.mutateAsync(folderId);
    },
    [canManage, deleteFolderMutation]
  );

  const onUploadInputChanged = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !selectedFolderId) return;
      try {
        await uploadFileMutation.mutateAsync({ folderId: selectedFolderId, file });
      } finally {
        event.target.value = "";
      }
    },
    [selectedFolderId, uploadFileMutation]
  );

  const renameFileWithName = React.useCallback(
    async (fileId: string, currentName: string, nextName: string) => {
      if (!nextName?.trim() || nextName.trim() === currentName) return;
      await renameFileMutation.mutateAsync({ fileId, displayName: nextName });
    },
    [renameFileMutation]
  );

  const deleteFileById = React.useCallback(
    async (fileId: string) => {
      await deleteFileMutation.mutateAsync(fileId);
    },
    [deleteFileMutation]
  );

  const downloadFile = React.useCallback(async (file: ResourceTreeFile) => {
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/resources/files/${file.id}/download`, {
        headers,
      });
      const body = await res.json();
      if (!res.ok || body?.error || !body?.url) {
        throw new Error(body?.error || "Failed to fetch download URL");
      }
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to download file");
    }
  }, []);

  const loadLinkedTopics = React.useCallback(async (fileId: string) => {
    setIsLoadingLinkedTopics(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/resources/files/${fileId}/topics`, {
        headers,
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to load linked topics");
      }
      setLinkedTopics(Array.isArray(body) ? (body as FileTopicLink[]) : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load linked topics");
      setLinkedTopics([]);
    } finally {
      setIsLoadingLinkedTopics(false);
    }
  }, []);

  const openFileTopicDialog = React.useCallback(
    async (file: ResourceTreeFile) => {
      setFileTopicTarget({ id: file.id, name: file.displayName });
      if (stageOptions.length > 0) {
        setSelectedStageId(stageOptions[0].id);
      } else {
        setSelectedStageId(null);
      }
      setSelectedTopicId("");
      await loadLinkedTopics(file.id);
    },
    [loadLinkedTopics, stageOptions]
  );

  const assignSelectedTopic = React.useCallback(async () => {
    if (!fileTopicTarget || !selectedTopicId) return;
    if (linkedTopicIds.has(selectedTopicId)) return;
    await assignFileTopicMutation.mutateAsync({
      fileId: fileTopicTarget.id,
      topicId: selectedTopicId,
    });
    setError(null);
    setSelectedTopicId("");
    await loadLinkedTopics(fileTopicTarget.id);
  }, [
    assignFileTopicMutation,
    fileTopicTarget,
    linkedTopicIds,
    loadLinkedTopics,
    selectedTopicId,
  ]);

  const unlinkTopic = React.useCallback(
    async (topicId: string) => {
      if (!fileTopicTarget) return;
      await removeFileTopicMutation.mutateAsync({
        fileId: fileTopicTarget.id,
        topicId,
      });
      setError(null);
      await loadLinkedTopics(fileTopicTarget.id);
    },
    [fileTopicTarget, loadLinkedTopics, removeFileTopicMutation]
  );

  React.useEffect(() => {
    if (!fileTopicTarget) return;
    if (selectedStageId) return;
    if (stageOptions.length === 0) return;
    setSelectedStageId(stageOptions[0].id);
  }, [fileTopicTarget, selectedStageId, stageOptions]);

  const openCreateSubfolderDialog = React.useCallback((parentId: string) => {
    setCreateSubfolderParentId(parentId);
    setNewSubfolderName("");
    setIsCreateSubfolderOpen(true);
  }, []);

  const renderCreateFolderOutline = React.useCallback(
    (
      onClick: () => void,
      label: string,
      depth: number,
      disabled = false
    ): React.ReactNode => (
      <button
        type="button"
        className="w-full rounded-md border border-dashed border-muted-foreground/40 px-2 py-2 text-left text-xs text-muted-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ marginLeft: depth * 14 }}
        onClick={onClick}
        disabled={disabled}
      >
        <span className="inline-flex items-center gap-2">
          <Plus className="h-3.5 w-3.5" />
          {label}
        </span>
      </button>
    ),
    []
  );

  const renderFolderNode = (node: ResourceTreeNode, depth = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center gap-1 rounded-md px-2 py-1 ${isSelected ? "bg-accent" : "hover:bg-muted"}`}
          style={{ marginLeft: depth * 14 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!hasChildren}
            onClick={() =>
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
              })
            }
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          </Button>

          <button
            type="button"
            className="flex flex-1 items-center gap-2 text-left text-sm"
            onClick={() => {
              setSelectedFolderId(node.id);
              expandToFolder(node.id, folderMap);
              replaceUrlForFolder(node.id, folderMap);
            }}
          >
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-amber-600" />
            ) : (
              <Folder className="h-4 w-4 text-amber-600" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
        </div>
        {isExpanded ? (
          <div className="space-y-1">
            {canManage
              ? renderCreateFolderOutline(
                  () => openCreateSubfolderDialog(node.id),
                  "New folder",
                  depth + 1,
                  anyBusy
                )
              : null}
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Resources</h1>
        <p className="text-muted-foreground mt-2">
          Manage global resource folders and files using clean slug-based URLs.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {canManage ? "Manager mode" : "Read-only mode"}
            </Badge>
            <Badge variant="outline">Global resources</Badge>
          </div>

          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={anyBusy}
                onClick={() => setIsCreateRootOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Root Folder
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={anyBusy || !selectedFolder}
                onClick={() => openCreateSubfolderDialog(selectedFolder.id)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Subfolder
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={anyBusy || !selectedFolder}
                onClick={() => uploadInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                onChange={onUploadInputChanged}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h2 className="font-semibold">Folders</h2>
                {isLoadingTree ? (
                  <p className="text-sm text-muted-foreground">Loading folders...</p>
                ) : roots.length === 0 ? (
                  <div className="space-y-2">
                    {canManage
                      ? renderCreateFolderOutline(
                          () => setIsCreateRootOpen(true),
                          "New folder",
                          0,
                          anyBusy
                        )
                      : null}
                    <p className="text-sm text-muted-foreground">No folders yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {canManage
                      ? renderCreateFolderOutline(
                          () => setIsCreateRootOpen(true),
                          "New folder",
                          0,
                          anyBusy
                        )
                      : null}
                    {roots.map((node) => renderFolderNode(node))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">Files</h2>
                    {breadcrumbs.length > 0 ? (
                      <p className="text-xs text-muted-foreground truncate">
                        /{folderPathSegments.join("/")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Select a folder to view files
                      </p>
                    )}
                  </div>
                  {canManage && selectedFolder ? (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Rename folder"
                        onClick={() =>
                          setFolderRenameTarget({
                            id: selectedFolder.id,
                            currentName: selectedFolder.name,
                            nextName: selectedFolder.name,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete folder"
                        onClick={() =>
                          setFolderDeleteTarget({
                            id: selectedFolder.id,
                            name: selectedFolder.name,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {!selectedFolder ? (
                  <p className="text-sm text-muted-foreground">
                    Choose a folder from the left to browse files.
                  </p>
                ) : selectedFolder.files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No files in this folder.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedFolder.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{file.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.sizeBytes)}
                            {file.mimeType ? ` • ${file.mimeType}` : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download file"
                          onClick={() => downloadFile(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canManage ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Map file to topic"
                              onClick={() => void openFileTopicDialog(file)}
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Rename file"
                              onClick={() =>
                                setFileRenameTarget({
                                  id: file.id,
                                  currentName: file.displayName,
                                  nextName: file.displayName,
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete file"
                              onClick={() =>
                                setFileDeleteTarget({
                                  id: file.id,
                                  name: file.displayName,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isCreateRootOpen}
        onOpenChange={(open) => {
          setIsCreateRootOpen(open);
          if (!open) {
            setNewRootFolderName("");
            setNewRootFolderDescription("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create root folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new top-level folder.
            </DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            placeholder="e.g. policy-documents"
            value={newRootFolderName}
            onChange={(event) => setNewRootFolderName(event.target.value)}
            onKeyDown={async (event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const name = newRootFolderName.trim();
              if (!name || anyBusy) return;
              await createFolderWithName(name, null, newRootFolderDescription);
              setIsCreateRootOpen(false);
              setNewRootFolderName("");
              setNewRootFolderDescription("");
            }}
          />

          <Input
            placeholder="Optional description for the resources card"
            value={newRootFolderDescription}
            onChange={(event) => setNewRootFolderDescription(event.target.value)}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateRootOpen(false);
                setNewRootFolderName("");
                setNewRootFolderDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={anyBusy || !newRootFolderName.trim()}
              onClick={async () => {
                const name = newRootFolderName.trim();
                if (!name) return;
                await createFolderWithName(name, null, newRootFolderDescription);
                setIsCreateRootOpen(false);
                setNewRootFolderName("");
                setNewRootFolderDescription("");
              }}
            >
              Create folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateSubfolderOpen}
        onOpenChange={(open) => {
          setIsCreateSubfolderOpen(open);
          if (!open) {
            setNewSubfolderName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create subfolder</DialogTitle>
            <DialogDescription>
              Enter a name for a folder inside the selected parent folder.
            </DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            placeholder="e.g. term-1"
            value={newSubfolderName}
            onChange={(event) => setNewSubfolderName(event.target.value)}
            onKeyDown={async (event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const name = newSubfolderName.trim();
              if (!name || anyBusy || !createSubfolderParentId) return;
              await createFolderWithName(name, createSubfolderParentId);
              setIsCreateSubfolderOpen(false);
              setCreateSubfolderParentId(null);
              setNewSubfolderName("");
            }}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateSubfolderOpen(false);
                setCreateSubfolderParentId(null);
                setNewSubfolderName("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={anyBusy || !newSubfolderName.trim() || !createSubfolderParentId}
              onClick={async () => {
                const name = newSubfolderName.trim();
                if (!name || !createSubfolderParentId) return;
                await createFolderWithName(name, createSubfolderParentId);
                setIsCreateSubfolderOpen(false);
                setCreateSubfolderParentId(null);
                setNewSubfolderName("");
              }}
            >
              Create folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(folderRenameTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setFolderRenameTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
            <DialogDescription>
              Update the folder name. URL slug will be regenerated automatically.
            </DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            value={folderRenameTarget?.nextName ?? ""}
            onChange={(event) =>
              setFolderRenameTarget((prev) =>
                prev ? { ...prev, nextName: event.target.value } : prev
              )
            }
            onKeyDown={async (event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (!folderRenameTarget || anyBusy) return;
              await renameFolderWithName(
                folderRenameTarget.id,
                folderRenameTarget.currentName,
                folderRenameTarget.nextName
              );
              setFolderRenameTarget(null);
            }}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={anyBusy || !folderRenameTarget?.nextName.trim()}
              onClick={async () => {
                if (!folderRenameTarget) return;
                await renameFolderWithName(
                  folderRenameTarget.id,
                  folderRenameTarget.currentName,
                  folderRenameTarget.nextName
                );
                setFolderRenameTarget(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(fileRenameTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setFileRenameTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Update the display name for this file.</DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            value={fileRenameTarget?.nextName ?? ""}
            onChange={(event) =>
              setFileRenameTarget((prev) =>
                prev ? { ...prev, nextName: event.target.value } : prev
              )
            }
            onKeyDown={async (event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (!fileRenameTarget || anyBusy) return;
              await renameFileWithName(
                fileRenameTarget.id,
                fileRenameTarget.currentName,
                fileRenameTarget.nextName
              );
              setFileRenameTarget(null);
            }}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setFileRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={anyBusy || !fileRenameTarget?.nextName.trim()}
              onClick={async () => {
                if (!fileRenameTarget) return;
                await renameFileWithName(
                  fileRenameTarget.id,
                  fileRenameTarget.currentName,
                  fileRenameTarget.nextName
                );
                setFileRenameTarget(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(fileTopicTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setFileTopicTarget(null);
            setSelectedStageId(null);
            setSelectedTopicId("");
            setLinkedTopics([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Map file to lesson topics</DialogTitle>
            <DialogDescription>
              {fileTopicTarget
                ? `Select a curriculum stage, choose a topic, then save to map "${fileTopicTarget.name}" for lesson preparation.`
                : "Select a curriculum stage and topic to map this file."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
            <div className="space-y-2 overflow-y-auto rounded-md border p-2">
              <p className="px-2 text-xs font-medium text-muted-foreground">
                Curriculum stages
              </p>
              {stagesQuery.isLoading ? (
                <p className="px-2 py-1 text-sm text-muted-foreground">Loading stages...</p>
              ) : stageOptions.length === 0 ? (
                <p className="px-2 py-1 text-sm text-muted-foreground">No stages found.</p>
              ) : (
                stageOptions.map((stage) => {
                  const isSelected = selectedStageId === stage.id;
                  const count = topicsByStage.get(stage.id)?.length ?? 0;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => {
                        setSelectedStageId(stage.id);
                        setSelectedTopicId("");
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors ${
                        isSelected ? "bg-accent" : "hover:bg-muted"
                      }`}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        {isSelected ? (
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Folder className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="truncate">{stage.name}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{count}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${
                            isSelected ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="space-y-3 overflow-y-auto rounded-md border p-3">
              <div>
                <h4 className="font-medium">Topics</h4>
                <p className="text-xs text-muted-foreground">
                  Select one topic for this mapping.
                </p>
              </div>

              {topicsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading topics...</p>
              ) : !selectedStageId ? (
                <p className="text-sm text-muted-foreground">
                  Select a curriculum stage to view topics.
                </p>
              ) : selectedStageTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No topics in this stage yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedStageTopics.map((topic) => {
                    const isActive = selectedTopicId === topic.id;
                    const isAlreadyMapped = linkedTopicIds.has(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedTopicId(topic.id)}
                        className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          isActive ? "border-primary bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate font-medium">{topic.title}</span>
                          {isAlreadyMapped ? (
                            <span className="text-xs text-muted-foreground">Mapped</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">Mapped topics</p>
            {isLoadingLinkedTopics ? (
              <p className="text-sm text-muted-foreground">Loading mapped topics...</p>
            ) : linkedTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mapped topics yet.</p>
            ) : (
              <div className="space-y-2">
                {linkedTopics.map((topic) => (
                  <div
                    key={topic.topicId}
                    className="flex items-center justify-between rounded-md border px-2 py-1"
                  >
                    <span className="truncate text-sm">{topic.topicTitle}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Unmap topic"
                      disabled={anyBusy}
                      onClick={() => void unlinkTopic(topic.topicId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              disabled={!selectedTopicId || isSelectedTopicLinked || anyBusy}
              onClick={() => void assignSelectedTopic()}
            >
              Save mapping
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFileTopicTarget(null);
                setSelectedStageId(null);
                setSelectedTopicId("");
                setLinkedTopics([]);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(folderDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setFolderDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              {folderDeleteTarget
                ? `Delete "${folderDeleteTarget.name}" and all nested folders/files? This action cannot be undone.`
                : "Delete this folder and its nested contents?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={anyBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={anyBusy}
              onClick={(event) => {
                event.preventDefault();
                if (!folderDeleteTarget) return;
                void deleteFolderById(folderDeleteTarget.id).finally(() =>
                  setFolderDeleteTarget(null)
                );
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(fileDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setFileDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              {fileDeleteTarget
                ? `Delete "${fileDeleteTarget.name}"? This action cannot be undone.`
                : "Delete this file?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={anyBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={anyBusy}
              onClick={(event) => {
                event.preventDefault();
                if (!fileDeleteTarget) return;
                void deleteFileById(fileDeleteTarget.id).finally(() =>
                  setFileDeleteTarget(null)
                );
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
