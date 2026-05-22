import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clientCreateSchema,
  estimateCreateSchema,
  jobCreateSchema,
  leadCreateSchema,
  paymentCreateSchema,
} from "../api-schemas.ts";

describe("API schema validation", () => {
  it("rejects client without name", () => {
    const r = clientCreateSchema.safeParse({ name: "" });
    assert.equal(r.success, false);
  });

  it("rejects invalid client email", () => {
    const r = clientCreateSchema.safeParse({
      name: "Acme",
      email: "not-an-email",
    });
    assert.equal(r.success, false);
  });

  it("accepts valid lead", () => {
    const r = leadCreateSchema.safeParse({
      name: "Jane Doe",
      value: 5000,
      status: "New Leads",
    });
    assert.equal(r.success, true);
  });

  it("rejects estimate without client_id uuid", () => {
    const r = estimateCreateSchema.safeParse({
      client_id: "not-uuid",
      lineItems: [],
    });
    assert.equal(r.success, false);
  });

  it("rejects job missing start_time", () => {
    const r = jobCreateSchema.safeParse({
      title: "Roof repair",
      client_id: "550e8400-e29b-41d4-a716-446655440000",
      end_time: "2026-06-01T10:00:00Z",
    });
    assert.equal(r.success, false);
  });

  it("rejects negative payment amount", () => {
    const r = paymentCreateSchema.safeParse({
      invoice_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: -10,
      method: "cash",
    });
    assert.equal(r.success, false);
  });

  it("rejects oversized line item quantity on estimate", () => {
    const r = estimateCreateSchema.safeParse({
      client_id: "550e8400-e29b-41d4-a716-446655440000",
      lineItems: [
        {
          description: "Labor",
          quantity: 2_000_000,
          unit_price: 1,
        },
      ],
    });
    assert.equal(r.success, false);
  });
});
