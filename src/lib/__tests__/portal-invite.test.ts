import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeInviteEmail } from "../portal-invite.ts";

describe("normalizeInviteEmail", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeInviteEmail("  Client@Example.COM "), "client@example.com");
  });
});
