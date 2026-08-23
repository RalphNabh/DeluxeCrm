import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatMetadataEntries, humanizeSource } from "../metadata-labels.ts";

describe("humanizeSource", () => {
  it("maps known sources to friendly labels", () => {
    assert.equal(humanizeSource("public_form"), "Website");
    assert.equal(humanizeSource("portal"), "Client Portal");
    assert.equal(humanizeSource("manual"), "Manual");
  });

  it("refines zapier to the ad platform when tracking metadata is present", () => {
    assert.equal(humanizeSource("zapier", { gclid: "abc123" }), "Google Ads");
    assert.equal(humanizeSource("zapier", { utm_source: "google_ads" }), "Google Ads");
    assert.equal(humanizeSource("zapier", { utm_source: "facebook" }), "Facebook Ads");
    assert.equal(humanizeSource("zapier", { utm_source: "bing" }), "Bing Ads");
  });

  it("falls back to plain Zapier with no ad metadata", () => {
    assert.equal(humanizeSource("zapier", {}), "Zapier");
    assert.equal(humanizeSource("zapier"), "Zapier");
  });

  it("falls back to Unknown for missing/unrecognized source", () => {
    assert.equal(humanizeSource(undefined), "Unknown");
    assert.equal(humanizeSource(null), "Unknown");
  });
});

describe("formatMetadataEntries", () => {
  it("labels known ad-tracking keys", () => {
    const entries = formatMetadataEntries({ utm_campaign: "spring-promo", gclid: "abc" });
    assert.deepEqual(
      entries.find((e) => e.key === "utm_campaign"),
      { key: "utm_campaign", label: "Campaign", value: "spring-promo" },
    );
    assert.deepEqual(
      entries.find((e) => e.key === "gclid"),
      { key: "gclid", label: "Google Click ID", value: "abc" },
    );
  });

  it("title-cases unrecognized keys as a fallback", () => {
    const entries = formatMetadataEntries({ how_did_you_hear: "Google" });
    assert.deepEqual(entries, [
      { key: "how_did_you_hear", label: "How Did You Hear", value: "Google" },
    ]);
  });

  it("filters out null/undefined/empty values", () => {
    const entries = formatMetadataEntries({ a: null, b: undefined, c: "", d: "kept" });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].key, "d");
  });

  it("stringifies object values", () => {
    const entries = formatMetadataEntries({ answers: { color: "blue" } });
    assert.equal(entries[0].value, JSON.stringify({ color: "blue" }));
  });

  it("returns an empty array for null/undefined/non-object metadata", () => {
    assert.deepEqual(formatMetadataEntries(null), []);
    assert.deepEqual(formatMetadataEntries(undefined), []);
  });
});
