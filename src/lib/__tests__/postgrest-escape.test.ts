import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapePostgrestValue } from "../postgrest-escape.ts";

describe("escapePostgrestValue", () => {
  it("escapes filter metacharacters", () => {
    assert.equal(escapePostgrestValue("a,b"), "a\\,b");
    assert.equal(escapePostgrestValue("x.y"), "x\\.y");
    assert.equal(escapePostgrestValue("(injection)"), "\\(injection\\)");
  });

  it("escapes backslashes", () => {
    assert.equal(escapePostgrestValue("a\\b"), "a\\\\b");
  });
});
