import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPainPoint,
  listClients,
  listPainPoints,
  type PainPoint,
} from "@/lib/geek-api";

async function createPainPointAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const readerSymptom = String(formData.get("readerSymptom") || "").trim();
  const costOfInaction = String(formData.get("costOfInaction") || "").trim();
  const offerTerminology = String(
    formData.get("offerTerminology") || "",
  ).trim();
  const objectionsRaw = String(formData.get("objections") || "");
  const confidenceRaw = String(formData.get("confidence") || "50").trim();
  if (
    !clientId ||
    !name ||
    !description ||
    !readerSymptom ||
    !costOfInaction ||
    !offerTerminology
  ) {
    return;
  }

  const objections = objectionsRaw
    .split(/\n|,/)
    .map((o) => o.trim())
    .filter(Boolean);
  const confidence = Number(confidenceRaw);
  await createPainPoint({
    clientId,
    name,
    description,
    readerSymptom,
    costOfInaction,
    offerTerminology,
    objections,
    confidence: Number.isFinite(confidence) ? confidence : 50,
  });
  revalidatePath("/app/pain-points");
  redirect(`/app/pain-points?clientId=${clientId}`);
}

export default async function PainPointsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId: filterClientId } = await searchParams;

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let painPoints: PainPoint[] = [];
  let error: string | null = null;

  try {
    clients = await listClients();
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");
    if (clientId) {
      painPoints = await listPainPoints(clientId);
      painPoints = [...painPoints].sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() -
          new Date(a.createdAtUtc).getTime(),
      );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load pain points";
  }

  const selectedClientId =
    filterClientId || (clients.length === 1 ? clients[0]?.id : "") || "";

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Research
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Pain points
      </h1>
      <p className="mt-2 text-gcw-muted">
        Reader symptoms, cost of inaction, and objections — link these when you
        create a strategy brief.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <form className="mt-8 flex flex-wrap gap-3" method="get">
        <select
          name="clientId"
          defaultValue={selectedClientId}
          className="rounded-lg border border-gcw-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-medium hover:bg-gcw-surface"
        >
          Filter
        </button>
      </form>

      {!selectedClientId ? (
        <p className="mt-6 text-sm text-gcw-muted">
          Select a client (or create one under Brand Core).
        </p>
      ) : (
        <>
          <form
            action={createPainPointAction}
            className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
          >
            <h2 className="font-heading text-lg font-medium">Add pain point</h2>
            <input type="hidden" name="clientId" value={selectedClientId} />
            <input
              name="name"
              required
              placeholder="Short name"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <textarea
              name="description"
              required
              rows={2}
              placeholder="Description"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <textarea
              name="readerSymptom"
              required
              rows={2}
              placeholder="Reader symptom"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <textarea
              name="costOfInaction"
              required
              rows={2}
              placeholder="Cost of inaction"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <input
              name="offerTerminology"
              required
              placeholder="Offer terminology"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <textarea
              name="objections"
              rows={3}
              placeholder="Objections (one per line or comma-separated)"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <label className="block text-sm text-gcw-muted">
              Confidence (0–100)
              <input
                name="confidence"
                type="number"
                min={0}
                max={100}
                defaultValue={50}
                className="mt-1 w-full rounded-lg border border-gcw-line px-3 py-2 text-sm text-gcw-ink"
              />
            </label>
            <button
              type="submit"
              className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Create pain point
            </button>
          </form>

          <ul className="mt-8 space-y-3">
            {painPoints.map((pp) => (
              <li
                key={pp.id}
                className="rounded-xl border border-gcw-line bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{pp.name}</p>
                    <p className="mt-1 text-sm text-gcw-muted">
                      {pp.readerSymptom}
                    </p>
                    <p className="mt-1 text-xs text-gcw-zinc">
                      Confidence {pp.confidence}
                      {pp.objections?.length
                        ? ` · ${pp.objections.length} objections`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/app/strategy-briefs?clientId=${selectedClientId}`}
                    className="shrink-0 text-sm font-medium text-gcw-ink underline-offset-2 hover:underline"
                  >
                    Use in brief →
                  </Link>
                </div>
              </li>
            ))}
            {painPoints.length === 0 ? (
              <li className="text-sm text-gcw-muted">No pain points yet.</li>
            ) : null}
          </ul>
        </>
      )}
    </div>
  );
}
