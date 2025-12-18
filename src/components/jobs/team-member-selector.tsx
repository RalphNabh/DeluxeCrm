"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
}

interface TeamMemberSelectorProps {
  value: string; // Comma-separated string of team member names
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export default function TeamMemberSelector({
  value,
  onChange,
  label = "Team Members",
  placeholder = "Select team members or type names manually",
}: TeamMemberSelectorProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    // Update input value when external value changes
    setInputValue("");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/team");
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.filter((member: TeamMember) => member.status === "Active"));
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedMembers = value ? value.split(",").map((m) => m.trim()).filter(Boolean) : [];
  const availableMembers = teamMembers.filter(
    (member) => !selectedMembers.includes(member.name)
  );

  const handleSelectTeamMember = (memberName: string) => {
    if (!selectedMembers.includes(memberName)) {
      const newValue = value ? `${value}, ${memberName}` : memberName;
      onChange(newValue);
    }
    setShowDropdown(false);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value;
    setInputValue(newInput);
    setShowDropdown(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const newValue = value ? `${value}, ${inputValue.trim()}` : inputValue.trim();
      onChange(newValue);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && selectedMembers.length > 0) {
      // Remove last member if backspace on empty input
      const newMembers = selectedMembers.slice(0, -1);
      onChange(newMembers.join(", "));
    }
  };

  const handleRemoveMember = (memberName: string) => {
    const newMembers = selectedMembers.filter((m) => m !== memberName);
    onChange(newMembers.join(", "));
  };

  const handleInputFocus = () => {
    if (availableMembers.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <Label>{label}</Label>
      
      {/* Selected Members Display */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedMembers.map((member) => {
            const teamMember = teamMembers.find((m) => m.name === member);
            const isTeamMember = !!teamMember;
            
            return (
              <div
                key={member}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm ${
                  isTeamMember
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : "bg-gray-100 text-gray-800 border border-gray-200"
                }`}
              >
                <span>{member}</span>
                {isTeamMember && (
                  <span className="text-xs text-blue-600">({teamMember.role})</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member)}
                  className="ml-1 hover:bg-black/10 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input with Dropdown */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
        />
        
        {/* Dropdown with Team Members */}
        {showDropdown && availableMembers.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 mb-2 px-2">
                Select from team:
              </div>
              {availableMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelectTeamMember(member.name)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.email}</div>
                  </div>
                  <span className="text-xs text-blue-600">{member.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Select from team members above or type names manually (comma-separated). Press Enter to add.
      </p>
    </div>
  );
}

