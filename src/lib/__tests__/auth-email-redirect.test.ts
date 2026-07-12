import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapAuthError } from "../auth-email-redirect.ts";

describe("mapAuthError", () => {
  it("maps email already registered", () => {
    const r = mapAuthError("User already registered");
    assert.equal(r.code, "email_taken");
    assert.match(r.message, /already in use/i);
  });

  it("maps weak password", () => {
    const r = mapAuthError("Password should be at least 8 characters", {
      code: "weak_password",
    });
    assert.equal(r.code, "weak_password");
  });

  it("maps invalid email", () => {
    const r = mapAuthError("Unable to validate email address: invalid format");
    assert.equal(r.code, "invalid_email");
  });

  it("maps rate limits", () => {
    const r = mapAuthError("Email rate limit exceeded");
    assert.equal(r.code, "rate_limited");
  });

  it("maps invalid api key", () => {
    const r = mapAuthError("Invalid API key");
    assert.equal(r.code, "invalid_api_key");
  });

  it("maps validation details", () => {
    const r = mapAuthError("Validation failed", {
      details: { email: "Invalid email" },
    });
    assert.equal(r.code, "validation");
    assert.match(r.message, /email/i);
  });

  it("maps empty object message from GoTrue", () => {
    const r = mapAuthError("{}");
    assert.equal(r.code, "unknown");
    assert.match(r.message, /database trigger|Auth logs/i);
  });

  it("preserves unknown raw messages", () => {
    const r = mapAuthError("Something weird happened");
    assert.equal(r.code, "unknown");
    assert.equal(r.message, "Something weird happened");
  });
});
