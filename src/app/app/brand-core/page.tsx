import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  createClient,
  GeekApiError,
  getClientProfileByClientId,
  listClients,
  listProjects,
  type ClientProfile,
  type CwClient,
} from "@/lib/geek-api";

async function createClientAction(formData: FormData) {
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

export default async function BrandCorePage() {
  let clients: CwClient[] = [];
  let profilesByClient = new Map<string, ClientProfile | null>();
  let projectCount = 0;
  let error: string | null = null;

  try {
    clients = await listClients();
    const projects = await listProjects().catch(() => []);
    projectCount = projects.length;
    const pairs = await Promise.all(
      clients.map(async (c) => [c.id, await loadProfile(c.id)] as const),
    );
    profilesByClient = new Map(pairs);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load clients";
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Brand Core
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Clients
      </h1>
      <p className="mt-2 text-gcw-muted">
        Each client can have a brand profile with versioned facts and prohibited
        claims. Campaigns pick up the latest version automatically.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-gcw-line bg-white px-4 py-3 text-sm text-gcw-muted">
          {error}
        </p>
      ) : null}

      <form
        action={createClientAction}
        className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
      >
        <h2 className="font-heading text-lg font-medium">Add client</h2>
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
          className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Create client
        </button>
      </form>

      <ul className="mt-8 space-y-3">
        {clients.map((c) => {
          const profile = profilesByClient.get(c.id) ?? null;
          return (
            <li
              key={c.id}
              className="rounded-xl border border-gcw-line bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{c.name}</p>
                  {c.notes ? (
                    <p className="mt-1 text-sm text-gcw-muted">{c.notes}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-gcw-zinc">
                    {profile
                      ? `Profile: ${profile.name}`
                      : "No brand profile yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/app/brand-core/${c.id}`}
                    className="text-sm font-medium text-gcw-ink underline-offset-2 hover:underline"
                  >
                    {profile ? "Open profile →" : "Create profile →"}
                  </Link>
                  <Link
                    href={`/app/drafting?clientId=${c.id}`}
                    className="text-sm font-medium text-gcw-muted underline-offset-2 hover:underline"
                  >
                    Drafting
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
        {clients.length === 0 && !error ? (
          <li className="text-sm text-gcw-muted">No clients yet.</li>
        ) : null}
      </ul>

      <p className="mt-6 text-xs text-gcw-zinc">{projectCount} projects total</p>
    </div>
  );
}
