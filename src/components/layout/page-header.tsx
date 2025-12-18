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
}: PageHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-3">
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
          
          {secondaryActions && (
            <div className="flex items-center space-x-2">
              {secondaryActions}
            </div>
          )}
          
          {primaryAction && (
            <div>
              {primaryAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
