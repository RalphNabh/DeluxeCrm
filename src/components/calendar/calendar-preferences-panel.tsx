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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
          "flex h-[110px] w-[190px] items-center justify-center rounded-lg border-2 bg-white p-2.5 transition-colors",
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

/** Mini calendar-column mockup shared by Nested/Stacked/Vertical previews. */
function ColumnGridPreview({ columns }: { columns: { top: number; blocks: number[] }[] }) {
  return (
    <div className="flex h-full w-full flex-col gap-1">
      <div className="flex flex-1 gap-1">
        {columns.map((col, i) => (
          <div key={i} className="h-1 flex-1 rounded-full bg-gray-300" />
        ))}
      </div>
      <div className="flex flex-[5] gap-1">
        {columns.map((col, i) => (
          <div key={i} className="flex flex-1 flex-col gap-0.5" style={{ paddingTop: `${col.top}%` }}>
            {col.blocks.map((h, j) => (
              <div key={j} className="w-full rounded-sm bg-gray-300" style={{ height: `${h}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function NestedPreview() {
  return (
    <ColumnGridPreview
      columns={[
        { top: 0, blocks: [35, 25] },
        { top: 10, blocks: [55] },
        { top: 0, blocks: [20, 30] },
        { top: 25, blocks: [20, 20] },
      ]}
    />
  );
}

function StackedPreview() {
  return (
    <ColumnGridPreview
      columns={[
        { top: 0, blocks: [45] },
        { top: 55, blocks: [30] },
        { top: 15, blocks: [65] },
        { top: 0, blocks: [25] },
      ]}
    />
  );
}

function GrayedOutPreview() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1.5 rounded-md bg-gray-100 p-2.5">
      <CheckCircle className="h-4 w-4 text-green-500" />
      <div className="h-1.5 w-full rounded-full bg-gray-300" />
      <div className="h-1.5 w-4/5 rounded-full bg-gray-300" />
      <div className="h-1.5 w-2/5 rounded-full bg-gray-300" />
    </div>
  );
}

function StrikethroughPreview() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1.5 rounded-md bg-green-50 p-2.5">
      <div className="h-3.5 w-3.5 rounded-full bg-gray-400" />
      <div className="relative">
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-gray-700" />
          <div className="h-1.5 w-4/5 rounded-full bg-gray-700" />
        </div>
        <div className="absolute inset-x-0 top-1/2 border-t border-gray-700" />
      </div>
      <div className="h-1.5 w-2/5 rounded-full bg-gray-500" />
    </div>
  );
}

function VerticalPreview() {
  return (
    <ColumnGridPreview
      columns={[
        { top: 0, blocks: [30, 25] },
        { top: 15, blocks: [50] },
        { top: 5, blocks: [20, 30] },
      ]}
    />
  );
}

function HorizontalPreview() {
  const rows: { offset: number; width: number }[] = [
    { offset: 5, width: 30 },
    { offset: 45, width: 25 },
    { offset: 15, width: 50 },
  ];
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="h-1.5 w-3 shrink-0 rounded-full bg-gray-300" />
          <div className="relative h-2.5 flex-1">
            <div
              className="absolute h-full rounded-sm bg-gray-300"
              style={{ left: `${row.offset}%`, width: `${row.width}%` }}
            />
          </div>
        </div>
      ))}
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

          <SettingRow
            title="Weekends"
            description="Show or hide Saturday and Sunday in the Month and Week views."
          >
            <div className="flex items-center gap-2">
              <Switch
                id="show-weekends"
                checked={draft.showWeekends}
                onCheckedChange={(checked) => setDraft((d) => ({ ...d, showWeekends: checked }))}
              />
              <Label htmlFor="show-weekends" className="text-sm text-gray-700">
                {draft.showWeekends ? "Shown" : "Hidden"}
              </Label>
            </div>
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
