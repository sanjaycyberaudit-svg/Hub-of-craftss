import { Skeleton } from "@/components/ui/skeleton";

function ShellHeaderSkeleton() {
  return (
    <div className="mb-5 flex gap-x-3 border-b pb-3">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
    </div>
  );
}

export function AdminTablePageSkeleton({
  statCards = 0,
  tableRows = 8,
}: {
  statCards?: number;
  tableRows?: number;
}) {
  return (
    <section>
      <ShellHeaderSkeleton />
      <div className="space-y-6">
        {statCards > 0 ? (
          <div
            className={`grid gap-4 ${statCards === 2 ? "md:grid-cols-2" : statCards >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}
          >
            {Array.from({ length: statCards }).map((_, index) => (
              <Skeleton
                key={`stat-${index}`}
                className="h-24 w-full rounded-lg"
              />
            ))}
          </div>
        ) : null}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3 rounded-lg border p-4">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: tableRows }).map((_, index) => (
            <Skeleton key={`row-${index}`} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <section>
      <ShellHeaderSkeleton />
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`card-${index}`}
              className="h-28 w-full rounded-lg"
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-72 rounded-lg" />
          <Skeleton className="col-span-3 h-72 rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      </div>
    </section>
  );
}

export function AdminSettingsSkeleton() {
  return (
    <section>
      <ShellHeaderSkeleton />
      <div className="max-w-3xl space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`form-${index}`}
            className="space-y-4 rounded-lg border p-6"
          >
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        ))}
      </div>
    </section>
  );
}
