"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/layout/page-header";
import { notifyRequestsChanged } from "@/lib/requests/unread-badge";
import { formatMetadataEntries, humanizeSource } from "@/lib/requests/metadata-labels";

interface ServiceRequest {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  photos?: string[];
  source?: string;
  metadata?: Record<string, unknown> | null;
  clients?: { id?: string; name?: string; email?: string };
}

export default function RequestsInboxPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = () => {
    fetch("/api/portal/requests?scope=contractor")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRequests(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/portal/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    notifyRequestsChanged();
    load();
  };

  const convertToEstimate = (req: ServiceRequest) => {
    if (!req.clients?.id) {
      setError("This request is not linked to a client, so it cannot be quoted.");
      return;
    }

    // /estimates/new reports back with converted_estimate_id once the quote is
    // saved, which is what moves the request to "quoted".
    const params = new URLSearchParams({
      clientId: req.clients.id,
      title: req.title,
      fromRequest: req.id,
    });
    router.push(`/estimates/new?${params.toString()}`);
  };

  return (
    <>
        <PageHeader
          title="Service Requests"
          description="Incoming requests from the client portal."
        />
        <main className="flex-1 p-4 md:p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {loading && <p className="text-gray-500">Loading...</p>}
          {requests.map((req) => (
            <Card key={req.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">{req.title}</CardTitle>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {humanizeSource(req.source, req.metadata)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {req.clients?.name} · {req.status} ·{" "}
                  {new Date(req.created_at).toLocaleDateString()}
                </p>
              </CardHeader>
              {(req.description ||
                (Array.isArray(req.photos) && req.photos.length > 0) ||
                formatMetadataEntries(req.metadata).length > 0) && (
                <CardContent className="text-sm text-gray-600 pb-2 space-y-2">
                  {req.description && <p>{req.description}</p>}
                  {Array.isArray(req.photos) && req.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {req.photos.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className="h-16 w-16 object-cover rounded border"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {formatMetadataEntries(req.metadata).length > 0 && (
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 text-xs text-gray-600 border-t pt-2 mt-2">
                      {formatMetadataEntries(req.metadata).map((entry) => (
                        <div key={entry.key} className="flex justify-between gap-2">
                          <dt className="font-medium text-gray-500">{entry.label}</dt>
                          <dd className="truncate text-right">{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </CardContent>
              )}
              <CardContent className="flex flex-wrap gap-2 pt-0">
                <Button size="sm" onClick={() => updateStatus(req.id, "reviewing")}>
                  Mark reviewing
                </Button>
                <Button size="sm" variant="outline" onClick={() => convertToEstimate(req)}>
                  Create estimate
                </Button>
                {req.clients?.id && (
                  <Link href={`/messages?clientId=${req.clients.id}`}>
                    <Button size="sm" variant="outline">
                      Message client
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(req.id, "declined")}
                >
                  Decline
                </Button>
              </CardContent>
            </Card>
          ))}
          {!loading && !requests.length && (
            <p className="text-center text-gray-500">No service requests yet.</p>
          )}
        </main>
    </>
  );
}
