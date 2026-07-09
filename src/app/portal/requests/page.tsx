"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ServiceRequest {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
}

export default function PortalRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    fetch("/api/portal/requests")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRequests(data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">My Requests</h1>
        <Link href="/portal">
          <Button variant="outline" size="sm">Back to Hub</Button>
        </Link>
      </header>
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {requests.map((req) => (
          <Card key={req.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{req.title}</CardTitle>
              <p className="text-xs text-gray-500 capitalize">{req.status}</p>
            </CardHeader>
            {req.description && (
              <CardContent className="text-sm text-gray-600">{req.description}</CardContent>
            )}
          </Card>
        ))}
        {!requests.length && (
          <p className="text-center text-gray-500">No requests yet.</p>
        )}
      </main>
    </div>
  );
}
