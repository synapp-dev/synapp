"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { schoolApi } from "@/entities/school/api/endpoints";
import { useSchoolDetail } from "./school-detail-context";

export function SchoolDeleteSchoolDialogs() {
  const {
    school,
    onOpenChange,
    onSchoolUpdate,
    isDeleteSchoolDialogOpen,
    setIsDeleteSchoolDialogOpen,
  } = useSchoolDetail();

  const [isConfirmDeleteSchoolDialogOpen, setIsConfirmDeleteSchoolDialogOpen] =
    useState(false);
  const [isDeletingSchool, setIsDeletingSchool] = useState(false);
  const [deleteSchoolError, setDeleteSchoolError] = useState<string | null>(
    null
  );
  const [deleteSchoolConfirmation, setDeleteSchoolConfirmation] = useState("");

  return (
    <>
      <Dialog
        open={isDeleteSchoolDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsDeleteSchoolDialogOpen(nextOpen);
          if (!nextOpen) {
            setDeleteSchoolError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete School</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this school? This action cannot
              be undone.
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

      <Dialog
        open={isConfirmDeleteSchoolDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsConfirmDeleteSchoolDialogOpen(nextOpen);
          if (!nextOpen) {
            setDeleteSchoolError(null);
            setDeleteSchoolConfirmation("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Type the school name <strong>{school.name}</strong> to confirm
              deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-school-name">School Name</Label>
              <Input
                id="confirm-school-name"
                placeholder={school.name}
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
                    setIsConfirmDeleteSchoolDialogOpen(false);
                    setDeleteSchoolConfirmation("");
                    onOpenChange(false);
                    onSchoolUpdate?.();
                  }
                } catch (error: unknown) {
                  console.error("[SCHOOL DELETE] Error:", error);
                  setDeleteSchoolError(
                    error instanceof Error
                      ? error.message
                      : "An unexpected error occurred"
                  );
                } finally {
                  setIsDeletingSchool(false);
                }
              }}
              disabled={
                isDeletingSchool || deleteSchoolConfirmation !== school.name
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
    </>
  );
}
