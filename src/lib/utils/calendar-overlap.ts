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


