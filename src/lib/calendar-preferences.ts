import type { AppointmentLayout, CompletedStyle } from "@/lib/utils/calendar-overlap";

export type DayOrientation = "vertical" | "horizontal";

export interface CalendarPreferences {
  appointmentLayout: AppointmentLayout;
  completedStyle: CompletedStyle;
  dayOrientation: DayOrientation;
  showWeekends: boolean;
}

export const DEFAULT_CALENDAR_PREFERENCES: CalendarPreferences = {
  appointmentLayout: "nested",
  completedStyle: "grayed_out",
  dayOrientation: "vertical",
  showWeekends: true,
};

const STORAGE_KEY = "calendar-view-settings";

const VALID_APPOINTMENT_LAYOUTS: AppointmentLayout[] = ["nested", "stacked"];
const VALID_COMPLETED_STYLES: CompletedStyle[] = ["grayed_out", "strikethrough"];
const VALID_DAY_ORIENTATIONS: DayOrientation[] = ["vertical", "horizontal"];

/** Pure parse, no localStorage access - testable without a DOM. */
export function parseCalendarPreferences(raw: string | null): CalendarPreferences | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CalendarPreferences>;
    if (
      parsed &&
      typeof parsed === "object" &&
      VALID_APPOINTMENT_LAYOUTS.includes(parsed.appointmentLayout as AppointmentLayout) &&
      VALID_COMPLETED_STYLES.includes(parsed.completedStyle as CompletedStyle) &&
      VALID_DAY_ORIENTATIONS.includes(parsed.dayOrientation as DayOrientation) &&
      typeof parsed.showWeekends === "boolean"
    ) {
      return {
        appointmentLayout: parsed.appointmentLayout as AppointmentLayout,
        completedStyle: parsed.completedStyle as CompletedStyle,
        dayOrientation: parsed.dayOrientation as DayOrientation,
        showWeekends: parsed.showWeekends,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function loadCalendarPreferences(): CalendarPreferences {
  if (typeof window === "undefined") return DEFAULT_CALENDAR_PREFERENCES;
  return parseCalendarPreferences(localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_CALENDAR_PREFERENCES;
}

export function saveCalendarPreferences(prefs: CalendarPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

/** Whether the user has ever saved a preference - drives the first-run prompt. */
export function hasCalendarPreferences(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== null;
}
