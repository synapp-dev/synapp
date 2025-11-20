"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
import { X, Loader2 } from "lucide-react";
import { statesApi } from "@/entities/states/api/endpoints";
import { schoolSectorsApi } from "@/entities/school-sectors/api/endpoints";
import { schoolLevelsApi } from "@/entities/school-levels/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";

interface AddSchoolWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  emailDomain: string;
  address: string;
  bannerUrl: string;
  avatarUrl: string;
}

export function AddSchoolWizard({ open, onOpenChange }: AddSchoolWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [schoolLevels, setSchoolLevels] = useState<SchoolLevel[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SchoolFormData>({
    name: "",
    stateId: "",
    sectorId: "",
    levelSelection: "",
    emailDomain: "",
    address: "",
    bannerUrl: "",
    avatarUrl: "",
  });

  useEffect(() => {
    if (open) {
      loadStates();
      loadSectors();
      loadSchoolLevels();
    } else {
      // Reset form when dialog closes
      setStep(1);
      setFormData({
        name: "",
        stateId: "",
        sectorId: "",
        levelSelection: "",
        emailDomain: "",
        address: "",
        bannerUrl: "",
        avatarUrl: "",
      });
      setAdminEmails([]);
      setNewEmail("");
      setError(null);
      setEmailError(null);
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmail = () => {
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) {
      setEmailError("Email cannot be empty");
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (adminEmails.includes(trimmedEmail)) {
      setEmailError("This email is already added");
      return;
    }
    setAdminEmails([...adminEmails, trimmedEmail]);
    setNewEmail("");
    setEmailError(null);
  };

  const handleRemoveEmail = (email: string) => {
    setAdminEmails(adminEmails.filter((e) => e !== email));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return (
          formData.name.trim() !== "" &&
          formData.stateId !== "" &&
          formData.sectorId !== "" &&
          formData.levelSelection !== ""
        );
      case 2:
        return adminEmails.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (canProceed() && step < 3) {
      setStep(step + 1);
      setError(null);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setLoading(true);
    setError(null);

    try {
      // Map levelSelection to levelIds
      let levelIds: string[] = [];
      if (formData.levelSelection === "p12") {
        // P-12 means both primary and secondary
        const primaryLevel = schoolLevels.find((l) => l.key === "primary");
        const secondaryLevel = schoolLevels.find((l) => l.key === "secondary");
        if (primaryLevel) levelIds.push(primaryLevel.id);
        if (secondaryLevel) levelIds.push(secondaryLevel.id);
      } else {
        // Single level selection
        const selectedLevel = schoolLevels.find(
          (l) => l.key === formData.levelSelection
        );
        if (selectedLevel) levelIds.push(selectedLevel.id);
      }

      if (levelIds.length === 0) {
        setError("Invalid school level selection");
        setLoading(false);
        return;
      }

      // Clean up empty strings for optional fields
      const cleanedFormData = {
        name: formData.name,
        stateId: formData.stateId,
        sectorId: formData.sectorId,
        levelIds,
        emailDomain: formData.emailDomain.trim() || null,
        address: formData.address.trim() || null,
        bannerUrl: formData.bannerUrl.trim() || null,
        avatarUrl: formData.avatarUrl.trim() || null,
      };

      const result = await schoolApi.post.create({
        school: cleanedFormData,
        adminEmails,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create school");
        return;
      }

      // Success - close dialog and refresh
      onOpenChange(false);
      // Trigger a page refresh or update the schools list
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to create school. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedState = states.find((s) => s.id === formData.stateId);
  const selectedSector = sectors.find((s) => s.id === formData.sectorId);
  const getSelectedLevelDisplay = (): string => {
    if (formData.levelSelection === "p12") {
      return "P-12";
    }
    const selectedLevel = schoolLevels.find(
      (l) => l.key === formData.levelSelection
    );
    return selectedLevel?.name || "Not selected";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "School Details"}
            {step === 2 && "School Admin Emails"}
            {step === 3 && "Review & Confirm"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Enter the basic information for the new school"}
            {step === 2 && "Add email addresses for school administrators"}
            {step === 3 && "Review the information before creating the school"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <ol className="flex items-center gap-2" aria-label="Progress">
            {[1, 2, 3].map((stepNum) => (
              <li key={stepNum} className="flex items-center gap-2">
                <div
                  className={
                    "size-2 rounded-full transition-colors " +
                    (stepNum <= step
                      ? "bg-primary"
                      : "bg-muted-foreground/30")
                  }
                  aria-hidden
                />
                {stepNum < 3 && (
                  <div className="h-px w-6 bg-border" aria-hidden />
                )}
              </li>
            ))}
          </ol>

          {/* Step Content */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  School Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Melbourne Grammar School"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.stateId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, stateId: value })
                  }
                  disabled={statesLoading}
                >
                  <SelectTrigger id="state">
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

              <div className="space-y-2">
                <Label htmlFor="sector">
                  Sector <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.sectorId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, sectorId: value })
                  }
                  disabled={sectorsLoading}
                >
                  <SelectTrigger id="sector">
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

              <div className="space-y-2">
                <Label htmlFor="level">
                  School Level <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.levelSelection}
                  onValueChange={(value) =>
                    setFormData({ ...formData, levelSelection: value })
                  }
                  disabled={levelsLoading}
                >
                  <SelectTrigger id="level">
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
                    <SelectItem value="p12">P-12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailDomain">Email Domain (optional)</Label>
                <Input
                  id="emailDomain"
                  placeholder="e.g. school.edu.au"
                  value={formData.emailDomain}
                  onChange={(e) =>
                    setFormData({ ...formData, emailDomain: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Input
                  id="address"
                  placeholder="Street, suburb, postcode"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bannerUrl">Banner URL (optional)</Label>
                <Input
                  id="bannerUrl"
                  placeholder="https://..."
                  value={formData.bannerUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, bannerUrl: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
                <Input
                  id="avatarUrl"
                  placeholder="https://..."
                  value={formData.avatarUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, avatarUrl: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">
                  Admin Email <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@school.edu.au"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      setEmailError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEmail();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddEmail}>
                    Add
                  </Button>
                </div>
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              {adminEmails.length > 0 && (
                <div className="space-y-2">
                  <Label>Added Admin Emails</Label>
                  <div className="space-y-2">
                    {adminEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <span className="text-sm">{email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveEmail(email)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">School Name</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">State</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedState?.name || "Not selected"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Sector</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSector?.name || "Not selected"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">School Level</Label>
                  <p className="text-sm text-muted-foreground">
                    {getSelectedLevelDisplay()}
                  </p>
                </div>
                {formData.emailDomain && (
                  <div>
                    <Label className="text-sm font-semibold">
                      Email Domain
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.emailDomain}
                    </p>
                  </div>
                )}
                {formData.address && (
                  <div>
                    <Label className="text-sm font-semibold">Address</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.address}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-semibold">
                    Admin Emails ({adminEmails.length})
                  </Label>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {adminEmails.map((email) => (
                      <li key={email}>{email}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={goBack}
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button
                  onClick={goNext}
                  disabled={!canProceed() || loading}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !canProceed()}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create School
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

