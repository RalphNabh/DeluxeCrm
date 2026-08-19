import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  formatDayDivider,
  formatListTime,
  formatMessageTime,
  mergeContractorInbox,
  truncatePreview,
} from "../messaging/format.ts";
import { buildSystemMessageBody, inboxToUnreadSummary } from "../hub-messaging.ts";
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

describe("contractor inbox mapper", () => {
  it("merges unread counts and truncates last-message preview", () => {
    const merged = mergeContractorInbox(
      [
        { id: "c1", client_id: "client-1" },
        { id: "c2", client_id: "client-2" },
      ],
      [
        {
          conversation_id: "c1",
          unread_count: "3",
          last_body: "hello   world",
          last_created_at: "2026-08-18T12:00:00Z",
        },
      ],
    );
    assert.equal(merged[0].unread_count, 3);
    assert.equal(merged[0].last_message_preview, "hello world");
    assert.equal(merged[1].unread_count, 0);
    assert.equal(merged[1].last_message_preview, null);
  });

  it("sums unread across conversations", () => {
    const summary = inboxToUnreadSummary([
      {
        conversation_id: "c1",
        unread_count: "2",
        last_body: "a",
        last_created_at: null,
      },
      {
        conversation_id: "c2",
        unread_count: 0,
        last_body: "b",
        last_created_at: null,
      },
      {
        conversation_id: "c3",
        unread_count: 5,
        last_body: "c",
        last_created_at: null,
      },
    ]);
    assert.equal(summary.total, 7);
    assert.deepEqual(summary.byConversation, { c1: 2, c3: 5 });
  });
});
