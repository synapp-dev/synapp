"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  FileText,
  ArrowLeft,
  Folder,
  FolderOpen,
  ChevronRight,
  Upload,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { getAuthHeaders } from "@/lib/api/fetcher.client";
import { useSchoolStore } from "@/stores/school-store";

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

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

function findFolderIdBySlugPath(
  roots: ResourceTreeNode[],
  segments: string[]
): string | null {
  if (segments.length === 0) return null;
  let currentLevel = roots;
  let currentNode: ResourceTreeNode | null = null;
  for (const segment of segments) {
    const next = currentLevel.find((node) => node.slug === segment) ?? null;
    if (!next) return null;
    currentNode = next;
    currentLevel = next.children;
  }
  return currentNode?.id ?? null;
}

function ensureExpandedForPath(
  targetFolderId: string,
  folderMap: Map<string, ResourceTreeNode>,
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  const toExpand: string[] = [];
  let current = folderMap.get(targetFolderId) ?? null;
  let safety = 0;
  while (current?.parentId) {
    toExpand.push(current.parentId);
    current = folderMap.get(current.parentId) ?? null;
    safety += 1;
    if (safety > 200) break;
  }
  if (toExpand.length > 0) {
    setExpanded((prev) => {
      const next = new Set(prev);
      toExpand.forEach((id) => next.add(id));
      return next;
    });
  }
}

export function ResourceBrowserClient({
  schoolSlug,
  initialFolderSegments,
}: {
  schoolSlug: string;
  initialFolderSegments: string[];
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const schoolUuid = currentSchool?.id ?? "";
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [pendingSelectedFolderId, setPendingSelectedFolderId] = React.useState<
    string | null
  >(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);

  const treeQuery = useQuery({
    queryKey: ["school-resources-tree", schoolUuid],
    enabled: Boolean(schoolUuid),
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/resources/tree?schoolId=${encodeURIComponent(schoolUuid)}`,
        {
          headers,
          cache: "no-store",
        }
      );
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to load resources");
      }
      return body as TreeResponse;
    },
  });

  const canManage = Boolean(treeQuery.data?.canManage);
  const roots = treeQuery.data?.roots ?? [];
  const isLoadingTree = treeQuery.isLoading;

  const folderMap = React.useMemo(() => flattenFolders(roots), [roots]);
  const selectedFolder = selectedFolderId ? folderMap.get(selectedFolderId) ?? null : null;

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

  const anyBusy =
    treeQuery.isFetching ||
    false;

  const replaceUrlForFolder = React.useCallback(
    (folderId: string | null, map: Map<string, ResourceTreeNode>) => {
      const basePath = `/schools/${schoolSlug}/resources`;
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
    [schoolSlug]
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
    const desiredId =
      (pendingSelectedFolderId &&
        nextMap.has(pendingSelectedFolderId) &&
        pendingSelectedFolderId) ||
      (selectedFolderId && nextMap.has(selectedFolderId) && selectedFolderId) ||
      (fromRoute && nextMap.has(fromRoute) && fromRoute) ||
      null;

    if (desiredId !== selectedFolderId) {
      setSelectedFolderId(desiredId);
    }
    if (desiredId) {
      ensureExpandedForPath(desiredId, nextMap, setExpanded);
      replaceUrlForFolder(desiredId, nextMap);
    }
    if (pendingSelectedFolderId && desiredId === pendingSelectedFolderId) {
      setPendingSelectedFolderId(null);
    }
  }, [
    roots,
    selectedFolderId,
    initialFolderSegments,
    pendingSelectedFolderId,
    replaceUrlForFolder,
  ]);

  const createFolderMutation = useMutation({
    mutationFn: async ({
      scopeType,
      parentId,
      name,
    }: {
      scopeType: "global" | "school";
      parentId?: string | null;
      name: string;
    }) => {
      const headers = await getAuthHeaders();
      headers.set("content-type", "application/json");
      const res = await fetch("/api/resources/folders", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          parentId: parentId ?? null,
          scopeType,
          schoolId: scopeType === "school" ? schoolUuid : null,
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
      void queryClient.invalidateQueries({
        queryKey: ["school-resources-tree", schoolUuid],
      });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to create folder");
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, name }: { folderId: string; name: string }) => {
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
      void queryClient.invalidateQueries({
        queryKey: ["school-resources-tree", schoolUuid],
      });
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
      void queryClient.invalidateQueries({
        queryKey: ["school-resources-tree", schoolUuid],
      });
      replaceUrlForFolder(null, folderMap);
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to delete folder");
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ folderId, file }: { folderId: string; file: File }) => {
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
      void queryClient.invalidateQueries({
        queryKey: ["school-resources-tree", schoolUuid],
      });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to upload file");
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, displayName }: { fileId: string; displayName: string }) => {
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
      void queryClient.invalidateQueries({
        queryKey: ["school-resources-tree", schoolUuid],
      });
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
      void queryClient.invalidateQueries({
        queryKey: ["school-resources-tree", schoolUuid],
      });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to delete file");
    },
  });

  const createFolder = React.useCallback(
    async (scopeType: "global" | "school", parentId?: string | null) => {
      if (!canManage || !schoolUuid) return;
      const name = window.prompt("Folder name");
      if (!name?.trim()) return;
      await createFolderMutation.mutateAsync({
        scopeType,
        parentId: parentId ?? null,
        name: name.trim(),
      });
    },
    [canManage, schoolUuid, createFolderMutation]
  );

  const renameFolder = React.useCallback(
    async (folderId: string, currentName: string) => {
      if (!canManage) return;
      const name = window.prompt("Rename folder", currentName);
      if (!name?.trim() || name.trim() === currentName) return;
      await renameFolderMutation.mutateAsync({ folderId, name: name.trim() });
    },
    [canManage, renameFolderMutation]
  );

  const deleteFolder = React.useCallback(
    async (folderId: string, folderName: string) => {
      if (!canManage) return;
      const confirmed = window.confirm(
        `Delete folder "${folderName}" and all nested folders/files?`
      );
      if (!confirmed) return;
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

  const renameFile = React.useCallback(
    async (file: ResourceTreeFile) => {
      if (!canManage) return;
      const displayName = window.prompt("Rename file", file.displayName);
      if (!displayName?.trim() || displayName.trim() === file.displayName) return;
      await renameFileMutation.mutateAsync({
        fileId: file.id,
        displayName: displayName.trim(),
      });
    },
    [canManage, renameFileMutation]
  );

  const deleteFile = React.useCallback(
    async (file: ResourceTreeFile) => {
      if (!canManage) return;
      const confirmed = window.confirm(`Delete file "${file.displayName}"?`);
      if (!confirmed) return;
      await deleteFileMutation.mutateAsync(file.id);
    },
    [canManage, deleteFileMutation]
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
              ensureExpandedForPath(node.id, folderMap, setExpanded);
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
        {isExpanded && node.children.length > 0 ? (
          <div>{node.children.map((child) => renderFolderNode(child, depth + 1))}</div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/schools/${schoolSlug}/resources`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            {selectedFolder?.name ?? "Resources"}
          </h1>
        </div>
        <p className="text-muted-foreground pl-14">
          {selectedFolder?.description?.trim() ||
            "Browse folders and resource files for your school."}
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={anyBusy}
            onClick={() => createFolder("global", null)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Global Folder
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={anyBusy || !schoolUuid}
            onClick={() => createFolder("school", null)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New School Folder
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={anyBusy || !selectedFolder}
            onClick={() =>
              selectedFolder
                ? createFolder(selectedFolder.scopeType, selectedFolder.id)
                : undefined
            }
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
        <div className="space-y-3">
          <h2 className="font-semibold">Folders</h2>
          {isLoadingTree ? (
            <p className="text-sm text-muted-foreground">Loading folders...</p>
          ) : roots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No folders yet.</p>
          ) : (
            <div className="space-y-1">{roots.map((node) => renderFolderNode(node))}</div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Files</h2>
              {breadcrumbs.length > 0 ? (
                <p className="text-xs text-muted-foreground truncate">
                  {breadcrumbs.map((item) => item.name).join(" / ")}
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
                  onClick={() => renameFolder(selectedFolder.id, selectedFolder.name)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete folder"
                  onClick={() => deleteFolder(selectedFolder.id, selectedFolder.name)}
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>Name</TableHead>
                    <TableHead className="w-28">Size</TableHead>
                    <TableHead className="w-40">Type</TableHead>
                    {canManage ? <TableHead className="w-24 text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedFolder.files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="max-w-0">
                        <button
                          type="button"
                          className="truncate text-left text-sm font-medium text-blue-600 hover:underline"
                          onClick={() => downloadFile(file)}
                        >
                          {file.displayName}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatFileSize(file.sizeBytes)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {file.mimeType || "Unknown"}
                      </TableCell>
                      {canManage ? (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Rename file"
                              onClick={() => renameFile(file)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete file"
                              onClick={() => deleteFile(file)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
