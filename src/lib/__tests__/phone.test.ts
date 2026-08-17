import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatPhoneAsYouType,
  isStandardNanp,
  isUnusualPhone,
} from "../phone.ts";

describe("formatPhoneAsYouType", () => {
  it("formats a 10-digit number with parentheses and dash", () => {
    assert.equal(formatPhoneAsYouType("5551234567"), "(555) 123-4567");
    assert.equal(formatPhoneAsYouType("555123"), "(555) 123");
    assert.equal(formatPhoneAsYouType("555"), "(555");
  });

  it("keeps a leading country code 1", () => {
    assert.equal(formatPhoneAsYouType("15551234567"), "1 (555) 123-4567");
  });

  it("leaves non-US plus numbers usable", () => {
    assert.equal(formatPhoneAsYouType("+447700900123"), "+447700900123");
  });
});

describe("isUnusualPhone", () => {
  it("does not flag a standard number", () => {
    assert.equal(isUnusualPhone("(555) 123-4567"), false);
    assert.equal(isStandardNanp("5551234567"), true);
  });

  it("does not flag incomplete numbers until blur", () => {
    assert.equal(isUnusualPhone("(555) 12", false), false);
    assert.equal(isUnusualPhone("(555) 12", true), true);
  });

  it("flags extra digits and letters immediately", () => {
    assert.equal(isUnusualPhone("(555) 123-4567 99", false), true);
    assert.equal(isUnusualPhone("call me", false), true);
  });

  it("does not flag an empty value", () => {
    assert.equal(isUnusualPhone("", true), false);
  });
});
