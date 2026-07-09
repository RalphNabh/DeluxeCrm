"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Phone, LogOut } from "lucide-react";
import SignOutButton from "@/components/auth/sign-out";

interface FieldJob {
  id: string;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
  location?: string;
  clients?: { name?: string; phone?: string; address?: string };
}

export default function FieldPage() {
  const [jobs, setJobs] = useState<FieldJob[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/field/schedule")
      .then((r) => r.json())
      .then((data) => {
        if (data.jobs) setJobs(data.jobs);
        if (data.role && data.role !== "worker") {
          // Managers visiting /field see today's org schedule — that's fine
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Field Schedule</h1>
          <p className="text-sm text-slate-300">Today&apos;s assigned jobs</p>
        </div>
        <SignOutButton />
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {loading && <p className="text-gray-500">Loading schedule...</p>}
        {!loading && jobs.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No jobs scheduled for today.
            </CardContent>
          </Card>
        )}
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{job.title}</CardTitle>
              <p className="text-sm text-gray-600">{job.clients?.name}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                {new Date(job.start_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" – "}
                {new Date(job.end_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {job.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </div>
              )}
              {job.clients?.phone && (
                <a
                  href={`tel:${job.clients.phone}`}
                  className="flex items-center gap-2 text-blue-600"
                >
                  <Phone className="h-4 w-4" />
                  {job.clients.phone}
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                View job details
              </Button>
            </CardContent>
          </Card>
        ))}
        <Link href="/profile">
          <Button variant="ghost" className="w-full">Profile</Button>
        </Link>
      </main>
    </div>
  );
}
