import Link from "next/link";
import { listProjects } from "@/lib/geek-api";

export default async function DraftingIndexPage() {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let error: string | null = null;
  try {
    projects = await listProjects();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load projects";
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        AI Drafting
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Projects to draft
      </h1>
      <p className="mt-2 text-gcw-muted">
        Open a project to crawl, generate pillar/blog content, and publish via CWV2
        on GeekAPI.
      </p>
      {error ? <p className="mt-6 text-sm text-gcw-muted">{error}</p> : null}
      <ul className="mt-8 space-y-3">
        {projects.map((p) => (
          <li key={p.id}>
            <Link
              href={`/app/drafting/${p.id}`}
              className="flex items-center justify-between rounded-xl border border-gcw-line bg-white px-4 py-3 hover:border-gcw-ink/20"
            >
              <span>
                <span className="font-medium">{p.name}</span>
                <span className="mt-0.5 block text-xs text-gcw-zinc">
                  {p.targetKeyword}
                </span>
              </span>
              <span className="text-sm">→</span>
            </Link>
          </li>
        ))}
        {projects.length === 0 && !error ? (
          <li className="text-sm text-gcw-muted">
            No projects — create one under Strategy Map.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
