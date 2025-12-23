"use client";

import { useState, useEffect } from "react";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { X, Loader2 } from "lucide-react";
import type { ClassOption } from "@/types/lesson-wizard";
import { classesApi } from "@/entities/classes/api/endpoints";

interface LessonWizardClassesProps {
  schoolId: string;
  selectedClasses: ClassOption[];
  onClassesChange: (classes: ClassOption[]) => void;
}

export function LessonWizardClasses({
  schoolId,
  selectedClasses,
  onClassesChange,
}: LessonWizardClassesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    classesApi.get
      .list({ schoolId, active: true })
      .then((result) => {
        if (result.error) {
          setError(result.error.message || "Failed to load classes");
          setClasses([]);
        } else if (result.data) {
          // Map Class type to ClassOption format
          const mappedClasses: ClassOption[] = result.data.map((cls) => ({
            id: cls.id,
            name: cls.name,
            yearLevel: cls.code || cls.stream || "N/A", // Use code or stream as fallback for yearLevel
            schoolId: cls.schoolId,
          }));
          setClasses(mappedClasses);
        } else {
          setClasses([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch classes:", err);
        setError("Failed to load classes. Please try again.");
        setClasses([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [schoolId]);

  const filteredClasses = classes.filter((cls) =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.yearLevel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleClassSelection = (classItem: ClassOption) => {
    const isSelected = selectedClasses.some((c) => c.id === classItem.id);

    if (isSelected) {
      onClassesChange(selectedClasses.filter((c) => c.id !== classItem.id));
    } else {
      onClassesChange([...selectedClasses, classItem]);
    }
  };

  const removeClass = (classId: string) => {
    onClassesChange(selectedClasses.filter((c) => c.id !== classId));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Classes</h3>
        <p className="text-sm text-muted-foreground">
          Select one or more classes for this lesson
        </p>
      </div>

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
      <ScrollArea className="h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery
                  ? `No classes found matching "${searchQuery}"`
                  : "No classes available for this school"}
              </p>
            ) : (
              filteredClasses.map((classItem) => {
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
                    <div className="flex flex-col">
                      <span className="font-medium">{classItem.name}</span>
                      <span className="text-sm text-muted-foreground">{classItem.yearLevel}</span>
                    </div>
                    {isSelected && (
                      <div className="text-primary">✓</div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

