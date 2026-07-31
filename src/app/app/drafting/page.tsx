import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DEPARTMENTS,
  LLM_PROVIDERS,
  type Department,
  type LlmProvider,
} from "@/lib/config";
import { createProject, listClients, listProjects } from "@/lib/geek-api";

async function createProjectAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const name = String(formData.get("name") || "").trim();
  const projectUrl = String(formData.get("projectUrl") || "").trim();
  const targetKeyword = String(formData.get("targetKeyword") || "").trim();
  const department = String(
    formData.get("department") || "marketing",
  ) as Department;
  const preferredProvider = String(
    formData.get("preferredProvider") || "OpenAi",
  ) as LlmProvider;
  if (!clientId || !name || !projectUrl || !targetKeyword) return;

  const project = await createProject({
    clientId,
    name,
    projectUrl,
    targetKeyword,
    department,
    preferredProvider,
  });
  revalidatePath("/app/drafting");
  revalidatePath("/app");
  redirect(`/app/drafting/${project.id}`);
}

export default async function DraftingIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId: filterClientId } = await searchParams;

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let error: string | null = null;

  try {
    [clients, projects] = await Promise.all([listClients(), listProjects()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load projects";
  }

  const visible = filterClientId
    ? projects.filter((p) => p.clientId === filterClientId)
    : projects;

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        AI Drafting
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        CWV2 projects
      </h1>
      <p className="mt-2 text-gcw-muted">
        Crawl, generate pillar/blog content, and publish. Campaign planning lives
        on{" "}
        <Link
          href="/app/strategy-map"
          className="font-medium text-gcw-ink underline-offset-2 hover:underline"
        >
          Strategy Map
        </Link>
        .
      </p>

      {error ? <p className="mt-6 text-sm text-gcw-muted">{error}</p> : null}

      <form
        action={createProjectAction}
        className="mt-8 grid gap-3 rounded-2xl border border-gcw-line bg-white p-5 sm:grid-cols-2"
      >
        <h2 className="font-heading text-lg font-medium sm:col-span-2">
          New project
        </h2>
        <select
          name="clientId"
          required
          defaultValue={filterClientId || ""}
          className="rounded-lg border border-gcw-line px-3 py-2 text-sm sm:col-span-2"
        >
          <option value="" disabled>
            Select client
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          name="name"
          required
          placeholder="Project name"
          className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <input
          name="targetKeyword"
          required
          placeholder="Target keyword"
          className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <input
          name="projectUrl"
          required
          placeholder="https://client-site.com"
          className="rounded-lg border border-gcw-line px-3 py-2 text-sm sm:col-span-2"
        />
        <select
          name="department"
          defaultValue="marketing"
          className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          name="preferredProvider"
          defaultValue="OpenAi"
          className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
        >
          {LLM_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
        >
          Create project
        </button>
      </form>

      <ul className="mt-8 space-y-3">
        {visible.map((p) => (
          <li key={p.id}>
            <Link
              href={`/app/drafting/${p.id}`}
              className="flex items-center justify-between rounded-xl border border-gcw-line bg-white px-4 py-3 hover:border-gcw-ink/20"
            >
              <span>
                <span className="font-medium">{p.name}</span>
                <span className="mt-0.5 block text-xs text-gcw-zinc">
                  {p.targetKeyword} · {p.status}
                </span>
              </span>
              <span className="text-sm">→</span>
            </Link>
          </li>
        ))}
        {visible.length === 0 && !error ? (
          <li className="text-sm text-gcw-muted">No projects yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
