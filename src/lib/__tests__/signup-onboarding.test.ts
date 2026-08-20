import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  completeSignupSchema,
  signupOnboardingFieldsSchema,
  signupSchema,
} from "../api-schemas.ts";

describe("signup onboarding schemas", () => {
  const baseProfile = {
    first_name: "Jane",
    last_name: "Doe",
    company_name: "Acme Plumbing",
    business_type: "Plumbing",
  };

  const fullOnboarding = {
    marketing_opt_in: true,
    team_size: "2-5" as const,
    years_in_business: "1-3" as const,
    primary_goals: ["scheduling", "invoicing"] as const,
    referral_source: "google_search" as const,
    estimated_revenue: "100k-500k" as const,
    referral_code: "REF123",
  };

  it("accepts signup with onboarding fields", () => {
    const r = signupSchema.safeParse({
      email: "jane@example.com",
      password: "secret12",
      ...baseProfile,
      ...fullOnboarding,
    });
    assert.equal(r.success, true);
  });

  it("rejects signup without company_name", () => {
    const r = signupSchema.safeParse({
      email: "jane@example.com",
      password: "secret12",
      first_name: "Jane",
      last_name: "Doe",
      business_type: "Plumbing",
    });
    assert.equal(r.success, false);
  });

  it("rejects invalid team_size enum", () => {
    const r = signupOnboardingFieldsSchema.safeParse({
      team_size: "99",
    });
    assert.equal(r.success, false);
  });

  it("rejects more than 5 primary goals", () => {
    const r = signupOnboardingFieldsSchema.safeParse({
      primary_goals: [
        "scheduling",
        "quoting",
        "invoicing",
        "payments",
        "team",
        "marketing",
      ],
    });
    assert.equal(r.success, false);
  });

  it("accepts complete-signup without email/password", () => {
    const r = completeSignupSchema.safeParse({
      ...baseProfile,
      ...fullOnboarding,
    });
    assert.equal(r.success, true);
  });

  it("accepts prefer_not_to_say revenue", () => {
    const r = signupOnboardingFieldsSchema.safeParse({
      estimated_revenue: "prefer_not_to_say",
    });
    assert.equal(r.success, true);
  });
});
