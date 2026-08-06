import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  claimWebhookEvent,
  markWebhookFailed,
  markWebhookProcessed,
} from "../stripe-webhook-claim.ts";

type Row = {
  event_id: string;
  event_type: string;
  status: string;
  attempts: number;
  last_error: string | null;
  updated_at: string;
  processed_at?: string;
};

function createFakeAdmin(initial: Row[] = []) {
  const rows = new Map<string, Row>(initial.map((r) => [r.event_id, { ...r }]));

  const api = {
    from(_table: string) {
      let filters: Record<string, unknown> = {};
      let inStatus: string[] | null = null;
      let mode: "select" | "insert" | "update" = "select";
      let patch: Partial<Row> = {};
      let insertRow: Row | null = null;

      const builder = {
        select() {
          return builder;
        },
        insert(row: Row) {
          mode = "insert";
          insertRow = row;
          return builder;
        },
        update(values: Partial<Row>) {
          mode = "update";
          patch = values;
          return builder;
        },
        eq(col: string, val: unknown) {
          filters[col] = val;
          return builder;
        },
        in(col: string, vals: string[]) {
          if (col === "status") inStatus = vals;
          return builder;
        },
        maybeSingle: async () => {
          if (mode === "insert" && insertRow) {
            if (rows.has(insertRow.event_id)) {
              return { data: null, error: { code: "23505", message: "duplicate" } };
            }
            rows.set(insertRow.event_id, { ...insertRow });
            return { data: insertRow, error: null };
          }

          const id = filters.event_id as string;
          const existing = rows.get(id);
          if (!existing) return { data: null, error: null };

          if (mode === "update") {
            if (inStatus && !inStatus.includes(existing.status)) {
              return { data: null, error: null };
            }
            const next = { ...existing, ...patch };
            rows.set(id, next);
            return { data: { event_id: id }, error: null };
          }

          return { data: { ...existing }, error: null };
        },
      };
      return builder;
    },
    _rows: rows,
  };

  return api;
}

describe("claimWebhookEvent", () => {
  it("claims a new event as processing", async () => {
    const admin = createFakeAdmin();
    const result = await claimWebhookEvent(
      admin as never,
      "evt_1",
      "checkout.session.completed",
      new Date("2026-08-06T12:00:00Z"),
    );
    assert.equal(result.action, "claimed");
    assert.equal(admin._rows.get("evt_1")?.status, "processing");
  });

  it("short-circuits already processed events", async () => {
    const admin = createFakeAdmin([
      {
        event_id: "evt_2",
        event_type: "checkout.session.completed",
        status: "processed",
        attempts: 1,
        last_error: null,
        updated_at: "2026-08-06T11:00:00Z",
      },
    ]);
    const result = await claimWebhookEvent(
      admin as never,
      "evt_2",
      "checkout.session.completed",
    );
    assert.equal(result.action, "already_processed");
  });

  it("allows retry after failed", async () => {
    const admin = createFakeAdmin([
      {
        event_id: "evt_3",
        event_type: "checkout.session.completed",
        status: "failed",
        attempts: 1,
        last_error: "boom",
        updated_at: "2026-08-06T11:00:00Z",
      },
    ]);
    const result = await claimWebhookEvent(
      admin as never,
      "evt_3",
      "checkout.session.completed",
    );
    assert.equal(result.action, "claimed");
    assert.equal(admin._rows.get("evt_3")?.status, "processing");
    assert.equal(admin._rows.get("evt_3")?.attempts, 2);
  });
});

describe("markWebhookProcessed / failed", () => {
  it("marks processed and failed", async () => {
    const admin = createFakeAdmin([
      {
        event_id: "evt_4",
        event_type: "x",
        status: "processing",
        attempts: 1,
        last_error: null,
        updated_at: "2026-08-06T11:00:00Z",
      },
    ]);
    await markWebhookProcessed(admin as never, "evt_4");
    assert.equal(admin._rows.get("evt_4")?.status, "processed");

    admin._rows.get("evt_4")!.status = "processing";
    await markWebhookFailed(admin as never, "evt_4", "nope");
    assert.equal(admin._rows.get("evt_4")?.status, "failed");
    assert.equal(admin._rows.get("evt_4")?.last_error, "nope");
  });
});
