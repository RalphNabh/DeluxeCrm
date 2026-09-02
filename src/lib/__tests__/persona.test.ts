import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyPersona } from "../persona-classify.ts";

describe("classifyPersona", () => {
  const portal = { client_id: "c1", organization_id: "o1" };
  const membership = { org_id: "o1", role: "owner" as const };

  it("sends portal-only users to the Client Hub", () => {
    const result = classifyPersona(portal, null);
    assert.equal(result.type, "client");
    assert.equal(result.redirectTo, "/portal");
    assert.equal(result.hasPortalAccess, true);
    assert.equal(result.hasCrmAccess, false);
  });

  it("sends contractor-only users to the CRM", () => {
    const result = classifyPersona(null, membership);
    assert.equal(result.type, "contractor");
    assert.equal(result.redirectTo, "/home");
    assert.equal(result.hasPortalAccess, false);
    assert.equal(result.hasCrmAccess, true);
  });

  it("Client Hub login admits portal users into /portal", () => {
    const result = classifyPersona(portal, null, "client");
    assert.equal(result.type, "client");
    assert.equal(result.redirectTo, "/portal");
    assert.equal(result.hasPortalAccess, true);
  });

  it("Client Hub login rejects contractors with no portal access", () => {
    const result = classifyPersona(null, membership, "client");
    assert.equal(result.hasPortalAccess, false);
    assert.equal(result.hasCrmAccess, true);
    assert.equal(result.redirectTo, "/login");
  });

  it("CRM login admits contractors into the CRM", () => {
    const result = classifyPersona(null, membership, "contractor");
    assert.equal(result.type, "contractor");
    assert.equal(result.redirectTo, "/home");
    assert.equal(result.hasCrmAccess, true);
  });

  it("CRM login rejects portal-only clients", () => {
    const result = classifyPersona(portal, null, "contractor");
    assert.equal(result.hasCrmAccess, false);
    assert.equal(result.hasPortalAccess, true);
    assert.equal(result.redirectTo, "/portal/login");
  });

  it("dual-role can use Client Hub login for /portal only", () => {
    const result = classifyPersona(portal, membership, "client");
    assert.equal(result.type, "client");
    assert.equal(result.redirectTo, "/portal");
    assert.equal(result.hasPortalAccess, true);
    assert.equal(result.hasCrmAccess, true);
  });

  it("dual-role can use CRM login for the CRM only", () => {
    const result = classifyPersona(portal, membership, "contractor");
    assert.equal(result.type, "contractor");
    assert.equal(result.redirectTo, "/home");
    assert.equal(result.hasCrmAccess, true);
  });
});
