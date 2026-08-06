import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  expandRecurrenceOccurrences,
  weekdayCodeFromDate,
  type JobRecurrence,
} from "../visits/generate.ts";

function job(partial: Partial<JobRecurrence> & Pick<JobRecurrence, "start_time" | "end_time">): JobRecurrence {
  return {
    id: "job-1",
    organization_id: "org-1",
    recurrence_freq: null,
    recurrence_interval: 1,
    recurrence_byweekday: null,
    recurrence_until: null,
    recurrence_count: null,
    ...partial,
  };
}

describe("visit recurrence expansion", () => {
  it("materializes a one-off visit in window", () => {
    const start = new Date("2026-06-01T14:00:00.000Z");
    const end = new Date("2026-06-01T16:00:00.000Z");
    const occ = expandRecurrenceOccurrences(
      job({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        recurrence_freq: null,
      }),
      new Date("2026-05-01T00:00:00.000Z"),
      new Date("2026-07-01T00:00:00.000Z")
    );
    assert.equal(occ.length, 1);
    assert.equal(occ[0].scheduled_start.toISOString(), start.toISOString());
  });

  it("expands weekly occurrences until date", () => {
    const start = new Date("2026-06-01T14:00:00.000Z"); // Monday
    const end = new Date("2026-06-01T16:00:00.000Z");
    const occ = expandRecurrenceOccurrences(
      job({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        recurrence_freq: "weekly",
        recurrence_interval: 1,
        recurrence_byweekday: ["MO"],
        recurrence_until: "2026-06-22",
      }),
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-08-01T00:00:00.000Z")
    );
    assert.ok(occ.length >= 3);
    assert.equal(weekdayCodeFromDate(occ[0].scheduled_start), "MO");
  });

  it("respects recurrence_count for daily", () => {
    const start = new Date("2026-06-01T09:00:00.000Z");
    const end = new Date("2026-06-01T10:00:00.000Z");
    const occ = expandRecurrenceOccurrences(
      job({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        recurrence_freq: "daily",
        recurrence_interval: 1,
        recurrence_count: 3,
      }),
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-07-01T00:00:00.000Z")
    );
    assert.equal(occ.length, 3);
  });

  it("is idempotent by scheduled_start uniqueness (caller responsibility)", () => {
    const start = new Date("2026-06-01T09:00:00.000Z");
    const end = new Date("2026-06-01T10:00:00.000Z");
    const a = expandRecurrenceOccurrences(
      job({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        recurrence_freq: "daily",
        recurrence_count: 2,
      }),
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-07-01T00:00:00.000Z")
    );
    const b = expandRecurrenceOccurrences(
      job({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        recurrence_freq: "daily",
        recurrence_count: 2,
      }),
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-07-01T00:00:00.000Z")
    );
    assert.deepEqual(
      a.map((o) => o.scheduled_start.toISOString()),
      b.map((o) => o.scheduled_start.toISOString())
    );
  });
});
