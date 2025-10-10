import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { X, Search, Filter } from "lucide-react";

interface SchoolFiltersProps {
  onFiltersChange: (filters: {
    search: string;
    state: string;
    sector: string;
    status: string;
    engagementMin: number;
    engagementMax: number;
    cultureMin: number;
    cultureMax: number;
  }) => void;
}

export function SchoolFilters({ onFiltersChange }: SchoolFiltersProps) {
  const [filters, setFilters] = useState({
    search: "",
    state: "all",
    sector: "all",
    status: "all",
    engagementMin: 0,
    engagementMax: 100,
    cultureMin: 0,
    cultureMax: 5,
  });

  const handleFilterChange = (key: string, value: string | number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: "",
      state: "all",
      sector: "all",
      status: "all",
      engagementMin: 0,
      engagementMax: 100,
      cultureMin: 0,
      cultureMax: 5,
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "search") return value !== "";
    if (key === "state" || key === "sector" || key === "status")
      return value !== "all";
    return value !== 0 && value !== 100 && value !== 5;
  });

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search schools..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.state}
            onValueChange={(value) => handleFilterChange("state", value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="NSW">NSW</SelectItem>
              <SelectItem value="VIC">VIC</SelectItem>
              <SelectItem value="QLD">QLD</SelectItem>
              <SelectItem value="SA">SA</SelectItem>
              <SelectItem value="WA">WA</SelectItem>
              <SelectItem value="TAS">TAS</SelectItem>
              <SelectItem value="NT">NT</SelectItem>
              <SelectItem value="ACT">ACT</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sector}
            onValueChange={(value) => handleFilterChange("sector", value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              <SelectItem value="government">Government</SelectItem>
              <SelectItem value="catholic">Catholic</SelectItem>
              <SelectItem value="independent">Independent</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange("status", value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Filter className="h-4 w-4" />
            Active filters:
          </span>
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("search", "")}
              />
            </Badge>
          )}
          {filters.state && filters.state !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              State: {filters.state}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("state", "all")}
              />
            </Badge>
          )}
          {filters.sector && filters.sector !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Sector: {filters.sector}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("sector", "all")}
              />
            </Badge>
          )}
          {filters.status && filters.status !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("status", "all")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
