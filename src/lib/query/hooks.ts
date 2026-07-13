"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/query/fetch";
import { queryKeys } from "@/lib/query/keys";

export function useClientsQuery(q?: string) {
  const query = q?.trim() ?? "";
  return useQuery({
    queryKey: queryKeys.clients.list(query),
    queryFn: () =>
      fetchJson<unknown[]>(
        query ? `/api/clients?q=${encodeURIComponent(query)}` : "/api/clients",
      ),
  });
}

export function useClientFoldersQuery() {
  return useQuery({
    queryKey: queryKeys.clientFolders.all,
    queryFn: async () => {
      const response = await fetch("/api/client-folders");
      if (!response.ok) return [] as unknown[];
      return (await response.json()) as unknown[];
    },
  });
}

export function useEstimatesQuery(clientId?: string) {
  return useQuery({
    queryKey: queryKeys.estimates.list(clientId),
    queryFn: () =>
      fetchJson<unknown[]>(
        clientId
          ? `/api/estimates?client_id=${encodeURIComponent(clientId)}`
          : "/api/estimates",
      ),
  });
}

export function useInvoicesQuery(options?: { q?: string; clientId?: string }) {
  const q = options?.q?.trim() ?? "";
  const clientId = options?.clientId ?? "";
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (clientId) params.set("client_id", clientId);
  const qs = params.toString();

  return useQuery({
    queryKey: queryKeys.invoices.list(q, clientId),
    queryFn: () =>
      fetchJson<unknown[]>(qs ? `/api/invoices?${qs}` : "/api/invoices"),
  });
}

export function useJobsQuery() {
  return useQuery({
    queryKey: queryKeys.jobs.list(),
    queryFn: () => fetchJson<unknown[]>("/api/jobs"),
  });
}

export function useTasksQuery(options?: {
  tag?: string | null;
  status?: string | null;
}) {
  const tag = options?.tag ?? null;
  const status = options?.status ?? null;
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (status) params.set("status", status);
  const qs = params.toString();

  return useQuery({
    queryKey: queryKeys.tasks.list(tag, status),
    queryFn: () => fetchJson<unknown[]>(qs ? `/api/tasks?${qs}` : "/api/tasks"),
  });
}

export function useMaterialsQuery() {
  return useQuery({
    queryKey: queryKeys.materials.list(),
    queryFn: () => fetchJson<unknown[]>("/api/materials"),
  });
}

export function useTeamQuery() {
  return useQuery({
    queryKey: queryKeys.team.list(),
    queryFn: () => fetchJson<unknown[]>("/api/team"),
  });
}

export function useLeadsQuery() {
  return useQuery({
    queryKey: queryKeys.leads.list(),
    queryFn: () => fetchJson<unknown[]>("/api/leads"),
  });
}

export function usePipelineStagesQuery() {
  return useQuery({
    queryKey: queryKeys.pipelineStages.list(),
    queryFn: () => fetchJson<unknown[]>("/api/pipeline-stages"),
  });
}

export function useAutomationsQuery() {
  return useQuery({
    queryKey: queryKeys.automations.list(),
    queryFn: () => fetchJson<unknown[]>("/api/automations"),
  });
}

/** Invalidate all cached lists for a resource after mutations. */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    clients: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
    clientFolders: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.clientFolders.all }),
    estimates: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all }),
    invoices: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
    jobs: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
    tasks: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
    materials: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all }),
    team: () => queryClient.invalidateQueries({ queryKey: queryKeys.team.all }),
    leads: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all }),
    pipelineStages: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelineStages.all,
      }),
    automations: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.all }),
  };
}
