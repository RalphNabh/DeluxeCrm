import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSubscriptionAccessAllowed } from "../subscription-access.ts";

describe("subscription access", () => {
  it("allows active subscription", () => {
    assert.equal(
      isSubscriptionAccessAllowed({
        status: "active",
        current_period_end: "2099-01-01T00:00:00Z",
      }),
      true,
    );
  });

  it("allows trialing subscription", () => {
    assert.equal(
      isSubscriptionAccessAllowed({
        status: "trialing",
        current_period_end: "2099-01-01T00:00:00Z",
      }),
      true,
    );
  });

  it("allows past_due subscription", () => {
    assert.equal(
      isSubscriptionAccessAllowed({ status: "past_due", current_period_end: null }),
      true,
    );
  });

  it("rejects canceled subscription", () => {
    assert.equal(
      isSubscriptionAccessAllowed({ status: "canceled", current_period_end: null }),
      false,
    );
  });

  it("rejects expired period", () => {
    assert.equal(
      isSubscriptionAccessAllowed({
        status: "active",
        current_period_end: "2020-01-01T00:00:00Z",
      }),
      false,
    );
  });

  it("rejects missing subscription", () => {
    assert.equal(isSubscriptionAccessAllowed(null), false);
  });
});
