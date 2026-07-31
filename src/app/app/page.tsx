import Link from "next/link";
import { createClient, listClients, listProjects } from "@/lib/geek-api";
import { revalidatePath } from "next/cache";

async function quickClientAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await createClient({ name });
  revalidatePath("/app");
  revalidatePath("/app/brand-core");
}

export default async function AppDashboardPage() {
  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let error: string | null = null;

  try {
    [clients, projects] = await Promise.all([listClients(), listProjects()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "GeekAPI unreachable";
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="font-heading text-3xl font-medium tracking-tight">Dashboard</h1>
      <p className="mt-2 text-gcw-muted">
        Content Writer v2 on GeekAPI (merged). Auth via GeekOAuth. Persistence through
        GeekRepository / Supabase — not called directly from this app.
      </p>

      {error ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Backend unreachable</p>
          <p className="mt-1 opacity-80">{error}</p>
          <p className="mt-2 text-xs">
            Run GeekOAuth + GeekAPI (with CWV2 ApplicationPart). See{" "}
            <code className="rounded bg-white px-1">.env.example</code>.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Clients" value={clients.length} href="/app/brand-core" />
        <Stat label="Projects" value={projects.length} href="/app/strategy-map" />
        <Stat label="Drafting" value="Open" href="/app/drafting" />
      </div>

      <form
        action={quickClientAction}
        className="mt-10 flex flex-wrap items-end gap-3 rounded-2xl border border-gcw-line bg-white p-5"
      >
        <div className="min-w-[200px] flex-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gcw-zinc">
            Quick add client
          </label>
          <input
            name="name"
            required
            placeholder="Acme Inc"
            className="mt-1 w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Create
        </button>
      </form>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-medium">Recent projects</h2>
        <ul className="mt-3 space-y-2">
          {projects.slice(0, 8).map((p) => (
            <li key={p.id}>
              <Link
                href={`/app/drafting/${p.id}`}
                className="text-sm font-medium text-gcw-ink hover:underline"
              >
                {p.name}
              </Link>
              <span className="text-xs text-gcw-zinc"> — {p.targetKeyword}</span>
            </li>
          ))}
          {projects.length === 0 && !error ? (
            <li className="text-sm text-gcw-muted">None yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-gcw-line bg-white p-5 shadow-sm transition hover:border-gcw-ink/20"
    >
      <p className="text-[12px] font-medium uppercase tracking-wide text-gcw-zinc">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl font-medium">{value}</p>
    </Link>
  );
}
