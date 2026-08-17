import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  formatDayDivider,
  formatListTime,
  formatMessageTime,
  truncatePreview,
} from "../messaging/format.ts";
import { buildSystemMessageBody } from "../hub-messaging.ts";
import { columnsOf } from "./helpers/migration-columns.ts";

describe("formatMessageTime", () => {
  const now = new Date("2026-08-17T18:00:00");

  it("shows Today for same-day messages", () => {
    const result = formatMessageTime("2026-08-17T14:14:00", now);
    assert.match(result, /^Today /);
  });

  it("shows Yesterday for prior day", () => {
    const result = formatMessageTime("2026-08-16T09:02:00", now);
    assert.match(result, /^Yesterday /);
  });

  it("shows weekday for older messages", () => {
    const result = formatMessageTime("2026-08-10T09:02:00", now);
    assert.match(result, /Mon, Aug 10/);
  });
});

describe("formatDayDivider", () => {
  const now = new Date("2026-08-17T18:00:00");

  it("labels today and yesterday", () => {
    assert.equal(formatDayDivider("2026-08-17T10:00:00", now), "Today");
    assert.equal(formatDayDivider("2026-08-16T10:00:00", now), "Yesterday");
  });
});

describe("truncatePreview", () => {
  it("truncates long text", () => {
    const long = "a".repeat(100);
    assert.equal(truncatePreview(long).length, 80);
    assert.ok(truncatePreview(long).endsWith("…"));
  });

  it("collapses whitespace", () => {
    assert.equal(truncatePreview("hello   world"), "hello world");
  });
});

describe("formatListTime", () => {
  const now = new Date("2026-08-17T18:00:00");

  it("returns empty for missing input", () => {
    assert.equal(formatListTime(null, now), "");
  });
});

describe("buildSystemMessageBody", () => {
  it("builds service request line", () => {
    assert.equal(
      buildSystemMessageBody("service_request", { title: "Fix faucet" }),
      "New request: Fix faucet",
    );
  });

  it("includes note for estimate change", () => {
    const body = buildSystemMessageBody("estimate_change", {
      estimateNumber: "EST-001",
      note: "Please adjust price",
    });
    assert.match(body, /EST-001/);
    assert.match(body, /Please adjust price/);
  });

  it("builds approve line", () => {
    assert.equal(
      buildSystemMessageBody("estimate_approved", { estimateNumber: "EST-001" }),
      "Estimate EST-001 approved",
    );
  });
});

describe("messages schema columns", () => {
  const MESSAGE_COLUMNS = columnsOf("messages");

  it("includes message_type and metadata from hub messaging migration", () => {
    assert.ok(MESSAGE_COLUMNS.has("message_type"));
    assert.ok(MESSAGE_COLUMNS.has("metadata"));
    assert.ok(MESSAGE_COLUMNS.has("read_at"));
  });
});
