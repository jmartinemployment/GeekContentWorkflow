import Link from "next/link";
import { listProjects } from "@/lib/geek-api";

/** CWV2 has no dedicated analytics API — surface project pipeline status instead. */
export default async function AnalyticsPage() {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let error: string | null = null;
  try {
    projects = await listProjects();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load";
  }

  const byStatus = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Analytics
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Pipeline status
      </h1>
      <p className="mt-2 text-gcw-muted">
        Derived from CWV2 project statuses on GeekAPI. Dedicated SEO/GA analytics live
        in GeekSeoBackend if you need rankings later.
      </p>

      {error ? <p className="mt-6 text-sm text-gcw-muted">{error}</p> : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {Object.entries(byStatus).map(([status, count]) => (
          <div
            key={status}
            className="rounded-2xl border border-gcw-line bg-white p-4"
          >
            <p className="text-xs uppercase tracking-wide text-gcw-zinc">{status}</p>
            <p className="mt-1 font-heading text-2xl font-medium">{count}</p>
          </div>
        ))}
        {Object.keys(byStatus).length === 0 && !error ? (
          <p className="text-sm text-gcw-muted sm:col-span-3">No projects.</p>
        ) : null}
      </div>

      <ul className="mt-8 space-y-2">
        {projects.map((p) => (
          <li key={p.id} className="flex justify-between text-sm">
            <Link href={`/app/drafting/${p.id}`} className="font-medium hover:underline">
              {p.name}
            </Link>
            <span className="text-gcw-zinc">{p.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
