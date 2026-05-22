import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeItems } from "../vision.ts";

/**
 * Tests for the defensive {@link sanitizeItems} pass run on every vision
 * response. The full provider isn't exercised here (it makes a real
 * network call); see AI_ESTIMATE_SETUP.md for the manual smoke test.
 */

describe("sanitizeItems", () => {
  it("drops items with empty descriptions", () => {
    const out = sanitizeItems([
      { description: "", category: "x", quantity: 1, unit: "ea", confidence: 1 },
      { description: "  ", category: "x", quantity: 1, unit: "ea", confidence: 1 },
      { description: "good", category: "x", quantity: 1, unit: "ea", confidence: 1 },
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].description, "good");
  });

  it("clamps confidence to [0, 1]", () => {
    const out = sanitizeItems([
      { description: "a", category: "x", quantity: 1, unit: "ea", confidence: 1.5 },
      { description: "b", category: "x", quantity: 1, unit: "ea", confidence: -0.2 },
    ]);
    assert.equal(out[0].confidence, 1);
    assert.equal(out[1].confidence, 0);
  });

  it("coerces negative or NaN quantities to 0", () => {
    const out = sanitizeItems([
      { description: "a", category: "x", quantity: -5, unit: "ea", confidence: 1 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { description: "b", category: "x", quantity: Number.NaN as any, unit: "ea", confidence: 1 },
    ]);
    assert.equal(out[0].quantity, 0);
    assert.equal(out[1].quantity, 0);
  });

  it("lowercases category and unit, trims description", () => {
    const out = sanitizeItems([
      { description: "  Copper Elbow  ", category: "PLUMBING", quantity: 2, unit: "EA", confidence: 0.9 },
    ]);
    assert.equal(out[0].description, "Copper Elbow");
    assert.equal(out[0].category, "plumbing");
    assert.equal(out[0].unit, "ea");
  });

  it("falls back to 'other' / 'ea' when category/unit missing", () => {
    const out = sanitizeItems([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { description: "a", category: "" as any, quantity: 1, unit: "" as any, confidence: 1 },
    ]);
    assert.equal(out[0].category, "other");
    assert.equal(out[0].unit, "ea");
  });
});
