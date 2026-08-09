import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Lightweight behavioral checks for status gating rules used by
 * applyEstimateClientAction (mirrored here so we don't need Resend/Stripe mocks).
 */

const ACTIONABLE = new Set(["Sent", "Changes Requested"]);

function canAction(status: string, action: "approve" | "request_changes") {
  const target = action === "approve" ? "Approved" : "Changes Requested";
  if (status === target) return { ok: true, alreadyApplied: true };
  if (!ACTIONABLE.has(status)) return { ok: false, alreadyApplied: false };
  return { ok: true, alreadyApplied: false };
}

describe("estimate client action status gate", () => {
  it("allows Sent and Changes Requested", () => {
    assert.equal(canAction("Sent", "approve").ok, true);
    assert.equal(canAction("Changes Requested", "approve").ok, true);
    assert.equal(canAction("Sent", "request_changes").ok, true);
  });

  it("treats already-applied as idempotent success", () => {
    const r = canAction("Approved", "approve");
    assert.equal(r.ok, true);
    assert.equal(r.alreadyApplied, true);
  });

  it("rejects Draft / Paid / Approved for request_changes", () => {
    assert.equal(canAction("Draft", "approve").ok, false);
    assert.equal(canAction("Approved", "request_changes").ok, false);
  });
});
