import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClient,
  createWorkspace,
  createWorkspaceClient,
  GeekApiError,
  getClientProfileByClientId,
  listClients,
  listProjects,
  listWorkspaceClients,
  listWorkspaces,
  type ClientProfile,
  type CwClient,
  type GcwClient,
  type Workspace,
} from "@/lib/geek-api";

async function createWorkspaceAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const workspace = await createWorkspace({ name });
  revalidatePath("/app/brand-core");
  redirect(`/app/brand-core?workspaceId=${workspace.id}`);
}

async function createWorkspaceClientAction(formData: FormData) {
  "use server";
  const workspaceId = String(formData.get("workspaceId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!workspaceId || !name) return;
  await createWorkspaceClient({ workspaceId, name });
  revalidatePath("/app/brand-core");
  redirect(`/app/brand-core?workspaceId=${workspaceId}`);
}

async function createDraftingClientAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!name) return;
  await createClient({ name, notes });
  revalidatePath("/app");
  revalidatePath("/app/brand-core");
}

async function loadProfile(
  clientId: string,
): Promise<ClientProfile | null> {
  try {
    return await getClientProfileByClientId(clientId);
  } catch (e) {
    if (e instanceof GeekApiError && e.status === 404) return null;
    throw e;
  }
}

export default async function BrandCorePage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const { workspaceId: workspaceIdParam } = await searchParams;

  let workspaces: Workspace[] = [];
  let selected: Workspace | null = null;
  let workspaceClients: GcwClient[] = [];
  let draftingClients: CwClient[] = [];
  let profilesByClient = new Map<string, ClientProfile | null>();
  let projectCount = 0;
  let error: string | null = null;

  try {
    workspaces = await listWorkspaces();
    selected =
      workspaces.find((w) => w.id === workspaceIdParam) ??
      workspaces[0] ??
      null;

    if (selected) {
      workspaceClients = await listWorkspaceClients(selected.id);
    }

    draftingClients = await listClients().catch(() => []);
    const projects = await listProjects().catch(() => []);
    projectCount = projects.length;

    const profileIds = [
      ...workspaceClients.map((c) => c.id),
      ...draftingClients.map((c) => c.id),
    ];
    const uniqueIds = [...new Set(profileIds)];
    const pairs = await Promise.all(
      uniqueIds.map(async (id) => [id, await loadProfile(id)] as const),
    );
    profilesByClient = new Map(pairs);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load Brand Core";
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Brand Core
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Workspaces
      </h1>
      <p className="mt-2 text-gcw-muted">
        Workspaces are the tenant above clients. Create a workspace, add
        clients, then open brand profiles.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-gcw-line bg-white px-4 py-3 text-sm text-gcw-muted">
          {error}
        </p>
      ) : null}

      <form
        action={createWorkspaceAction}
        className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
      >
        <h2 className="font-heading text-lg font-medium">New workspace</h2>
        <input
          name="name"
          required
          placeholder="Workspace name"
          className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Create workspace
        </button>
      </form>

      {workspaces.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {workspaces.map((w) => {
            const active = selected?.id === w.id;
            return (
              <Link
                key={w.id}
                href={`/app/brand-core?workspaceId=${w.id}`}
                className={
                  active
                    ? "rounded-pill bg-gcw-ink px-3 py-1.5 text-sm font-medium text-white"
                    : "rounded-pill border border-gcw-line bg-white px-3 py-1.5 text-sm font-medium text-gcw-ink hover:bg-gcw-surface"
                }
              >
                {w.name}
              </Link>
            );
          })}
        </div>
      ) : null}

      {selected ? (
        <>
          <div className="mt-8">
            <h2 className="font-heading text-lg font-medium">
              Clients in {selected.name}
            </h2>
            <p className="mt-1 text-xs text-gcw-zinc">
              Workspace id {selected.id}
            </p>
          </div>

          <form
            action={createWorkspaceClientAction}
            className="mt-4 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
          >
            <h3 className="text-sm font-semibold">Add client</h3>
            <input type="hidden" name="workspaceId" value={selected.id} />
            <input
              name="name"
              required
              placeholder="Company name"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Create client
            </button>
          </form>

          <ul className="mt-6 space-y-3">
            {workspaceClients.map((c) => {
              const profile = profilesByClient.get(c.id) ?? null;
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-gcw-line bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="mt-1 text-xs text-gcw-zinc">
                        {profile
                          ? `Profile: ${profile.name}`
                          : "No brand profile yet"}
                      </p>
                    </div>
                    <Link
                      href={`/app/brand-core/${c.id}`}
                      className="text-sm font-medium text-gcw-ink underline-offset-2 hover:underline"
                    >
                      {profile ? "Open profile →" : "Create profile →"}
                    </Link>
                  </div>
                </li>
              );
            })}
            {workspaceClients.length === 0 ? (
              <li className="text-sm text-gcw-muted">
                No clients in this workspace yet.
              </li>
            ) : null}
          </ul>
        </>
      ) : !error ? (
        <p className="mt-8 text-sm text-gcw-muted">
          Create a workspace to start adding clients.
        </p>
      ) : null}

      <details className="mt-12 rounded-2xl border border-gcw-line bg-white p-5">
        <summary className="cursor-pointer font-heading text-lg font-medium">
          Drafting clients (CWV2)
        </summary>
        <p className="mt-2 text-sm text-gcw-muted">
          Used by AI Drafting projects. Separate from workspace clients above.
        </p>
        <form
          action={createDraftingClientAction}
          className="mt-4 space-y-3"
        >
          <input
            name="name"
            required
            placeholder="Company name"
            className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <textarea
            name="notes"
            placeholder="Brand notes, ICP, voice…"
            rows={3}
            className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-semibold text-gcw-ink"
          >
            Create drafting client
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {draftingClients.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gcw-line px-3 py-2 text-sm"
            >
              <span className="font-medium">{c.name}</span>
              <Link
                href={`/app/drafting?clientId=${c.id}`}
                className="text-gcw-muted underline-offset-2 hover:underline"
              >
                Drafting
              </Link>
            </li>
          ))}
          {draftingClients.length === 0 ? (
            <li className="text-sm text-gcw-muted">No drafting clients.</li>
          ) : null}
        </ul>
        <p className="mt-4 text-xs text-gcw-zinc">{projectCount} projects total</p>
      </details>
    </div>
  );
}
