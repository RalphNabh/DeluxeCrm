export const UNREAD_CHANGED_EVENT = "deluxe:unread-changed";

/** Tell CRM/portal shells to refresh the unread badge without waiting for the poll. */
export function notifyUnreadChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT));
}
