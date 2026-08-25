import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  clampDragToSameDay,
  endOfLocalDay,
  firstAssigneeUserId,
  getCompletedClasses,
  getJobCardAppearance,
  getJobColor,
  getLayoutStyle,
  type PositionedEvent,
} from "../calendar-overlap.ts";

function positionedEvent(overrides: Partial<PositionedEvent> = {}): PositionedEvent {
  return {
    id: "1",
    start_time: "2026-01-01T09:00:00Z",
    end_time: "2026-01-01T10:00:00Z",
    left: 50,
    width: 50,
    column: 1,
    totalColumns: 2,
    ...overrides,
  };
}

describe("getLayoutStyle", () => {
  it("nested mode uses the event's own left/width", () => {
    const event = positionedEvent({ left: 25, width: 75, column: 1 });
    assert.deepEqual(getLayoutStyle(event, "nested"), {
      left: "25%",
      width: "75%",
      zIndex: 1,
    });
  });

  it("stacked mode ignores left/width and cascades by column", () => {
    const event = positionedEvent({ left: 50, width: 50, column: 2 });
    const style = getLayoutStyle(event, "stacked");
    assert.equal(style.left, "20px");
    assert.equal(style.width, "calc(100% - 20px)");
    assert.equal(style.zIndex, 3);
  });

  it("stacked mode gives the first column no offset", () => {
    const event = positionedEvent({ column: 0 });
    const style = getLayoutStyle(event, "stacked");
    assert.equal(style.left, "0px");
    assert.equal(style.zIndex, 1);
  });
});

describe("getCompletedClasses", () => {
  it("returns empty classes for non-completed statuses", () => {
    assert.deepEqual(getCompletedClasses("Scheduled", "grayed_out"), { card: "", title: "" });
    assert.deepEqual(getCompletedClasses("In Progress", "strikethrough"), { card: "", title: "" });
  });

  it("grayed_out mutes the card and leaves the title untouched", () => {
    const result = getCompletedClasses("Completed", "grayed_out");
    assert.match(result.card, /grayscale/);
    assert.equal(result.title, "");
  });

  it("strikethrough leaves the card untouched and strikes the title", () => {
    const result = getCompletedClasses("Completed", "strikethrough");
    assert.equal(result.card, "");
    assert.match(result.title, /line-through/);
  });
});

describe("firstAssigneeUserId", () => {
  it("returns null when there are no assignments", () => {
    assert.equal(firstAssigneeUserId(undefined), null);
    assert.equal(firstAssigneeUserId(null), null);
    assert.equal(firstAssigneeUserId([]), null);
  });

  it("returns the earliest-assigned user, regardless of array order", () => {
    const assignments = [
      { user_id: "later", assigned_at: "2026-01-02T00:00:00Z" },
      { user_id: "earliest", assigned_at: "2026-01-01T00:00:00Z" },
    ];
    assert.equal(firstAssigneeUserId(assignments), "earliest");
  });
});

describe("getJobColor", () => {
  it("returns null when there's no assignee", () => {
    assert.equal(getJobColor(null, new Map([["u1", "#ff0000"]])), null);
  });

  it("returns null when the assignee has no color on file", () => {
    assert.equal(getJobColor("u1", new Map()), null);
  });

  it("resolves a tinted background and the raw color as the border", () => {
    const color = getJobColor("u1", new Map([["u1", "#ff0000"]]));
    assert.equal(color?.border, "#ff0000");
    assert.match(color?.background ?? "", /^rgba\(255, 0, 0, 0\.14\)$/);
  });
});

describe("getJobCardAppearance", () => {
  it("falls back to the default blue gradient when there's no color", () => {
    const appearance = getJobCardAppearance(null);
    assert.match(appearance.cardClassName, /bg-gradient-to-r/);
    assert.deepEqual(appearance.cardStyle, {});
  });

  it("switches to a left-accent border when a color is resolved", () => {
    const appearance = getJobCardAppearance({ background: "rgba(0,0,0,0.1)", border: "#123456" });
    assert.match(appearance.cardClassName, /border-l-4/);
    assert.equal(appearance.cardStyle.borderLeftColor, "#123456");
  });
});

describe("endOfLocalDay", () => {
  it("returns 23:59:59.999 on the same local day", () => {
    const d = endOfLocalDay(new Date(2026, 0, 15, 9, 30, 0, 0));
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 0);
    assert.equal(d.getDate(), 15);
    assert.equal(d.getHours(), 23);
    assert.equal(d.getMinutes(), 59);
    assert.equal(d.getSeconds(), 59);
    assert.equal(d.getMilliseconds(), 999);
  });
});

describe("clampDragToSameDay", () => {
  it("leaves a same-day range untouched", () => {
    const start = new Date(2026, 0, 15, 9, 0);
    const end = new Date(2026, 0, 15, 10, 0);
    const result = clampDragToSameDay(start, end);
    assert.equal(result.start.getTime(), start.getTime());
    assert.equal(result.end.getTime(), end.getTime());
  });

  it("shifts start earlier to keep end within the same day, preserving duration", () => {
    const start = new Date(2026, 0, 15, 23, 0);
    const end = new Date(2026, 0, 16, 1, 0); // 2 hours, crosses midnight
    const durationMs = end.getTime() - start.getTime();
    const result = clampDragToSameDay(start, end);

    assert.equal(result.end.getTime(), endOfLocalDay(start).getTime());
    assert.equal(result.end.getTime() - result.start.getTime(), durationMs);
    assert.equal(result.start.getDate(), 15);
    assert.equal(result.end.getDate(), 15);
  });

  it("treats an end exactly at end-of-day as same-day (no shift)", () => {
    const start = new Date(2026, 0, 15, 20, 0);
    const end = endOfLocalDay(start);
    const result = clampDragToSameDay(start, end);
    assert.equal(result.start.getTime(), start.getTime());
    assert.equal(result.end.getTime(), end.getTime());
  });
});
