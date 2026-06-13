"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { invoicesApi } from "@/entities/invoices/api/endpoints";
import { invoiceKeys } from "@/entities/invoices/model/keys";

type InvoiceUploadDialogProps = {
  organisation: string;
  venue: string;
};

export function InvoiceUploadDialog({ organisation, venue }: InvoiceUploadDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file");
      const formData = new FormData();
      formData.append("file", file);
      if (notes.trim()) formData.append("notes", notes.trim());
      return invoicesApi.upload({ organisationSlug: organisation, venueSlug: venue, formData });
    },
    onSuccess: (res) => {
      if (res.error || !res.data) {
        toast.error("Upload failed", { description: res.error?.message });
        return;
      }
      toast.success("Invoice uploaded — review in Pending Review");
      setOpen(false);
      setFile(null);
      setNotes("");
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
    onError: (e: Error) => toast.error("Upload failed", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Upload invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload supplier invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invoice-file">PDF or image</Label>
            <Input
              id="invoice-file"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-notes">Notes (optional)</Label>
            <Input
              id="invoice-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bidfood weekly delivery"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!file || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending ? "Parsing…" : "Upload & parse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
