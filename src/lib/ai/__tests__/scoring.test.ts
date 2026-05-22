import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalize,
  tokenize,
  similarity,
  findBestMatch,
  applyMarkup,
  round2,
  currentYearMonthUtc,
  nextMonthResetIso,
} from "../scoring.ts";

/**
 * Pure-logic tests for the AI Estimate pipeline.
 *
 * Run with:
 *   node --test --experimental-strip-types src/lib/ai/__tests__/scoring.test.ts
 *
 * No vitest/jest install required — uses Node 22+'s built-in test runner
 * and type-stripping support.
 */

describe("normalize", () => {
  it("lowercases, strips punctuation, collapses whitespace", () => {
    assert.equal(normalize("  1/2 INCH Copper Elbow!  "), "1 2 inch copper elbow");
  });

  it("handles empty input", () => {
    assert.equal(normalize(""), "");
  });
});

describe("tokenize", () => {
  it("drops tokens shorter than 2 chars", () => {
    const toks = tokenize("a bb ccc");
    assert.ok(!toks.has("a"));
    assert.ok(toks.has("bb"));
    assert.ok(toks.has("ccc"));
  });

  it("deduplicates tokens", () => {
    const toks = tokenize("nail nail nail");
    assert.equal(toks.size, 1);
  });
});

describe("similarity", () => {
  it("returns high score for near-identical descriptions", () => {
    const score = similarity(
      { description: "1/2 inch copper elbow", category: "plumbing" },
      { name: "1/2 inch copper elbow", category: "plumbing" },
    );
    assert.ok(score > 0.9, `expected > 0.9, got ${score}`);
  });

  it("gets a small boost when categories match exactly", () => {
    const withMatch = similarity(
      { description: "copper elbow", category: "plumbing" },
      { name: "elbow copper", category: "plumbing" },
    );
    const noMatch = similarity(
      { description: "copper elbow", category: "plumbing" },
      { name: "elbow copper", category: "electrical" },
    );
    assert.ok(withMatch > noMatch, "category match should raise score");
  });

  it("returns 0 for empty token sets", () => {
    assert.equal(
      similarity({ description: "", category: "" }, { name: "", category: "" }),
      0,
    );
  });

  it("never exceeds 1", () => {
    const score = similarity(
      { description: "abc abc abc", category: "x x x" },
      { name: "abc abc abc", category: "x x x" },
    );
    assert.ok(score <= 1);
  });
});

describe("findBestMatch", () => {
  const materials = [
    { name: "1/2 inch copper elbow", category: "plumbing" },
    { name: "15 amp duplex outlet", category: "electrical" },
    { name: "2x4 pressure treated lumber", category: "lumber" },
  ];

  it("returns the closest match above the threshold", () => {
    const m = findBestMatch(
      { description: "copper elbow 1/2 inch", category: "plumbing" },
      materials,
      0.5,
    );
    assert.ok(m, "should match");
    assert.equal(m!.row.name, "1/2 inch copper elbow");
  });

  it("returns null when nothing clears the threshold", () => {
    const m = findBestMatch(
      { description: "completely unrelated widget", category: "other" },
      materials,
      0.7,
    );
    assert.equal(m, null);
  });
});

describe("applyMarkup", () => {
  it("returns input unchanged for 0 or undefined markup", () => {
    assert.equal(applyMarkup(100, undefined), 100);
    assert.equal(applyMarkup(100, 0), 100);
  });

  it("applies positive markup", () => {
    assert.equal(applyMarkup(100, 20), 120);
    assert.equal(applyMarkup(50, 50), 75);
  });

  it("ignores negative markup", () => {
    assert.equal(applyMarkup(100, -10), 100);
  });
});

describe("round2", () => {
  it("rounds to 2 decimals", () => {
    assert.equal(round2(1.234), 1.23);
    assert.equal(round2(1.235), 1.24);
    assert.equal(round2(0.1 + 0.2), 0.3);
  });
});

describe("currentYearMonthUtc", () => {
  it("formats as YYYY-MM in UTC", () => {
    const d = new Date(Date.UTC(2026, 4, 11)); // May 2026
    assert.equal(currentYearMonthUtc(d), "2026-05");
  });

  it("pads single-digit months", () => {
    const d = new Date(Date.UTC(2026, 0, 1));
    assert.equal(currentYearMonthUtc(d), "2026-01");
  });
});

describe("nextMonthResetIso", () => {
  it("returns the first of next UTC month at 00:00", () => {
    const d = new Date(Date.UTC(2026, 4, 11));
    assert.equal(nextMonthResetIso(d), "2026-06-01T00:00:00.000Z");
  });

  it("rolls over the year correctly", () => {
    const d = new Date(Date.UTC(2026, 11, 31));
    assert.equal(nextMonthResetIso(d), "2027-01-01T00:00:00.000Z");
  });
});
