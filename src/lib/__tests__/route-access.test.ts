import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateTaxAndTotal,
  invoiceStatusAfterPayment,
  isPublicRoute,
  isSubscriptionExempt,
  leadAutomationEventForStatus,
  LEAD_STAGE_AUTOMATION_EVENTS,
} from "../route-access.ts";

describe("isPublicRoute", () => {
  it("allows marketing and auth pages", () => {
    assert.equal(isPublicRoute("/"), true);
    assert.equal(isPublicRoute("/login"), true);
    assert.equal(isPublicRoute("/estimate-action"), true);
    assert.equal(isPublicRoute("/signup/invite"), true);
    assert.equal(isPublicRoute("/auth/callback"), true);
  });

  it("does not treat every path as public (regression)", () => {
    assert.equal(isPublicRoute("/dashboard"), false);
    assert.equal(isPublicRoute("/api/clients"), false);
    assert.equal(isPublicRoute("/estimates"), false);
  });
});

describe("isSubscriptionExempt", () => {
  it("exempts subscription checkout and API", () => {
    assert.equal(isSubscriptionExempt("/subscription"), true);
    assert.equal(isSubscriptionExempt("/api/stripe/webhook"), true);
    assert.equal(isSubscriptionExempt("/dashboard"), false);
  });
});

describe("leadAutomationEventForStatus", () => {
  it("maps forward pipeline stages", () => {
    assert.equal(
      leadAutomationEventForStatus("Approved", "Estimate Sent"),
      "lead_approved",
    );
    assert.equal(
      leadAutomationEventForStatus("Completed", "Job Scheduled"),
      "lead_completed",
    );
  });

  it("does not fire lead_created when moving to New Leads", () => {
    assert.equal(
      leadAutomationEventForStatus("New Leads", "Estimate Sent"),
      null,
    );
    assert.ok(!("New Leads" in LEAD_STAGE_AUTOMATION_EVENTS));
  });

  it("returns null when status unchanged", () => {
    assert.equal(
      leadAutomationEventForStatus("Approved", "Approved"),
      null,
    );
  });
});

describe("calculateTaxAndTotal", () => {
  it("applies 13% tax consistently", () => {
    const r = calculateTaxAndTotal([
      { quantity: 2, unit_price: 100 },
      { quantity: 1, unit_price: 50 },
    ]);
    assert.equal(r.subtotal, 250);
    assert.equal(r.tax, 32.5);
    assert.equal(r.total, 282.5);
  });

  it("handles empty line items", () => {
    const r = calculateTaxAndTotal([]);
    assert.equal(r.subtotal, 0);
    assert.equal(r.tax, 0);
    assert.equal(r.total, 0);
  });
});

describe("invoiceStatusAfterPayment", () => {
  it("marks paid when total met", () => {
    assert.equal(invoiceStatusAfterPayment(100, 100, "Sent"), "Paid");
    assert.equal(invoiceStatusAfterPayment(100, 150, "Sent"), "Paid");
  });

  it("marks partially paid", () => {
    assert.equal(
      invoiceStatusAfterPayment(100, 40, "Sent"),
      "Partially Paid",
    );
  });

  it("keeps status when no payment", () => {
    assert.equal(invoiceStatusAfterPayment(100, 0, "Sent"), "Sent");
  });
});
