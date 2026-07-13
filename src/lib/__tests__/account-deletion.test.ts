import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isBenignStripeCancelError } from "../account-deletion.ts";

describe("isBenignStripeCancelError", () => {
  it("treats missing resources as benign", () => {
    assert.equal(
      isBenignStripeCancelError({ code: "resource_missing" }),
      true,
    );
    assert.equal(
      isBenignStripeCancelError({ message: "No such subscription: sub_x" }),
      true,
    );
    assert.equal(
      isBenignStripeCancelError({ message: "Subscription already canceled" }),
      true,
    );
  });

  it("treats real failures as fatal", () => {
    assert.equal(
      isBenignStripeCancelError({ message: "Invalid API Key" }),
      false,
    );
    assert.equal(isBenignStripeCancelError(new Error("network down")), false);
  });
});
