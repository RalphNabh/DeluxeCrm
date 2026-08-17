export {
  ensureClientConversation,
  ensurePortalConversation,
  postHubMessage,
  postSystemMessage,
  markConversationRead,
  getUnreadCount,
  getOrgUnreadSummary,
  getClientUnreadSummary,
  buildSystemMessageBody,
} from "./hub-messaging";

export type {
  HubConversation,
  HubMessageRow,
  MessageType,
  SystemMessageMetadata,
} from "./hub-messaging";

// Legacy module — import from @/lib/hub-messaging instead.
export type { HubConversation as PortalConversation } from "./hub-messaging";
