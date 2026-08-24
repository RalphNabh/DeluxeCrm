"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarPreferences, DayOrientation } from "@/lib/calendar-preferences";
import type { AppointmentLayout, CompletedStyle } from "@/lib/utils/calendar-overlap";

interface CalendarPreferencesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: CalendarPreferences;
  onSave: (prefs: CalendarPreferences) => void;
}

function OptionCard({
  selected,
  onClick,
  label,
  preview,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  preview: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
    >
      <div
        className={cn(
          "flex h-20 w-32 items-center justify-center rounded-lg border-2 bg-white p-2 transition-colors",
          selected ? "border-green-600" : "border-gray-200 group-hover:border-gray-300",
        )}
      >
        {preview}
      </div>
      <div className="flex items-center gap-1.5 text-sm text-gray-700">
        <span
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded-full border-2",
            selected ? "border-green-600" : "border-gray-300",
          )}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-green-600" />}
        </span>
        {label}
      </div>
    </button>
  );
}

function NestedPreview() {
  return (
    <div className="flex h-full w-full gap-1">
      <div className="h-full flex-1 rounded bg-gray-300" />
      <div className="h-full flex-1 rounded bg-gray-300" />
    </div>
  );
}

function StackedPreview() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 translate-x-1.5 translate-y-1 rounded bg-gray-200" />
      <div className="absolute inset-0 rounded bg-gray-300" />
    </div>
  );
}

function GrayedOutPreview() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1 rounded bg-gray-100 p-2">
      <CheckCircle className="h-3.5 w-3.5 text-gray-400" />
      <div className="h-1.5 w-full rounded bg-gray-300" />
      <div className="h-1.5 w-2/3 rounded bg-gray-300" />
    </div>
  );
}

function StrikethroughPreview() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1 rounded bg-green-50 p-2">
      <div className="relative h-1.5 w-full rounded bg-green-300">
        <div className="absolute inset-y-1/2 w-full border-t border-gray-700" />
      </div>
      <div className="h-1.5 w-2/3 rounded bg-green-300" />
    </div>
  );
}

function VerticalPreview() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1">
      <div className="h-1.5 w-full rounded bg-gray-300" />
      <div className="h-1.5 w-full rounded bg-gray-300" />
      <div className="h-1.5 w-full rounded bg-gray-300" />
    </div>
  );
}

function HorizontalPreview() {
  return (
    <div className="flex h-full w-full items-center gap-1">
      <div className="h-full w-1.5 rounded bg-gray-300" />
      <div className="h-full w-1.5 rounded bg-gray-300" />
      <div className="h-full w-1.5 rounded bg-gray-300" />
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-gray-100 py-6 last:border-b-0 md:flex-row md:items-start md:justify-between">
      <div className="max-w-sm">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      <div className="flex shrink-0 gap-4">{children}</div>
    </div>
  );
}

export function CalendarPreferencesPanel({
  open,
  onOpenChange,
  value,
  onSave,
}: CalendarPreferencesPanelProps) {
  const [draft, setDraft] = useState<CalendarPreferences>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule settings</DialogTitle>
          <DialogDescription>
            Control how your calendar looks and behaves so it&apos;s easier for you to use.
            These changes are saved just for you.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-gray-100">
          <SettingRow
            title="Appointment layout"
            description="Choose how overlapping appointments are laid out in the Week view. Nested for better title legibility in crowded schedules. Stacked for visual clarity of time gaps."
          >
            <OptionCard
              selected={draft.appointmentLayout === "nested"}
              onClick={() => setDraft((d) => ({ ...d, appointmentLayout: "nested" as AppointmentLayout }))}
              label="Nested"
              preview={<NestedPreview />}
            />
            <OptionCard
              selected={draft.appointmentLayout === "stacked"}
              onClick={() => setDraft((d) => ({ ...d, appointmentLayout: "stacked" as AppointmentLayout }))}
              label="Stacked"
              preview={<StackedPreview />}
            />
          </SettingRow>

          <SettingRow
            title="Completed appointment styling"
            description="Choose how completed appointments are styled. Grayed out for better overdue visibility. Strikethrough to preserve your color coding."
          >
            <OptionCard
              selected={draft.completedStyle === "grayed_out"}
              onClick={() => setDraft((d) => ({ ...d, completedStyle: "grayed_out" as CompletedStyle }))}
              label="Grayed out"
              preview={<GrayedOutPreview />}
            />
            <OptionCard
              selected={draft.completedStyle === "strikethrough"}
              onClick={() => setDraft((d) => ({ ...d, completedStyle: "strikethrough" as CompletedStyle }))}
              label="Strikethrough"
              preview={<StrikethroughPreview />}
            />
          </SettingRow>

          <SettingRow
            title="Day view orientation"
            description="Choose how time is shown in the Day view. Vertical is ideal if you have a lot of appointments. Horizontal gives you a timeline view."
          >
            <OptionCard
              selected={draft.dayOrientation === "vertical"}
              onClick={() => setDraft((d) => ({ ...d, dayOrientation: "vertical" as DayOrientation }))}
              label="Vertical"
              preview={<VerticalPreview />}
            />
            <OptionCard
              selected={draft.dayOrientation === "horizontal"}
              onClick={() => setDraft((d) => ({ ...d, dayOrientation: "horizontal" as DayOrientation }))}
              label="Horizontal"
              preview={<HorizontalPreview />}
            />
          </SettingRow>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
