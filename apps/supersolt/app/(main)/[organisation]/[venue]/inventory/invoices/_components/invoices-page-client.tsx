"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  FileText,
  Mail,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

type InvoicesPageClientProps = {
  organisation: string;
  venue: string;
};

type InvoiceStatus = "pending_review" | "confirmed" | "disputed" | "duplicate";
type InvoiceSource = "upload" | "email";
type DocumentType = "invoice" | "credit_note";

type Invoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  supplierId: string;
  invoiceDate: string;
  createdAt: string;
  documentType: DocumentType;
  totalAmount: number;
  status: InvoiceStatus;
  source: InvoiceSource;
  originalFilename: string;
};

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }
> = {
  pending_review: { label: "Pending Review", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle },
  disputed: { label: "Disputed", variant: "destructive", icon: AlertCircle },
  duplicate: { label: "Duplicate", variant: "outline", icon: Copy },
};

const SEED_INVOICES: Invoice[] = [
  {
    id: "inv1",
    invoiceNumber: "FC-20260317",
    supplierName: "FreshCo Produce",
    supplierId: "sup1",
    invoiceDate: "2026-03-17",
    createdAt: "2026-03-17T09:20:00Z",
    documentType: "invoice",
    totalAmount: 48600,
    status: "pending_review",
    source: "email",
    originalFilename: "FreshCo_March17.pdf",
  },
  {
    id: "inv2",
    invoiceNumber: "MW-4821",
    supplierName: "MeatWorks",
    supplierId: "sup2",
    invoiceDate: "2026-03-15",
    createdAt: "2026-03-15T14:05:00Z",
    documentType: "invoice",
    totalAmount: 156200,
    status: "confirmed",
    source: "upload",
    originalFilename: "MeatWorks_inv4821.pdf",
  },
  {
    id: "inv3",
    invoiceNumber: "PS-7734",
    supplierName: "Pacific Seafood",
    supplierId: "sup3",
    invoiceDate: "2026-03-14",
    createdAt: "2026-03-14T11:30:00Z",
    documentType: "invoice",
    totalAmount: 89400,
    status: "pending_review",
    source: "email",
    originalFilename: "pacific_seafood_7734.pdf",
  },
  {
    id: "inv4",
    invoiceNumber: "DD-1190",
    supplierName: "Dairy Direct",
    supplierId: "sup4",
    invoiceDate: "2026-03-12",
    createdAt: "2026-03-12T08:45:00Z",
    documentType: "invoice",
    totalAmount: 21800,
    status: "confirmed",
    source: "upload",
    originalFilename: "DairyDirect_1190.pdf",
  },
  {
    id: "inv5",
    invoiceNumber: "FC-CN-0042",
    supplierName: "FreshCo Produce",
    supplierId: "sup1",
    invoiceDate: "2026-03-11",
    createdAt: "2026-03-11T16:15:00Z",
    documentType: "credit_note",
    totalAmount: -3200,
    status: "confirmed",
    source: "email",
    originalFilename: "FreshCo_credit_0042.pdf",
  },
  {
    id: "inv6",
    invoiceNumber: "MW-4799",
    supplierName: "MeatWorks",
    supplierId: "sup2",
    invoiceDate: "2026-03-09",
    createdAt: "2026-03-09T10:00:00Z",
    documentType: "invoice",
    totalAmount: 134800,
    status: "disputed",
    source: "upload",
    originalFilename: "MeatWorks_inv4799.pdf",
  },
  {
    id: "inv7",
    invoiceNumber: "PS-7701",
    supplierName: "Pacific Seafood",
    supplierId: "sup3",
    invoiceDate: "2026-03-07",
    createdAt: "2026-03-07T13:20:00Z",
    documentType: "invoice",
    totalAmount: 67500,
    status: "confirmed",
    source: "email",
    originalFilename: "pacific_seafood_7701.pdf",
  },
  {
    id: "inv8",
    invoiceNumber: "DD-1185",
    supplierName: "Dairy Direct",
    supplierId: "sup4",
    invoiceDate: "2026-03-05",
    createdAt: "2026-03-05T09:10:00Z",
    documentType: "invoice",
    totalAmount: 19400,
    status: "duplicate",
    source: "upload",
    originalFilename: "DairyDirect_1185_dup.pdf",
  },
  {
    id: "inv9",
    invoiceNumber: "FC-20260303",
    supplierName: "FreshCo Produce",
    supplierId: "sup1",
    invoiceDate: "2026-03-03",
    createdAt: "2026-03-03T07:55:00Z",
    documentType: "invoice",
    totalAmount: 38900,
    status: "confirmed",
    source: "email",
    originalFilename: "FreshCo_March03.pdf",
  },
  {
    id: "inv10",
    invoiceNumber: "MW-4780",
    supplierName: "MeatWorks",
    supplierId: "sup2",
    invoiceDate: "2026-03-01",
    createdAt: "2026-03-01T15:40:00Z",
    documentType: "invoice",
    totalAmount: 112300,
    status: "confirmed",
    source: "upload",
    originalFilename: "MeatWorks_inv4780.pdf",
  },
];

type SourceFilterValue = "all" | InvoiceSource;
type DateFilterValue = "all" | "7d" | "30d" | "90d";
type StatusFilterValue = "all" | InvoiceStatus;

function formatCurrency(cents: number): string {
  const abs = Math.abs(cents);
  const formatted = `$${(abs / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return cents < 0 ? `−${formatted}` : formatted;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

export function InvoicesPageClient({ organisation, venue }: InvoicesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");

  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of SEED_INVOICES) {
      map.set(inv.supplierId, inv.supplierName);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, []);

  const filtered = useMemo(() => {
    let items: Invoice[] = SEED_INVOICES;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.supplierName.toLowerCase().includes(q) ||
          inv.originalFilename.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      items = items.filter((inv) => inv.status === statusFilter);
    }

    if (supplierFilter !== "all") {
      items = items.filter((inv) => inv.supplierId === supplierFilter);
    }

    if (sourceFilter !== "all") {
      items = items.filter((inv) => inv.source === sourceFilter);
    }

    if (dateFilter !== "all") {
      const now = Date.now();
      const ms: Record<Exclude<DateFilterValue, "all">, number> = {
        "7d": 7 * 86_400_000,
        "30d": 30 * 86_400_000,
        "90d": 90 * 86_400_000,
      };
      const cutoff = now - ms[dateFilter];
      items = items.filter((inv) => new Date(inv.invoiceDate).getTime() >= cutoff);
    }

    return [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [searchQuery, statusFilter, supplierFilter, sourceFilter, dateFilter]);

  return (
    <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Invoices
        </h1>
      </div>
      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 w-[480px] max-w-full pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
              <SelectItem value="duplicate">Duplicate</SelectItem>
            </SelectContent>
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {uniqueSuppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilterValue)}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilterValue)}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="pl-6 text-xs font-medium uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Supplier</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Invoice #</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wider">
                    Total
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Source</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  className="h-14 cursor-pointer bg-[#bcdc88]/20 hover:bg-[#bcdc88]/50"
                  onClick={() => toast.info("Upload invoice coming soon")}
                >
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/5">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-medium">Upload invoice</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                </TableRow>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No invoices found. Adjust filters or upload a new invoice.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => {
                    const cfg = STATUS_CONFIG[inv.status];
                    const StatusIcon = cfg.icon;

                    return (
                      <TableRow key={inv.id} className="h-14 cursor-pointer hover:bg-muted/50">
                        <TableCell className="pl-6 text-sm">{formatDate(inv.invoiceDate)}</TableCell>
                        <TableCell className="font-medium">{inv.supplierName}</TableCell>
                        <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {inv.documentType.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            inv.totalAmount < 0 && "text-red-600"
                          )}
                        >
                          {formatCurrency(inv.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inv.source === "email" ? (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Mail className="h-3 w-3" />
                              Email
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Upload className="h-3 w-3" />
                              Upload
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toast.info("Invoice detail coming soon")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      
    </section>
  );
}
