import { describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.ESTIMATE_ACTION_SECRET = "test-secret-for-unit-tests";

const {
  createEstimateActionToken,
  verifyEstimateActionToken,
  buildEstimateActionUrl,
} = await import("../estimate-action-token.ts");

const ESTIMATE_ID = "550e8400-e29b-41d4-a716-446655440000";
const EMAIL = "Client@Example.com";

describe("estimate action tokens", () => {
  it("round-trips approve and request_changes", () => {
    for (const action of ["approve", "request_changes"] as const) {
      const token = createEstimateActionToken(ESTIMATE_ID, EMAIL, action);
      assert.equal(
        verifyEstimateActionToken(token, ESTIMATE_ID, EMAIL, action),
        true,
      );
      assert.equal(
        verifyEstimateActionToken(token, ESTIMATE_ID, EMAIL, action === "approve" ? "request_changes" : "approve"),
        false,
      );
    }
  });

  it("rejects wrong estimate or email", () => {
    const token = createEstimateActionToken(ESTIMATE_ID, EMAIL, "approve");
    assert.equal(
      verifyEstimateActionToken(
        token,
        "660e8400-e29b-41d4-a716-446655440001",
        EMAIL,
        "approve",
      ),
      false,
    );
    assert.equal(
      verifyEstimateActionToken(token, ESTIMATE_ID, "other@example.com", "approve"),
      false,
    );
  });

  it("rejects tampered token", () => {
    const token = createEstimateActionToken(ESTIMATE_ID, EMAIL, "approve");
    const tampered = token.slice(0, -4) + "XXXX";
    assert.equal(
      verifyEstimateActionToken(tampered, ESTIMATE_ID, EMAIL, "approve"),
      false,
    );
  });

  it("buildEstimateActionUrl includes signed token", () => {
    const url = buildEstimateActionUrl(
      ESTIMATE_ID,
      EMAIL,
      "Client Name",
      "approve",
      "https://www.dyluxepro.com",
    );
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/estimate-action");
    assert.equal(parsed.searchParams.get("estimateId"), ESTIMATE_ID);
    assert.equal(parsed.searchParams.get("action"), "approve");
    const token = parsed.searchParams.get("token");
    assert.ok(token);
    assert.equal(
      verifyEstimateActionToken(token!, ESTIMATE_ID, EMAIL, "approve"),
      true,
    );
  });
});
