"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageSidebar from "@/components/layout/page-sidebar";
import { Menu } from "lucide-react";

interface ServiceRequest {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  clients?: { name?: string; email?: string };
}

export default function RequestsInboxPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    load();
  };

  const convertToEstimate = (req: ServiceRequest) => {
    const params = new URLSearchParams({
      clientId: req.clients ? "" : "",
      title: req.title,
      fromRequest: req.id,
    });
    router.push(`/estimates/new?${params.toString()}`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <PageSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Service Requests</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loading && <p className="text-gray-500">Loading...</p>}
          {requests.map((req) => (
            <Card key={req.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{req.title}</CardTitle>
                <p className="text-sm text-gray-500">
                  {req.clients?.name} · {req.status} ·{" "}
                  {new Date(req.created_at).toLocaleDateString()}
                </p>
              </CardHeader>
              {req.description && (
                <CardContent className="text-sm text-gray-600 pb-2">
                  {req.description}
                </CardContent>
              )}
              <CardContent className="flex flex-wrap gap-2 pt-0">
                <Button size="sm" onClick={() => updateStatus(req.id, "reviewing")}>
                  Mark reviewing
                </Button>
                <Button size="sm" variant="outline" onClick={() => convertToEstimate(req)}>
                  Create estimate
                </Button>
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
      </div>
    </div>
  );
}
