"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Plus, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Material {
  id: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  default_price: number;
  is_active: boolean;
}

interface MaterialSelectorProps {
  value?: string; // Material ID
  onSelect: (material: Material | null) => void;
  onCustomEntry?: () => void;
}

export default function MaterialSelector({
  value,
  onSelect,
  onCustomEntry,
}: MaterialSelectorProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/materials");
      if (response.ok) {
        const data = await response.json();
        setMaterials(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch materials:", error);
    } finally {
      setLoading(false);
    }
  };


  const categories = Array.from(
    new Set(materials.map((m) => m.category).filter(Boolean))
  ).sort();

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || material.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedMaterial = materials.find((m) => m.id === value);

  return (
    <div className="space-y-2">
      <div className="relative" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
        >
          {selectedMaterial ? (
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span>{selectedMaterial.name}</span>
              {selectedMaterial.default_price > 0 && (
                <span className="text-gray-500 text-sm">
                  (${selectedMaterial.default_price.toFixed(2)})
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-500">
              Select from catalog or enter custom
            </span>
          )}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-[400px] overflow-hidden flex flex-col">
            {/* Search */}
            <div className="p-2 border-b">
              <Input
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8"
              />
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="p-2 border-b">
                <div className="flex items-center space-x-2 flex-wrap gap-1">
                  <span className="text-xs text-gray-500">Category:</span>
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setSelectedCategory("all")}
                  >
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Materials List */}
            <div className="flex-1 overflow-y-auto">
              {filteredMaterials.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  {searchTerm
                    ? "No materials found"
                    : "No materials in catalog. Click 'Add New' to create one."}
                </div>
              ) : (
                <div className="py-1">
                  {filteredMaterials.map((material) => (
                    <div
                      key={material.id}
                      onClick={() => {
                        onSelect(material);
                        setOpen(false);
                        setSearchTerm("");
                      }}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {material.name}
                        </div>
                        {material.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {material.description}
                          </div>
                        )}
                        {material.category && (
                          <span className="text-xs text-blue-600">
                            {material.category}
                          </span>
                        )}
                      </div>
                      {material.default_price > 0 && (
                        <span className="ml-2 text-sm font-medium text-gray-700 whitespace-nowrap">
                          ${material.default_price.toFixed(2)}/{material.unit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t p-2 space-y-1">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                  setSearchTerm("");
                  if (onCustomEntry) onCustomEntry();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Enter Custom Item
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedMaterial && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Unit: {selectedMaterial.unit}</span>
          <span>•</span>
          <span>
            Price: {formatCurrencyWithSymbol(selectedMaterial.default_price)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {
              onSelect(null);
              if (onCustomEntry) onCustomEntry();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function formatCurrencyWithSymbol(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
