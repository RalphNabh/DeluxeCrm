/** Client row from Supabase join — typing may be object or single-element array. */
export function getJoinedClientEmail(
  clients: { email?: string } | { email?: string }[] | null | undefined,
): string | undefined {
  if (!clients) return undefined;
  if (Array.isArray(clients)) return clients[0]?.email;
  return clients.email;
}
