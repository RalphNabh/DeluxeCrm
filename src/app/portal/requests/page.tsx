"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PortalShell from "@/components/portal/portal-shell";

interface ServiceRequest {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  photos?: string[];
}

export default function PortalRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    fetch("/api/portal/requests")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRequests(data));
  }, []);

  return (
    <PortalShell title="My requests">
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {requests.map((req) => (
          <Card key={req.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{req.title}</CardTitle>
              <p className="text-xs text-gray-500 capitalize">{req.status}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {req.description && (
                <p className="text-sm text-gray-600">{req.description}</p>
              )}
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
            </CardContent>
          </Card>
        ))}
        {!requests.length && (
          <p className="text-center text-gray-500">
            No requests yet. Submit one from Home.
          </p>
        )}
      </main>
    </PortalShell>
  );
}
