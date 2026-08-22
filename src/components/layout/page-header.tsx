"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  filters?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  showSearch = false,
  primaryAction,
  secondaryActions,
  filters,
}: PageHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-4 transition-colors md:px-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        
        <div className="flex flex-col flex-wrap gap-3 space-y-0 md:flex-row md:items-center">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue || ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10 w-full md:w-64"
              />
            </div>
          )}
          
          {filters && (
            <div className="flex items-center space-x-2">
              {filters}
            </div>
          )}
          
          {secondaryActions && (
            <div className="flex flex-wrap items-center gap-2">
              {secondaryActions}
            </div>
          )}

          {primaryAction && (
            <div className="w-full md:w-auto [&>a]:block [&>a>button]:w-full [&>button]:w-full md:[&>a]:inline md:[&>a>button]:w-auto md:[&>button]:w-auto">
              {primaryAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}






