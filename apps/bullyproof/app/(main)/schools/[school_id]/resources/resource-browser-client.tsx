"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  FileText,
  Folder,
  FolderOpen,
  FolderOutput,
  ChevronRight,
  Download,
  Search,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Separator } from "@workspace/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { getAuthHeaders } from "@/lib/api/fetcher.client";
import { useSchoolStore } from "@/stores/school-store";
import { generateResourcesFolderTabTitle } from "@/utils/metadata";

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

/** Subsequence fuzzy match (query chars appear in order within haystack). */
function fuzzyMatch(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const h = haystack.toLowerCase();
  let qi = 0;
  for (let i = 0; i < h.length && qi < q.length; i++) {
    if (h[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

/** Matching files in subtree (this folder’s files + all descendants’ files). */
function computeSubtreeMatchCounts(
  roots: ResourceTreeNode[],
  query: string
): Map<string, number> {
  const map = new Map<string, number>();
  const q = query.trim();
  if (!q) return map;

  const walk = (n: ResourceTreeNode): number => {
    let count = 0;
    for (const f of n.files) {
      if (fuzzyMatch(f.displayName, q)) count++;
    }
    for (const c of n.children) {
      count += walk(c);
    }
    map.set(n.id, count);
    return count;
  };
  for (const r of roots) walk(r);
  return map;
}

function folderDepthFromRoot(
  folderId: string,
  folderMap: Map<string, ResourceTreeNode>
): number {
  let depth = 0;
  let cur = folderMap.get(folderId) ?? null;
  let safety = 0;
  while (cur?.parentId) {
    depth++;
    cur = folderMap.get(cur.parentId) ?? null;
    safety++;
    if (safety > 200) break;
  }
  return depth;
}

/** Folder with the highest match count; ties → deepest (most specific). */
function pickBestFolderId(
  counts: Map<string, number>,
  folderMap: Map<string, ResourceTreeNode>
): string | null {
  let best: string | null = null;
  let bestCount = 0;
  let bestDepth = -1;
  for (const [id, c] of counts) {
    if (c <= 0) continue;
    const depth = folderDepthFromRoot(id, folderMap);
    if (c > bestCount || (c === bestCount && depth > bestDepth)) {
      bestCount = c;
      bestDepth = depth;
      best = id;
    }
  }
  return best;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

const FORMAT_ACTION_SELECTOR = "[data-format-action]";

function isFormatActionTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && Boolean(target.closest(FORMAT_ACTION_SELECTOR))
  );
}

function inferExtFromMime(mimeType: string | null): string {
  if (!mimeType?.trim()) return "";
  const key = mimeType.trim().toLowerCase();
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.ms-excel.sheet.macroenabled.12": "xlsm",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow": "ppsx",
    "text/plain": "txt",
    "text/csv": "csv",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/zip": "zip",
    "application/json": "json",
  };
  return map[key] ?? "";
}

/** Base name (display) and lowercase extension for grouping; ext may be "" if unknown. */
function parseFileNameParts(
  displayName: string,
  mimeType: string | null
): { base: string; ext: string } {
  const trimmed = displayName.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot > 0 && lastDot < trimmed.length - 1) {
    return {
      base: trimmed.slice(0, lastDot),
      ext: trimmed.slice(lastDot + 1).toLowerCase(),
    };
  }
  return { base: trimmed, ext: inferExtFromMime(mimeType) };
}

function compareExt(a: string, b: string): number {
  const pri = ["pdf", "docx", "doc", "xlsx", "xls", "xlsm", "pptx", "ppt", "ppsx"];
  const ia = pri.indexOf(a);
  const ib = pri.indexOf(b);
  const ra = ia === -1 ? pri.length : ia;
  const rb = ib === -1 ? pri.length : ib;
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b);
}

function extShortLabel(ext: string): string {
  if (!ext) return "FILE";
  return ext.length <= 5 ? ext.toUpperCase() : ext.toUpperCase().slice(0, 5);
}

type FileRowModel =
  | { kind: "single"; file: ResourceTreeFile }
  | { kind: "group"; baseDisplay: string; variants: ResourceTreeFile[] };

function groupFolderFiles(files: ResourceTreeFile[]): FileRowModel[] {
  const parsed = files.map((file) => {
    const { base, ext } = parseFileNameParts(file.displayName, file.mimeType);
    return { file, base, ext };
  });

  const baseKeyTo = new Map<
    string,
    { baseDisplay: string; entries: (typeof parsed)[number][] }
  >();
  for (const p of parsed) {
    const key = p.base.trim().toLowerCase();
    const existing = baseKeyTo.get(key);
    if (!existing) {
      baseKeyTo.set(key, { baseDisplay: p.base, entries: [p] });
    } else {
      existing.entries.push(p);
    }
  }

  const seen = new Set<string>();
  const result: FileRowModel[] = [];

  for (const p of parsed) {
    const key = p.base.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const g = baseKeyTo.get(key)!;
    if (g.entries.length === 1) {
      result.push({ kind: "single", file: g.entries[0].file });
      continue;
    }

    const exts = g.entries.map((e) => e.ext);
    const distinct = new Set(exts);
    if (distinct.size !== exts.length) {
      for (const e of g.entries) {
        result.push({ kind: "single", file: e.file });
      }
      continue;
    }

    const sorted = [...g.entries].sort((a, b) => compareExt(a.ext, b.ext));
    result.push({
      kind: "group",
      baseDisplay: g.baseDisplay,
      variants: sorted.map((e) => e.file),
    });
  }

  return result;
}

/** Second line for consolidated rows: upload icon + date(s). */
function GroupUploadedMeta({ variants }: { variants: ResourceTreeFile[] }) {
  const parts = variants.map((f) => {
    const { ext } = parseFileNameParts(f.displayName, f.mimeType);
    return {
      label: extShortLabel(ext),
      date: formatUploadedAt(f.createdAt),
    };
  });
  const dates = new Set(parts.map((p) => p.date).filter(Boolean));
  const text =
    dates.size <= 1
      ? parts[0]?.date ?? ""
      : parts
          .filter((p) => p.date)
          .map((p) => `${p.label} · ${p.date}`)
          .join(" · ");

  if (!text) return null;

  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Upload className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0">{text}</span>
    </p>
  );
}

function ResourceFormatDownloadButton({
  file,
  onPick,
  className,
  wrapperClassName,
  variant = "row",
}: {
  file: ResourceTreeFile;
  onPick: (f: ResourceTreeFile) => void;
  className?: string;
  wrapperClassName?: string;
  variant?: "row" | "dialog";
}) {
  const { ext } = parseFileNameParts(file.displayName, file.mimeType);
  const isPdf = ext === "pdf";
  const isDocx = ext === "docx";
  const rowLabel = isPdf ? "PDF" : isDocx ? "DOCX" : extShortLabel(ext);
  const dialogLabel = isPdf
    ? "Download PDF"
    : isDocx
      ? "Download DOCX"
      : `Download ${extShortLabel(ext)}`;
  const tooltipLabel = isPdf ? "PDF" : isDocx ? "DOCX" : extShortLabel(ext);
  const tooltipText = `Download ${tooltipLabel} (${formatFileSize(file.sizeBytes)})`;

  const icon =
    isPdf ? (
      <Image
        src="/images/pdf-icon.png"
        alt=""
        width={18}
        height={18}
        className="h-[18px] w-[18px] object-contain"
      />
    ) : isDocx ? (
      <Image
        src="/images/docx-icon.png"
        alt=""
        width={18}
        height={18}
        className="h-[18px] w-[18px] object-contain"
      />
    ) : (
      <FileText className="h-[18px] w-[18px] shrink-0 text-blue-600 dark:text-blue-400" />
    );

  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "group gap-2 text-blue-600 underline-offset-2 transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:text-blue-600 dark:text-blue-400 dark:hover:bg-blue-950/25 dark:hover:text-blue-400 dark:focus-visible:text-blue-400",
        variant === "dialog" &&
          "h-auto min-h-10 w-full justify-between gap-3 py-2.5 text-left",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onPick(file);
      }}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        {icon}
        <span
          className={cn(
            "underline-offset-2 group-hover:underline",
            variant === "dialog" ? "truncate" : "whitespace-nowrap"
          )}
        >
          {variant === "dialog" ? dialogLabel : rowLabel}
        </span>
      </span>
      {variant === "dialog" ? (
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground hover:text-muted-foreground">
          {formatFileSize(file.sizeBytes)}
        </span>
      ) : null}
    </Button>
  );

  if (variant === "dialog") {
    return (
      <span
        data-format-action=""
        className={cn("inline-flex w-full shrink-0", wrapperClassName)}
      >
        {button}
      </span>
    );
  }

  return (
    <span
      data-format-action=""
      className={cn("inline-flex shrink-0", wrapperClassName)}
    >
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top">{tooltipText}</TooltipContent>
      </Tooltip>
    </span>
  );
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

function folderSlugSegmentsFromId(
  folderId: string,
  map: Map<string, ResourceTreeNode>
): string[] {
  const parts: string[] = [];
  let current = map.get(folderId) ?? null;
  let safety = 0;
  while (current) {
    parts.push(current.slug);
    current = current.parentId ? map.get(current.parentId) ?? null : null;
    safety += 1;
    if (safety > 200) break;
  }
  return parts.reverse();
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
  const target = folderMap.get(targetFolderId) ?? null;
  if (target && target.children.length > 0) {
    toExpand.push(targetFolderId);
  }
  let current: ResourceTreeNode | null = target;
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
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const schoolUuid = currentSchool?.id ?? "";
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [pendingSelectedFolderId, setPendingSelectedFolderId] = React.useState<
    string | null
  >(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const defaultExpandInitSchoolRef = React.useRef<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = React.useState("");

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
  const folderMatchCounts = React.useMemo(
    () => computeSubtreeMatchCounts(roots, fileSearchQuery),
    [roots, fileSearchQuery]
  );
  const selectedFolder = selectedFolderId ? folderMap.get(selectedFolderId) ?? null : null;

  React.useEffect(() => {
    defaultExpandInitSchoolRef.current = null;
  }, [schoolUuid]);

  React.useEffect(() => {
    if (!schoolUuid || roots.length === 0) return;
    if (defaultExpandInitSchoolRef.current === schoolUuid) return;
    defaultExpandInitSchoolRef.current = schoolUuid;

    const nextMap = flattenFolders(roots);
    const withChildrenIds: string[] = [];
    for (const [, node] of nextMap) {
      if (node.children.length > 0) withChildrenIds.push(node.id);
    }
    if (withChildrenIds.length === 0) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of withChildrenIds) next.add(id);
      return next;
    });
  }, [schoolUuid, roots]);

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

  const replaceUrlForFolder = React.useCallback(
    (folderId: string | null, map: Map<string, ResourceTreeNode>) => {
      const basePath = `/schools/${schoolSlug}/resources`;
      if (!folderId) {
        window.history.replaceState(null, "", basePath);
        return;
      }
      const path = folderSlugSegmentsFromId(folderId, map).join("/");
      window.history.replaceState(null, "", path ? `${basePath}/${path}` : basePath);
    },
    [schoolSlug]
  );

  React.useEffect(() => {
    if (!selectedFolderId || folderMap.size === 0) {
      document.title = generateResourcesFolderTabTitle([]);
      return;
    }
    const segments = folderSlugSegmentsFromId(selectedFolderId, folderMap);
    document.title = generateResourcesFolderTabTitle(segments);
  }, [selectedFolderId, folderMap]);

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

  React.useEffect(() => {
    const q = fileSearchQuery.trim();
    if (!q || roots.length === 0) return;
    const best = pickBestFolderId(folderMatchCounts, folderMap);
    if (!best) return;
    setPendingSelectedFolderId(best);
    ensureExpandedForPath(best, folderMap, setExpanded);
  }, [fileSearchQuery, roots, folderMatchCounts, folderMap]);

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

  const [formatDialog, setFormatDialog] = React.useState<{
    baseDisplay: string;
    variants: ResourceTreeFile[];
  } | null>(null);

  const fileRows = React.useMemo((): FileRowModel[] => {
    if (!selectedFolder?.files.length) return [];
    const q = fileSearchQuery.trim();
    const files = q
      ? selectedFolder.files.filter((f) => fuzzyMatch(f.displayName, q))
      : selectedFolder.files;
    return groupFolderFiles(files);
  }, [selectedFolder?.files, fileSearchQuery]);

  const resourceListRowClassName =
    "group flex cursor-pointer flex-wrap items-center gap-2 rounded-md border p-2 text-left transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-blue-950/25";

  const emptyFilesInFolderRowClassName =
    "flex min-w-0 items-center rounded-md border-2 border-dotted border-muted-foreground/35 bg-muted/15 p-2 text-sm text-muted-foreground dark:border-muted-foreground/45 dark:bg-muted/25";

  const renderFolderNode = (node: ResourceTreeNode, depth = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children.length > 0;
    const searchActive = Boolean(fileSearchQuery.trim());
    const matchCount = folderMatchCounts.get(node.id) ?? 0;
    const rowDisabled = searchActive && matchCount === 0;

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={cn(
            "flex min-w-0 items-center gap-1 rounded-md px-2 py-1",
            rowDisabled
              ? "opacity-50"
              : isSelected
                ? "bg-accent"
                : "hover:bg-muted"
          )}
          style={{ marginLeft: depth * 14 }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              disabled={rowDisabled}
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
          ) : (
            <span className="h-6 w-6 shrink-0" aria-hidden />
          )}

          <button
            type="button"
            disabled={rowDisabled}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 text-left text-sm",
              rowDisabled && "cursor-not-allowed"
            )}
            onClick={() => {
              if (rowDisabled) return;
              setSelectedFolderId(node.id);
              ensureExpandedForPath(node.id, folderMap, setExpanded);
              replaceUrlForFolder(node.id, folderMap);
            }}
          >
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-amber-600" />
            )}
            <span className="min-w-0 truncate">{node.name}</span>
          </button>

          {searchActive && matchCount > 0 ? (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {matchCount}
            </span>
          ) : null}
        </div>
        {isExpanded && node.children.length > 0 ? (
          <div>{node.children.map((child) => renderFolderNode(child, depth + 1))}</div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="flex min-w-0 items-center gap-2 text-3xl font-bold">
            <FileText className="h-7 w-7 shrink-0" />
            <span className="truncate">{selectedFolder?.name ?? "Resources"}</span>
          </h1>
          {canManage ? (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link
                href="/admin/resources"
                className="inline-flex items-center gap-2"
              >
                <Shield className="h-4 w-4" aria-hidden />
                Manage Resources
              </Link>
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground">
          {selectedFolder?.description?.trim() ||
            "Browse folders and resource files for your school."}
        </p>
        <div className="py-2">
          <Separator />
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        {!isLoadingTree && roots.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 lg:col-span-2">
            <div className="relative w-full min-w-0 lg:w-1/2">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="text"
                role="searchbox"
                inputMode="search"
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                placeholder="Search files…"
                className={cn(
                  "h-9 pl-9",
                  fileSearchQuery.trim() ? "pr-9" : ""
                )}
                aria-label="Search files"
              />
              {fileSearchQuery ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                  onClick={() => setFileSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
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

          {!selectedFolder ? (
            <p className="text-sm text-muted-foreground">
              Choose a folder from the left to browse files.
            </p>
          ) : (() => {
            const searchActive = Boolean(fileSearchQuery.trim());
            const hasSubfolders = selectedFolder.children.length > 0;
            const hasAnyFiles = selectedFolder.files.length > 0;
            const noMatchingFiles = searchActive && fileRows.length === 0;

            const openChildFolder = (childId: string) => {
              setSelectedFolderId(childId);
              ensureExpandedForPath(childId, folderMap, setExpanded);
              replaceUrlForFolder(childId, folderMap);
            };

            const parentFolderNode = selectedFolder.parentId
              ? (folderMap.get(selectedFolder.parentId) ?? null)
              : null;

            const goUpRow = parentFolderNode ? (
              <div
                key="go-up-parent"
                tabIndex={0}
                role="button"
                aria-label={`Back to folder ${parentFolderNode.name}`}
                onClick={() => openChildFolder(parentFolderNode.id)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  openChildFolder(parentFolderNode.id);
                }}
                className={cn(
                  resourceListRowClassName,
                  "border-dashed hover:bg-muted/50 dark:hover:bg-muted/30"
                )}
              >
                <FolderOutput
                  className="h-6 w-6 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-muted-foreground group-hover:text-foreground">
                    Back to {parentFolderNode.name}
                  </p>
                </div>
              </div>
            ) : null;

            const subfolderBlocks = hasSubfolders
              ? selectedFolder.children.map((child) => {
                  const childMatchCount = folderMatchCounts.get(child.id) ?? 0;
                  const subfolderDisabled =
                    searchActive && childMatchCount === 0;
                  return (
                    <div
                      key={child.id}
                      tabIndex={subfolderDisabled ? -1 : 0}
                      role="button"
                      aria-disabled={subfolderDisabled}
                      aria-label={`Open folder ${child.name}`}
                      onClick={() => {
                        if (subfolderDisabled) return;
                        openChildFolder(child.id);
                      }}
                      onKeyDown={(event) => {
                        if (subfolderDisabled) return;
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        openChildFolder(child.id);
                      }}
                      className={cn(
                        resourceListRowClassName,
                        subfolderDisabled &&
                          "cursor-not-allowed opacity-50 hover:bg-transparent dark:hover:bg-transparent"
                      )}
                    >
                      <Folder className="h-6 w-6 shrink-0 text-amber-600" />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            subfolderDisabled
                              ? "text-muted-foreground"
                              : "text-amber-800 underline-offset-2 group-hover:underline group-focus-visible:underline dark:text-amber-200"
                          )}
                        >
                          {child.name}
                        </p>
                      </div>
                      {searchActive && childMatchCount > 0 ? (
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {childMatchCount}
                        </span>
                      ) : null}
                    </div>
                  );
                })
              : null;

            const fileBlocks = fileRows.map((row) => {
                if (row.kind === "single") {
                  const file = row.file;
                  const { ext } = parseFileNameParts(file.displayName, file.mimeType);
                  const showPdfDocxButton = ext === "pdf" || ext === "docx";
                  const uploaded = formatUploadedAt(file.createdAt);

                  return (
                    <div
                      key={file.id}
                      tabIndex={0}
                      aria-label={`Download ${file.displayName}`}
                      title="Download file"
                      onClick={(e) => {
                        if (isFormatActionTarget(e.target)) return;
                        void downloadFile(file);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        if (isFormatActionTarget(event.target)) return;
                        void downloadFile(file);
                      }}
                      className={resourceListRowClassName}
                    >
                      <FileText className="h-6 w-6 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-blue-600 underline-offset-2 group-hover:underline group-focus-visible:underline dark:text-blue-400">
                          {file.displayName}
                        </p>
                        {uploaded ? (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Upload
                              className="h-3 w-3 shrink-0 opacity-80"
                              aria-hidden
                            />
                            <span>{uploaded}</span>
                          </p>
                        ) : null}
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <span
                          className="pointer-events-none inline-block overflow-hidden text-sm font-medium text-muted-foreground whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out max-w-0 translate-x-2 opacity-0 group-hover:max-w-[12rem] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:max-w-[12rem] group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                          aria-hidden
                        >
                          Click to download
                        </span>
                        {showPdfDocxButton ? (
                          <ResourceFormatDownloadButton
                            file={file}
                            onPick={(f) => void downloadFile(f)}
                          />
                        ) : (
                          <span data-format-action="" className="inline-flex shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-blue-400 dark:hover:bg-blue-950/25 dark:hover:text-blue-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void downloadFile(file);
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Download {extShortLabel(ext)} (
                                {formatFileSize(file.sizeBytes)})
                              </TooltipContent>
                            </Tooltip>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                const rowKey = row.variants.map((v) => v.id).join("-");
                const dialogKey =
                  formatDialog?.variants.map((v) => v.id).join("-") ?? "";
                const dialogOpen =
                  formatDialog !== null && rowKey === dialogKey;

                return (
                  <div
                    key={row.variants.map((v) => v.id).join("-")}
                    tabIndex={0}
                    aria-haspopup="dialog"
                    aria-expanded={dialogOpen}
                    aria-label={`Choose download format for ${row.baseDisplay}`}
                    onClick={(e) => {
                      if (isFormatActionTarget(e.target)) return;
                      setFormatDialog({
                        baseDisplay: row.baseDisplay,
                        variants: row.variants,
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      if (isFormatActionTarget(event.target)) return;
                      setFormatDialog({
                        baseDisplay: row.baseDisplay,
                        variants: row.variants,
                      });
                    }}
                    className={resourceListRowClassName}
                  >
                    <FileText className="h-6 w-6 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-blue-600 underline-offset-2 group-hover:underline group-focus-visible:underline dark:text-blue-400">
                        {row.baseDisplay}
                      </p>
                      <GroupUploadedMeta variants={row.variants} />
                    </div>
                    <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <span
                        className="pointer-events-none inline-block overflow-hidden text-sm font-medium text-muted-foreground whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out max-w-0 translate-x-2 opacity-0 group-hover:max-w-[12rem] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:max-w-[12rem] group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                        aria-hidden
                      >
                        Choose format
                      </span>
                      {row.variants.map((file) => (
                        <ResourceFormatDownloadButton
                          key={file.id}
                          file={file}
                          onPick={(f) => void downloadFile(f)}
                        />
                      ))}
                    </div>
                  </div>
                );
              });

            if (!hasSubfolders && !hasAnyFiles) {
              const noFilesRow = (
                <div
                  role="status"
                  aria-live="polite"
                  className={emptyFilesInFolderRowClassName}
                >
                  No files in this folder.
                </div>
              );
              if (goUpRow) {
                return (
                  <div className="space-y-2">
                    {goUpRow}
                    {noFilesRow}
                  </div>
                );
              }
              return noFilesRow;
            }

            if (!hasSubfolders && hasAnyFiles && noMatchingFiles) {
              if (goUpRow) {
                return (
                  <div className="space-y-2">
                    {goUpRow}
                    <p className="text-sm text-muted-foreground">
                      No files matching this search.
                    </p>
                  </div>
                );
              }
              return (
                <p className="text-sm text-muted-foreground">
                  No files matching this search.
                </p>
              );
            }

            return (
              <div className="space-y-2">
                {goUpRow}
                {subfolderBlocks}
                {fileBlocks}
                {hasSubfolders && !hasAnyFiles && !searchActive ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className={emptyFilesInFolderRowClassName}
                  >
                    No files in this folder.
                  </div>
                ) : null}
                {noMatchingFiles && (hasSubfolders || hasAnyFiles) ? (
                  <p className="text-sm text-muted-foreground">
                    No files matching this search.
                  </p>
                ) : null}
              </div>
            );
          })()}
        </div>
      </div>

      <Dialog
        open={formatDialog !== null}
        onOpenChange={(open) => {
          if (!open) setFormatDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {formatDialog ? (
            <>
              <DialogHeader className="gap-0">
                <DialogTitle className="flex items-center gap-2 text-left text-sm font-normal text-muted-foreground">
                  <Download className="h-4 w-4 shrink-0" aria-hidden />
                  Download File
                </DialogTitle>
                <p className="mt-4 truncate text-left text-base font-medium text-foreground">
                  {formatDialog.baseDisplay}
                </p>
                <DialogDescription className="mt-1 text-left">
                  This resource is available in more than one format. Pick the
                  one you want to download.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 pt-2">
                {formatDialog.variants.map((file) => (
                  <ResourceFormatDownloadButton
                    key={file.id}
                    variant="dialog"
                    file={file}
                    wrapperClassName="w-full"
                    onPick={(f) => {
                      void downloadFile(f);
                      setFormatDialog(null);
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
