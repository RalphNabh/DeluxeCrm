import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  consumeWelcomeIfFirstTime,
  markWelcomePending,
  WELCOME_PENDING_KEY,
  WELCOME_SHOWN_KEY,
} from "../welcome-notification.ts";

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem(key: string) {
      return data[key] ?? null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    },
    data,
  };
}

describe("consumeWelcomeIfFirstTime", () => {
  it("shows once for a pending new-user session", () => {
    const session = memoryStore();
    const local = memoryStore();
    markWelcomePending(session);

    assert.equal(
      consumeWelcomeIfFirstTime(false, { session, local }),
      true,
    );
    assert.equal(session.getItem(WELCOME_PENDING_KEY), null);
    assert.equal(local.getItem(WELCOME_SHOWN_KEY), "true");
    assert.equal(
      consumeWelcomeIfFirstTime(false, { session, local }),
      false,
    );
  });

  it("does not show on a returning visit with no pending flag", () => {
    const session = memoryStore();
    const local = memoryStore();
    assert.equal(
      consumeWelcomeIfFirstTime(false, { session, local }),
      false,
    );
  });

  it("never shows again after it has already been shown", () => {
    const session = memoryStore({ [WELCOME_PENDING_KEY]: "true" });
    const local = memoryStore({ [WELCOME_SHOWN_KEY]: "true" });
    assert.equal(
      consumeWelcomeIfFirstTime(true, { session, local }),
      false,
    );
    assert.equal(session.getItem(WELCOME_PENDING_KEY), null);
  });
});
