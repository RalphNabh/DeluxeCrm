export const queryKeys = {
  clients: {
    all: ["clients"] as const,
    list: (q?: string) => ["clients", "list", q ?? ""] as const,
  },
  clientFolders: {
    all: ["client-folders"] as const,
  },
  estimates: {
    all: ["estimates"] as const,
    list: (clientId?: string) =>
      ["estimates", "list", clientId ?? ""] as const,
    detail: (id: string) => ["estimates", "detail", id] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    list: (q?: string, clientId?: string) =>
      ["invoices", "list", q ?? "", clientId ?? ""] as const,
    detail: (id: string) => ["invoices", "detail", id] as const,
  },
  jobs: {
    all: ["jobs"] as const,
    list: () => ["jobs", "list"] as const,
    detail: (id: string) => ["jobs", "detail", id] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    list: (tag?: string | null, status?: string | null) =>
      ["tasks", "list", tag ?? "", status ?? ""] as const,
  },
  materials: {
    all: ["materials"] as const,
    list: () => ["materials", "list"] as const,
  },
  team: {
    all: ["team"] as const,
    list: () => ["team", "list"] as const,
  },
  leads: {
    all: ["leads"] as const,
    list: () => ["leads", "list"] as const,
  },
  pipelineStages: {
    all: ["pipeline-stages"] as const,
    list: () => ["pipeline-stages", "list"] as const,
  },
  automations: {
    all: ["automations"] as const,
    list: () => ["automations", "list"] as const,
  },
  reports: {
    all: ["reports"] as const,
  },
} as const;
