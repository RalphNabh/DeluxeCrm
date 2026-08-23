import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/org";
import { getZapierClientId, getZapierRedirectUri } from "@/lib/oauth/zapier";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { approveAuthorization, denyAuthorization } from "./actions";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Can&apos;t connect</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const responseType = first(params.response_type);
  const clientId = first(params.client_id);
  const redirectUri = first(params.redirect_uri);
  const state = first(params.state);

  if (responseType !== "code" || !clientId || !redirectUri) {
    return <ErrorScreen message="This connection request is missing required information." />;
  }

  let expectedClientId: string;
  let expectedRedirectUri: string;
  try {
    expectedClientId = getZapierClientId();
    expectedRedirectUri = getZapierRedirectUri();
  } catch {
    return <ErrorScreen message="Zapier connections aren't configured yet." />;
  }

  if (clientId !== expectedClientId || redirectUri !== expectedRedirectUri) {
    console.error("[oauth/authorize] mismatch", {
      clientIdMatch: clientId === expectedClientId,
      redirectUriMatch: redirectUri === expectedRedirectUri,
      receivedRedirectUri: redirectUri,
      expectedRedirectUri,
    });
    return <ErrorScreen message="Unrecognized application." />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = first(value);
      if (v) query.set(key, v);
    }
    const next = `/oauth/authorize?${query.toString()}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const membership = await getActiveMembership(supabase, user.id);
  if (!membership) {
    return (
      <ErrorScreen message="Finish setting up your DyluxePro account before connecting Zapier." />
    );
  }

  const orgs = membership.organizations;
  const orgName = (Array.isArray(orgs) ? orgs[0]?.name : orgs?.name) ?? "your account";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Connect Zapier to DyluxePro</CardTitle>
          <CardDescription>
            Zapier wants to create Requests in <strong>{orgName}</strong> whenever a new lead
            comes in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <form action={approveAuthorization} className="flex-1">
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="state" value={state} />
            <Button type="submit" className="w-full">
              Approve
            </Button>
          </form>
          <form action={denyAuthorization} className="flex-1">
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="state" value={state} />
            <Button type="submit" variant="outline" className="w-full">
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
