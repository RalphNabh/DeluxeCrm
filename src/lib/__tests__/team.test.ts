import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  displayNameFor,
  membershipStatusLabel,
  roleLabel,
  roleValue,
} from "../team.ts";

describe("team role helpers", () => {
  it("maps database roles to UI labels", () => {
    assert.equal(roleLabel("owner"), "Owner");
    assert.equal(roleLabel("admin"), "Admin");
    assert.equal(roleLabel("manager"), "Manager");
    assert.equal(roleLabel("worker"), "Worker");
    assert.equal(roleLabel("unknown"), "Worker");
  });

  it("maps UI labels back to database roles", () => {
    assert.equal(roleValue("Owner"), "owner");
    assert.equal(roleValue("Admin"), "admin");
    assert.equal(roleValue("Manager"), "manager");
    assert.equal(roleValue("Worker"), "worker");
    assert.equal(roleValue("anything"), "worker");
  });
});

describe("membershipStatusLabel", () => {
  it("normalizes membership statuses for the Team page", () => {
    assert.equal(membershipStatusLabel("active"), "Active");
    assert.equal(membershipStatusLabel("disabled"), "Disabled");
    assert.equal(membershipStatusLabel("invited"), "Invited");
  });
});

describe("displayNameFor", () => {
  it("prefers a full name, then email local part", () => {
    assert.equal(displayNameFor("Alex Rivera", "alex@example.com"), "Alex Rivera");
    assert.equal(displayNameFor("  ", "alex@example.com"), "alex");
    assert.equal(displayNameFor(null, null), "Team member");
  });
});
