import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;
let realtimeAuthBound = false;

function bindRealtimeAuth(client: SupabaseClient) {
  if (realtimeAuthBound) return;
  realtimeAuthBound = true;

  const syncAuth = (accessToken: string | null | undefined) => {
    client.realtime.setAuth(accessToken ?? null);
  };

  void client.auth.getSession().then(({ data: { session } }) => {
    syncAuth(session?.access_token);
  });

  client.auth.onAuthStateChange((_event, session) => {
    syncAuth(session?.access_token);
  });
}

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    bindRealtimeAuth(browserClient);
  }

  return browserClient;
}
