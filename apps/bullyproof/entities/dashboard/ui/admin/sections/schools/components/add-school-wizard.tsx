"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Loader2, School } from "lucide-react";
import { statesApi } from "@/entities/states/api/endpoints";
import { schoolSectorsApi } from "@/entities/school-sectors/api/endpoints";
import { schoolLevelsApi } from "@/entities/school-levels/api/endpoints";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";
import { Separator } from "@workspace/ui/components/separator";
import { capitalizeSchoolName } from "@/utils/school-name";

interface AddSchoolWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchoolCreated?: (school: { slug: string | null }) => void;
}

type State = {
  id: string;
  code: string;
  name: string;
};

type Sector = {
  id: string;
  key: string;
  name: string;
};

type SchoolLevel = {
  id: string;
  key: string;
  name: string;
};

interface SchoolFormData {
  name: string;
  stateId: string;
  sectorId: string;
  levelSelection: string; // "primary", "secondary", or "p12"
}

export function AddSchoolWizard({
  open,
  onOpenChange,
  onSchoolCreated,
}: AddSchoolWizardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [schoolLevels, setSchoolLevels] = useState<SchoolLevel[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [levelsLoading, setLevelsLoading] = useState(false);

  const [formData, setFormData] = useState<SchoolFormData>({
    name: "",
    stateId: "",
    sectorId: "",
    levelSelection: "",
  });

  useEffect(() => {
    if (open) {
      loadStates();
      loadSectors();
      loadSchoolLevels();
    } else {
      // Reset form when sheet closes
      setFormData({
        name: "",
        stateId: "",
        sectorId: "",
        levelSelection: "",
      });
      setError(null);
    }
  }, [open]);

  const loadStates = async () => {
    setStatesLoading(true);
    try {
      const result = await statesApi.get.list();
      if (result.error) {
        console.error("Error loading states:", result.error);
        setError("Failed to load states");
        return;
      }
      // Sort by name since API doesn't guarantee order
      const sortedStates = (result.data || []).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setStates(sortedStates);
    } catch (err: any) {
      console.error("Error loading states:", err);
      setError("Failed to load states");
    } finally {
      setStatesLoading(false);
    }
  };

  const loadSectors = async () => {
    setSectorsLoading(true);
    try {
      const result = await schoolSectorsApi.get.list();
      if (result.error) {
        console.error("Error loading sectors:", result.error);
        setError("Failed to load sectors");
        return;
      }
      // Sort by name since API doesn't guarantee order
      const sortedSectors = (result.data || []).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setSectors(sortedSectors);
    } catch (err: any) {
      console.error("Error loading sectors:", err);
      setError("Failed to load sectors");
    } finally {
      setSectorsLoading(false);
    }
  };

  const loadSchoolLevels = async () => {
    setLevelsLoading(true);
    try {
      const result = await schoolLevelsApi.get.list();
      if (result.error) {
        console.error("Error loading school levels:", result.error);
        setError("Failed to load school levels");
        return;
      }
      // Sort by key to ensure primary comes before secondary
      const sortedLevels = (result.data || []).sort((a, b) =>
        a.key.localeCompare(b.key)
      );
      setSchoolLevels(sortedLevels);
    } catch (err: any) {
      console.error("Error loading school levels:", err);
      setError("Failed to load school levels");
    } finally {
      setLevelsLoading(false);
    }
  };

  const canSubmit = (): boolean => {
    return (
      formData.name.trim() !== "" &&
      formData.stateId !== "" &&
      formData.sectorId !== "" &&
      formData.levelSelection !== ""
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setLoading(true);
    setError(null);

    try {
      let levelIds: string[] | undefined;
      let yearIds: string[] | undefined;

      if (formData.levelSelection === "p10") {
        // P-10: Prep through Year 10 (sortIndex 0..10)
        const yearsResult = await curriculumApi.years.list();
        if (yearsResult.error || !yearsResult.data) {
          setError("Could not load year levels");
          setLoading(false);
          return;
        }
        const p10Years = yearsResult.data
          .filter((y) => y.sortIndex >= 0 && y.sortIndex <= 10)
          .sort((a, b) => a.sortIndex - b.sortIndex);
        yearIds = p10Years.map((y) => y.id);
        if (yearIds.length === 0) {
          setError("Invalid P-10 year configuration");
          setLoading(false);
          return;
        }
      } else if (formData.levelSelection === "p12") {
        const primaryLevel = schoolLevels.find((l) => l.key === "primary");
        const secondaryLevel = schoolLevels.find((l) => l.key === "secondary");
        levelIds = [];
        if (primaryLevel) levelIds.push(primaryLevel.id);
        if (secondaryLevel) levelIds.push(secondaryLevel.id);
      } else {
        const selectedLevel = schoolLevels.find(
          (l) => l.key === formData.levelSelection
        );
        levelIds = selectedLevel ? [selectedLevel.id] : [];
      }

      if (!levelIds?.length && !yearIds?.length) {
        setError("Invalid school level selection");
        setLoading(false);
        return;
      }

      const result = await schoolApi.post.create({
        name: capitalizeSchoolName(formData.name.trim()),
        stateId: formData.stateId,
        sectorId: formData.sectorId,
        ...(levelIds?.length ? { levelIds } : {}),
        ...(yearIds?.length ? { yearIds } : {}),
      });

      if (result.error) {
        setError(result.error.message || "Failed to create school");
        return;
      }

      // Success - get the created school data
      const createdSchool = result.data;
      if (!createdSchool) {
        setError("School was created but no data was returned");
        setLoading(false);
        return;
      }

      // Call the callback with the created school's slug
      // The parent component will handle closing the wizard and updating the URL
      if (onSchoolCreated) {
        onSchoolCreated({ slug: createdSchool.slug || null });
      }
    } catch (err: any) {
      setError(err.message || "Failed to create school. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="h-[65vh] left-1/2 -translate-x-1/2 w-1/3 max-w-md !right-auto rounded-b-2xl p-4 flex flex-col"
      >
        {/* Header - Full width */}
        <SheetHeader className="flex items-center justify-center">
          <SheetTitle className="flex items-center gap-2 text-2xl">
            <School className="size-6" />
            Add New School
          </SheetTitle>
          {/* <SheetDescription>
            Enter the basic information for the new school
          </SheetDescription> */}
        </SheetHeader>

        {/* Body - Form content */}
        <div className="flex flex-1 min-h-0">
          <div className="w-full flex flex-col min-h-0">
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              <div className="space-y-6">
                {/* Row 1: School Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="pl-2 text-muted-foreground">
                    School Name
                  </Label>
                  <Input
                    id="name"
                    className="w-full capitalize"
                    placeholder="New School"
                    value={formData.name}
                    onChange={(e) => {
                      // Allow free typing - preserve spaces
                      setFormData({ ...formData, name: e.target.value });
                    }}
                    onBlur={(e) => {
                      // Apply capitalization when user finishes typing
                      const capitalized = capitalizeSchoolName(e.target.value);
                      setFormData({ ...formData, name: capitalized });
                    }}
                  />
                </div>

                <Separator className="my-6 w-2/3 mx-auto" />

                {/* Row 2: School Level */}
                <div className="space-y-2">
                  <Label htmlFor="level" className="pl-2 text-muted-foreground">
                    Level
                  </Label>
                  <Select
                    value={formData.levelSelection}
                    onValueChange={(value) =>
                      setFormData({ ...formData, levelSelection: value })
                    }
                    disabled={levelsLoading}
                  >
                    <SelectTrigger id="level" className="w-full">
                      <SelectValue
                        placeholder={
                          levelsLoading ? "Loading..." : "Select school level"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolLevels.map((level) => (
                        <SelectItem key={level.id} value={level.key}>
                          {level.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="p10">P-10</SelectItem>
                      <SelectItem value="p12">P-12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 3: State */}
                <div className="space-y-2">
                  <Label htmlFor="state" className="pl-2 text-muted-foreground">
                    State
                  </Label>
                  <Select
                    value={formData.stateId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, stateId: value })
                    }
                    disabled={statesLoading}
                  >
                    <SelectTrigger id="state" className="w-full">
                      <SelectValue
                        placeholder={
                          statesLoading ? "Loading..." : "Select state"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 4: Sector */}
                <div className="space-y-2">
                  <Label
                    htmlFor="sector"
                    className="pl-2 text-muted-foreground"
                  >
                    Sector
                  </Label>
                  <Select
                    value={formData.sectorId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, sectorId: value })
                    }
                    disabled={sectorsLoading}
                  >
                    <SelectTrigger id="sector" className="w-full">
                      <SelectValue
                        placeholder={
                          sectorsLoading ? "Loading..." : "Select sector"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors.map((sector) => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Full width */}
        <SheetFooter className="w-full">
          <div className="flex w-full items-center justify-center gap-3">
            {/* <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="px-6"
            >
              Cancel
            </Button> */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !canSubmit()}
              className="w-full text-xl font-bold py-6"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add School
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
