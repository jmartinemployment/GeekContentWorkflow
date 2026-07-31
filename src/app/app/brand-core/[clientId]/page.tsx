import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  createClientProfile,
  createClientProfileVersion,
  GeekApiError,
  getClientProfileByClientId,
  listClientProfileVersions,
  listClients,
  type ClientProfile,
  type ClientProfileVersion,
} from "@/lib/geek-api";

async function loadProfile(clientId: string): Promise<ClientProfile | null> {
  try {
    return await getClientProfileByClientId(clientId);
  } catch (e) {
    if (e instanceof GeekApiError && e.status === 404) return null;
    throw e;
  }
}

async function createProfileAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!clientId || !name) return;

  try {
    await createClientProfile({ clientId, name });
  } catch (e) {
    // Already exists — open existing
    if (!(e instanceof GeekApiError && e.status === 409)) throw e;
  }
  revalidatePath("/app/brand-core");
  revalidatePath(`/app/brand-core/${clientId}`);
  redirect(`/app/brand-core/${clientId}`);
}

async function createVersionAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const profileId = String(formData.get("profileId") || "");
  const approvedFactsRaw = String(formData.get("approvedFacts") || "").trim();
  const prohibitedClaimsRaw = String(
    formData.get("prohibitedClaims") || "",
  ).trim();
  if (!clientId || !profileId) return;

  let approvedFacts: Record<string, unknown> = {};
  let prohibitedClaims: Record<string, unknown> = {};
  try {
    approvedFacts = approvedFactsRaw
      ? (JSON.parse(approvedFactsRaw) as Record<string, unknown>)
      : {};
    prohibitedClaims = prohibitedClaimsRaw
      ? (JSON.parse(prohibitedClaimsRaw) as Record<string, unknown>)
      : {};
  } catch {
    redirect(
      `/app/brand-core/${clientId}?error=${encodeURIComponent("Approved facts and prohibited claims must be valid JSON objects.")}`,
    );
  }

  if (
    typeof approvedFacts !== "object" ||
    approvedFacts === null ||
    Array.isArray(approvedFacts) ||
    typeof prohibitedClaims !== "object" ||
    prohibitedClaims === null ||
    Array.isArray(prohibitedClaims)
  ) {
    redirect(
      `/app/brand-core/${clientId}?error=${encodeURIComponent("JSON must be objects, not arrays or primitives.")}`,
    );
  }

  await createClientProfileVersion({
    profileId,
    approvedFacts,
    prohibitedClaims,
  });
  revalidatePath("/app/brand-core");
  revalidatePath(`/app/brand-core/${clientId}`);
  redirect(`/app/brand-core/${clientId}`);
}

export default async function BrandCoreClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { clientId } = await params;
  const { error: queryError } = await searchParams;

  let clientName = "Client";
  let profile: ClientProfile | null = null;
  let versions: ClientProfileVersion[] = [];
  let error: string | null = queryError || null;

  try {
    const clients = await listClients();
    const client = clients.find((c) => c.id === clientId);
    if (!client) notFound();
    clientName = client.name;
    profile = await loadProfile(clientId);
    if (profile) {
      versions = await listClientProfileVersions(profile.id);
      versions = [...versions].sort((a, b) => b.version - a.version);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load profile";
  }

  const latest = versions[0] ?? null;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Brand Core
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        {clientName}
      </h1>
      <p className="mt-2 text-gcw-muted">
        Brand profile versions with approved facts and prohibited claims.
      </p>
      <p className="mt-3">
        <Link
          href="/app/brand-core"
          className="text-sm font-medium text-gcw-muted underline-offset-2 hover:underline"
        >
          ← All clients
        </Link>
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {!profile ? (
        <form
          action={createProfileAction}
          className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
        >
          <h2 className="font-heading text-lg font-medium">Create profile</h2>
          <p className="text-sm text-gcw-muted">
            One profile per client. Versions capture facts and claims over time.
          </p>
          <input type="hidden" name="clientId" value={clientId} />
          <input
            name="name"
            required
            defaultValue={`${clientName} brand`}
            placeholder="Profile name"
            className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Create profile
          </button>
        </form>
      ) : (
        <>
          <div className="mt-8 rounded-2xl border border-gcw-line bg-white p-5">
            <h2 className="font-heading text-lg font-medium">{profile.name}</h2>
            <p className="mt-1 text-xs text-gcw-zinc">
              Profile id {profile.id}
            </p>
            {latest ? (
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium">
                  Latest: v{latest.version}{" "}
                  <span className="font-normal text-gcw-zinc">
                    ({new Date(latest.createdAtUtc).toLocaleString()})
                  </span>
                </p>
                <pre className="overflow-x-auto rounded-lg bg-gcw-surface p-3 text-xs text-gcw-ink">
                  {JSON.stringify(
                    {
                      approvedFacts: latest.approvedFacts,
                      prohibitedClaims: latest.prohibitedClaims,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gcw-muted">
                No versions yet — add one below.
              </p>
            )}
          </div>

          <form
            action={createVersionAction}
            className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
          >
            <h2 className="font-heading text-lg font-medium">New version</h2>
            <p className="text-sm text-gcw-muted">
              Paste JSON objects for approved facts and prohibited claims.
            </p>
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="profileId" value={profile.id} />
            <label className="block text-sm">
              <span className="mb-1 block text-gcw-muted">Approved facts</span>
              <textarea
                name="approvedFacts"
                rows={6}
                defaultValue={
                  latest
                    ? JSON.stringify(latest.approvedFacts, null, 2)
                    : '{\n  "product": "Example",\n  "audience": "B2B marketers"\n}'
                }
                className="w-full rounded-lg border border-gcw-line px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gcw-muted">
                Prohibited claims
              </span>
              <textarea
                name="prohibitedClaims"
                rows={5}
                defaultValue={
                  latest
                    ? JSON.stringify(latest.prohibitedClaims, null, 2)
                    : '{\n  "guarantees": ["100% results"]\n}'
                }
                className="w-full rounded-lg border border-gcw-line px-3 py-2 font-mono text-xs"
              />
            </label>
            <button
              type="submit"
              className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Save version
            </button>
          </form>

          {versions.length > 0 ? (
            <div className="mt-8">
              <h2 className="font-heading text-lg font-medium">Version history</h2>
              <ul className="mt-3 space-y-2">
                {versions.map((v) => (
                  <li
                    key={v.id}
                    className="rounded-xl border border-gcw-line bg-white px-4 py-3 text-sm"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">v{v.version}</span>
                      <span className="text-xs text-gcw-zinc">
                        {new Date(v.createdAtUtc).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-gcw-muted">
                      {v.id}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-8 text-sm">
            <Link
              href={`/app/strategy-briefs?clientId=${clientId}`}
              className="font-medium text-gcw-ink underline-offset-2 hover:underline"
            >
              Create campaign with this profile →
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
