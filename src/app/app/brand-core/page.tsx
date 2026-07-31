import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient, listClients, listProjects } from "@/lib/geek-api";

async function createClientAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!name) return;
  await createClient({ name, notes });
  revalidatePath("/app");
  revalidatePath("/app/brand-core");
}

export default async function BrandCorePage() {
  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let projectCount = 0;
  let error: string | null = null;

  try {
    clients = await listClients();
    const projects = await listProjects().catch(() => []);
    projectCount = projects.length;
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
        CWV2 <code className="text-xs">/api/clients</code> via GeekAPI. Each client
        owns projects (crawl → generate → publish).
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
        {clients.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-gcw-line bg-white px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{c.name}</p>
                {c.notes ? (
                  <p className="mt-1 text-sm text-gcw-muted">{c.notes}</p>
                ) : null}
              </div>
              <Link
                href={`/app/strategy-map?clientId=${c.id}`}
                className="shrink-0 text-sm font-medium text-gcw-ink underline-offset-2 hover:underline"
              >
                Projects →
              </Link>
            </div>
          </li>
        ))}
        {clients.length === 0 && !error ? (
          <li className="text-sm text-gcw-muted">No clients yet.</li>
        ) : null}
      </ul>

      <p className="mt-6 text-xs text-gcw-zinc">{projectCount} projects total</p>
    </div>
  );
}
