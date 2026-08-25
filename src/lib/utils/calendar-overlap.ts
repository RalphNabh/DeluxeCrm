/**
 * Utility functions for handling overlapping events in calendar views
 */

export interface CalendarEvent {
  id: string;
  start_time: string;
  end_time: string;
  [key: string]: any;
}

export interface PositionedEvent extends CalendarEvent {
  left: number; // Percentage from left (0-100)
  width: number; // Percentage width (0-100)
  column: number; // Column index (0-based)
  totalColumns: number; // Total columns in this overlap group
}

/**
 * Check if two events overlap in time
 */
function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  const start1 = new Date(event1.start_time).getTime();
  const end1 = new Date(event1.end_time).getTime();
  const start2 = new Date(event2.start_time).getTime();
  const end2 = new Date(event2.end_time).getTime();

  return !(end1 <= start2 || end2 <= start1);
}

/**
 * Group events into columns based on overlaps
 */
function groupEventsIntoColumns(events: CalendarEvent[]): PositionedEvent[] {
  if (events.length === 0) return [];

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  const positioned: PositionedEvent[] = [];
  const columns: CalendarEvent[][] = [];

  for (const event of sortedEvents) {
    let placed = false;

    // Try to place event in existing column
    for (let i = 0; i < columns.length; i++) {
      const columnEvents = columns[i];
      // Check if event doesn't overlap with any event in this column
      const noOverlap = columnEvents.every(
        (existingEvent) => !eventsOverlap(event, existingEvent)
      );

      if (noOverlap) {
        columnEvents.push(event);
        positioned.push({
          ...event,
          column: i,
          totalColumns: columns.length,
          left: 0,
          width: 0, // Will be calculated later
        });
        placed = true;
        break;
      }
    }

    // If couldn't place in existing column, create new one
    if (!placed) {
      columns.push([event]);
      positioned.push({
        ...event,
        column: columns.length - 1,
        totalColumns: columns.length,
        left: 0,
        width: 0, // Will be calculated later
      });
    }
  }

  // Calculate widths and positions for each event
  // We need to find the maximum number of columns at any point in time
  const maxColumns = Math.max(...positioned.map((e) => e.totalColumns));

  // For each positioned event, calculate its width based on its column
  return positioned.map((event) => {
    const width = 100 / maxColumns;
    const left = (event.column / maxColumns) * 100;

    return {
      ...event,
      width,
      left,
      totalColumns: maxColumns,
    };
  });
}

/**
 * Calculate positions for overlapping events with side-by-side layout
 * @param events Array of events to position
 * @returns Array of events with left, width, column, and totalColumns properties
 */
export function calculateEventPositions(
  events: CalendarEvent[]
): PositionedEvent[] {
  if (events.length === 0) return [];

  // Group events into columns
  const positioned = groupEventsIntoColumns(events);

  return positioned;
}

export type AppointmentLayout = "nested" | "stacked";
export type CompletedStyle = "grayed_out" | "strikethrough";

/**
 * Resolve the left/width/z-index for one positioned event given the
 * user's chosen appointment layout.
 *
 * "nested" keeps the side-by-side column split calculateEventPositions
 * already computed. "stacked" ignores that split and gives every event
 * the full column width, fanning overlapping events out by a small
 * pixel offset (using the same `column` index) so none are fully
 * hidden - matches Jobber's documented tradeoff: stacked favors seeing
 * true empty-time gaps over side-by-side overlap clarity.
 */
export function getLayoutStyle(
  event: PositionedEvent,
  layout: AppointmentLayout,
): { left: string; width: string; zIndex: number } {
  if (layout === "stacked") {
    const CASCADE_PX = 10;
    return {
      left: `${event.column * CASCADE_PX}px`,
      width: `calc(100% - ${event.column * CASCADE_PX}px)`,
      zIndex: event.column + 1,
    };
  }
  return {
    left: `${event.left}%`,
    width: `${event.width}%`,
    zIndex: 1,
  };
}

/**
 * Card/title classes for a completed event, per the user's chosen
 * completed-appointment style. Returns empty strings when the event
 * isn't completed, so callers can unconditionally append the result.
 */
export function getCompletedClasses(
  status: string,
  style: CompletedStyle,
): { card: string; title: string } {
  if (status !== "Completed") {
    return { card: "", title: "" };
  }
  if (style === "strikethrough") {
    return { card: "", title: "line-through decoration-2" };
  }
  return {
    card: "opacity-60 grayscale bg-gray-50 border-gray-200",
    title: "",
  };
}

/** One row from `job_assignments`, as attached to a calendar job/visit. */
export interface JobAssignment {
  user_id: string;
  assigned_at: string;
}

/**
 * The "primary" assignee for coloring purposes: whoever was assigned first.
 * There's no separate primary flag in the schema, so earliest `assigned_at`
 * is the only stable, deterministic choice.
 */
export function firstAssigneeUserId(
  assignments?: JobAssignment[] | null,
): string | null {
  if (!assignments || assignments.length === 0) return null;
  return [...assignments].sort(
    (a, b) => new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime(),
  )[0].user_id;
}

export interface JobColor {
  /** Light tinted background, derived from the member's color. */
  background: string;
  /** The member's color itself, used for the border/accent. */
  border: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Resolve a job's assignee color, or null to fall back to the default look. */
export function getJobColor(
  assigneeUserId: string | null,
  colorByUserId: Map<string, string>,
): JobColor | null {
  if (!assigneeUserId) return null;
  const hex = colorByUserId.get(assigneeUserId);
  if (!hex) return null;
  return { background: hexToRgba(hex, 0.14), border: hex };
}

export interface JobCardAppearance {
  cardClassName: string;
  cardStyle: { borderLeftColor?: string; backgroundColor?: string };
  accentClassName: string;
}

/**
 * Card classes/styles for a job, given its resolved assignee color (or null
 * for the default blue look). Tailwind can't generate classes for arbitrary
 * per-org hex colors, so a colored card switches to an inline-styled left
 * accent border instead of the default gradient classes.
 */
export function getJobCardAppearance(color: JobColor | null): JobCardAppearance {
  if (!color) {
    return {
      cardClassName: "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200",
      cardStyle: {},
      accentClassName: "text-blue-600",
    };
  }
  return {
    cardClassName: "bg-white border border-gray-200 border-l-4",
    cardStyle: { borderLeftColor: color.border, backgroundColor: color.background },
    accentClassName: "text-gray-700",
  };
}

export function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Contractor jobs never legitimately span midnight, so a drag that would
 * push `end` into the next day shifts `start` earlier instead, preserving
 * duration - never crossing a day boundary. Without this, the same visit
 * matches two day columns in a day-range check keyed on inclusive date
 * ranges, and the grid's own hour bounds can balloon to fit it.
 */
export function clampDragToSameDay(start: Date, end: Date): { start: Date; end: Date } {
  const dayEnd = endOfLocalDay(start);
  if (end <= dayEnd) return { start, end };
  const overflowMs = end.getTime() - dayEnd.getTime();
  return { start: new Date(start.getTime() - overflowMs), end: dayEnd };
}

/**
 * Get overlap groups for a specific time range
 * Useful for calculating positions when events span different dates
 */
export function getOverlapGroups(
  events: CalendarEvent[]
): PositionedEvent[][] {
  if (events.length === 0) return [];

  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  const groups: CalendarEvent[][] = [];
  let currentGroup: CalendarEvent[] = [];

  for (const event of sortedEvents) {
    if (currentGroup.length === 0) {
      currentGroup.push(event);
    } else {
      // Check if this event overlaps with any event in current group
      const overlapsWithGroup = currentGroup.some((e) =>
        eventsOverlap(event, e)
      );

      if (overlapsWithGroup) {
        currentGroup.push(event);
      } else {
        // Start a new group
        groups.push(currentGroup);
        currentGroup = [event];
      }
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Calculate positions for each group
  return groups.map((group) => calculateEventPositions(group));
}


