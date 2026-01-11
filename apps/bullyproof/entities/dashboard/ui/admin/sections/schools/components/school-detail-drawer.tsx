import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import type { schoolYears } from "@/server/db/schema";
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
  Settings,
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
  Upload,
  FileText,
  ArrowLeft,
  MoreHorizontal,
  ChevronsRight,
} from "lucide-react";
import { type School as SchoolType } from "./schools-table-columns";
import { createSchoolUsersColumns } from "./school-users-table-columns";
import { AddUserDialog } from "./add-user-dialog";

type TabId =
  | "onboarding"
  | "overview"
  | "users"
  | "classes"
  | "activity"
  | "culture"
  | "settings";

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
  { id: "overview", name: "Overview", icon: Eye },
  { id: "users", name: "Users", icon: Users },
  { id: "classes", name: "Classes", icon: GraduationCap },
  { id: "activity", name: "Activity", icon: Activity },
  { id: "culture", name: "Culture", icon: Star },
  { id: "settings", name: "Settings", icon: Settings },
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
  const [activeSection, setActiveSection] = useState<TabId>(initialTab);

  // Reset to initialTab when drawer opens or initialTab changes
  useEffect(() => {
    if (open) {
      setActiveSection(initialTab);
    }
  }, [open, initialTab]);

  // Handle tab change
  const handleTabChange = (tab: TabId) => {
    setActiveSection(tab);
    onTabChange?.(tab);
  };
  const [users, setUsers] = useState<UserWithRolesAndSchools[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [classes, setClasses] = useState<ClassWithYearCodes[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Table state for users
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Dialog states
  const [addLicenceDialogOpen, setAddLicenceDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false);

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

  useEffect(() => {
    if (activeSection === "users" && school) {
      setLoadingUsers(true);
      meApi.get
        .listAllUsers()
        .then((result) => {
          if (!result.error && result.data) {
            // Filter users who have ANY role for this school
            const schoolUsers = result.data.filter((user) =>
              user.schoolRoles.some((role) => role.schoolId === school.id)
            );
            setUsers(schoolUsers);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch users:", error);
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }
  }, [activeSection, school]);

  useEffect(() => {
    if (activeSection === "classes" && school) {
      setLoadingClasses(true);
      classesApi.get
        .list({ schoolId: school.id })
        .then((result) => {
          if (!result.error && result.data) {
            setClasses(result.data);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch classes:", error);
        })
        .finally(() => {
          setLoadingClasses(false);
        });
    }
  }, [activeSection, school]);

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

  // Fetch school licence when settings section is active
  useEffect(() => {
    if (activeSection === "settings" && school) {
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
    } else {
      setSchoolLicence(null);
    }
  }, [activeSection, school]);

  // Check for dialog query parameter and open dialog if conditions are met
  useEffect(() => {
    // Don't interfere if we're manually closing the dialog
    if (isClosingDialogRef.current) {
      return;
    }

    if (open && school && activeSection === "settings") {
      const dialogParam = searchParams?.get("dialog");
      if (dialogParam === "ADD-school-licence" && !addLicenceDialogOpen) {
        setAddLicenceDialogOpen(true);
      }
    }

    if (open && school && activeSection === "users") {
      const dialogParam = searchParams?.get("dialog");
      if (dialogParam === "add-user" && !addUserDialogOpen) {
        setAddUserDialogOpen(true);
      } else if (dialogParam !== "add-user" && addUserDialogOpen) {
        // Close dialog when param is removed
        setAddUserDialogOpen(false);
      }
    }

    if (open && school && activeSection === "classes") {
      const dialogParam = searchParams?.get("dialog");
      if (dialogParam === "add-class" && !addClassDialogOpen) {
        setAddClassDialogOpen(true);
      } else if (dialogParam !== "add-class" && addClassDialogOpen) {
        // Close dialog when param is removed
        setAddClassDialogOpen(false);
        setClassName("");
        setClassCode("");
        setClassRunningYear(new Date().getFullYear().toString());
        setSelectedYearIds([]);
      }
    }
  }, [
    open,
    school,
    activeSection,
    searchParams,
    addLicenceDialogOpen,
    addUserDialogOpen,
    addClassDialogOpen,
  ]);

  // Fetch existing school licence email when dialog opens
  useEffect(() => {
    if (addLicenceDialogOpen && school) {
      setLoadingLicenceEmail(true);
      meApi.get
        .listAllUsers()
        .then((result) => {
          if (!result.error && result.data) {
            // Find user with SCHOOL_LICENCE role for this school
            const licenceUser = result.data.find((user) =>
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

  // Set up columns for users table (memoized to avoid recreation on every render)
  const usersColumns = useMemo(
    () => (school ? createSchoolUsersColumns(school.id) : []),
    [school?.id]
  );

  // Set up users table
  const usersTable = useReactTable({
    data: users,
    columns: usersColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Handler for opening add user dialog
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
        className="h-[95vh] w-full max-w-6xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 overflow-hidden flex flex-col"
      >
        <SheetTitle className="sr-only">
          {school.name} - School Details
        </SheetTitle>
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar */}
          <div className="hidden md:flex flex-col w-48 border-r shrink-0">
            {/* School Info Header */}
            <div className="p-4 border-b shrink-0">
              <div className="flex items-center gap-2 mb-2">
                {/* <School className="h-5 w-5 text-muted-foreground" /> */}
                <h2 className="font-semibold text-xl">{school.name}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
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
            </div>
            {/* Navigation Menu */}
            <div className="h-fit">
              <SidebarProvider className="items-start">
                <Sidebar collapsible="none" className="border-0">
                  <SidebarContent>
                    <SidebarGroup>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {navItems.map((item) => {
                            const Icon = item.icon;
                            const isOnboarding = item.id === "onboarding";
                            return (
                              <SidebarMenuItem key={item.id}>
                                <SidebarMenuButton
                                  onClick={() =>
                                    handleTabChange(item.id as TabId)
                                  }
                                  isActive={activeSection === item.id}
                                  className={
                                    isOnboarding
                                      ? "animate-pulse text-orange-600 data-[active=true]:text-orange-600"
                                      : ""
                                  }
                                >
                                  <Icon className="h-4 w-4" />
                                  <span>{item.name}</span>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  </SidebarContent>
                </Sidebar>
              </SidebarProvider>
            </div>
          </div>

          {/* Right Content Area */}
          <main className="flex flex-1 flex-col overflow-hidden min-h-0">
            {/* Mobile Header */}
            <div className="md:hidden p-4 border-b shrink-0">
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
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Scrollable Content */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              {/* Onboarding Section */}
              {activeSection === "onboarding" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Rocket className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Onboarding</h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Essential Section */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        Essential
                      </h4>
                      {(() => {
                        const steps = [
                          {
                            id: "add-school",
                            title: "Add School",
                            description: "School has been created",
                            icon: School,
                            completed: true,
                          },
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
                            id: "add-classes",
                            title: "Add Classes",
                            description:
                              school.classCount > 0
                                ? "Classes have been added"
                                : "No classes have been added yet",
                            icon: GraduationCap,
                            completed: school.classCount > 0,
                          },
                          {
                            id: "add-teachers",
                            title: "Add Teachers",
                            description:
                              school.teacherCount > 0
                                ? "Teachers have been added"
                                : "No users have been added yet",
                            icon: UserPlus,
                            completed: school.teacherCount > 0,
                          },
                        ];

                        let previousCompleted = true;

                        return steps.map((item, index) => {
                          const Icon = item.icon;
                          const isCompleted = item.completed;
                          const isAvailable = previousCompleted;
                          const isDisabled = index === 0 || !isAvailable;

                          // Update previousCompleted for next iteration
                          if (isCompleted) {
                            previousCompleted = true;
                          } else {
                            previousCompleted = false;
                          }

                          return (
                            <Card
                              key={item.id}
                              className={`transition-all py-1 p-0 ${
                                isCompleted
                                  ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                                  : isAvailable
                                    ? "hover:bg-muted/30 border-border"
                                    : "bg-muted/30 opacity-60 border-muted"
                              } ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                              onClick={() => {
                                if (isDisabled || isCompleted) return;

                                // If this is the "Add School Licence" step, navigate to settings tab with dialog
                                if (item.id === "add-licence") {
                                  handleTabChange("settings");
                                  if (school?.slug) {
                                    const params = new URLSearchParams(
                                      searchParams?.toString() || ""
                                    );
                                    params.set("school", school.slug);
                                    params.set("tab", "settings");
                                    params.set("dialog", "ADD-school-licence");
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
                              <CardContent className="py-2">
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0 flex items-center gap-2">
                                    <span className="text-sm font-semibold text-muted-foreground w-4">
                                      {index + 1}
                                    </span>
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <Circle
                                        className={`h-5 w-5 ${
                                          isAvailable
                                            ? "text-muted-foreground"
                                            : "text-muted-foreground/50"
                                        }`}
                                      />
                                    )}
                                  </div>
                                  <div
                                    className={`text-sm font-bold flex items-center gap-2 flex-1 ${
                                      isCompleted
                                        ? "text-green-700 dark:text-green-400 line-through"
                                        : isAvailable
                                          ? ""
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    <Icon
                                      className={`h-4 w-4 shrink-0 ${
                                        isCompleted
                                          ? "text-green-600"
                                          : isAvailable
                                            ? "text-muted-foreground"
                                            : "text-muted-foreground/50"
                                      }`}
                                    />
                                    {item.title}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        });
                      })()}
                    </div>

                    {/* Optional Section */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        (Optional)
                      </h4>
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
                      ].map((item) => {
                        const Icon = item.icon;
                        const isCompleted = item.completed;

                        return (
                          <Card
                            key={item.id}
                            className={`transition-all ${
                              isCompleted
                                ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                                : "hover:bg-muted/30 border-border"
                            } cursor-pointer`}
                          >
                            <CardContent className="py-2">
                              <div className="flex items-center gap-3">
                                <div className="shrink-0">
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div
                                  className={`text-sm font-bold flex items-center gap-2 flex-1 ${
                                    isCompleted
                                      ? "text-green-700 dark:text-green-400"
                                      : ""
                                  }`}
                                >
                                  <Icon
                                    className={`h-4 w-4 shrink-0 ${
                                      isCompleted
                                        ? "text-green-600"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                  {item.title}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Overview Section */}
              {activeSection === "overview" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Overview</h3>
                  </div>
                  {/* Quick Stats Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Teachers
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {school.teacherCount}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          total teachers
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          State
                        </CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {school.state || "—"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          location
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* School Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>School Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            State: {school.state || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <School className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Sector:{" "}
                            {school.sector === "government"
                              ? "Government"
                              : school.sector === "catholic"
                                ? "Catholic"
                                : school.sector === "independent"
                                  ? "Independent"
                                  : "—"}
                          </span>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">School ID</span>
                        <span className="text-sm text-muted-foreground font-mono">
                          {school.id}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Teachers</span>
                        <span className="text-sm text-muted-foreground">
                          {school.teacherCount} teachers
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Feedback */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              Teacher Training Completed
                            </p>
                            <p className="text-xs text-muted-foreground">
                              "Great session! The new curriculum materials are
                              very helpful."
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              2 days ago
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              Lesson Delivered Successfully
                            </p>
                            <p className="text-xs text-muted-foreground">
                              "Students were very engaged with the anti-bullying
                              content."
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              5 days ago
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Users Section */}
              {activeSection === "users" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Users</h3>
                  </div>

                  {/* Action Cards */}
                  <div className="flex items-center justify-end gap-4">
                    <Card
                      className="cursor-pointer py-2 hover:bg-muted/50 transition-colors"
                      onClick={handleAddUserClick}
                    >
                      <CardContent className="flex items-center gap-1.5">
                        <UserPlus className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold text-sm">Add User</h4>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="flex items-center py-4 gap-4">
                      <Input
                        placeholder="Filter emails..."
                        value={
                          (usersTable
                            .getColumn("email")
                            ?.getFilterValue() as string) ?? ""
                        }
                        onChange={(event) =>
                          usersTable
                            .getColumn("email")
                            ?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="ml-auto">
                            Columns <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {usersTable
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                              return (
                                <DropdownMenuCheckboxItem
                                  key={column.id}
                                  className="capitalize"
                                  checked={column.getIsVisible()}
                                  onCheckedChange={(value) =>
                                    column.toggleVisibility(!!value)
                                  }
                                >
                                  {column.id}
                                </DropdownMenuCheckboxItem>
                              );
                            })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableHeader>
                          {usersTable.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map((header) => {
                                return (
                                  <TableHead key={header.id}>
                                    {header.isPlaceholder
                                      ? null
                                      : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext()
                                        )}
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableHeader>
                        <TableBody>
                          {/* Add User Row */}
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50 transition-colors border-dashed"
                            onClick={handleAddUserClick}
                          >
                            <TableCell
                              colSpan={usersColumns.length}
                              className="h-auto py-3"
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground pl-0.5">
                                  <UserPlus className="h-4 w-4" />
                                  <span className="font-medium pl-2">
                                    Add New User
                                  </span>
                                </div>
                                <div>
                                  <ChevronsRight className="h-3 w-3 text-muted-foreground mt-0.5" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 pl-2">
                                  Add a member to {school.name}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                          {loadingUsers ? (
                            <TableRow>
                              <TableCell
                                colSpan={usersColumns.length}
                                className="h-24 text-center"
                              >
                                <div className="flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : usersTable.getRowModel().rows?.length ? (
                            usersTable.getRowModel().rows.map((row) => (
                              <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                              >
                                {row.getVisibleCells().map((cell) => (
                                  <TableCell key={cell.id}>
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={usersColumns.length}
                                className="h-24 text-center"
                              >
                                <div className="flex flex-col items-center justify-center">
                                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                  <h3 className="text-lg font-medium mb-2">
                                    No Users Found
                                  </h3>
                                  <p className="text-muted-foreground">
                                    No users have been assigned to this school
                                    yet.
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-end space-x-2 py-4">
                      <div className="text-muted-foreground flex-1 text-sm">
                        {usersTable.getFilteredSelectedRowModel().rows.length}{" "}
                        of {usersTable.getFilteredRowModel().rows.length} row(s)
                        selected.
                      </div>
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => usersTable.previousPage()}
                          disabled={!usersTable.getCanPreviousPage()}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => usersTable.nextPage()}
                          disabled={!usersTable.getCanNextPage()}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Classes Section */}
              {activeSection === "classes" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Classes</h3>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setAddClassDialogOpen(true);
                        // Add dialog query parameter to URL
                        if (school?.slug) {
                          const params = new URLSearchParams(
                            searchParams?.toString() || ""
                          );
                          params.set("school", school.slug);
                          params.set("tab", "classes");
                          params.set("dialog", "add-class");
                          router.push(`/admin/schools?${params.toString()}`, {
                            scroll: false,
                          });
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Class
                    </Button>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="sr-only">Classes</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Class Name</TableHead>
                              <TableHead>Code</TableHead>
                              <TableHead>Year Level Codes</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classes.map((classItem) => (
                              <TableRow key={classItem.id}>
                                <TableCell>
                                  <div className="font-medium">
                                    {classItem.name}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {classItem.code || "—"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {classItem.yearCodes &&
                                  classItem.yearCodes.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {classItem.yearCodes.map(
                                        (yearCode, index) => (
                                          <Badge
                                            key={index}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {yearCode}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      classItem.active ? "default" : "secondary"
                                    }
                                  >
                                    {classItem.active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {classItem.createdAt ? (
                                    <span className="text-sm text-muted-foreground">
                                      {new Date(
                                        classItem.createdAt
                                      ).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
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
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Star className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Culture</h3>
                  </div>
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

              {/* Settings Section */}
              {activeSection === "settings" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Settings</h3>
                  </div>

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
                      <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
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
                            params.set("tab", "settings");
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

                  <Card>
                    <CardHeader>
                      <CardTitle className="sr-only">School Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          Settings & Management
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          School settings and management tools coming soon.
                        </p>
                        <div className="text-sm text-muted-foreground">
                          This will include school details, license management,
                          and user invitations.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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

      {/* Add User Wizard Dialog */}
      <AddUserDialog
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
          // Refresh users list
          if (activeSection === "users") {
            const usersResult = await meApi.get.listAllUsers();
            if (!usersResult.error && usersResult.data) {
              const schoolUsers = usersResult.data.filter((user) =>
                user.schoolRoles.some((role) => role.schoolId === school.id)
              );
              setUsers(schoolUsers);
            }
          }

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
