export const REQUESTS_UNREAD_CHANGED_EVENT = "deluxe:requests-unread-changed";

/** Tell the sidebar to refresh the Requests badge without waiting for the poll. */
export function notifyRequestsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REQUESTS_UNREAD_CHANGED_EVENT));
}
