"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { toast } from "sonner";
import {
  downloadCsv,
  downloadPdf,
  type ExportTable,
} from "@/lib/report-export";

interface ReportExportMenuProps {
  /** Base filename without extension, e.g. "bullyproof-reports-overview". */
  filename: string;
  documentTitle: string;
  /** May fetch on demand: called when the user picks a format. */
  getTables: () => ExportTable[] | Promise<ExportTable[]>;
  disabled?: boolean;
}

export function ReportExportMenu({
  filename,
  documentTitle,
  getTables,
  disabled = false,
}: ReportExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "pdf") => {
    setIsExporting(true);
    try {
      const tables = await getTables();
      if (format === "csv") {
        downloadCsv(filename, tables);
      } else {
        await downloadPdf(filename, documentTitle, tables);
      }
    } catch (error) {
      console.error("Report export failed:", error);
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
