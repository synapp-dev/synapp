"use client";

import { useState } from "react";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { X } from "lucide-react";
import type { ClassOption } from "@/types/lesson-wizard";

interface LessonWizardClassesProps {
  selectedClasses: ClassOption[];
  onClassesChange: (classes: ClassOption[]) => void;
}

// Dummy class data (formatted like "7 Blue", "8 Red", etc.)
const dummyClasses: ClassOption[] = [
  { id: "class-1", name: "7 Blue", yearLevel: "Year 7", schoolId: "" },
  { id: "class-2", name: "8 Red", yearLevel: "Year 8", schoolId: "" },
  { id: "class-3", name: "9 Green", yearLevel: "Year 9", schoolId: "" },
  { id: "class-4", name: "10 Yellow", yearLevel: "Year 10", schoolId: "" },
  { id: "class-5", name: "11 Purple", yearLevel: "Year 11", schoolId: "" },
  { id: "class-6", name: "6 Orange", yearLevel: "Year 6", schoolId: "" },
];

export function LessonWizardClasses({
  selectedClasses,
  onClassesChange,
}: LessonWizardClassesProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClasses = dummyClasses.filter((cls) =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="flex flex-col gap-2">
          {filteredClasses.map((classItem) => {
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
          })}
        </div>
      </ScrollArea>

      {searchQuery && filteredClasses.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No classes found matching "{searchQuery}"
        </p>
      )}
    </div>
  );
}

