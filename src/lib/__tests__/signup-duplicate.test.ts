import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isObfuscatedExistingSignup } from "../auth-email-redirect.ts";

describe("isObfuscatedExistingSignup", () => {
  it("detects empty identities as existing account", () => {
    assert.equal(isObfuscatedExistingSignup({ identities: [] }), true);
  });

  it("allows real new users with an identity", () => {
    assert.equal(
      isObfuscatedExistingSignup({
        identities: [{ provider: "email" }],
      }),
      false,
    );
  });

  it("handles null user", () => {
    assert.equal(isObfuscatedExistingSignup(null), false);
  });
});
