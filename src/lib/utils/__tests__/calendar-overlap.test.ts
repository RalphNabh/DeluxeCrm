import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getCompletedClasses,
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
