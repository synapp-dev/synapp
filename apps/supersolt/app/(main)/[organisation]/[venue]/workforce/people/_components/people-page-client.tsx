"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MoreVertical, Phone, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import { Separator } from "@workspace/ui/components/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { positionBadgeClass } from "@/lib/roster/position-styles";
import { PeopleStaffSheet } from "./people-staff-sheet";
import {
  ROLE_BADGE_VARIANT,
  ROLE_STYLES,
  enrichFromApiRow,
  formatStartDate,
  getInitials,
  type PeopleApiStaff,
  type StaffMember,
  type SortField,
} from "./people-staff-model";

type PeoplePageClientProps = {
  organisation: string;
  venue: string;
};

export function PeoplePageClient({ organisation, venue }: PeoplePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterEmpType, setFilterEmpType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoadingStaff(true);
      setLoadError(null);
      try {
        const path = `/api/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/people`;
        const res = await fetch(path);
        const json = (await res.json()) as {
          data: { staff: PeopleApiStaff[] } | null;
          error: { message: string } | null;
        };
        if (cancelled) return;
        if (!res.ok || json.error || !json.data) {
          setLoadError(json.error?.message ?? "Could not load people");
          setStaffList([]);
          return;
        }
        setStaffList(json.data.staff.map(enrichFromApiRow));
      } catch {
        if (!cancelled) {
          setLoadError("Could not load people");
          setStaffList([]);
        }
      } finally {
        if (!cancelled) setIsLoadingStaff(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [organisation, venue]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return staffList
      .filter((s) => {
        const matchSearch =
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.roleSlug.toLowerCase().includes(q) ||
          s.roleDisplayName.toLowerCase().includes(q);
        const matchRole = filterRole === "all" || s.roleTier === filterRole;
        const matchEmp = filterEmpType === "all" || s.employmentType === filterEmpType;
        return matchSearch && matchRole && matchEmp;
      })
      .sort((a, b) =>
        sortBy === "start_date"
          ? new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          : a.name.localeCompare(b.name)
      );
  }, [staffList, searchQuery, filterRole, filterEmpType, sortBy]);

  const isShowingAll = pageSize === -1;
  const totalPages = isShowingAll ? 1 : Math.max(1, Math.ceil(filteredStaff.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterEmpType, sortBy, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const paginatedStaff = useMemo(() => {
    if (isShowingAll) {
      return filteredStaff;
    }
    const startIndex = (currentPage - 1) * pageSize;
    return filteredStaff.slice(startIndex, startIndex + pageSize);
  }, [filteredStaff, currentPage, isShowingAll, pageSize]);

  const visibleStart = filteredStaff.length === 0 ? 0 : isShowingAll ? 1 : (currentPage - 1) * pageSize + 1;
  const visibleEnd = filteredStaff.length === 0 ? 0 : visibleStart + paginatedStaff.length - 1;

  return (
    <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Users className="h-5 w-5 text-muted-foreground" />
          People
        </h1>
        {isLoadingStaff ? (
          <span className="text-sm text-muted-foreground">Loading…</span>
        ) : null}
        {loadError ? <span className="text-sm text-destructive">{loadError}</span> : null}
      </div>
      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-[420px] max-w-full pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="crew">Crew</SelectItem>
              <SelectItem value="custom">Custom role</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEmpType} onValueChange={setFilterEmpType}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="start_date">Sort: Start Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-medium uppercase tracking-wider">Staff Member</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider">Access / station</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider">Employment</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider">Contact</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider">Next Shift</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider">Status</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              className="cursor-pointer bg-[#bcdc88]/20 hover:bg-[#bcdc88]/50"
              onClick={(e) => {
                e.stopPropagation();
                toast.info("Add staff member — coming soon");
              }}
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/5">
                    <Plus className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="font-medium">Add new staff member</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">-</TableCell>
              <TableCell className="text-muted-foreground">-</TableCell>
              <TableCell className="text-muted-foreground">-</TableCell>
              <TableCell className="text-muted-foreground">-</TableCell>
              <TableCell className="text-muted-foreground">-</TableCell>
              <TableCell className="text-muted-foreground">-</TableCell>
            </TableRow>
            {paginatedStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No staff members found. Adjust filters to see more results.
                </TableCell>
              </TableRow>
            ) : (
              paginatedStaff.map((person) => (
                <TableRow
                  key={person.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedStaff(person)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          ROLE_STYLES[person.roleTier]
                        )}
                      >
                        {getInitials(person.name)}
                      </div>
                      <div>
                        <div className="font-medium">{person.name}</div>
                        <div className="text-xs text-muted-foreground">Since {formatStartDate(person.startDate)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={ROLE_BADGE_VARIANT[person.roleTier]} className="w-fit text-xs">
                        {person.roleDisplayName}
                      </Badge>
                      {person.positionSlug && person.positionDisplayName ? (
                        <Badge
                          variant="outline"
                          className={cn("w-fit px-1.5 py-0 text-[10px]", positionBadgeClass(person.positionSlug))}
                        >
                          {person.positionDisplayName}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No roster station</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {person.employmentType.replace("-", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{person.email}</span>
                      </div>
                      {person.phone ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {person.phone}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {person.nextShift ? (
                      <div className="text-xs text-muted-foreground">
                        <div>{person.nextShift.day}</div>
                        <div>{person.nextShift.time}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No upcoming</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={person.status === "active" ? "default" : "secondary"}>
                      {person.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("Actions: Edit, View Profile, Roster, Deactivate — coming soon");
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-xs text-muted-foreground">
          {isShowingAll
            ? `Showing all ${filteredStaff.length} staff members`
            : `Showing ${visibleStart}-${visibleEnd} of ${filteredStaff.length}`}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs whitespace-nowrap text-muted-foreground">Rows per page:</span>
            {isHydrated ? (
              <Select
                value={isShowingAll ? "all" : String(pageSize)}
                onValueChange={(value) => setPageSize(value === "all" ? -1 : Number(value))}
              >
                <SelectTrigger className="h-8 w-[88px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="h-8 w-[88px] rounded-md border bg-background" />
            )}
          </div>
          {!isShowingAll ? (
            <Pagination className="!mx-0 !w-auto !justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage((page) => Math.max(1, page - 1));
                    }}
                    className={cn(currentPage <= 1 && "pointer-events-none opacity-50")}
                    aria-disabled={currentPage <= 1}
                  />
                </PaginationItem>

                {currentPage > 3 ? (
                  <>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage(1);
                        }}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {currentPage > 4 ? (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : null}
                  </>
                ) : null}

                {currentPage > 1 ? (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage(currentPage - 1);
                      }}
                    >
                      {currentPage - 1}
                    </PaginationLink>
                  </PaginationItem>
                ) : null}

                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {currentPage}
                  </PaginationLink>
                </PaginationItem>

                {currentPage < totalPages ? (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage(currentPage + 1);
                      }}
                    >
                      {currentPage + 1}
                    </PaginationLink>
                  </PaginationItem>
                ) : null}

                {currentPage < totalPages - 2 ? (
                  <>
                    {currentPage < totalPages - 3 ? (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : null}
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage(totalPages);
                        }}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                ) : null}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage((page) => Math.min(totalPages, page + 1));
                    }}
                    className={cn(currentPage >= totalPages && "pointer-events-none opacity-50")}
                    aria-disabled={currentPage >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </div>
      </div>

      <PeopleStaffSheet
        staff={selectedStaff}
        open={selectedStaff !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedStaff(null);
          }
        }}
        organisationSlug={organisation}
        venueSlug={venue}
      />
    </section>
  );
}
