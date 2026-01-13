"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { X, Loader2 } from "lucide-react";
import type { ClassOption } from "@/types/lesson-wizard";
import { classesApi } from "@/entities/classes/api/endpoints";
import { useMeStore } from "@/entities/me/model/store";
import { apiFetch } from "@/lib/api/fetcher.client";

interface LessonWizardClassesProps {
  schoolId: string | null;
  selectedClasses: ClassOption[];
  onClassesChange: (classes: ClassOption[]) => void;
}

type ClassWithYearCodes = {
  id: string;
  name: string;
  code: string | null;
  schoolId: string;
  yearCodes?: string[] | null;
};

type UserClass = {
  classId: string;
  className: string;
  classCode: string | null;
  schoolId: string;
  schoolName: string;
  active: boolean;
};

export function LessonWizardClasses({
  schoolId,
  selectedClasses,
  onClassesChange,
}: LessonWizardClassesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [classes, setClasses] = useState<ClassWithYearCodes[]>([]);
  const [userClasses, setUserClasses] = useState<UserClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useMeStore((s) => s.currentUser);

  // Fetch all classes for the school
  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      // Fetch all classes for the school
      classesApi.get.list({ schoolId, active: true }),
      // Fetch user's assigned classes if user is logged in
      currentUser?.id
        ? apiFetch<UserClass[]>(`/users/${currentUser.id}/classes`)
        : Promise.resolve({ data: [], error: null }),
    ])
      .then(([classesResult, userClassesResult]) => {
        if (classesResult.error) {
          setError(classesResult.error.message || "Failed to load classes");
          setClasses([]);
        } else if (classesResult.data) {
          setClasses(classesResult.data);
        } else {
          setClasses([]);
        }

        if (userClassesResult.error) {
          console.error("Failed to fetch user classes:", userClassesResult.error);
          setUserClasses([]);
        } else if (userClassesResult.data) {
          // Filter user classes to only include classes for this school
          const filteredUserClasses = userClassesResult.data.filter(
            (uc) => uc.schoolId === schoolId && uc.active
          );
          setUserClasses(filteredUserClasses);
        } else {
          setUserClasses([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch classes:", err);
        setError("Failed to load classes. Please try again.");
        setClasses([]);
        setUserClasses([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [schoolId, currentUser?.id]);

  // Split classes into "My Classes" and "All Classes"
  const { myClasses, allClasses } = useMemo(() => {
    const userClassIds = new Set(userClasses.map((uc) => uc.classId));
    
    const myClassesList: ClassWithYearCodes[] = [];
    const allClassesList: ClassWithYearCodes[] = [];

    classes.forEach((cls) => {
      if (userClassIds.has(cls.id)) {
        myClassesList.push(cls);
      } else {
        allClassesList.push(cls);
      }
    });

    return {
      myClasses: myClassesList,
      allClasses: allClassesList,
    };
  }, [classes, userClasses]);

  // Filter classes based on search query
  const filterClasses = (classList: ClassWithYearCodes[]) => {
    if (!searchQuery.trim()) return classList;
    
    const queryLower = searchQuery.toLowerCase();
    return classList.filter(
      (cls) =>
        cls.name.toLowerCase().includes(queryLower) ||
        cls.code?.toLowerCase().includes(queryLower) ||
        cls.yearCodes?.some((code) => code.toLowerCase().includes(queryLower))
    );
  };

  const filteredMyClasses = filterClasses(myClasses);
  const filteredAllClasses = filterClasses(allClasses);

  // Convert ClassWithYearCodes to ClassOption
  const toClassOption = (cls: ClassWithYearCodes): ClassOption => ({
    id: cls.id,
    name: cls.name,
    yearLevel: cls.yearCodes?.join(", ") || cls.code || "N/A",
    schoolId: cls.schoolId,
  });

  const toggleClassSelection = (classItem: ClassWithYearCodes) => {
    const classOption = toClassOption(classItem);
    const isSelected = selectedClasses.some((c) => c.id === classOption.id);

    if (isSelected) {
      onClassesChange(selectedClasses.filter((c) => c.id !== classOption.id));
    } else {
      onClassesChange([...selectedClasses, classOption]);
    }
  };

  const removeClass = (classId: string) => {
    onClassesChange(selectedClasses.filter((c) => c.id !== classId));
  };

  const renderClassCard = (classItem: ClassWithYearCodes) => {
    const isSelected = selectedClasses.some((c) => c.id === classItem.id);

    return (
      <button
        key={classItem.id}
        onClick={() => toggleClassSelection(classItem)}
        className={`
          flex items-center justify-between p-3 rounded-lg border text-left
          transition-colors
          ${isSelected
            ? "border-primary bg-primary/5"
            : "border-border hover:bg-accent"
          }
        `}
      >
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="font-medium">{classItem.name}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {classItem.code && (
              <span className="text-sm text-muted-foreground">Code: {classItem.code}</span>
            )}
            {classItem.yearCodes && classItem.yearCodes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {classItem.yearCodes.map((yearCode, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {yearCode}
                  </Badge>
                ))}
              </div>
            )}
            {!classItem.code && (!classItem.yearCodes || classItem.yearCodes.length === 0) && (
              <span className="text-sm text-muted-foreground">N/A</span>
            )}
          </div>
        </div>
        {isSelected && (
          <div className="text-primary ml-2">✓</div>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Selected classes chips */}
      {selectedClasses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedClasses.map((cls) => (
            <Badge
              key={cls.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-xs">{cls.name} ({cls.yearLevel})</span>
              <button
                onClick={() => removeClass(cls.id)}
                className="ml-1 rounded-full hover:bg-secondary-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <Input
        placeholder="Search classes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />

      {/* Class list */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* My Classes Section */}
            {filteredMyClasses.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  My Classes
                </h4>
                <div className="flex flex-col gap-2">
                  {filteredMyClasses.map(renderClassCard)}
                </div>
              </div>
            )}

            {/* All Classes Section */}
            {filteredAllClasses.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {filteredMyClasses.length > 0 ? "All Classes" : "Classes"}
                </h4>
                <div className="flex flex-col gap-2">
                  {filteredAllClasses.map(renderClassCard)}
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredMyClasses.length === 0 && filteredAllClasses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery
                  ? `No classes found matching "${searchQuery}"`
                  : "No classes available for this school"}
              </p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

