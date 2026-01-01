"use client";

import { useEffect, useState, useMemo } from "react";
import { useSchoolStore } from "@/stores/school-store";
import { classesApi } from "@/entities/classes/api/endpoints";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { GraduationCap, Plus, Loader2, Search } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Input } from "@workspace/ui/components/input";

// Simple fuzzy search function
function fuzzySearch(query: string, text: string): boolean {
  if (!query) return true;
  
  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) return true;
  
  // Fuzzy match: check if all characters in query appear in order in text
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length;
}

type ClassWithYearCodes = {
  id: string;
  schoolId: string;
  name: string;
  code: string | null;
  stream: string | null;
  room: string | null;
  studentCap: number | null;
  active: boolean;
  createdAt: string;
  yearCodes?: string[] | null;
};

export default function ClassesPage() {
  usePageTitle(["schools", "classes"]);
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const [classes, setClasses] = useState<ClassWithYearCodes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchClasses() {
      // Wait for school to be loaded from the store (set by layout)
      if (!currentSchool?.id) {
        setLoading(true);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query classes table where school_id matches the school UUID from store
        const result = await classesApi.get.list({
          schoolId: currentSchool.id,
        });

        if (result.error) {
          setError(result.error.message || "Failed to load classes");
          setClasses([]);
        } else {
          setClasses(result.data || []);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
        setClasses([]);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, [currentSchool?.id]);

  // Filter classes based on search query
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;

    return classes.filter((classItem) => {
      const name = classItem.name || "";
      const code = classItem.code || "";
      const stream = classItem.stream || "";
      const yearCodes = classItem.yearCodes?.join(" ") || "";
      
      return (
        fuzzySearch(searchQuery, name) ||
        fuzzySearch(searchQuery, code) ||
        fuzzySearch(searchQuery, stream) ||
        fuzzySearch(searchQuery, yearCodes)
      );
    });
  }, [classes, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Classes</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading classes...</p>
        </div>
      </div>
    );
  }

  if (!currentSchool) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">School not found</h1>
          <p className="text-muted-foreground">
            The school you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GraduationCap className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Classes</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search classes by name, code, stream, or year level..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Classes Grid */}
      {error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive">Error loading classes: {error}</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredClasses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No classes found matching your search."
                  : "No classes found for this school."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-md transition-shadow h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {classItem.name}
                    </CardTitle>
                    {classItem.stream && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Stream: {classItem.stream}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={classItem.active ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {classItem.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {classItem.code && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Code: </span>
                      <span className="font-medium">{classItem.code}</span>
                    </div>
                  )}
                  {classItem.yearCodes && classItem.yearCodes.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        Year Levels:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {classItem.yearCodes.map((yearCode, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {yearCode}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {classItem.room && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Room: </span>
                      <span className="font-medium">{classItem.room}</span>
                    </div>
                  )}
                  {classItem.studentCap && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Capacity: </span>
                      <span className="font-medium">{classItem.studentCap}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
