import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { defaultDayOrientationForTeamSize, parseCalendarPreferences } from "../calendar-preferences.ts";

describe("parseCalendarPreferences", () => {
  it("returns null for null input", () => {
    assert.equal(parseCalendarPreferences(null), null);
  });

  it("returns null for malformed JSON", () => {
    assert.equal(parseCalendarPreferences("not json"), null);
  });

  it("returns null when a value is out of range", () => {
    assert.equal(
      parseCalendarPreferences(
        JSON.stringify({
          appointmentLayout: "diagonal",
          completedStyle: "grayed_out",
          dayOrientation: "vertical",
          showWeekends: true,
        }),
      ),
      null,
    );
  });

  it("returns null when a key is missing", () => {
    assert.equal(
      parseCalendarPreferences(JSON.stringify({ appointmentLayout: "nested" })),
      null,
    );
  });

  it("returns null when showWeekends isn't a boolean", () => {
    assert.equal(
      parseCalendarPreferences(
        JSON.stringify({
          appointmentLayout: "nested",
          completedStyle: "grayed_out",
          dayOrientation: "vertical",
          showWeekends: "yes",
        }),
      ),
      null,
    );
  });

  it("parses a valid preferences object", () => {
    const raw = JSON.stringify({
      appointmentLayout: "stacked",
      completedStyle: "strikethrough",
      dayOrientation: "horizontal",
      showWeekends: false,
    });
    assert.deepEqual(parseCalendarPreferences(raw), {
      appointmentLayout: "stacked",
      completedStyle: "strikethrough",
      dayOrientation: "horizontal",
      showWeekends: false,
    });
  });
});

describe("defaultDayOrientationForTeamSize", () => {
  it("defaults to vertical for a solo operator", () => {
    assert.equal(defaultDayOrientationForTeamSize("solo"), "vertical");
  });

  it("defaults to vertical when team size is unknown", () => {
    assert.equal(defaultDayOrientationForTeamSize(null), "vertical");
    assert.equal(defaultDayOrientationForTeamSize(undefined), "vertical");
  });

  it("defaults to horizontal for any team larger than solo", () => {
    assert.equal(defaultDayOrientationForTeamSize("2-5"), "horizontal");
    assert.equal(defaultDayOrientationForTeamSize("6-10"), "horizontal");
    assert.equal(defaultDayOrientationForTeamSize("16+"), "horizontal");
  });
});
