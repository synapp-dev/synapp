"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { cn } from "@workspace/ui/lib/utils";
import { Image, Loader2, Pencil, Save, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { schoolApi } from "@/entities/school/api/endpoints";
import { statesApi } from "@/entities/states/api/endpoints";
import { schoolSectorsApi } from "@/entities/school-sectors/api/endpoints";
import { schoolLevelsApi } from "@/entities/school-levels/api/endpoints";
import { StorageImage } from "@/components/atoms/storage-image";

/** School object sufficient for the details form */
export interface SchoolForDetailsForm {
  id: string;
  name: string;
  state?: string | null;
  sector?: string | null;
  levels?: string[] | null;
  address?: string | null;
  emailDomain?: string | null;
  bannerUrl?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
}

interface SchoolImageUploadProps {
  label: string;
  urlOrPath: string;
  onUrlChange: (value: string) => void;
  onUploadComplete?: () => void;
  editing: boolean;
  schoolId: string;
  type: "avatar" | "banner";
  colSpan?: 1 | 3;
}

function SchoolImageUpload({
  label,
  urlOrPath,
  onUrlChange,
  onUploadComplete,
  editing,
  schoolId,
  type,
  colSpan = 1,
}: SchoolImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (JPEG, PNG, WebP, or GIF)");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const result = await schoolApi.post.uploadImage(schoolId, type, file);
      if (result.error) {
        setUploadError(result.error.message ?? "Upload failed");
        return;
      }
      if (result.data?.path) {
        onUrlChange(result.data.path);
        onUploadComplete?.();
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleClick = () => {
    if (editing && !uploading) fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "space-y-1.5",
        colSpan === 3 && "col-span-3"
      )}
    >
      <Label className="text-xs text-muted-foreground ml-2">{label}</Label>
      <div
        role={editing ? "button" : undefined}
        tabIndex={editing ? 0 : undefined}
        onKeyDown={
          editing
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") handleClick();
              }
            : undefined
        }
        onClick={handleClick}
        className={cn(
          "relative overflow-hidden rounded-lg border bg-muted group min-h-[5rem]",
          type === "avatar" ? "aspect-square min-w-0" : "h-28 w-full",
          editing && "cursor-pointer"
        )}
      >
        {urlOrPath ? (
          <StorageImage
            src={urlOrPath}
            alt={label}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center text-muted-foreground">
            <Image className="h-8 w-8 shrink-0" />
            {!editing && (
              <span className="text-xs px-2">Click Edit to add</span>
            )}
            {editing && (
              <span className="text-xs px-2">Click to add</span>
            )}
          </div>
        )}
        {editing && urlOrPath && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-white font-medium">Replace</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />
      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}
    </div>
  );
}

interface SchoolDetailsFormProps {
  school: SchoolForDetailsForm | null;
  onSchoolUpdate?: () => void;
  readOnly?: boolean;
}

export function SchoolDetailsForm({ school, onSchoolUpdate, readOnly = false }: SchoolDetailsFormProps) {
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

  const { data: statesData = [], isLoading: loadingStates } = useQuery({
    queryKey: ["states"],
    queryFn: async () => {
      const result = await statesApi.get.list();
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch states");
      }
      if (result.data) {
        return [...result.data].sort((a, b) => a.name.localeCompare(b.name));
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: sectorsData = [], isLoading: loadingSectors } = useQuery({
    queryKey: ["school-sectors"],
    queryFn: async () => {
      const result = await schoolSectorsApi.get.list();
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch sectors");
      }
      if (result.data) {
        return [...result.data].sort((a, b) => a.name.localeCompare(b.name));
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
        return [...result.data].sort((a, b) => a.key.localeCompare(b.key));
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (
      school &&
      statesData.length > 0 &&
      sectorsData.length > 0 &&
      levelsData.length > 0
    ) {
      setName(school.name || "");
      setAddress(school.address || "");
      setEmailDomain(school.emailDomain || "");
      setBannerUrl(school.bannerUrl || "");
      setAvatarUrl(school.avatarUrl || "");

      if (school.state) {
        const state = statesData.find(
          (s) => s.code?.toLowerCase() === school.state?.toLowerCase()
        );
        setStateId(state?.id || "");
      } else {
        setStateId("");
      }

      if (school.sector) {
        const sector = sectorsData.find((s) => s.key === school.sector);
        setSectorId(sector?.id || "");
      } else {
        setSectorId("");
      }

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

        const hasPrimary = mappedLevelIds.some(
          (id) => levelsData.find((l) => l.id === id)?.key === "primary"
        );
        const hasSecondary = mappedLevelIds.some(
          (id) => levelsData.find((l) => l.id === id)?.key === "secondary"
        );
        setIsP12Mode(hasPrimary && hasSecondary && mappedLevelIds.length === 2);
      } else {
        setLevelIds([]);
        setIsP12Mode(false);
      }
    }
  }, [school?.id, statesData, sectorsData, levelsData]);

  const hasChanges =
    school &&
    (name !== (school.name || "") ||
      address !== (school.address || "") ||
      emailDomain !== (school.emailDomain || "") ||
      bannerUrl !== (school.bannerUrl || "") ||
      avatarUrl !== (school.avatarUrl || "") ||
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

      setEditing(false);
      onSchoolUpdate?.();
    } catch (err: unknown) {
      console.error("Failed to update school:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to update school");
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
      setAddress(school.address || "");
      setEmailDomain(school.emailDomain || "");
      setBannerUrl(school.bannerUrl || "");
      setAvatarUrl(school.avatarUrl || "");

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

  const editable = !readOnly;
  const canEdit = editable && !readOnly;

  const selectedState = statesData.find((s) => s.id === stateId);
  const selectedSector = sectorsData.find((s) => s.id === sectorId);
  const selectedLevels = levelsData.filter((l) => levelIds.includes(l.id));

  const primaryLevel = levelsData.find((l) => l.key === "primary");
  const secondaryLevel = levelsData.find((l) => l.key === "secondary");
  const hasPrimary = primaryLevel && levelIds.includes(primaryLevel.id);
  const hasSecondary = secondaryLevel && levelIds.includes(secondaryLevel.id);

  const isP12 = hasPrimary && hasSecondary && isP12Mode;

  const formatLevelsDisplay = (levels: typeof selectedLevels): string => {
    if (levels.length === 0) return "—";
    if (levels.length === 2) {
      const hasP = levels.some((l) => l.key === "primary");
      const hasS = levels.some((l) => l.key === "secondary");
      if (hasP && hasS) return "P-12";
    }
    return levels.map((l) => l.name).join(", ");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          {school.createdAt && (
            <p className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
              Created {new Date(school.createdAt).toLocaleDateString()}
            </p>
          )}
          {canEdit && (
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
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground ml-2">State</Label>
            <Popover open={stateComboboxOpen} onOpenChange={setStateComboboxOpen} modal>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={stateComboboxOpen}
                  className="w-full justify-between"
                  disabled={!editing || loadingStates || readOnly}
                >
                  {selectedState ? selectedState.name : "Select state..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
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
                          <Check className={cn("mr-2 h-4 w-4", stateId === state.id ? "opacity-100" : "opacity-0")} />
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
            <Label className="text-xs text-muted-foreground ml-2">School Name</Label>
            <Input
              id="school-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!editing || readOnly}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground ml-2">Sector</Label>
            <Popover open={sectorComboboxOpen} onOpenChange={setSectorComboboxOpen} modal>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sectorComboboxOpen}
                  className="w-full justify-between"
                  disabled={!editing || loadingSectors || readOnly}
                >
                  {selectedSector ? selectedSector.name : "Select sector..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
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
                            setSectorId(sector.id === sectorId ? "" : sector.id);
                            setSectorComboboxOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", sectorId === sector.id ? "opacity-100" : "opacity-0")} />
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
            <Label className="text-xs text-muted-foreground ml-2">Type</Label>
            <Popover open={levelsComboboxOpen} onOpenChange={setLevelsComboboxOpen} modal>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={levelsComboboxOpen}
                  className="w-full justify-between"
                  disabled={!editing || loadingLevels || readOnly}
                >
                  {selectedLevels.length > 0 ? formatLevelsDisplay(selectedLevels) : "Select type..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search type..." />
                  <CommandList>
                    <CommandEmpty>No type found.</CommandEmpty>
                    <CommandGroup>
                      {primaryLevel && secondaryLevel && (
                        <CommandItem
                          key="p-12"
                          value="p-12 P-12"
                          onSelect={() => {
                            if (isP12) {
                              setLevelIds(
                                levelIds.filter(
                                  (id) =>
                                    id !== primaryLevel.id && id !== secondaryLevel.id
                                )
                              );
                              setIsP12Mode(false);
                            } else {
                              const newIds: string[] = [];
                              if (primaryLevel.id) newIds.push(primaryLevel.id);
                              if (secondaryLevel.id) newIds.push(secondaryLevel.id);
                              setLevelIds(newIds);
                              setIsP12Mode(true);
                            }
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", isP12 ? "opacity-100" : "opacity-0")} />
                          P-12
                        </CommandItem>
                      )}
                      {levelsData.map((level) => {
                        const isSelected = isP12 ? false : levelIds.includes(level.id);
                        return (
                          <CommandItem
                            key={level.id}
                            value={`${level.id} ${level.name}`}
                            onSelect={() => {
                              if (
                                isP12 &&
                                (level.key === "primary" || level.key === "secondary")
                              ) {
                                setIsP12Mode(false);
                                setLevelIds([level.id]);
                              } else if (isSelected) {
                                setLevelIds(levelIds.filter((id) => id !== level.id));
                                setIsP12Mode(false);
                              } else {
                                if (
                                  level.key === "primary" ||
                                  level.key === "secondary"
                                ) {
                                  const otherLevel =
                                    level.key === "primary"
                                      ? secondaryLevel
                                      : primaryLevel;
                                  const hasOther =
                                    otherLevel && levelIds.includes(otherLevel.id);

                                  if (hasOther) {
                                    const newIds: string[] = [];
                                    if (primaryLevel?.id) newIds.push(primaryLevel.id);
                                    if (secondaryLevel?.id) newIds.push(secondaryLevel.id);
                                    setLevelIds(newIds);
                                    setIsP12Mode(true);
                                  } else {
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
          <Label className="text-xs text-muted-foreground ml-2">Address</Label>
          <Input
            id="school-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={!editing || readOnly}
            className={!editing ? "bg-muted" : ""}
            placeholder="Enter school address"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground ml-2">Email Domain</Label>
          <Input
            id="school-email-domain"
            value={emailDomain}
            onChange={(e) => setEmailDomain(e.target.value)}
            disabled={!editing || readOnly}
            className={!editing ? "bg-muted" : ""}
            placeholder="example.com"
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <SchoolImageUpload
            label="Banner"
            urlOrPath={bannerUrl}
            onUrlChange={setBannerUrl}
            onUploadComplete={() => onSchoolUpdate?.()}
            editing={editing && !readOnly}
            schoolId={school.id}
            type="banner"
            colSpan={3}
          />
          <SchoolImageUpload
            label="Avatar"
            urlOrPath={avatarUrl}
            onUrlChange={setAvatarUrl}
            onUploadComplete={() => onSchoolUpdate?.()}
            editing={editing && !readOnly}
            schoolId={school.id}
            type="avatar"
            colSpan={1}
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
