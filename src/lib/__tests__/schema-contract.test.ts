import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { columnsOf } from "./helpers/migration-columns.ts";
import { buildPaymentInsert, sumPayments, today } from "../payments.ts";
import { paymentCreateSchema } from "../api-schemas.ts";

/**
 * Recording a payment used to fail every time, for three separate reasons: the
 * request schema expected `method` while the form sent `payment_method`, the
 * insert wrote `method`/`paid_at` to columns named `payment_method`/
 * `payment_date`, and it omitted `user_id`, which is NOT NULL and the RLS
 * predicate. No unit test could see any of that, because none of them compared
 * the code against the schema.
 *
 * These tests read the migrations and assert the two stay in agreement.
 */

const PAYMENT_COLUMNS = columnsOf("payments");
const ESTIMATE_COLUMNS = columnsOf("estimates");
const LEAD_COLUMNS = columnsOf("leads");

describe("migration column parsing", () => {
  it("finds columns declared in create table", () => {
    assert.ok(PAYMENT_COLUMNS.has("amount"));
    assert.ok(PAYMENT_COLUMNS.has("invoice_id"));
  });

  it("finds columns added by later migrations", () => {
    // Added by 20250104000000_repair_schema_drift.sql, not the baseline.
    assert.ok(ESTIMATE_COLUMNS.has("sent_at"));
    assert.ok(ESTIMATE_COLUMNS.has("estimate_number"));
    assert.ok(ESTIMATE_COLUMNS.has("valid_until"));
    assert.ok(LEAD_COLUMNS.has("client_id"));
  });

  it("does not treat table constraints as columns", () => {
    for (const name of ["primary", "constraint", "unique", "check"]) {
      assert.equal(PAYMENT_COLUMNS.has(name), false);
    }
  });
});

describe("payment insert matches the payments table", () => {
  const insert = buildPaymentInsert(
    {
      invoice_id: "3f1a2b4c-5d6e-4f80-8a1b-2c3d4e5f6071",
      amount: 250,
      payment_method: "Cash",
      payment_date: "2026-02-01",
      reference: "chq 4021",
      notes: "deposit",
    },
    { userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7", orgId: "b6d5a1f2-3c4e-4a5b-9c8d-7e6f5a4b3c2d" },
  );

  it("writes only columns that exist", () => {
    for (const column of Object.keys(insert)) {
      assert.ok(
        PAYMENT_COLUMNS.has(column),
        `payments has no column "${column}"`,
      );
    }
  });

  it("supplies every NOT NULL column without a default", () => {
    for (const required of [
      "invoice_id",
      "amount",
      "payment_method",
      "payment_date",
      "user_id",
    ]) {
      assert.ok(
        required in insert,
        `payment insert is missing required column "${required}"`,
      );
    }
  });

  it("scopes the payment to an organization so the read path can find it", () => {
    assert.equal(insert.organization_id, "b6d5a1f2-3c4e-4a5b-9c8d-7e6f5a4b3c2d");
  });

  it("defaults payment_date to today when the caller omits it", () => {
    const withoutDate = buildPaymentInsert(
      {
        invoice_id: "3f1a2b4c-5d6e-4f80-8a1b-2c3d4e5f6071",
        amount: 10,
        payment_method: "Cash",
      },
      { userId: "u", orgId: "o" },
    );
    assert.match(withoutDate.payment_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(withoutDate.payment_date, today());
  });
});

describe("paymentCreateSchema accepts what the invoice form sends", () => {
  const formBody = {
    invoice_id: "3f1a2b4c-5d6e-4f80-8a1b-2c3d4e5f6071",
    amount: 500,
    payment_method: "Credit Card",
    payment_date: "2026-02-01",
    reference: "",
    notes: "",
  };

  it("parses the real request body", () => {
    const result = paymentCreateSchema.safeParse(formBody);
    assert.ok(result.success, JSON.stringify(result.error?.issues));
    assert.equal(result.data.payment_method, "Credit Card");
  });

  it("rejects the old field name so the mismatch cannot come back", () => {
    const { payment_method, ...rest } = formBody;
    const result = paymentCreateSchema.safeParse({ ...rest, method: payment_method });
    assert.equal(result.success, false);
  });

  it("rejects a payment_date that is not a plain date", () => {
    const result = paymentCreateSchema.safeParse({
      ...formBody,
      payment_date: new Date().toISOString(),
    });
    assert.equal(result.success, false);
  });

  it("only names fields that exist as columns", () => {
    for (const field of Object.keys(paymentCreateSchema.shape)) {
      assert.ok(
        PAYMENT_COLUMNS.has(field),
        `paymentCreateSchema field "${field}" is not a payments column`,
      );
    }
  });
});

describe("sumPayments", () => {
  it("totals recorded payments", () => {
    assert.equal(sumPayments([{ amount: 100 }, { amount: 49.5 }]), 149.5);
  });

  it("treats a missing payments relation as zero rather than throwing", () => {
    // The invoices list computed total_paid from a relation it never selected,
    // so this path was reached on every request and always produced 0.
    assert.equal(sumPayments(undefined), 0);
    assert.equal(sumPayments(null), 0);
    assert.equal(sumPayments([]), 0);
  });

  it("coerces numeric strings, which is how postgres returns numeric", () => {
    assert.equal(sumPayments([{ amount: "75.25" }, { amount: "24.75" }]), 100);
  });

  it("ignores unparseable amounts", () => {
    assert.equal(sumPayments([{ amount: "abc" }, { amount: 10 }, { amount: null }]), 10);
  });
});
