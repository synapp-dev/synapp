"use client";

import type { CertificationCourseRow } from "@/types/db";

import { useState, useEffect } from "react";
import { Calendar, Loader2, Save } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { certificationApi } from "@/entities/certification/api/endpoints";
import { toast } from "sonner";

type Course = CertificationCourseRow & {
  topicCount?: number;
};

interface CertificationCourseInformationProps {
  course: Course;
  onCourseUpdated?: () => void;
}

export function CertificationCourseInformation({
  course,
  onCourseUpdated,
}: CertificationCourseInformationProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load course data when component mounts or course changes
  useEffect(() => {
    if (course) {
      setName(course.name || "");
      setError(null);
    }
  }, [course]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const validateForm = (): { isValid: boolean; message?: string } => {
    if (!name.trim()) {
      return { isValid: false, message: "Name is required" };
    }
    return { isValid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    setError(null);

    const validation = validateForm();
    if (!validation.isValid) {
      setError(validation.message || "Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        name: name.trim(),
      };
      
      const result = await certificationApi.courses.update(course.id, updateData);

      if (result.error) {
        setError(result.error.message || "Failed to update course");
        toast.error(result.error.message || "Failed to update course");
        return;
      }

      toast.success("Course updated successfully");
      onCourseUpdated?.();
    } catch (err) {
      console.error("Failed to update certification course:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to update certification course. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!course) {
    return null;
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header with badges and save button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              Created {formatDate(course.createdAt)}
            </Badge>
            {course.updatedAt && (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Updated {formatDate(course.updatedAt)}
              </Badge>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Certification Course, Advanced Certification"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                The display name for this certification course
              </p>
            </div>
          </CardContent>
        </Card>
      </form>
    </>
  );
}
