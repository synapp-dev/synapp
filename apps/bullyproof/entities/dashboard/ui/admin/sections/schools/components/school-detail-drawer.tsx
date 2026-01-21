import {
  useState,
  useEffect,
  useRef,
  Suspense,
  useMemo,
  useCallback,
} from "react";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { classesApi } from "@/entities/classes/api/endpoints";
import type { classes } from "@/server/db/schema";

import { licencesApi } from "@/entities/licences/api/endpoints";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { usersApi } from "@/entities/users/api/endpoints";
import { schoolLevelsApi } from "@/entities/school-levels/api/endpoints";
import { statesApi } from "@/entities/states/api/endpoints";
import { schoolSectorsApi } from "@/entities/school-sectors/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";
import { useStatesStore } from "@/entities/states/model/store";
import { useSchoolSectorsStore } from "@/entities/school-sectors/model/store";
import { useSchoolLevelsStore } from "@/entities/school-levels/model/store";
import { useRoles, useUsers } from "@/entities/users/model/store";
import { userKeys } from "@/entities/users/model/keys";
import { UsersTable } from "@/entities/users/ui/users-table";
import { ClassesTable } from "@/entities/classes/ui/classes-table";
import type { schoolYears } from "@/server/db/schema";
import { BulkYearLevelDialog } from "./bulk-year-level-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { cn } from "@workspace/ui/lib/utils";

type Class = typeof classes.$inferSelect;
type ClassWithYearCodes = Class & { yearCodes?: string[] };
import {
  School,
  Users,
  BookOpen,
  Star,
  TrendingUp,
  MapPin,
  UserPlus,
  GraduationCap,
  Shield,
  Key,
  Rocket,
  Eye,
  Activity,
  CheckCircle2,
  Circle,
  Mail,
  Image,
  UserCircle,
  Loader2,
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronsUpDown,
  Upload,
  FileText,
  ArrowLeft,
  MoreHorizontal,
  ChevronsRight,
  Pencil,
  Save,
  AlertCircle,
  Search,
  CircleX,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { type School as SchoolType } from "./schools-table-columns";
import { AddManualUserDialog } from "./add-manual-user-dialog";
import { SchoolDetailHeader } from "./school-detail-header";
import { SchoolDetailSidebar } from "./school-detail-sidebar";
import { ImportUsersDialog } from "./import-users-dialog";
import { ImportClassesDialog } from "./import-classes-dialog";
import { BulkRoleDialog } from "./bulk-role-dialog";
import { apiFetch } from "@/lib/api/fetcher.client";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

type TabId =
  | "onboarding"
  | "details"
  | "users"
  | "classes"
  | "activity"
  | "culture"
  | "license";

interface SchoolDetailDrawerProps {
  school: SchoolType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  onSchoolUpdate?: () => void;
}

const navItems = [
  { id: "onboarding", name: "Onboarding", icon: Rocket },
  { id: "details", name: "Details", icon: Eye },
  { id: "users", name: "Users", icon: Users },
  { id: "classes", name: "Classes", icon: GraduationCap },
  { id: "activity", name: "Activity", icon: Activity, disabled: true },
  { id: "culture", name: "Culture", icon: Star, disabled: true },
  { id: "license", name: "License", icon: Key },
  { id: "delete", name: "Delete School", icon: Trash2 },
];

// Helper function to format school levels
function formatSchoolLevel(levels: string[] | null | undefined): string {
  if (!levels || levels.length === 0) {
    return "—";
  }

  // Filter out null/undefined/non-string values and normalize level names to lowercase for comparison
  const normalizedLevels = levels
    .filter(
      (level): level is string => typeof level === "string" && level != null
    )
    .map((level) => level.toLowerCase().trim())
    .filter((level) => level.length > 0); // Remove empty strings after trimming

  if (normalizedLevels.length === 0) {
    return "—";
  }

  const hasPrimary = normalizedLevels.some(
    (level) => level === "primary" || level.includes("primary")
  );
  const hasSecondary = normalizedLevels.some(
    (level) => level === "secondary" || level.includes("secondary")
  );

  if (hasPrimary && hasSecondary) {
    return "P-12";
  } else if (hasPrimary) {
    return "Primary";
  } else if (hasSecondary) {
    return "Secondary";
  }

  // Fallback: return first level capitalized
  const firstLevel = normalizedLevels[0];
  return firstLevel
    ? firstLevel.charAt(0).toUpperCase() + firstLevel.slice(1).toLowerCase()
    : "—";
}

interface SchoolDetailsCardProps {
  school: SchoolType | null;
  onSchoolUpdate?: () => void;
}

function SchoolDetailsCard({ school, onSchoolUpdate }: SchoolDetailsCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [stateId, setStateId] = useState<string>("");
  const [sectorId, setSectorId] = useState<string>("");
  const [levelIds, setLevelIds] = useState<string[]>([]);
  const [isP12Mode, setIsP12Mode] = useState(false);
  const [stateComboboxOpen, setStateComboboxOpen] = useState(false);
  const [sectorComboboxOpen, setSectorComboboxOpen] = useState(false);
  const [levelsComboboxOpen, setLevelsComboboxOpen] = useState(false);

  // React Query hooks with Zustand caching
  const { states, setStates } = useStatesStore();
  const { schoolSectors, setSchoolSectors } = useSchoolSectorsStore();
  const { schoolLevels, setSchoolLevels } = useSchoolLevelsStore();

  const { data: statesData = [], isLoading: loadingStates } = useQuery({
    queryKey: ["states"],
    queryFn: async () => {
      const result = await statesApi.get.list();
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch states");
      }
      if (result.data) {
        const sorted = [...result.data].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setStates(sorted);
        return sorted;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: () => (states.length > 0 ? states : undefined),
  });

  const { data: sectorsData = [], isLoading: loadingSectors } = useQuery({
    queryKey: ["school-sectors"],
    queryFn: async () => {
      const result = await schoolSectorsApi.get.list();
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch sectors");
      }
      if (result.data) {
        const sorted = [...result.data].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setSchoolSectors(sorted);
        return sorted;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: () => (schoolSectors.length > 0 ? schoolSectors : undefined),
  });

  const { data: levelsData = [], isLoading: loadingLevels } = useQuery({
    queryKey: ["school-levels"],
    queryFn: async () => {
      const result = await schoolLevelsApi.get.list();
      if (result.error) {
        throw new Error(
          result.error.message || "Failed to fetch school levels"
        );
      }
      if (result.data) {
        const sorted = [...result.data].sort((a, b) =>
          a.key.localeCompare(b.key)
        );
        setSchoolLevels(sorted);
        return sorted;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: () => (schoolLevels.length > 0 ? schoolLevels : undefined),
  });

  // Map school data to IDs
  useEffect(() => {
    if (
      school &&
      statesData.length > 0 &&
      sectorsData.length > 0 &&
      levelsData.length > 0
    ) {
      setName(school.name || "");
      setAddress((school as any).address || "");
      setEmailDomain((school as any).emailDomain || "");
      setBannerUrl((school as any).bannerUrl || "");
      setAvatarUrl((school as any).avatarUrl || "");

      // Map state code to state ID
      if (school.state) {
        const state = statesData.find(
          (s) => s.code?.toLowerCase() === school.state?.toLowerCase()
        );
        setStateId(state?.id || "");
      } else {
        setStateId("");
      }

      // Map sector key to sector ID
      if (school.sector) {
        const sector = sectorsData.find((s) => s.key === school.sector);
        setSectorId(sector?.id || "");
      } else {
        setSectorId("");
      }

      // Map level names to level IDs
      if (school.levels && school.levels.length > 0) {
        const mappedLevelIds = school.levels
          .map((levelName) => {
            const level = levelsData.find(
              (l) => l.name?.toLowerCase() === levelName.toLowerCase()
            );
            return level?.id;
          })
          .filter((id): id is string => !!id);
        setLevelIds(mappedLevelIds);

        // Check if both Primary and Secondary are present (P-12)
        const hasPrimary = mappedLevelIds.some(
          (id) => levelsData.find((l) => l.id === id)?.key === "primary"
        );
        const hasSecondary = mappedLevelIds.some(
          (id) => levelsData.find((l) => l.id === id)?.key === "secondary"
        );
        // Set P-12 mode if both are present and it's exactly these two
        setIsP12Mode(hasPrimary && hasSecondary && mappedLevelIds.length === 2);
      } else {
        setLevelIds([]);
        setIsP12Mode(false);
      }
    }
  }, [school?.id, statesData, sectorsData, levelsData]);

  // Check if there are changes
  const hasChanges =
    school &&
    (name !== (school.name || "") ||
      address !== ((school as any).address || "") ||
      emailDomain !== ((school as any).emailDomain || "") ||
      bannerUrl !== ((school as any).bannerUrl || "") ||
      avatarUrl !== ((school as any).avatarUrl || "") ||
      stateId !==
        (statesData.find(
          (s) => s.code?.toLowerCase() === school.state?.toLowerCase()
        )?.id || "") ||
      sectorId !==
        (sectorsData.find((s) => s.key === school.sector)?.id || "") ||
      JSON.stringify(levelIds) !==
        JSON.stringify(
          (school.levels || [])
            .map((levelName) => {
              const level = levelsData.find(
                (l) => l.name?.toLowerCase() === levelName.toLowerCase()
              );
              return level?.id;
            })
            .filter((id): id is string => !!id)
        ));

  const handleSave = async () => {
    if (!school) return;

    try {
      setSaving(true);
      setSaveError(null);

      const result = await schoolApi.patch.update(school.id, {
        name: name.trim() || undefined,
        address: address.trim() || null,
        emailDomain: emailDomain.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        stateId: stateId || undefined,
        sectorId: sectorId || undefined,
        levelIds: levelIds.length > 0 ? levelIds : undefined,
      });

      if (result.error) {
        const errorMessage = result.error.message || "Failed to update school";
        throw new Error(errorMessage);
      }

      // Exit edit mode but keep drawer open
      setEditing(false);
      // Refresh school data
      onSchoolUpdate?.();
    } catch (err: any) {
      console.error("Failed to update school:", err);
      setSaveError(err.message || "Failed to update school");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setSaveError(null);
    if (
      school &&
      statesData.length > 0 &&
      sectorsData.length > 0 &&
      levelsData.length > 0
    ) {
      setName(school.name || "");
      setAddress((school as any).address || "");
      setEmailDomain((school as any).emailDomain || "");
      setBannerUrl((school as any).bannerUrl || "");
      setAvatarUrl((school as any).avatarUrl || "");

      // Reset state, sector, and levels
      const state = statesData.find(
        (s) => s.code?.toLowerCase() === school.state?.toLowerCase()
      );
      setStateId(state?.id || "");

      const sector = sectorsData.find((s) => s.key === school.sector);
      setSectorId(sector?.id || "");

      const mappedLevelIds = (school.levels || [])
        .map((levelName) => {
          const level = levelsData.find(
            (l) => l.name?.toLowerCase() === levelName.toLowerCase()
          );
          return level?.id;
        })
        .filter((id): id is string => !!id);
      setLevelIds(mappedLevelIds);
    }
  };

  if (!school) return null;

  const selectedState = statesData.find((s) => s.id === stateId);
  const selectedSector = sectorsData.find((s) => s.id === sectorId);
  const selectedLevels = levelsData.filter((l) => levelIds.includes(l.id));

  // Find Primary and Secondary level IDs for P-12 logic
  const primaryLevel = levelsData.find((l) => l.key === "primary");
  const secondaryLevel = levelsData.find((l) => l.key === "secondary");
  const hasPrimary = primaryLevel && levelIds.includes(primaryLevel.id);
  const hasSecondary = secondaryLevel && levelIds.includes(secondaryLevel.id);

  // Determine if we're in P-12 mode (both selected and P-12 mode is active)
  const isP12 = hasPrimary && hasSecondary && isP12Mode;

  // Format levels display
  const formatLevelsDisplay = (levels: typeof selectedLevels): string => {
    if (levels.length === 0) return "—";
    if (levels.length === 2) {
      const hasPrimary = levels.some((l) => l.key === "primary");
      const hasSecondary = levels.some((l) => l.key === "secondary");
      if (hasPrimary && hasSecondary) return "P-12";
    }
    return levels.map((l) => l.name).join(", ");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          {(school as any).createdAt && (
            <p className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
              Created {new Date((school as any).createdAt).toLocaleDateString()}
            </p>
          )}
          <div className="ml-auto">
            {editing ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className={
                    hasChanges && !saving
                      ? "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
                      : ""
                  }
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(true);
                  setSaveError(null);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* State (1/4) and School Name (3/4) row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="school-state"
              className="text-xs text-muted-foreground ml-2"
            >
              State
            </Label>
            <Popover
              open={stateComboboxOpen}
              onOpenChange={setStateComboboxOpen}
              modal
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={stateComboboxOpen}
                  className="w-full justify-between"
                  disabled={!editing || loadingStates}
                >
                  {selectedState ? selectedState.name : "Select state..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search state..." />
                  <CommandList>
                    <CommandEmpty>No state found.</CommandEmpty>
                    <CommandGroup>
                      {statesData.map((state) => (
                        <CommandItem
                          key={state.id}
                          value={`${state.id} ${state.name}`}
                          onSelect={() => {
                            setStateId(state.id === stateId ? "" : state.id);
                            setStateComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              stateId === state.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {state.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label
              htmlFor="school-name"
              className="text-xs text-muted-foreground ml-2"
            >
              School Name
            </Label>
            <Input
              id="school-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
        </div>

        {/* Sector (1/2) and Type/Levels (1/2) row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="school-sector"
              className="text-xs text-muted-foreground ml-2"
            >
              Sector
            </Label>
            <Popover
              open={sectorComboboxOpen}
              onOpenChange={setSectorComboboxOpen}
              modal
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sectorComboboxOpen}
                  className="w-full justify-between"
                  disabled={!editing || loadingSectors}
                >
                  {selectedSector ? selectedSector.name : "Select sector..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search sector..." />
                  <CommandList>
                    <CommandEmpty>No sector found.</CommandEmpty>
                    <CommandGroup>
                      {sectorsData.map((sector) => (
                        <CommandItem
                          key={sector.id}
                          value={`${sector.id} ${sector.name}`}
                          onSelect={() => {
                            setSectorId(
                              sector.id === sectorId ? "" : sector.id
                            );
                            setSectorComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              sectorId === sector.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {sector.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="school-levels"
              className="text-xs text-muted-foreground ml-2"
            >
              Type
            </Label>
            <Popover
              open={levelsComboboxOpen}
              onOpenChange={setLevelsComboboxOpen}
              modal
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={levelsComboboxOpen}
                  className="w-full justify-between"
                  disabled={!editing || loadingLevels}
                >
                  {selectedLevels.length > 0
                    ? formatLevelsDisplay(selectedLevels)
                    : "Select type..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search type..." />
                  <CommandList>
                    <CommandEmpty>No type found.</CommandEmpty>
                    <CommandGroup>
                      {/* P-12 option (artificial, selects both Primary and Secondary) */}
                      {primaryLevel && secondaryLevel && (
                        <CommandItem
                          key="p-12"
                          value="p-12 P-12"
                          onSelect={() => {
                            if (isP12) {
                              // Deselect P-12: remove both Primary and Secondary
                              setLevelIds(
                                levelIds.filter(
                                  (id) =>
                                    id !== primaryLevel.id &&
                                    id !== secondaryLevel.id
                                )
                              );
                              setIsP12Mode(false);
                            } else {
                              // Select P-12: add both Primary and Secondary and set P-12 mode
                              const newIds: string[] = [];
                              if (primaryLevel.id) newIds.push(primaryLevel.id);
                              if (secondaryLevel.id)
                                newIds.push(secondaryLevel.id);
                              setLevelIds(newIds);
                              setIsP12Mode(true);
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isP12 ? "opacity-100" : "opacity-0"
                            )}
                          />
                          P-12
                        </CommandItem>
                      )}
                      {/* Individual level options */}
                      {levelsData.map((level) => {
                        // If P-12 is selected, don't show Primary/Secondary as checked
                        // even though their IDs are in levelIds
                        const isSelected = isP12
                          ? false // When P-12 is active, individual options show as unchecked
                          : levelIds.includes(level.id);

                        return (
                          <CommandItem
                            key={level.id}
                            value={`${level.id} ${level.name}`}
                            onSelect={() => {
                              if (
                                isP12 &&
                                (level.key === "primary" ||
                                  level.key === "secondary")
                              ) {
                                // If P-12 is selected and user clicks Primary or Secondary,
                                // deselect P-12 and select only the clicked level
                                setIsP12Mode(false);
                                setLevelIds([level.id]);
                              } else if (isSelected) {
                                // Deselecting: remove this level
                                setLevelIds(
                                  levelIds.filter((id) => id !== level.id)
                                );
                                setIsP12Mode(false);
                              } else {
                                // Selecting: add this level
                                // If selecting primary or secondary, allow multiple
                                // Otherwise replace with single selection
                                if (
                                  level.key === "primary" ||
                                  level.key === "secondary"
                                ) {
                                  // If selecting the other one (primary when secondary is selected or vice versa),
                                  // check if we should switch to P-12 mode
                                  const otherLevel =
                                    level.key === "primary"
                                      ? secondaryLevel
                                      : primaryLevel;
                                  const hasOther =
                                    otherLevel &&
                                    levelIds.includes(otherLevel.id);

                                  if (hasOther) {
                                    // Both will be selected, switch to P-12 mode
                                    const newIds: string[] = [];
                                    if (primaryLevel?.id)
                                      newIds.push(primaryLevel.id);
                                    if (secondaryLevel?.id)
                                      newIds.push(secondaryLevel.id);
                                    setLevelIds(newIds);
                                    setIsP12Mode(true);
                                  } else {
                                    // Just add this one
                                    setLevelIds([...levelIds, level.id]);
                                    setIsP12Mode(false);
                                  }
                                } else {
                                  setLevelIds([level.id]);
                                  setIsP12Mode(false);
                                }
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {level.name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="school-address"
            className="text-xs text-muted-foreground ml-2"
          >
            Address
          </Label>
          <Input
            id="school-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={!editing}
            className={!editing ? "bg-muted" : ""}
            placeholder="Enter school address"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="school-email-domain"
            className="text-xs text-muted-foreground ml-2"
          >
            Email Domain
          </Label>
          <Input
            id="school-email-domain"
            value={emailDomain}
            onChange={(e) => setEmailDomain(e.target.value)}
            disabled={!editing}
            className={!editing ? "bg-muted" : ""}
            placeholder="example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="school-banner-url"
            className="text-xs text-muted-foreground ml-2"
          >
            Banner URL
          </Label>
          <Input
            id="school-banner-url"
            type="url"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            disabled={!editing}
            className={!editing ? "bg-muted" : ""}
            placeholder="https://example.com/banner.jpg"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="school-avatar-url"
            className="text-xs text-muted-foreground ml-2"
          >
            Avatar URL
          </Label>
          <Input
            id="school-avatar-url"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            disabled={!editing}
            className={!editing ? "bg-muted" : ""}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        {saveError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function SchoolDetailDrawerContent({
  school,
  open,
  onOpenChange,
  initialTab = "onboarding",
  onTabChange,
  onSchoolUpdate,
}: SchoolDetailDrawerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<TabId>(
    initialTab || "onboarding"
  );
  const prevInitialTabRef = useRef<TabId | undefined>(initialTab);
  const prevOpenRef = useRef(open);
  const isInitialMountRef = useRef(true);
  const hasHandledInitialDialogRef = useRef(false);
  const hasRedirectedForLicenseRef = useRef(false);

  // Reset to initialTab when drawer opens or initialTab changes
  useEffect(() => {
    // Only update if initialTab actually changed or drawer just opened
    const initialTabChanged = prevInitialTabRef.current !== initialTab;
    const drawerJustOpened = !prevOpenRef.current && open;

    if (open && (initialTabChanged || drawerJustOpened)) {
      const newTab = initialTab || "onboarding";
      setActiveSection(newTab);
      prevInitialTabRef.current = initialTab;
    }

    // Reset initial mount flag when drawer closes
    if (!open && prevOpenRef.current) {
      isInitialMountRef.current = true;
      hasHandledInitialDialogRef.current = false;
      hasRedirectedForLicenseRef.current = false;
    }

    prevOpenRef.current = open;
  }, [open, initialTab]);

  // Track previous active section to detect transitions
  const prevActiveSectionRef = useRef<TabId | null>(null);
  const isInitialMountRefForRedirect = useRef(true);

  // Redirect to license tab if user navigates TO onboarding tab with active license
  // This should NOT trigger on page refresh when already on onboarding
  useEffect(() => {
    // Reset redirect flag when drawer closes
    if (!open) {
      hasRedirectedForLicenseRef.current = false;
      prevActiveSectionRef.current = null;
      isInitialMountRefForRedirect.current = true;
      return;
    }

    // On initial mount, initialize the previous section to current section
    // This prevents redirect on page refresh when already on onboarding
    if (isInitialMountRefForRedirect.current) {
      prevActiveSectionRef.current = activeSection;
      isInitialMountRefForRedirect.current = false;
      return;
    }

    // Only redirect if we're transitioning TO onboarding (not already on it)
    const isTransitioningToOnboarding =
      prevActiveSectionRef.current !== "onboarding" &&
      activeSection === "onboarding";

    if (
      open &&
      school &&
      isTransitioningToOnboarding &&
      school.activeLicence &&
      !hasRedirectedForLicenseRef.current
    ) {
      hasRedirectedForLicenseRef.current = true;
      // Redirect to license tab without opening dialog
      setActiveSection("license");
      onTabChange?.("license");
      if (school?.slug) {
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("school", school.slug);
        params.set("tab", "license");
        // Explicitly remove dialog param if it exists
        params.delete("dialog");
        router.replace(`/admin/schools?${params.toString()}`, {
          scroll: false,
        });
      }
    }

    // Update previous section ref
    prevActiveSectionRef.current = activeSection;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, school?.id, school?.activeLicence, activeSection]);

  // Handle tab change
  const handleTabChange = (tab: TabId) => {
    setActiveSection(tab);
    onTabChange?.(tab);
  };
  const [classes, setClasses] = useState<ClassWithYearCodes[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Search and filter state for users
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  // Search and filter state for classes
  const [classesSearchQuery, setClassesSearchQuery] = useState("");
  const [debouncedClassesSearchQuery, setDebouncedClassesSearchQuery] =
    useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState<string>("");
  const [classesRowSelection, setClassesRowSelection] = useState({});

  // Edit class dialog state
  const [editClassDialogOpen, setEditClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithYearCodes | null>(
    null
  );
  const [editClassName, setEditClassName] = useState("");
  const [editClassCode, setEditClassCode] = useState("");
  const [editClassStudentCap, setEditClassStudentCap] = useState<string>("");
  const [editClassActive, setEditClassActive] = useState(true);
  const [editClassRunningYear, setEditClassRunningYear] = useState<string>("");
  const [editSelectedYearIds, setEditSelectedYearIds] = useState<string[]>([]);
  const [editLoadingYears, setEditLoadingYears] = useState(false);
  const [editAvailableYears, setEditAvailableYears] = useState<
    Array<typeof schoolYears.$inferSelect>
  >([]);
  const [editYearComboboxOpen, setEditYearComboboxOpen] = useState(false);
  const [editSelectedTeacherIds, setEditSelectedTeacherIds] = useState<
    string[]
  >([]);
  const [editTeacherComboboxOpen, setEditTeacherComboboxOpen] = useState(false);

  // Roles for filtering
  const { roles, isLoading: isLoadingRoles } = useRoles();

  // Use React Query hook for users with locked schoolId filter
  const {
    users,
    isLoading: loadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useUsers({
    search: debouncedSearchQuery || undefined,
    role: roleFilter && roleFilter !== "all" ? roleFilter : undefined,
    schoolId: school?.id, // Lock to this school
  });

  // Row selection state (if needed for future bulk actions)
  const [rowSelection, setRowSelection] = useState({});

  // Dialog states
  const [addLicenceDialogOpen, setAddLicenceDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [importUsersDialogOpen, setImportUsersDialogOpen] = useState(false);
  const [importClassesDialogOpen, setImportClassesDialogOpen] = useState(false);
  const [bulkRoleDialogOpen, setBulkRoleDialogOpen] = useState(false);
  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Class deletion state
  const [isDeleteClassesDialogOpen, setIsDeleteClassesDialogOpen] =
    useState(false);
  const [
    isConfirmDeleteClassesDialogOpen,
    setIsConfirmDeleteClassesDialogOpen,
  ] = useState(false);
  const [isDeletingClasses, setIsDeletingClasses] = useState(false);
  const [deleteClassesError, setDeleteClassesError] = useState<string | null>(
    null
  );

  // Bulk year level edit state
  const [bulkYearLevelDialogOpen, setBulkYearLevelDialogOpen] = useState(false);

  // School deletion state
  const [isDeleteSchoolDialogOpen, setIsDeleteSchoolDialogOpen] =
    useState(false);
  const [isConfirmDeleteSchoolDialogOpen, setIsConfirmDeleteSchoolDialogOpen] =
    useState(false);
  const [isDeletingSchool, setIsDeletingSchool] = useState(false);
  const [deleteSchoolError, setDeleteSchoolError] = useState<string | null>(
    null
  );
  const [deleteSchoolConfirmation, setDeleteSchoolConfirmation] = useState("");

  // Legacy states for backward compatibility (will be removed)
  const [addAdminDialogOpen, setAddAdminDialogOpen] = useState(false);
  const [addAdminSuccess, setAddAdminSuccess] = useState(false);
  const [addTeacherDialogOpen, setAddTeacherDialogOpen] = useState(false);
  const [addTeacherSuccess, setAddTeacherSuccess] = useState(false);
  const [addTeacherStep, setAddTeacherStep] = useState<
    "selection" | "manual" | "csv"
  >("selection");

  // Class form states
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [classRunningYear, setClassRunningYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [selectedYearIds, setSelectedYearIds] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<
    Array<typeof schoolYears.$inferSelect>
  >([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [yearComboboxOpen, setYearComboboxOpen] = useState(false);
  const [schoolLevelsMap, setSchoolLevelsMap] = useState<Map<string, string>>(
    new Map()
  ); // Maps level name/key to level ID

  // Licence state
  const [schoolLicence, setSchoolLicence] = useState<any | null>(null);
  const [loadingLicence, setLoadingLicence] = useState(false);

  // Form states
  const [licenceDuration, setLicenceDuration] = useState<string>("");
  const [schoolLicenceEmail, setSchoolLicenceEmail] = useState("");
  const [existingLicenceEmail, setExistingLicenceEmail] = useState<
    string | null
  >(null);
  const [loadingLicenceEmail, setLoadingLicenceEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [licenceError, setLicenceError] = useState<string | null>(null);
  const isClosingDialogRef = useRef(false);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    if (!email) return false;
    // Pattern: at least 2 chars before @, then @, then something, then ., then at least 2 chars after dot
    const emailRegex = /^[^\s@]{2,}@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  };

  // Check if email is valid (either existing email or valid new input)
  const hasValidEmail = existingLicenceEmail
    ? true
    : schoolLicenceEmail
      ? isValidEmail(schoolLicenceEmail)
      : false;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounce classes search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClassesSearchQuery(classesSearchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [classesSearchQuery]);

  // Refetch users when section becomes active
  const prevUsersSectionRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeSection === "users" && school?.id) {
      // Only refetch if we're switching TO the users section (not already on it)
      if (prevUsersSectionRef.current !== "users") {
        refetchUsers();
        prevUsersSectionRef.current = "users";
      }
    } else {
      prevUsersSectionRef.current = activeSection;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, school?.id]);

  // Fetch classes function - reusable for initial load and refetch after bulk edit
  const fetchClasses = useCallback(async () => {
    if (!school?.id) return;
    
    setLoadingClasses(true);
    try {
      const result = await classesApi.get.list({ schoolId: school.id });
      if (!result.error && result.data) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    } finally {
      setLoadingClasses(false);
    }
  }, [school?.id]);

  // Track previous classes section to prevent duplicate fetches
  const prevClassesSectionRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeSection === "classes" && school?.id) {
      // Only fetch if we're switching TO the classes section (not already on it)
      if (prevClassesSectionRef.current !== "classes") {
        fetchClasses();
        prevClassesSectionRef.current = "classes";
      }
    } else {
      prevClassesSectionRef.current = activeSection;
    }
  }, [activeSection, school?.id, fetchClasses]);

  // Filter classes based on search and year level
  const filteredClasses = useMemo(() => {
    let filtered = classes;

    // Filter by search query
    if (debouncedClassesSearchQuery.trim()) {
      const searchLower = debouncedClassesSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (classItem) =>
          classItem.name.toLowerCase().includes(searchLower) ||
          classItem.code?.toLowerCase().includes(searchLower) ||
          classItem.yearCodes?.some((code) =>
            code.toLowerCase().includes(searchLower)
          )
      );
    }

    // Filter by year level
    if (yearLevelFilter && yearLevelFilter !== "all") {
      filtered = filtered.filter((classItem) =>
        classItem.yearCodes?.includes(yearLevelFilter)
      );
    }

    return filtered;
  }, [classes, debouncedClassesSearchQuery, yearLevelFilter]);

  // Memoize year codes for filter dropdown
  const yearLevelOptions = useMemo(() => {
    const allYearCodes = new Set<string>();
    classes.forEach((classItem) => {
      classItem.yearCodes?.forEach((code) => {
        allYearCodes.add(code);
      });
    });
    return Array.from(allYearCodes)
      .sort()
      .map((yearCode) => {
        const count = classes.filter((classItem) =>
          classItem.yearCodes?.includes(yearCode)
        ).length;
        return { yearCode, count };
      });
  }, [classes]);

  // Stable callback for row selection
  const handleClassesRowSelectionChange = useCallback(
    (selection: Record<string, boolean>) => {
      setClassesRowSelection(selection);
    },
    []
  );

  // Ref to track if edit dialog is open (to prevent infinite loops)
  const editDialogOpenRef = useRef(false);

  useEffect(() => {
    editDialogOpenRef.current = editClassDialogOpen;
  }, [editClassDialogOpen]);

  // Stable callback for class click
  const handleClassClick = useCallback(
    async (classItem: ClassWithYearCodes) => {
      // Prevent multiple clicks or if dialog is already open
      if (editDialogOpenRef.current) return;

      // Load full class data with years
      try {
        const result = await classesApi.get.byId(classItem.id);
        if (result.data && !editDialogOpenRef.current) {
          setEditingClass(result.data);
          setEditClassName(result.data.name);
          setEditClassCode(result.data.code || "");
          setEditClassStudentCap(result.data.studentCap?.toString() || "");
          setEditClassActive(result.data.active ?? true);

          // Extract running year from startYear
          const runningYear = result.data.startYear
            ? new Date(result.data.startYear).getFullYear().toString()
            : new Date().getFullYear().toString();
          setEditClassRunningYear(runningYear);

          // Get year IDs from the years array
          const yearIds = result.data.years?.map((y: any) => y.yearId) || [];
          setEditSelectedYearIds(yearIds);

          // Get teacher IDs from the teachers array
          const classData = result.data as any;
          const teacherIds =
            classData?.teachers?.map((t: any) => t.userId) || [];
          setEditSelectedTeacherIds(teacherIds);

          setEditClassDialogOpen(true);
        }
      } catch (error) {
        console.error("Failed to load class:", error);
      }
    },
    []
  );

  // Fetch school levels on mount to create mapping
  useEffect(() => {
    schoolLevelsApi.get
      .list()
      .then((result) => {
        if (!result.error && result.data) {
          const map = new Map<string, string>();
          result.data.forEach((level) => {
            // Map both by key and by name (case-insensitive)
            if (level.key) {
              map.set(level.key.toLowerCase(), level.id);
            }
            if (level.name) {
              map.set(level.name.toLowerCase(), level.id);
            }
          });
          setSchoolLevelsMap(map);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch school levels:", error);
      });
  }, []);

  // Filter teachers from the school (users with TEACHER role)
  // Find user with SCHOOL_LICENCE role for this school
  const licenseUser = useMemo(() => {
    if (!users || !school?.id) return null;
    return users.find((user) =>
      user.schoolRoles?.some(
        (role) =>
          role.schoolId === school.id && role.roleKey === "SCHOOL_LICENCE"
      )
    );
  }, [users, school?.id]);

  const editAvailableTeachers = useMemo(() => {
    if (!school?.id || !users || users.length === 0) return [];

    return users.filter((user) => {
      // Check if user has TEACHER role for this school
      const schoolRoles = user.schoolRoles.filter(
        (role) => role.schoolId === school.id
      );

      // User must have TEACHER role for this school
      return schoolRoles.some((role) => role.roleKey === "TEACHER");
    });
  }, [users, school?.id]);

  // Fetch school years for edit dialog
  useEffect(() => {
    if (editClassDialogOpen && school && schoolLevelsMap.size > 0) {
      setEditLoadingYears(true);

      // Extract level IDs from school's levels array
      const levelIds = school.levels
        ?.map((levelName: string) => {
          const normalizedName = levelName.toLowerCase().trim();
          return schoolLevelsMap.get(normalizedName);
        })
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      // Fetch years filtered by school's level IDs
      curriculumApi.years
        .list(levelIds && levelIds.length > 0 ? { levelIds } : undefined)
        .then((result) => {
          if (!result.error && result.data) {
            const years = result.data
              .map((item: any) => item.year)
              .filter((year: any) => year != null);

            const sortedYears = [...years].sort((a, b) => {
              if (a.sortIndex != null && b.sortIndex != null) {
                return a.sortIndex - b.sortIndex;
              }
              const aCode = a.code || "";
              const bCode = b.code || "";
              return aCode.localeCompare(bCode);
            });

            setEditAvailableYears(sortedYears);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch school years:", error);
          setEditAvailableYears([]);
        })
        .finally(() => {
          setEditLoadingYears(false);
        });
    }
  }, [editClassDialogOpen, school, schoolLevelsMap]);

  // Fetch school years when dialog opens
  useEffect(() => {
    if (addClassDialogOpen && school && schoolLevelsMap.size > 0) {
      setLoadingYears(true);

      // Extract level IDs from school's levels array
      // School levels structure: string[] (level names like ["Primary", "Secondary"])
      const levelIds = school.levels
        ?.map((levelName: string) => {
          // Look up level ID by name (case-insensitive)
          const normalizedName = levelName.toLowerCase().trim();
          return schoolLevelsMap.get(normalizedName);
        })
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      // Fetch years filtered by school's level IDs
      curriculumApi.years
        .list(levelIds && levelIds.length > 0 ? { levelIds } : undefined)
        .then((result) => {
          if (!result.error && result.data) {
            // Extract year objects from the nested response structure
            // Response format: [{ year: {...}, level: {...} }, ...]
            const years = result.data
              .map((item: any) => item.year)
              .filter((year: any) => year != null);

            // Sort by sortIndex if available, otherwise by code
            const sortedYears = [...years].sort((a, b) => {
              if (a.sortIndex != null && b.sortIndex != null) {
                return a.sortIndex - b.sortIndex;
              }
              const aCode = a.code || "";
              const bCode = b.code || "";
              return aCode.localeCompare(bCode);
            });

            setAvailableYears(sortedYears);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch school years:", error);
          setAvailableYears([]);
        })
        .finally(() => {
          setLoadingYears(false);
        });
    } else if (!addClassDialogOpen) {
      // Reset form when dialog closes
      setClassName("");
      setClassCode("");
      setClassRunningYear(new Date().getFullYear().toString());
      setSelectedYearIds([]);
    }
  }, [addClassDialogOpen, school, schoolLevelsMap]);

  // Generate year options for class running year (current year - 2 to current year + 8)
  const getClassRunningYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2;
    const endYear = currentYear + 8;
    const years: { value: string; label: string }[] = [];

    for (let year = startYear; year <= endYear; year++) {
      years.push({
        value: year.toString(),
        label: year.toString(),
      });
    }

    return years;
  };

  // Fetch school licence when license section is active
  const prevLicenseSectionRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeSection === "license" && school?.id) {
      // Only fetch if we're switching TO the license section (not already on it)
      if (prevLicenseSectionRef.current !== "license") {
        setLoadingLicence(true);
        // First check for ACTIVE licence
        licencesApi.get
          .list({ schoolId: school.id, status: "ACTIVE", limit: 1 })
          .then((result) => {
            if (!result.error && result.data && result.data.length > 0) {
              setSchoolLicence(result.data[0]);
              setLoadingLicence(false);
            } else {
              // If no ACTIVE licence, check for PENDING status
              licencesApi.get
                .list({ schoolId: school.id, status: "PENDING", limit: 1 })
                .then((pendingResult) => {
                  if (
                    !pendingResult.error &&
                    pendingResult.data &&
                    pendingResult.data.length > 0
                  ) {
                    setSchoolLicence(pendingResult.data[0]);
                  } else {
                    setSchoolLicence(null);
                  }
                })
                .catch((error) => {
                  console.error("Failed to fetch pending licence:", error);
                  setSchoolLicence(null);
                })
                .finally(() => {
                  setLoadingLicence(false);
                });
            }
          })
          .catch((error) => {
            console.error("Failed to fetch licence:", error);
            setSchoolLicence(null);
            setLoadingLicence(false);
          });
        prevLicenseSectionRef.current = "license";
      }
    } else {
      if (activeSection !== "license") {
        prevLicenseSectionRef.current = activeSection;
      }
    }
  }, [activeSection, school?.id]);

  // Track dialog param value to avoid infinite loops
  const dialogParam = searchParams?.get("dialog") || null;
  const prevDialogParamRef = useRef<string | null>(dialogParam);

  // Check for dialog query parameter and open dialog if conditions are met
  useEffect(() => {
    // Don't interfere if we're manually closing the dialog
    if (isClosingDialogRef.current) {
      return;
    }

    // Handle initial page load with dialog=add-class - remove it without opening dialog
    if (
      isInitialMountRef.current &&
      dialogParam === "add-class" &&
      open &&
      school &&
      activeSection === "classes"
    ) {
      if (!hasHandledInitialDialogRef.current) {
        hasHandledInitialDialogRef.current = true;
        // Remove dialog param on initial page load
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.delete("dialog");
        const newUrl = params.toString()
          ? `/admin/schools?${params.toString()}`
          : "/admin/schools";
        router.replace(newUrl, { scroll: false });
        return;
      }
    }

    // Mark initial mount as complete after first render
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
    }

    // Only process if dialog param actually changed
    const dialogParamChanged = prevDialogParamRef.current !== dialogParam;
    if (!dialogParamChanged && !open) {
      return;
    }
    prevDialogParamRef.current = dialogParam;

    if (open && school && activeSection === "license") {
      if (dialogParam === "ADD-school-licence" && !addLicenceDialogOpen) {
        setAddLicenceDialogOpen(true);
      } else if (!dialogParam && addLicenceDialogOpen) {
        setAddLicenceDialogOpen(false);
      }
    }

    if (open && school && activeSection === "users") {
      if (dialogParam === "add-user" && !addUserDialogOpen) {
        setAddUserDialogOpen(true);
        // Close import dialog if it's open
        if (importUsersDialogOpen) {
          setImportUsersDialogOpen(false);
        }
      } else if (dialogParam === "import-users" && !importUsersDialogOpen) {
        setImportUsersDialogOpen(true);
        // Close add user dialog if it's open
        if (addUserDialogOpen) {
          setAddUserDialogOpen(false);
        }
      } else if (!dialogParam) {
        // Close both dialogs when param is removed
        if (addUserDialogOpen) {
          setAddUserDialogOpen(false);
        }
        if (importUsersDialogOpen) {
          setImportUsersDialogOpen(false);
        }
      }
    }

    if (open && school && activeSection === "classes") {
      if (dialogParam === "add-class" && !addClassDialogOpen) {
        // Only open if we've already handled the initial page load case
        // or if this is a subsequent change (user clicked button)
        if (!isInitialMountRef.current || hasHandledInitialDialogRef.current) {
          setAddClassDialogOpen(true);
          hasHandledInitialDialogRef.current = true; // Mark as handled for future opens
          // Close import dialog if it's open
          if (importClassesDialogOpen) {
            setImportClassesDialogOpen(false);
          }
        }
      } else if (dialogParam === "import-classes" && !importClassesDialogOpen) {
        setImportClassesDialogOpen(true);
        // Close add class dialog if it's open
        if (addClassDialogOpen) {
          setAddClassDialogOpen(false);
        }
      } else if (!dialogParam) {
        // Close both dialogs when param is removed
        if (addClassDialogOpen) {
          setAddClassDialogOpen(false);
          setClassName("");
          setClassCode("");
          setClassRunningYear(new Date().getFullYear().toString());
          setSelectedYearIds([]);
        }
        if (importClassesDialogOpen) {
          setImportClassesDialogOpen(false);
        }
        // Reset the initial dialog flag when dialog closes
        hasHandledInitialDialogRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, school?.id, activeSection, dialogParam]);

  // Fetch existing school licence email when dialog opens
  useEffect(() => {
    if (addLicenceDialogOpen && school) {
      setLoadingLicenceEmail(true);
      meApi.get
        .listAllUsers()
        .then((result) => {
          if (!result.error && result.data) {
            // Find user with SCHOOL_LICENCE role for this school
            const licenceUser = result.data.users.find((user) =>
              user.schoolRoles.some(
                (role) =>
                  role.schoolId === school.id &&
                  role.roleKey === "SCHOOL_LICENCE"
              )
            );
            if (licenceUser) {
              setExistingLicenceEmail(licenceUser.email);
              setSchoolLicenceEmail(licenceUser.email);
            } else {
              setExistingLicenceEmail(null);
              setSchoolLicenceEmail("");
            }
          }
        })
        .catch((error) => {
          console.error("Failed to fetch licence email:", error);
          setExistingLicenceEmail(null);
        })
        .finally(() => {
          setLoadingLicenceEmail(false);
        });
    }
  }, [addLicenceDialogOpen, school]);

  // Handler for opening add user dialog (goes directly to manual form)
  const handleAddUserClick = () => {
    setAddUserDialogOpen(true);
    // Add dialog query parameter to URL
    if (school?.slug) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("school", school.slug);
      params.set("tab", "users");
      params.set("dialog", "add-user");
      router.push(`/admin/schools?${params.toString()}`, {
        scroll: false,
      });
    }
  };

  // Handler for opening import data dialog (triggers file picker immediately)
  const handleImportDataClick = () => {
    // Open import dialog
    setImportUsersDialogOpen(true);
    if (school?.slug) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("school", school.slug);
      params.set("tab", "users");
      params.set("dialog", "import-users");
      router.push(`/admin/schools?${params.toString()}`, {
        scroll: false,
      });
    }
  };

  const handleBulkRoleClick = () => {
    setBulkRoleDialogOpen(true);
  };

  if (!school) return null;

  const levelDisplay = formatSchoolLevel(school.levels);
  const sectorDisplay =
    school.sector === "government"
      ? "Government"
      : school.sector === "catholic"
        ? "Catholic"
        : school.sector === "independent"
          ? "Independent"
          : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95vh] w-full max-w-7xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 gap-2 overflow-hidden flex flex-col"
      >
        <SheetTitle className="sr-only">
          {school.name} - School Details
        </SheetTitle>

        {/* Full-width Header */}
        <SchoolDetailHeader school={school} />

        {/* Sidebar and Content Area */}
        <div className="flex flex-1 overflow-hidden min-h-0 gap-0">
          {/* Left Sidebar */}
          <SchoolDetailSidebar
            activeTab={activeSection}
            onTabChange={handleTabChange}
            onDeleteClick={() => setIsDeleteSchoolDialogOpen(true)}
          />

          {/* Right Content Area */}
          <main className="flex flex-1 flex-col overflow-hidden min-h-0 pt-2 pr-6 pl-4">
            {/* Mobile Header */}
            <div className="md:hidden p-4 border-b shrink-0 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <School className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-lg">{school.name}</h2>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {school.state && (
                  <Badge variant="secondary" className="w-fit">
                    {school.state.toUpperCase()}
                  </Badge>
                )}
                {sectorDisplay !== "—" && (
                  <Badge variant="secondary" className="w-fit">
                    {sectorDisplay}
                  </Badge>
                )}
                {levelDisplay !== "—" && (
                  <Badge variant="secondary" className="w-fit">
                    {levelDisplay}
                  </Badge>
                )}
              </div>
              <Select
                value={activeSection}
                onValueChange={(value) => handleTabChange(value as TabId)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {navItems.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      disabled={item.disabled}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Onboarding Section */}
              {activeSection === "onboarding" && (
                <div className="space-y-6">
                  {/* Essential Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Essential
                    </h4>
                    {(() => {
                      const steps = [
                        {
                          id: "add-licence",
                          title: "Add School Licence",
                          description: school.activeLicence
                            ? "Active school licence exists"
                            : "No active school licence has been added yet",
                          icon: Key,
                          completed: school.activeLicence,
                        },
                        {
                          id: "add-admin",
                          title: "Add School Admin",
                          description:
                            school.schoolAdminCount > 0
                              ? "School admin has been added"
                              : "No school admin has been added yet",
                          icon: Shield,
                          completed: school.schoolAdminCount > 0,
                        },
                        {
                          id: "add-teachers",
                          title: "Add Staff and AP Teachers",
                          description:
                            school.teacherCount > 0
                              ? "Staff and AP teachers have been added"
                              : "No staff or AP teachers have been added yet",
                          icon: UserPlus,
                          completed: school.teacherCount > 0,
                        },
                        {
                          id: "add-classes",
                          title: "Add Classes",
                          description:
                            school.classCount > 0
                              ? "Classes have been added"
                              : "No classes have been added yet",
                          icon: GraduationCap,
                          completed: school.classCount > 0,
                        },
                      ];

                      let previousCompleted = true;

                      return (
                        <div className="grid grid-cols-4 gap-4">
                          {steps.map((item, index) => {
                            const Icon = item.icon;
                            const isCompleted = item.completed;
                            const isAvailable = previousCompleted;
                            const isDisabled = !isAvailable;

                            // Update previousCompleted for next iteration
                            if (isCompleted) {
                              previousCompleted = true;
                            } else {
                              previousCompleted = false;
                            }

                            return (
                              <Card
                                key={item.id}
                                className={`transition-all relative h-fit p-0 ${
                                  isCompleted
                                    ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                                    : isAvailable
                                      ? "hover:bg-muted/30 border-border"
                                      : "bg-muted/30 opacity-60 border-muted"
                                } ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                                onClick={() => {
                                  if (isDisabled) return;

                                  // If this is the "Add School Licence" step, navigate to license tab
                                  if (item.id === "add-licence") {
                                    handleTabChange("license");
                                    if (school?.slug) {
                                      const params = new URLSearchParams(
                                        searchParams?.toString() || ""
                                      );
                                      params.set("school", school.slug);
                                      params.set("tab", "license");
                                      // If completed or has active license, don't open dialog
                                      // Otherwise, open dialog to add license
                                      if (isCompleted || school.activeLicence) {
                                        params.delete("dialog");
                                      } else {
                                        params.set(
                                          "dialog",
                                          "ADD-school-licence"
                                        );
                                      }
                                      router.push(
                                        `/admin/schools?${params.toString()}`,
                                        {
                                          scroll: false,
                                        }
                                      );
                                    }
                                  }

                                  // If this is the "Add School Admin" step, navigate to users tab with dialog
                                  if (item.id === "add-admin") {
                                    handleTabChange("users");
                                    if (school?.slug) {
                                      const params = new URLSearchParams(
                                        searchParams?.toString() || ""
                                      );
                                      params.set("school", school.slug);
                                      params.set("tab", "users");
                                      params.set("dialog", "add-school-admin");
                                      router.push(
                                        `/admin/schools?${params.toString()}`,
                                        {
                                          scroll: false,
                                        }
                                      );
                                    }
                                  }

                                  // If this is the "Add Teachers" step, navigate to users tab with dialog
                                  if (item.id === "add-teachers") {
                                    handleTabChange("users");
                                    if (school?.slug) {
                                      const params = new URLSearchParams(
                                        searchParams?.toString() || ""
                                      );
                                      params.set("school", school.slug);
                                      params.set("tab", "users");
                                      params.set("dialog", "add-teacher");
                                      router.push(
                                        `/admin/schools?${params.toString()}`,
                                        {
                                          scroll: false,
                                        }
                                      );
                                    }
                                  }

                                  // If this is the "Add Classes" step, navigate to classes tab with dialog
                                  if (item.id === "add-classes") {
                                    handleTabChange("classes");
                                    if (school?.slug) {
                                      const params = new URLSearchParams(
                                        searchParams?.toString() || ""
                                      );
                                      params.set("school", school.slug);
                                      params.set("tab", "classes");
                                      params.set("dialog", "add-class");
                                      // Mark that we're opening via click, not page load
                                      hasHandledInitialDialogRef.current = true;
                                      router.push(
                                        `/admin/schools?${params.toString()}`,
                                        {
                                          scroll: false,
                                        }
                                      );
                                    }
                                  }
                                }}
                              >
                                <CardContent className="p-4 pb-3 flex flex-col items-center">
                                  {/* Icon at top */}
                                  <div className="flex items-center justify-center mb-3">
                                    <Icon
                                      className={`h-12 w-12 ${
                                        isCompleted
                                          ? "text-green-600"
                                          : isAvailable
                                            ? "text-muted-foreground"
                                            : "text-muted-foreground/50"
                                      }`}
                                    />
                                  </div>
                                  {/* Title */}
                                  <h3
                                    className={`text-sm font-semibold text-center mb-1 ${
                                      isCompleted
                                        ? "text-green-700 dark:text-green-400"
                                        : isAvailable
                                          ? ""
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    {item.title}
                                  </h3>
                                  {/* Description */}
                                  <p className="text-xs text-muted-foreground text-center line-clamp-2">
                                    {item.description}
                                  </p>
                                </CardContent>
                                {isCompleted && (
                                  <CardFooter className="px-4 py-2 bg-muted border-t-0 rounded-b-xl">
                                    <span className="text-xs font-medium text-green-700 dark:text-green-400 w-full text-center">
                                      Completed
                                    </span>
                                  </CardFooter>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  <Separator />

                  {/* Optional Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      (Optional)
                    </h4>
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        {
                          id: "add-email-domain",
                          title: "Add Email Domain",
                          description: (school as any).emailDomain
                            ? `Email domain: ${(school as any).emailDomain}`
                            : "No email domain has been added yet",
                          icon: Mail,
                          completed: !!(school as any).emailDomain,
                        },
                        {
                          id: "add-address",
                          title: "Add Address",
                          description: (school as any).address
                            ? `Address: ${(school as any).address}`
                            : "No address has been added yet",
                          icon: MapPin,
                          completed: !!(school as any).address,
                        },
                        {
                          id: "add-banner",
                          title: "Add Banner",
                          description: (school as any).bannerUrl
                            ? "Banner image has been added"
                            : "No banner image has been added yet",
                          icon: Image,
                          completed: !!(school as any).bannerUrl,
                        },
                        {
                          id: "add-avatar",
                          title: "Add Avatar",
                          description: (school as any).avatarUrl
                            ? "Avatar image has been added"
                            : "No avatar image has been added yet",
                          icon: UserCircle,
                          completed: !!(school as any).avatarUrl,
                        },
                      ].map((item, index) => {
                        const Icon = item.icon;
                        const isCompleted = item.completed;

                        return (
                          <Card
                            key={item.id}
                            className={`transition-all relative h-fit ${
                              isCompleted
                                ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                                : "hover:bg-muted/30 border-border"
                            } cursor-pointer`}
                          >
                            <CardContent className="p-4 pb-3 flex flex-col items-center">
                              {/* Icon at top */}
                              <div className="flex items-center justify-center mb-3">
                                <Icon
                                  className={`h-12 w-12 ${
                                    isCompleted
                                      ? "text-green-600"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              </div>
                              {/* Title */}
                              <h3
                                className={`text-sm font-semibold text-center mb-1 ${
                                  isCompleted
                                    ? "text-green-700 dark:text-green-400"
                                    : ""
                                }`}
                              >
                                {item.title}
                              </h3>
                              {/* Description */}
                              <p className="text-xs text-muted-foreground text-center line-clamp-2">
                                {item.description}
                              </p>
                            </CardContent>
                            {isCompleted && (
                              <CardFooter className="p-3 bg-muted/50 border-t-0 rounded-b-xl">
                                <span className="text-xs font-medium text-green-700 dark:text-green-400 w-full text-center">
                                  Completed
                                </span>
                              </CardFooter>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Details Section */}
              {activeSection === "details" && (
                <div className="space-y-6">
                  <SchoolDetailsCard
                    school={school}
                    onSchoolUpdate={onSchoolUpdate}
                  />
                </div>
              )}

              {/* Users Section */}
              {activeSection === "users" && (
                <div className="space-y-6 pt-1">
                  {/* Action Buttons and Search/Filters */}
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    {/* Add User and Import Data Buttons - Left */}
                    <div className="flex items-center gap-2 h-8">
                      {Object.keys(rowSelection).filter(
                        (key) => rowSelection[key]
                      ).length > 0 ? (
                        <div
                          className="flex items-center gap-2 opacity-0 animate-slide-up-fade-in"
                          style={{ animationFillMode: "forwards" }}
                        >
                          <div className="flex items-center gap-0.5 text-sm text-muted-foreground">
                            <span className="pl-4">
                              {
                                Object.keys(rowSelection).filter(
                                  (key) => rowSelection[key]
                                ).length
                              }
                            </span>
                            <Check className="h-4 w-4" />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="group h-8 w-8 bg-destructive/5 hover:bg-destructive/10 border border-transparent hover:border-destructive transition-all duration-200 ease-in-out"
                              >
                                <Trash2 className="h-4 w-4 text-destructive opacity-100 group-hover:animate-shake-twice" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove from School</TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <>
                          <Button
                            onClick={handleAddUserClick}
                            disabled={loadingUsers && users.length === 0}
                            className="bg-transparent hover:bg-[var(--brand-bullyproof-primary)] text-[var(--brand-bullyproof-primary)] hover:text-white h-10 opacity-0 animate-slide-left-fade-in transition-colors"
                            style={{ animationFillMode: "forwards" }}
                          >
                            <UserPlus className="h-4 w-4" />
                            Add User
                          </Button>
                          <Button
                            onClick={handleImportDataClick}
                            variant="outline"
                            disabled={loadingUsers && users.length === 0}
                            className="h-10 opacity-0 animate-slide-left-fade-in transition-colors"
                            style={{ animationFillMode: "forwards" }}
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Import Data
                          </Button>
                          <Button
                            onClick={handleBulkRoleClick}
                            variant="outline"
                            disabled={loadingUsers && users.length === 0}
                            className="h-10 opacity-0 animate-slide-left-fade-in transition-colors"
                            style={{ animationFillMode: "forwards" }}
                          >
                            <Shield className="h-4 w-4" />
                            Bulk Edit
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Vertical Separator */}
                    <div className="h-6 w-px bg-border" />

                    {/* Search and Filters - Right */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative flex-1 min-w-0 transition-all duration-200 ease-in-out">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={cn(
                            "pl-10 pr-10 transition-all duration-200 ease-in-out",
                            debouncedSearchQuery.trim() &&
                              "border-orange-500 bg-orange-500/10"
                          )}
                          disabled={loadingUsers && users.length === 0}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {searchQuery !== debouncedSearchQuery ||
                          loadingUsers ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : searchQuery ? (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Clear search"
                            >
                              <CircleX className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Select
                          value={roleFilter || "all"}
                          onValueChange={setRoleFilter}
                          disabled={loadingUsers && users.length === 0}
                        >
                          <SelectTrigger
                            className={cn(
                              "w-[180px]",
                              roleFilter &&
                                roleFilter !== "all" &&
                                "border-orange-500 bg-orange-500/10"
                            )}
                            disabled={loadingUsers && users.length === 0}
                          >
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {roles
                              .filter((role) => role.key)
                              .sort((a, b) =>
                                (a.name || "").localeCompare(b.name || "")
                              )
                              .map((role) => {
                                const roleKey = role.key || "";
                                const count = users.filter((user) => {
                                  const schoolRoles = user.schoolRoles.filter(
                                    (sr) =>
                                      sr.schoolId === school.id &&
                                      sr.roleKey === roleKey
                                  );
                                  return schoolRoles.length > 0;
                                }).length;
                                return (
                                  <SelectItem key={role.id} value={roleKey}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{role.name}</span>
                                      {count > 0 && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          {count}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Vertical Separator */}
                    {(searchQuery.trim() ||
                      (roleFilter && roleFilter !== "all")) && (
                      <>
                        <div className="h-6 w-px bg-border" />
                        {/* Clear Filters Button */}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchQuery("");
                            setRoleFilter("");
                          }}
                          className={cn(
                            "flex items-center gap-1",
                            "text-orange-500 border-orange-500/10 hover:text-orange-500 hover:bg-orange-500/10"
                          )}
                          disabled={loadingUsers && users.length === 0}
                        >
                          <CircleX className="h-4 w-4" />
                          Clear Filters
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="w-full space-y-4">
                    <UsersTable
                      users={users}
                      roles={roles}
                      isLoading={loadingUsers}
                      error={usersError?.message || null}
                      schoolId={school?.id}
                      showSelection={true}
                      onRowSelectionChange={setRowSelection}
                    />
                    {Object.keys(rowSelection).length > 0 && (
                      <div className="flex items-center justify-end space-x-2 py-4">
                        <div className="text-muted-foreground flex-1 text-sm">
                          {Object.keys(rowSelection).length} of {users.length}{" "}
                          row(s) selected.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Classes Section */}
              {activeSection === "classes" && (
                <div className="space-y-6 pt-1">
                  {/* Action Buttons and Search/Filters */}
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    {/* Add Class and Import Classes Buttons - Left */}
                    <div className="flex items-center gap-2 h-8">
                      {Object.keys(classesRowSelection).filter(
                        (key) => classesRowSelection[key]
                      ).length > 0 ? (
                        <div
                          className="flex items-center gap-2 opacity-0 animate-slide-up-fade-in"
                          style={{ animationFillMode: "forwards" }}
                        >
                          <div className="flex items-center gap-0.5 text-sm text-muted-foreground">
                            <span className="pl-4">
                              {
                                Object.keys(classesRowSelection).filter(
                                  (key) => classesRowSelection[key]
                                ).length
                              }
                            </span>
                            <Check className="h-4 w-4" />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setBulkYearLevelDialogOpen(true);
                                }}
                                className="group h-8 w-8 bg-primary/5 hover:bg-primary/10 border border-transparent hover:border-primary transition-all duration-200 ease-in-out"
                              >
                                <GraduationCap className="h-4 w-4 text-primary opacity-100" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Bulk Edit Year Levels</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setIsDeleteClassesDialogOpen(true);
                                }}
                                className="group h-8 w-8 bg-destructive/5 hover:bg-destructive/10 border border-transparent hover:border-destructive transition-all duration-200 ease-in-out"
                              >
                                <Trash2 className="h-4 w-4 text-destructive opacity-100 group-hover:animate-shake-twice" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <>
                          <Button
                            onClick={() => {
                              // Mark that we're opening via click, not page load
                              hasHandledInitialDialogRef.current = true;
                              setAddClassDialogOpen(true);
                              if (school?.slug) {
                                const params = new URLSearchParams(
                                  searchParams?.toString() || ""
                                );
                                params.set("school", school.slug);
                                params.set("tab", "classes");
                                params.set("dialog", "add-class");
                                router.push(
                                  `/admin/schools?${params.toString()}`,
                                  {
                                    scroll: false,
                                  }
                                );
                              }
                            }}
                            disabled={loadingClasses && classes.length === 0}
                            className="bg-transparent hover:bg-[var(--brand-bullyproof-primary)] text-[var(--brand-bullyproof-primary)] hover:text-white h-10 opacity-0 animate-slide-left-fade-in transition-colors"
                            style={{ animationFillMode: "forwards" }}
                          >
                            <Plus className="h-4 w-4" />
                            Add Class
                          </Button>
                          <Button
                            onClick={() => {
                              setImportClassesDialogOpen(true);
                              if (school?.slug) {
                                const params = new URLSearchParams(
                                  searchParams?.toString() || ""
                                );
                                params.set("school", school.slug);
                                params.set("tab", "classes");
                                params.set("dialog", "import-classes");
                                router.push(
                                  `/admin/schools?${params.toString()}`,
                                  {
                                    scroll: false,
                                  }
                                );
                              }
                            }}
                            variant="outline"
                            disabled={loadingClasses && classes.length === 0}
                            className="h-10 opacity-0 animate-slide-left-fade-in transition-colors"
                            style={{ animationFillMode: "forwards" }}
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Import Data
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Vertical Separator */}
                    <div className="h-6 w-px bg-border" />

                    {/* Search and Filters - Right */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative flex-1 min-w-0 transition-all duration-200 ease-in-out">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search by class name or code..."
                          value={classesSearchQuery}
                          onChange={(e) =>
                            setClassesSearchQuery(e.target.value)
                          }
                          className={cn(
                            "pl-10 pr-10 transition-all duration-200 ease-in-out",
                            debouncedClassesSearchQuery.trim() &&
                              "border-orange-500 bg-orange-500/10"
                          )}
                          disabled={loadingClasses && classes.length === 0}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {classesSearchQuery !== debouncedClassesSearchQuery ||
                          loadingClasses ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : classesSearchQuery ? (
                            <button
                              type="button"
                              onClick={() => setClassesSearchQuery("")}
                              className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Clear search"
                            >
                              <CircleX className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Select
                          value={yearLevelFilter || "all"}
                          onValueChange={setYearLevelFilter}
                          disabled={loadingClasses && classes.length === 0}
                        >
                          <SelectTrigger
                            className={cn(
                              "w-[180px]",
                              yearLevelFilter &&
                                yearLevelFilter !== "all" &&
                                "border-orange-500 bg-orange-500/10"
                            )}
                            disabled={loadingClasses && classes.length === 0}
                          >
                            <SelectValue placeholder="Year Level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Year Levels</SelectItem>
                            {yearLevelOptions.map(({ yearCode, count }) => (
                              <SelectItem key={yearCode} value={yearCode}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{yearCode}</span>
                                  {count > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {count}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Vertical Separator */}
                    {(classesSearchQuery.trim() ||
                      (yearLevelFilter && yearLevelFilter !== "all")) && (
                      <>
                        <div className="h-6 w-px bg-border" />
                        {/* Clear Filters Button */}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setClassesSearchQuery("");
                            setYearLevelFilter("");
                          }}
                          className={cn(
                            "flex items-center gap-1",
                            "text-orange-500 border-orange-500/10 hover:text-orange-500 hover:bg-orange-500/10"
                          )}
                          disabled={loadingClasses && classes.length === 0}
                        >
                          <CircleX className="h-4 w-4" />
                          Clear Filters
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="w-full space-y-4">
                    {loadingClasses ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : classes.length === 0 ? (
                      <div className="text-center py-8">
                        <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          No Classes Found
                        </h3>
                        <p className="text-muted-foreground">
                          No classes have been created for this school yet.
                        </p>
                      </div>
                    ) : (
                      <>
                        <ClassesTable
                          classes={filteredClasses}
                          isLoading={false}
                          error={null}
                          showSelection={true}
                          onRowSelectionChange={handleClassesRowSelectionChange}
                          onClassClick={handleClassClick}
                        />
                        {Object.keys(classesRowSelection).length > 0 && (
                          <div className="flex items-center justify-between space-x-2 py-4">
                            <div className="text-muted-foreground flex-1 text-sm">
                              {Object.keys(classesRowSelection).length} of{" "}
                              {filteredClasses.length} row(s) selected.
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBulkYearLevelDialogOpen(true);
                                }}
                              >
                                <GraduationCap className="h-4 w-4 mr-2" />
                                Bulk Edit Year Levels
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setIsDeleteClassesDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Selected
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Activity Section */}
              {activeSection === "activity" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Activity</h3>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="sr-only">
                        Activity Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          Activity Feed
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Activity timeline and event tracking coming soon.
                        </p>
                        <div className="text-sm text-muted-foreground">
                          This will show recent lessons, teacher activities, and
                          school events.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Culture Section */}
              {activeSection === "culture" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="sr-only">
                        Culture Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          Culture Insights
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Culture rating analytics and trends coming soon.
                        </p>
                        <div className="text-sm text-muted-foreground">
                          This will include detailed culture metrics, trends,
                          and recommendations.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* License Section */}
              {activeSection === "license" && (
                <div className="space-y-6">
                  {/* School Licence Card */}
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    {loadingLicence ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ) : schoolLicence ? (
                      <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900 p-0">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                <Key className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">
                                    School Licence
                                  </h4>
                                  <Badge
                                    variant={
                                      schoolLicence.status === "ACTIVE"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={
                                      schoolLicence.status === "ACTIVE"
                                        ? "bg-green-600"
                                        : ""
                                    }
                                  >
                                    {schoolLicence.status}
                                  </Badge>
                                </div>
                                {licenseUser?.email && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {licenseUser.email}
                                  </p>
                                )}
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  {schoolLicence.startsAt && (
                                    <p>
                                      Starts:{" "}
                                      {new Date(
                                        schoolLicence.startsAt
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                  {schoolLicence.endsAt && (
                                    <p>
                                      Expires:{" "}
                                      {new Date(
                                        schoolLicence.endsAt
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                  {schoolLicence.planLength && (
                                    <p>
                                      Duration: {schoolLicence.planLength} year
                                      {schoolLicence.planLength !== 1
                                        ? "s"
                                        : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setAddLicenceDialogOpen(true);
                          // Add dialog query parameter to URL
                          if (school?.slug) {
                            const params = new URLSearchParams(
                              searchParams?.toString() || ""
                            );
                            params.set("school", school.slug);
                            params.set("tab", "license");
                            params.set("dialog", "ADD-school-licence");
                            router.push(`/admin/schools?${params.toString()}`, {
                              scroll: false,
                            });
                          }
                        }}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                              <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h4 className="font-semibold">
                                Add School Licence
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Create a new licence
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </SheetContent>

      {/* Add School Licence Dialog */}
      <Dialog
        open={addLicenceDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Set flag to prevent effect from interfering
            isClosingDialogRef.current = true;

            // Close dialog immediately
            setAddLicenceDialogOpen(false);
            setLicenceDuration("");
            setSchoolLicenceEmail("");
            setExistingLicenceEmail(null);

            // Remove dialog query parameter from URL
            const params = new URLSearchParams(searchParams?.toString() || "");
            params.delete("dialog");
            const newUrl = params.toString()
              ? `/admin/schools?${params.toString()}`
              : "/admin/schools";
            router.replace(newUrl, { scroll: false });

            // Reset flag after a brief delay to allow URL update to complete
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          } else {
            setAddLicenceDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add School Licence</DialogTitle>
            <DialogDescription>
              Create a new licence for this school.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 py-4">
            <div className="flex gap-4">
              <div className="space-y-2 shrink-0">
                <Label htmlFor="licence-duration">Duration</Label>
                <Select
                  value={licenceDuration}
                  onValueChange={setLicenceDuration}
                >
                  <SelectTrigger id="licence-duration" className="w-[140px]">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Year</SelectItem>
                    <SelectItem value="2">2 Years</SelectItem>
                    <SelectItem value="3">3 Years</SelectItem>
                    <SelectItem value="4">4 Years</SelectItem>
                    <SelectItem value="5">5 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="school-licence-email">Main School Email</Label>
                <Input
                  id="school-licence-email"
                  type="email"
                  placeholder={
                    existingLicenceEmail ? undefined : "Enter main school email"
                  }
                  value={schoolLicenceEmail}
                  onChange={(e) => {
                    setSchoolLicenceEmail(e.target.value);
                    // Clear error when user starts typing
                    if (licenceError) {
                      setLicenceError(null);
                    }
                  }}
                  disabled={loadingLicenceEmail || !!existingLicenceEmail}
                  className={
                    schoolLicenceEmail &&
                    !existingLicenceEmail &&
                    !isValidEmail(schoolLicenceEmail)
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {schoolLicenceEmail &&
                  !existingLicenceEmail &&
                  !isValidEmail(schoolLicenceEmail) && (
                    <p className="text-sm text-red-500">
                      Please enter a valid email address (e.g., name@domain.com)
                    </p>
                  )}
                {existingLicenceEmail && (
                  <p className="text-sm text-muted-foreground">
                    Using existing licence email
                  </p>
                )}
                {licenceError && (
                  <div className="mt-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium">
                      {licenceError}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Set flag to prevent effect from interfering
                isClosingDialogRef.current = true;

                // Close dialog immediately
                setAddLicenceDialogOpen(false);
                setLicenceDuration("");
                setSchoolLicenceEmail("");
                setExistingLicenceEmail(null);
                setLicenceError(null);

                // Remove dialog query parameter from URL
                const params = new URLSearchParams(
                  searchParams?.toString() || ""
                );
                params.delete("dialog");
                const newUrl = params.toString()
                  ? `/admin/schools?${params.toString()}`
                  : "/admin/schools";
                router.replace(newUrl, { scroll: false });

                // Reset flag after a brief delay to allow URL update to complete
                setTimeout(() => {
                  isClosingDialogRef.current = false;
                }, 100);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!school || !licenceDuration || !hasValidEmail) return;
                setSubmitting(true);
                setLicenceError(null);
                try {
                  const result = await licencesApi.post.create({
                    schoolId: school.id,
                    status: "ACTIVE",
                    durationYears: parseInt(licenceDuration),
                    metadata: schoolLicenceEmail
                      ? { mainSchoolEmail: schoolLicenceEmail }
                      : undefined,
                  });
                  if (result.error) {
                    console.warn("Failed to create licence:", result.error);
                    // Check if it's the constraint violation error
                    // Handle both string and object error formats
                    const error = result.error;
                    const errorMessage =
                      typeof error === "string"
                        ? error
                        : (error as { message?: string })?.message ||
                          String(error);
                    if (
                      errorMessage.includes("already been used") ||
                      errorMessage.includes("cannot have any other roles")
                    ) {
                      setLicenceError(
                        "This email has already been used for another role! The school licence can only be tied to the school email, and it cannot have any other roles."
                      );
                    } else {
                      setLicenceError(
                        errorMessage ||
                          "Failed to create licence. Please try again."
                      );
                    }
                    setSubmitting(false);
                  } else {
                    // Set flag to prevent effect from interfering
                    isClosingDialogRef.current = true;

                    // Close dialog immediately
                    setAddLicenceDialogOpen(false);
                    setLicenceDuration("");
                    setSchoolLicenceEmail("");
                    setExistingLicenceEmail(null);

                    // Remove dialog query parameter from URL
                    const params = new URLSearchParams(
                      searchParams?.toString() || ""
                    );
                    params.delete("dialog");
                    const newUrl = params.toString()
                      ? `/admin/schools?${params.toString()}`
                      : "/admin/schools";
                    router.replace(newUrl, { scroll: false });

                    // Refresh school data and licence
                    onSchoolUpdate?.();
                    // Also refresh the licence in this component
                    if (school) {
                      setLoadingLicence(true);
                      // First check for ACTIVE licence
                      licencesApi.get
                        .list({
                          schoolId: school.id,
                          status: "ACTIVE",
                          limit: 1,
                        })
                        .then((refreshResult) => {
                          if (
                            !refreshResult.error &&
                            refreshResult.data &&
                            refreshResult.data.length > 0
                          ) {
                            setSchoolLicence(refreshResult.data[0]);
                            setLoadingLicence(false);
                          } else {
                            // Check for PENDING status
                            licencesApi.get
                              .list({
                                schoolId: school.id,
                                status: "PENDING",
                                limit: 1,
                              })
                              .then((pendingResult) => {
                                if (
                                  !pendingResult.error &&
                                  pendingResult.data &&
                                  pendingResult.data.length > 0
                                ) {
                                  setSchoolLicence(pendingResult.data[0]);
                                } else {
                                  setSchoolLicence(null);
                                }
                              })
                              .catch((error) => {
                                console.error(
                                  "Failed to refresh pending licence:",
                                  error
                                );
                                setSchoolLicence(null);
                              })
                              .finally(() => {
                                setLoadingLicence(false);
                              });
                          }
                        })
                        .catch((error) => {
                          console.error("Failed to refresh licence:", error);
                          setSchoolLicence(null);
                          setLoadingLicence(false);
                        });
                    }

                    // Reset flag after a brief delay to allow URL update to complete
                    setTimeout(() => {
                      isClosingDialogRef.current = false;
                    }, 100);
                  }
                } catch (error: any) {
                  console.warn("Error creating licence:", error);
                  // Check if it's the constraint violation error
                  const errorMessage =
                    error?.message || error?.toString() || "";
                  if (
                    errorMessage.includes("already been used") ||
                    errorMessage.includes("cannot have any other roles")
                  ) {
                    setLicenceError(
                      "This email has already been used for another role! The school licence can only be tied to the school email, and it cannot have any other roles."
                    );
                  } else {
                    setLicenceError(
                      errorMessage ||
                        "Failed to create licence. Please try again."
                    );
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting || !licenceDuration || !hasValidEmail}
            >
              {submitting ? "Creating..." : "Create Licence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual User Dialog */}
      <AddManualUserDialog
        open={addUserDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Set flag to prevent effect from interfering
            isClosingDialogRef.current = true;

            // Close dialog immediately
            setAddUserDialogOpen(false);

            // Remove dialog query parameter from URL
            const params = new URLSearchParams(searchParams?.toString() || "");
            params.delete("dialog");
            const newUrl = params.toString()
              ? `/admin/schools?${params.toString()}`
              : "/admin/schools";
            router.replace(newUrl, { scroll: false });

            // Reset flag after a brief delay to allow URL update to complete
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          } else {
            setAddUserDialogOpen(open);
          }
        }}
        school={school}
        onSuccess={async () => {
          // Wait a bit to ensure database transactions are committed
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Invalidate React Query cache for users - React Query will automatically refetch
          await queryClient.invalidateQueries({ queryKey: userKeys.all });

          // Refresh school data to update counts (including schoolAdminCount)
          onSchoolUpdate?.();
        }}
      />

      {/* Import Classes Dialog */}
      <ImportClassesDialog
        open={importClassesDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Set flag to prevent effect from interfering
            isClosingDialogRef.current = true;

            // Close dialog immediately
            setImportClassesDialogOpen(false);

            // Remove dialog query parameter from URL
            const params = new URLSearchParams(searchParams?.toString() || "");
            params.delete("dialog");
            const newUrl = params.toString()
              ? `/admin/schools?${params.toString()}`
              : "/admin/schools";
            router.replace(newUrl, { scroll: false });

            // Reset flag after a brief delay to allow URL update to complete
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          } else {
            setImportClassesDialogOpen(open);
          }
        }}
        school={school}
        onSuccess={async () => {
          // Wait a bit to ensure database transactions are committed
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Refresh classes list
          if (school?.id) {
            setLoadingClasses(true);
            try {
              const result = await classesApi.get.list({
                schoolId: school.id,
              });
              if (result.data) {
                setClasses(result.data);
              }
            } catch (error) {
              console.error("Failed to refresh classes:", error);
            } finally {
              setLoadingClasses(false);
            }
          }

          // Refresh school data to update counts
          onSchoolUpdate?.();
        }}
      />

      {/* Import Users Dialog */}
      <ImportUsersDialog
        open={importUsersDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Set flag to prevent effect from interfering
            isClosingDialogRef.current = true;

            // Close dialog immediately
            setImportUsersDialogOpen(false);

            // Remove dialog query parameter from URL
            const params = new URLSearchParams(searchParams?.toString() || "");
            params.delete("dialog");
            const newUrl = params.toString()
              ? `/admin/schools?${params.toString()}`
              : "/admin/schools";
            router.replace(newUrl, { scroll: false });

            // Reset flag after a brief delay to allow URL update to complete
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          } else {
            setImportUsersDialogOpen(open);
          }
        }}
        school={school}
        onSuccess={async () => {
          // Wait a bit to ensure database transactions are committed
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Invalidate React Query cache for users - React Query will automatically refetch
          await queryClient.invalidateQueries({ queryKey: userKeys.all });

          // Refresh school data to update counts (including schoolAdminCount)
          onSchoolUpdate?.();
        }}
      />

      {/* Bulk Role Dialog */}
      <BulkRoleDialog
        open={bulkRoleDialogOpen}
        onOpenChange={setBulkRoleDialogOpen}
        school={school}
        onSuccess={async () => {
          // Wait a bit to ensure database transactions are committed
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Invalidate React Query cache for users - React Query will automatically refetch
          await queryClient.invalidateQueries({ queryKey: userKeys.all });

          // Refresh school data to update counts
          onSchoolUpdate?.();
        }}
      />

      {/* Add Class Dialog */}
      <Dialog
        open={addClassDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Set flag to prevent effect from interfering
            isClosingDialogRef.current = true;

            // Close dialog immediately
            setAddClassDialogOpen(false);
            setClassName("");
            setClassCode("");
            setClassRunningYear(new Date().getFullYear().toString());
            setSelectedYearIds([]);

            // Remove dialog query parameter from URL
            const params = new URLSearchParams(searchParams?.toString() || "");
            params.delete("dialog");
            const newUrl = params.toString()
              ? `/admin/schools?${params.toString()}`
              : "/admin/schools";
            router.replace(newUrl, { scroll: false });

            // Reset flag after a brief delay to allow URL update to complete
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          } else {
            setAddClassDialogOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>
              Create a new class for {school?.name || "this school"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Class Name and Class Code in same row */}
            <div className="grid grid-cols-5 gap-4">
              {/* Class Name - 3/5 width */}
              <div className="col-span-3 space-y-1.5">
                <Label
                  htmlFor="class-name"
                  className="text-xs text-muted-foreground ml-2"
                >
                  Class Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="class-name"
                  placeholder="Enter class name"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>
              {/* Class Code - 2/5 width */}
              <div className="col-span-2 space-y-1.5">
                <Label
                  htmlFor="class-code"
                  className="text-xs text-muted-foreground ml-2"
                >
                  Class Code
                </Label>
                <Input
                  id="class-code"
                  placeholder="Code (optional)"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                />
              </div>
            </div>

            {/* Class Running Year and School Years - Side by side */}
            <div className="flex gap-4 mt-6">
              {/* Class Running Year - Half width */}
              <div className="flex-1 space-y-1.5">
                <Label
                  htmlFor="class-running-year"
                  className="text-xs text-muted-foreground ml-2"
                >
                  Running Year
                </Label>
                <Select
                  value={classRunningYear}
                  onValueChange={setClassRunningYear}
                >
                  <SelectTrigger id="class-running-year" className="w-full">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {getClassRunningYearOptions().map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* School Years Multi-Select - Half width */}
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">
                  School Years <span className="text-red-500">*</span>
                </Label>
                <Popover
                  modal
                  open={yearComboboxOpen}
                  onOpenChange={setYearComboboxOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={yearComboboxOpen}
                      className="w-full justify-between"
                    >
                      {selectedYearIds.length === 0
                        ? "Select years..."
                        : `${selectedYearIds.length} year${
                            selectedYearIds.length > 1 ? "s" : ""
                          } selected`}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0 [&_[data-slot='command-list']]:[&::-webkit-scrollbar]:w-2 [&_[data-slot='command-list']]:[&::-webkit-scrollbar-track]:bg-transparent [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:rounded-full [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:bg-border [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:hover:bg-border/80"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search years..." />
                      <CommandList className="[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:hover:bg-border/80">
                        <CommandEmpty>
                          {loadingYears ? "Loading..." : "No years found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableYears.map((year) => {
                            const isSelected = selectedYearIds.includes(
                              year.id
                            );
                            return (
                              <CommandItem
                                key={year.id}
                                value={`${year.displayName} ${year.code || ""}`}
                                onSelect={() => {
                                  if (isSelected) {
                                    setSelectedYearIds(
                                      selectedYearIds.filter(
                                        (id) => id !== year.id
                                      )
                                    );
                                  } else {
                                    setSelectedYearIds([
                                      ...selectedYearIds,
                                      year.id,
                                    ]);
                                  }
                                }}
                                className={
                                  isSelected
                                    ? "bg-[var(--brand-bullyproof-primary)]/10"
                                    : ""
                                }
                              >
                                <span className="flex-1">
                                  {year.displayName}
                                </span>
                                <Check
                                  className={`ml-2 h-4 w-4 ${
                                    isSelected ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator className="mt-6 mb-6" />

            {/* Class Preview Card */}
            {(className ||
              classCode ||
              classRunningYear ||
              selectedYearIds.length > 0) && (
              <Card className="border-2 border-dashed bg-muted/30 py-4">
                <CardContent className="px-4">
                  <div className="space-y-1.5">
                    {/* Header: School name and Year */}
                    <div className="flex items-center justify-between">
                      {school?.name && (
                        <div className="text-sm text-muted-foreground">
                          {school.name}
                        </div>
                      )}
                      {classRunningYear && (
                        <div className="text-sm font-medium text-muted-foreground">
                          {classRunningYear}
                        </div>
                      )}
                    </div>

                    {/* Class name with icon */}
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-6 w-6 text-muted-foreground" />
                      {className ? (
                        <span className="text-xl font-bold">{className}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground/50 italic">
                          N/A
                        </span>
                      )}
                      {classCode && (
                        <p className="text-xs text-muted-foreground">
                          {classCode}
                        </p>
                      )}
                    </div>
                    {/* Year level badges */}
                    {selectedYearIds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedYearIds.map((yearId) => {
                          const year = availableYears.find(
                            (y) => y.id === yearId
                          );
                          if (!year) return null;
                          return (
                            <Badge
                              key={yearId}
                              variant="secondary"
                              className="text-xs"
                            >
                              {year.displayName}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Set flag to prevent effect from interfering
                isClosingDialogRef.current = true;

                // Close dialog immediately
                setAddClassDialogOpen(false);
                setClassName("");
                setClassCode("");
                setClassRunningYear("");
                setSelectedYearIds([]);

                // Remove dialog query parameter from URL
                const params = new URLSearchParams(
                  searchParams?.toString() || ""
                );
                params.delete("dialog");
                const newUrl = params.toString()
                  ? `/admin/schools?${params.toString()}`
                  : "/admin/schools";
                router.replace(newUrl, { scroll: false });

                // Reset flag after a brief delay to allow URL update to complete
                setTimeout(() => {
                  isClosingDialogRef.current = false;
                }, 100);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!school || !className || selectedYearIds.length === 0)
                  return;
                setSubmitting(true);
                try {
                  // Convert selected year to January 1st of that year
                  const startYearDate = classRunningYear
                    ? new Date(
                        `${classRunningYear}-01-01T00:00:00.000Z`
                      ).toISOString()
                    : undefined;

                  // If no code provided, use the class name as the code
                  const finalCode = classCode.trim() || className.trim();

                  const result = await classesApi.post.create({
                    schoolId: school.id,
                    name: className,
                    code: finalCode,
                    yearIds: selectedYearIds,
                    startYear: startYearDate,
                  });
                  if (result.error) {
                    console.error("Failed to create class:", result.error);
                  } else {
                    // Set flag to prevent effect from interfering
                    isClosingDialogRef.current = true;

                    // Close dialog immediately
                    setAddClassDialogOpen(false);
                    setClassName("");
                    setClassCode("");
                    setClassRunningYear("");
                    setSelectedYearIds([]);

                    // Remove dialog query parameter from URL
                    const params = new URLSearchParams(
                      searchParams?.toString() || ""
                    );
                    params.delete("dialog");
                    const newUrl = params.toString()
                      ? `/admin/schools?${params.toString()}`
                      : "/admin/schools";
                    router.replace(newUrl, { scroll: false });

                    // Refresh classes list
                    if (activeSection === "classes") {
                      setLoadingClasses(true);
                      classesApi.get
                        .list({ schoolId: school.id })
                        .then((refreshResult) => {
                          if (!refreshResult.error && refreshResult.data) {
                            setClasses(refreshResult.data);
                          }
                        })
                        .catch((error) => {
                          console.error("Failed to refresh classes:", error);
                        })
                        .finally(() => {
                          setLoadingClasses(false);
                        });
                    }
                    onSchoolUpdate?.();

                    // Reset flag after a brief delay to allow URL update to complete
                    setTimeout(() => {
                      isClosingDialogRef.current = false;
                    }, 100);
                  }
                } catch (error) {
                  console.error("Failed to create class:", error);
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={
                submitting || !className || selectedYearIds.length === 0
              }
            >
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      {editingClass && (
        <Dialog
          open={editClassDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEditClassDialogOpen(false);
              setEditingClass(null);
              setEditClassName("");
              setEditClassCode("");
              setEditClassStudentCap("");
              setEditClassActive(true);
              setEditClassRunningYear("");
              setEditSelectedYearIds([]);
              setEditSelectedTeacherIds([]);
            } else {
              setEditClassDialogOpen(open);
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Update class information for {school?.name || "this school"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {editingClass && (
                <>
                  {/* Class Name and Class Code in same row */}
                  <div className="grid grid-cols-5 gap-4">
                    {/* Class Name - 3/5 width */}
                    <div className="col-span-3 space-y-1.5">
                      <Label
                        htmlFor="edit-class-name"
                        className="text-xs text-muted-foreground ml-2"
                      >
                        Class Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-class-name"
                        placeholder="Enter class name"
                        value={editClassName}
                        onChange={(e) => setEditClassName(e.target.value)}
                      />
                    </div>
                    {/* Class Code - 2/5 width */}
                    <div className="col-span-2 space-y-1.5">
                      <Label
                        htmlFor="edit-class-code"
                        className="text-xs text-muted-foreground ml-2"
                      >
                        Class Code
                      </Label>
                      <Input
                        id="edit-class-code"
                        placeholder="Code (optional)"
                        value={editClassCode}
                        onChange={(e) => setEditClassCode(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Student Cap and Active Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="edit-student-cap"
                        className="text-xs text-muted-foreground ml-2"
                      >
                        Student Capacity
                      </Label>
                      <Input
                        id="edit-student-cap"
                        type="number"
                        placeholder="Number of students"
                        value={editClassStudentCap}
                        onChange={(e) => setEditClassStudentCap(e.target.value)}
                        min="1"
                        max="1000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground ml-2">
                        Status
                      </Label>
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox
                          id="edit-class-active"
                          checked={editClassActive}
                          onCheckedChange={(checked) =>
                            setEditClassActive(checked === true)
                          }
                        />
                        <Label
                          htmlFor="edit-class-active"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Active
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Running Year */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="edit-running-year"
                      className="text-xs text-muted-foreground ml-2"
                    >
                      Running Year
                    </Label>
                    <Select
                      value={editClassRunningYear}
                      onValueChange={setEditClassRunningYear}
                    >
                      <SelectTrigger id="edit-running-year" className="w-full">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {getClassRunningYearOptions().map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                            {year.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* School Years Multi-Select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground ml-2">
                      School Years <span className="text-red-500">*</span>
                    </Label>
                    <Popover
                      modal
                      open={editYearComboboxOpen}
                      onOpenChange={setEditYearComboboxOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={editYearComboboxOpen}
                          className="w-full justify-between"
                        >
                          {editSelectedYearIds.length === 0
                            ? "Select years..."
                            : `${editSelectedYearIds.length} year${
                                editSelectedYearIds.length > 1 ? "s" : ""
                              } selected`}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0 [&_[data-slot='command-list']]:[&::-webkit-scrollbar]:w-2 [&_[data-slot='command-list']]:[&::-webkit-scrollbar-track]:bg-transparent [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:rounded-full [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:bg-border [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:hover:bg-border/80"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Search years..." />
                          <CommandList className="[&_[data-slot='command-list']]:[&::-webkit-scrollbar]:w-2 [&_[data-slot='command-list']]:[&::-webkit-scrollbar-track]:bg-transparent [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:rounded-full [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:bg-border [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:hover:bg-border/80">
                            <CommandEmpty>
                              {editLoadingYears
                                ? "Loading..."
                                : "No years found."}
                            </CommandEmpty>
                            <CommandGroup>
                              {editAvailableYears.map((year) => {
                                const isSelected = editSelectedYearIds.includes(
                                  year.id
                                );
                                return (
                                  <CommandItem
                                    key={year.id}
                                    value={`${year.displayName} ${year.code || ""}`}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setEditSelectedYearIds(
                                          editSelectedYearIds.filter(
                                            (id) => id !== year.id
                                          )
                                        );
                                      } else {
                                        setEditSelectedYearIds([
                                          ...editSelectedYearIds,
                                          year.id,
                                        ]);
                                      }
                                    }}
                                    className={
                                      isSelected
                                        ? "bg-[var(--brand-bullyproof-primary)]/10"
                                        : ""
                                    }
                                  >
                                    <span className="flex-1">
                                      {year.displayName}
                                    </span>
                                    <Check
                                      className={`ml-2 h-4 w-4 ${
                                        isSelected ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Teachers Multi-Select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground ml-2">
                      Teachers
                    </Label>
                    <Popover
                      modal
                      open={editTeacherComboboxOpen}
                      onOpenChange={setEditTeacherComboboxOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={editTeacherComboboxOpen}
                          className="w-full justify-between"
                        >
                          {editSelectedTeacherIds.length === 0
                            ? "Select teachers..."
                            : `${editSelectedTeacherIds.length} teacher${
                                editSelectedTeacherIds.length > 1 ? "s" : ""
                              } selected`}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0 [&_[data-slot='command-list']]:[&::-webkit-scrollbar]:w-2 [&_[data-slot='command-list']]:[&::-webkit-scrollbar-track]:bg-transparent [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:rounded-full [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:bg-border [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:hover:bg-border/80"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Search teachers..." />
                          <CommandList className="[&_[data-slot='command-list']]:[&::-webkit-scrollbar]:w-2 [&_[data-slot='command-list']]:[&::-webkit-scrollbar-track]:bg-transparent [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:rounded-full [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:bg-border [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:hover:bg-border/80">
                            <CommandEmpty>
                              {loadingUsers
                                ? "Loading..."
                                : "No teachers found."}
                            </CommandEmpty>
                            <CommandGroup>
                              {editAvailableTeachers.map((teacher) => {
                                const isSelected =
                                  editSelectedTeacherIds.includes(teacher.id);
                                const fullName =
                                  `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() ||
                                  teacher.email;
                                return (
                                  <CommandItem
                                    key={teacher.id}
                                    value={`${fullName} ${teacher.email || ""}`}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setEditSelectedTeacherIds(
                                          editSelectedTeacherIds.filter(
                                            (id) => id !== teacher.id
                                          )
                                        );
                                      } else {
                                        setEditSelectedTeacherIds([
                                          ...editSelectedTeacherIds,
                                          teacher.id,
                                        ]);
                                      }
                                    }}
                                    className={
                                      isSelected
                                        ? "bg-[var(--brand-bullyproof-primary)]/10"
                                        : ""
                                    }
                                  >
                                    <span className="flex-1">{fullName}</span>
                                    <Check
                                      className={`ml-2 h-4 w-4 ${
                                        isSelected ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator className="mt-6 mb-6" />

                  {/* Class Preview Card */}
                  {(editClassName ||
                    editClassCode ||
                    editSelectedYearIds.length > 0) && (
                    <Card className="border-2 border-dashed bg-muted/30 py-4">
                      <CardContent className="px-4">
                        <div className="space-y-1.5">
                          {/* Header: School name */}
                          {school?.name && (
                            <div className="text-sm text-muted-foreground">
                              {school.name}
                            </div>
                          )}

                          {/* Class name with icon */}
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-6 w-6 text-muted-foreground" />
                            {editClassName ? (
                              <span className="text-xl font-bold">
                                {editClassName}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground/50 italic">
                                N/A
                              </span>
                            )}
                            {editClassCode && (
                              <p className="text-xs text-muted-foreground">
                                {editClassCode}
                              </p>
                            )}
                          </div>
                          {/* Year level badges */}
                          {editSelectedYearIds.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {editSelectedYearIds.map((yearId) => {
                                const year = editAvailableYears.find(
                                  (y) => y.id === yearId
                                );
                                if (!year) return null;
                                return (
                                  <Badge
                                    key={yearId}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {year.displayName}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          {/* Student cap */}
                          {editClassStudentCap && (
                            <div className="text-sm text-muted-foreground">
                              Capacity: {editClassStudentCap} students
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditClassDialogOpen(false);
                  setEditingClass(null);
                  setEditClassName("");
                  setEditClassCode("");
                  setEditClassStudentCap("");
                  setEditClassActive(true);
                  setEditClassRunningYear("");
                  setEditSelectedYearIds([]);
                  setEditSelectedTeacherIds([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (
                    !editingClass ||
                    !school ||
                    !editClassName.trim() ||
                    editSelectedYearIds.length === 0
                  )
                    return;
                  setSubmitting(true);
                  try {
                    const studentCap = editClassStudentCap.trim()
                      ? parseInt(editClassStudentCap.trim(), 10)
                      : undefined;

                    // Convert running year to datetime string (January 1st of that year)
                    const startYearDate = editClassRunningYear
                      ? new Date(
                          `${editClassRunningYear}-01-01T00:00:00.000Z`
                        ).toISOString()
                      : undefined;

                    const result = await classesApi.put.update(
                      editingClass.id,
                      {
                        name: editClassName.trim(),
                        code: editClassCode.trim() || undefined,
                        studentCap,
                        active: editClassActive,
                        yearIds: editSelectedYearIds,
                        teacherIds: editSelectedTeacherIds,
                        startYear: startYearDate,
                      }
                    );
                    if (result.error) {
                      console.error("Failed to update class:", result.error);
                    } else {
                      // Close dialog
                      setEditClassDialogOpen(false);
                      setEditingClass(null);
                      setEditClassName("");
                      setEditClassCode("");
                      setEditClassStudentCap("");
                      setEditClassActive(true);
                      setEditClassRunningYear("");
                      setEditSelectedYearIds([]);
                      setEditSelectedTeacherIds([]);

                      // Refresh classes list
                      if (activeSection === "classes") {
                        setLoadingClasses(true);
                        classesApi.get
                          .list({ schoolId: school.id })
                          .then((refreshResult) => {
                            if (!refreshResult.error && refreshResult.data) {
                              setClasses(refreshResult.data);
                            }
                          })
                          .catch((error) => {
                            console.error("Failed to refresh classes:", error);
                          })
                          .finally(() => {
                            setLoadingClasses(false);
                          });
                      }
                      onSchoolUpdate?.();
                    }
                  } catch (error) {
                    console.error("Failed to update class:", error);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={
                  submitting ||
                  !editClassName.trim() ||
                  editSelectedYearIds.length === 0
                }
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Remove Users from School Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Users from School</DialogTitle>
            <DialogDescription>
              You're about to remove these users from{" "}
              {school?.name || "this school"}. This will remove all their roles,
              positions, and class associations for this school. The users
              themselves will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-4">
              {Object.keys(rowSelection)
                .filter((key) => rowSelection[key])
                .map((rowIndex) => {
                  const user = users[parseInt(rowIndex)];
                  if (!user) return null;
                  const fullName = [user.firstName, user.lastName]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">
                          {fullName || user.email}
                        </div>
                        {fullName && (
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setIsConfirmDeleteDialogOpen(true);
              }}
            >
              Remove from School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove from School Dialog */}
      <Dialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmDeleteDialogOpen(open);
          if (!open) {
            setDeleteError(null);
            setIsDeleting(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This will remove all roles, positions, and class associations for
              these users at {school?.name || "this school"}. The users
              themselves will not be deleted and can be added back to the school
              later if needed.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDeleteDialogOpen(false);
                setRowSelection({});
                setDeleteError(null);
                setIsDeleting(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const selectedUserIds = Object.keys(rowSelection)
                  .filter((key) => rowSelection[key])
                  .map((rowIndex) => {
                    const user = users[parseInt(rowIndex)];
                    return user?.id;
                  })
                  .filter(Boolean) as string[];

                if (selectedUserIds.length === 0) {
                  setIsConfirmDeleteDialogOpen(false);
                  setRowSelection({});
                  return;
                }

                setIsDeleting(true);
                setDeleteError(null);

                if (!school?.id) {
                  setDeleteError("School ID is missing");
                  setIsDeleting(false);
                  return;
                }

                try {
                  const result = await apiFetch<{
                    success: boolean;
                    removed: number;
                    failed: number;
                    results: {
                      successful: string[];
                      failed: Array<{ userId: string; error: string }>;
                    };
                  }>(`/schools/${school.id}/users/remove`, {
                    method: "POST",
                    body: JSON.stringify({ userIds: selectedUserIds }),
                  });

                  if (result.error) {
                    setDeleteError(
                      result.error.message ||
                        "Failed to remove users from school"
                    );
                    setIsDeleting(false);
                    return;
                  }

                  if (result.data) {
                    const { removed, failed, results } = result.data;

                    // Invalidate React Query cache for users - React Query will automatically refetch
                    await queryClient.invalidateQueries({
                      queryKey: userKeys.all,
                    });

                    if (failed > 0) {
                      // Partial success - show error but keep dialog open
                      const failedMessages = results.failed
                        .map((f) => {
                          const failedUser = users.find(
                            (u) => u.id === f.userId
                          );
                          const userName = failedUser
                            ? [failedUser.firstName, failedUser.lastName]
                                .filter(Boolean)
                                .join(" ") || failedUser.email
                            : f.userId;
                          return `${userName}: ${f.error}`;
                        })
                        .join(", ");
                      setDeleteError(
                        `Successfully removed ${removed} user(s) from school, but failed to remove ${failed} user(s): ${failedMessages}`
                      );
                      // Clear selection for successfully removed users
                      const newSelection: Record<string, boolean> = {};
                      Object.keys(rowSelection).forEach((key) => {
                        const user = users[parseInt(key)];
                        if (user && !results.successful.includes(user.id)) {
                          newSelection[key] = true;
                        }
                      });
                      setRowSelection(newSelection);
                    } else {
                      // Complete success - close dialogs and clear selection
                      setIsConfirmDeleteDialogOpen(false);
                      setRowSelection({});
                    }
                  }
                } catch (error: any) {
                  console.error("[REMOVE USERS FROM SCHOOL] Error:", error);
                  setDeleteError(
                    error.message || "An unexpected error occurred"
                  );
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove from School"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Classes Dialog */}
      <Dialog
        open={isDeleteClassesDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteClassesDialogOpen(open);
          if (!open) {
            setDeleteClassesError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Classes</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the selected classes? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-2">
              {Object.keys(classesRowSelection)
                .filter((key) => classesRowSelection[key])
                .map((rowIndex) => {
                  const classItem = filteredClasses[parseInt(rowIndex)];
                  if (!classItem) return null;
                  return (
                    <div
                      key={classItem.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">{classItem.name}</div>
                        {classItem.code && (
                          <div className="text-sm text-muted-foreground">
                            {classItem.code}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteClassesDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteClassesDialogOpen(false);
                setIsConfirmDeleteClassesDialogOpen(true);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Classes Dialog */}
      <Dialog
        open={isConfirmDeleteClassesDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmDeleteClassesDialogOpen(open);
          if (!open) {
            setDeleteClassesError(null);
            setIsDeletingClasses(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action is irreversible. Are you absolutely sure you want to
              delete these classes?
            </DialogDescription>
          </DialogHeader>
          {deleteClassesError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{deleteClassesError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDeleteClassesDialogOpen(false);
                setClassesRowSelection({});
                setDeleteClassesError(null);
                setIsDeletingClasses(false);
              }}
              disabled={isDeletingClasses}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const selectedClassIds = Object.keys(classesRowSelection)
                  .filter((key) => classesRowSelection[key])
                  .map((rowIndex) => {
                    const classItem = filteredClasses[parseInt(rowIndex)];
                    return classItem?.id;
                  })
                  .filter(Boolean) as string[];

                if (selectedClassIds.length === 0) {
                  setIsConfirmDeleteClassesDialogOpen(false);
                  setClassesRowSelection({});
                  return;
                }

                setIsDeletingClasses(true);
                setDeleteClassesError(null);

                try {
                  // Delete classes in batch using Drizzle batch operations
                  const result = await classesApi.delete.deleteBatch({
                    classIds: selectedClassIds,
                  });

                  if (result.error) {
                    setDeleteClassesError(
                      result.error.message || "Failed to delete classes"
                    );
                  } else {
                    // Complete success - close dialogs and refresh
                    setIsConfirmDeleteClassesDialogOpen(false);
                    setClassesRowSelection({});
                    // Refresh classes list
                    if (activeSection === "classes") {
                      setLoadingClasses(true);
                      classesApi.get
                        .list({ schoolId: school?.id })
                        .then((refreshResult) => {
                          if (!refreshResult.error && refreshResult.data) {
                            setClasses(refreshResult.data);
                          }
                        })
                        .catch((error) => {
                          console.error("Failed to refresh classes:", error);
                        })
                        .finally(() => {
                          setLoadingClasses(false);
                        });
                    }
                    onSchoolUpdate?.();
                  }
                } catch (error: any) {
                  console.error("[CLASS DELETE] Error:", error);
                  setDeleteClassesError(
                    error.message || "An unexpected error occurred"
                  );
                } finally {
                  setIsDeletingClasses(false);
                }
              }}
              disabled={isDeletingClasses}
            >
              {isDeletingClasses ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete School Dialog */}
      <Dialog
        open={isDeleteSchoolDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteSchoolDialogOpen(open);
          if (!open) {
            setDeleteSchoolError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete School</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this school? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This will permanently delete the school and all related data
                including:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All classes</li>
                  <li>All lessons</li>
                  <li>All user roles associated with this school</li>
                  <li>All school licences</li>
                  <li>All school invites</li>
                  <li>All school level assignments</li>
                  <li>All user school positions</li>
                </ul>
              </AlertDescription>
            </Alert>
            {deleteSchoolError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{deleteSchoolError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteSchoolDialogOpen(false);
                setDeleteSchoolError(null);
              }}
              disabled={isDeletingSchool}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteSchoolDialogOpen(false);
                setIsConfirmDeleteSchoolDialogOpen(true);
              }}
              disabled={isDeletingSchool}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete School Dialog */}
      <Dialog
        open={isConfirmDeleteSchoolDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmDeleteSchoolDialogOpen(open);
          if (!open) {
            setDeleteSchoolError(null);
            setDeleteSchoolConfirmation("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Type the school name <strong>{school?.name}</strong> to confirm
              deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-school-name">School Name</Label>
              <Input
                id="confirm-school-name"
                placeholder={school?.name}
                value={deleteSchoolConfirmation}
                onChange={(e) => setDeleteSchoolConfirmation(e.target.value)}
                disabled={isDeletingSchool}
              />
            </div>
            {deleteSchoolError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{deleteSchoolError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsConfirmDeleteSchoolDialogOpen(false);
                setDeleteSchoolError(null);
                setDeleteSchoolConfirmation("");
              }}
              disabled={isDeletingSchool}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!school) return;

                if (deleteSchoolConfirmation !== school.name) {
                  setDeleteSchoolError("School name does not match");
                  return;
                }

                setIsDeletingSchool(true);
                setDeleteSchoolError(null);

                try {
                  const result = await schoolApi.delete.delete(school.id);

                  if (result.error) {
                    setDeleteSchoolError(
                      result.error.message || "Failed to delete school"
                    );
                  } else {
                    // Success - close dialogs and drawer
                    setIsConfirmDeleteSchoolDialogOpen(false);
                    setDeleteSchoolConfirmation("");
                    onOpenChange(false);
                    // Refresh the schools list
                    onSchoolUpdate?.();
                  }
                } catch (error: any) {
                  console.error("[SCHOOL DELETE] Error:", error);
                  setDeleteSchoolError(
                    error.message || "An unexpected error occurred"
                  );
                } finally {
                  setIsDeletingSchool(false);
                }
              }}
              disabled={
                isDeletingSchool || deleteSchoolConfirmation !== school?.name
              }
            >
              {isDeletingSchool ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete School"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Year Level Dialog */}
      <BulkYearLevelDialog
        open={bulkYearLevelDialogOpen}
        onOpenChange={setBulkYearLevelDialogOpen}
        school={school}
        selectedClassIds={Object.keys(classesRowSelection)
          .filter((key) => classesRowSelection[key])
          .map((rowIndex) => {
            const classItem = filteredClasses[parseInt(rowIndex)];
            return classItem?.id;
          })
          .filter((id): id is string => typeof id === "string")}
        onSuccess={() => {
          setBulkYearLevelDialogOpen(false);
          setClassesRowSelection({});
          // Refetch classes to show updated values
          fetchClasses();
        }}
      />
    </Sheet>
  );
}

export function SchoolDetailDrawer(props: SchoolDetailDrawerProps) {
  return (
    <Suspense
      fallback={
        <Sheet open={props.open} onOpenChange={props.onOpenChange}>
          <SheetContent
            side="bottom"
            className="h-[95vh] w-full max-w-6xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </SheetContent>
        </Sheet>
      }
    >
      <SchoolDetailDrawerContent {...props} />
    </Suspense>
  );
}
