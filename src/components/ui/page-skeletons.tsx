import { Skeleton } from "@/components/ui/skeleton";

/** Stats row + list/card rows — used by clients, estimates, invoices, etc. */
export function ListPageSkeleton({
  rows = 6,
  cards = 4,
}: {
  rows?: number;
  cards?: number;
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading content">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${Math.min(cards, 4)}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 flex items-center gap-4"
          >
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton className="h-4 w-1/3 max-w-[200px]" />
              <Skeleton className="h-3 w-1/2 max-w-[280px]" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
            <Skeleton className="h-8 w-20 hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Pipeline board placeholder for the dashboard. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>

      <div className="flex gap-4 overflow-hidden pb-2">
        {Array.from({ length: 4 }).map((_, col) => (
          <div
            key={col}
            className="min-w-[220px] w-[240px] shrink-0 rounded-lg border border-gray-200 bg-gray-100/80 p-3 space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            {Array.from({ length: 3 }).map((_, row) => (
              <div
                key={row}
                className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
              >
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Week/day grid placeholder for calendar. */
export function CalendarSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading calendar">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-6 w-full" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg border border-gray-200 bg-white p-2 space-y-2"
          >
            <Skeleton className="h-3 w-6" />
            {i % 3 === 0 && <Skeleton className="h-5 w-full rounded" />}
            {i % 5 === 0 && <Skeleton className="h-5 w-4/5 rounded" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card grid for materials / team. */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
        >
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex justify-between pt-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
