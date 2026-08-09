import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applicationFeeCents,
  connectStatusFromOrg,
  dollarsToCents,
} from "../stripe-connect-core.ts";

describe("connectStatusFromOrg", () => {
  it("requires an account with charges enabled", () => {
    assert.equal(
      connectStatusFromOrg({
        stripe_connect_account_id: "acct_1",
        stripe_connect_charges_enabled: true,
      }).readyForPayments,
      true,
    );
    assert.equal(
      connectStatusFromOrg({
        stripe_connect_account_id: "acct_1",
        stripe_connect_charges_enabled: false,
      }).readyForPayments,
      false,
    );
    assert.equal(connectStatusFromOrg(null).readyForPayments, false);
  });
});

describe("applicationFeeCents", () => {
  it("defaults to zero and clamps to amount", () => {
    assert.equal(applicationFeeCents(10_000, "0"), 0);
    assert.equal(applicationFeeCents(10_000, "250"), 250);
    assert.equal(applicationFeeCents(100, "10000"), 100);
  });
});

describe("dollarsToCents", () => {
  it("rounds currency safely", () => {
    assert.equal(dollarsToCents(19.99), 1999);
    assert.equal(dollarsToCents(0.1 + 0.2), 30);
  });
});
