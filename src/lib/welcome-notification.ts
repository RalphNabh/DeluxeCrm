export const WELCOME_PENDING_KEY = "showWelcomeNotification";
export const WELCOME_SHOWN_KEY = "welcomeNotificationShown";

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/** Session flag: this browser just finished signup / email verify. */
export function markWelcomePending(session: StorageLike = sessionStorage): void {
  session.setItem(WELCOME_PENDING_KEY, "true");
}

/**
 * Show welcome only for a first-time contractor, once.
 * Returning logins should not set the pending flag.
 */
export function consumeWelcomeIfFirstTime(
  welcomeQuery: boolean,
  stores: { session: StorageLike; local: StorageLike } = {
    session: sessionStorage,
    local: localStorage,
  },
): boolean {
  const pending = stores.session.getItem(WELCOME_PENDING_KEY) === "true";
  stores.session.removeItem(WELCOME_PENDING_KEY);

  if (!pending && !welcomeQuery) return false;
  if (stores.local.getItem(WELCOME_SHOWN_KEY) === "true") return false;

  stores.local.setItem(WELCOME_SHOWN_KEY, "true");
  return true;
}
