import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  ProjectActionForm,
  type ProjectActionState,
} from "@/components/app/ProjectActionForm";
import {
  GeekApiError,
  commitHtmlExport,
  crawlProject,
  generateAll,
  generateBlog,
  generatePillar,
  getProject,
  updateProjectNotes,
} from "@/lib/geek-api";

/** Crawl / generate can run long; Vercel honors this for server actions on the page. */
export const maxDuration = 300;

function actionError(e: unknown): ProjectActionState {
  if (e instanceof GeekApiError) {
    const timeoutish =
      e.status === 504 ||
      e.status === 408 ||
      /timeout|timed out|gateway/i.test(e.message);
    return {
      ok: false,
      error: timeoutish
        ? `${e.message} — long jobs can hit the host timeout; retry or check GeekAPI logs.`
        : e.message,
    };
  }
  return {
    ok: false,
    error: e instanceof Error ? e.message : "Action failed",
  };
}

async function crawlAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  "use server";
  const id = String(formData.get("projectId"));
  try {
    await crawlProject(id);
    revalidatePath(`/app/drafting/${id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

async function generateAllAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  "use server";
  const id = String(formData.get("projectId"));
  try {
    await generateAll(id);
    revalidatePath(`/app/drafting/${id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

async function generatePillarAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  "use server";
  const id = String(formData.get("projectId"));
  try {
    await generatePillar(id);
    revalidatePath(`/app/drafting/${id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

async function generateBlogAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  "use server";
  const id = String(formData.get("projectId"));
  try {
    await generateBlog(id);
    revalidatePath(`/app/drafting/${id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

async function publishAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  "use server";
  const id = String(formData.get("projectId"));
  try {
    await commitHtmlExport(id);
    revalidatePath(`/app/drafting/${id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

async function notesAction(formData: FormData) {
  "use server";
  const id = String(formData.get("projectId"));
  const notes = String(formData.get("notes") || "").trim() || null;
  await updateProjectNotes(id, notes);
  revalidatePath(`/app/drafting/${id}`);
}

export default async function ProjectDraftingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  let project: Awaited<ReturnType<typeof getProject>> | null = null;
  let error: string | null = null;

  try {
    project = await getProject(projectId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load project";
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl px-8 py-10">
        <p className="text-sm text-gcw-muted">{error || "Project not found"}</p>
        <Link href="/app/strategy-map" className="mt-4 inline-block text-sm underline">
          ← Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/app/strategy-map"
        className="text-xs font-medium text-gcw-zinc hover:text-gcw-ink"
      >
        ← Projects
      </Link>
      <h1 className="mt-3 font-heading text-3xl font-medium tracking-tight">
        {project.name}
      </h1>
      <p className="mt-2 text-sm text-gcw-muted">
        {project.targetKeyword} · {project.projectUrl} · {project.status}
      </p>

      {project.crawl ? (
        <p className="mt-3 rounded-lg border border-gcw-line bg-white px-3 py-2 text-xs text-gcw-muted">
          Crawled {project.crawl.pagesCrawled} pages · tone {project.crawl.detectedTone} ·
          focus {project.crawl.detectedFocus}
        </p>
      ) : null}

      <form action={notesAction} className="mt-6 flex flex-col gap-2">
        <input type="hidden" name="projectId" value={project.id} />
        <label className="text-xs font-semibold uppercase tracking-wide text-gcw-zinc">
          Notes (required intro topics)
        </label>
        <textarea
          name="notes"
          defaultValue={project.notes ?? ""}
          rows={2}
          className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <button type="submit" className="self-start text-sm font-medium underline">
          Save notes
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-3">
        <ProjectActionForm
          action={crawlAction}
          projectId={project.id}
          label="Crawl site"
          pendingLabel="Crawling…"
        />
        <ProjectActionForm
          action={generatePillarAction}
          projectId={project.id}
          label="Generate pillar"
          pendingLabel="Generating pillar…"
        />
        <ProjectActionForm
          action={generateBlogAction}
          projectId={project.id}
          label="Generate blog"
          pendingLabel="Generating blog…"
        />
        <ProjectActionForm
          action={generateAllAction}
          projectId={project.id}
          label="Generate all"
          pendingLabel="Generating all…"
        />
        <ProjectActionForm
          action={publishAction}
          projectId={project.id}
          label="Publish HTML commit"
          pendingLabel="Publishing…"
        />
      </div>
      <p className="mt-3 text-xs text-gcw-zinc">
        Crawl and generate can take several minutes. Keep this tab open until the button
        finishes — timeouts surface as an error under the action.
      </p>

      <h2 className="mt-10 font-heading text-xl font-medium">Generated content</h2>
      <ul className="mt-4 space-y-4">
        {(project.generatedContent ?? []).map((g) => (
          <li
            key={g.id}
            className="overflow-hidden rounded-2xl border border-gcw-line bg-white"
          >
            <div className="border-b border-gcw-line px-4 py-3">
              <p className="font-medium">{g.title}</p>
              <p className="text-xs text-gcw-zinc">
                {g.contentType} · {g.wordCount} words · {g.slug}
              </p>
            </div>
            <div
              className="prose prose-sm max-w-none px-4 py-3 text-gcw-ink"
              dangerouslySetInnerHTML={{ __html: g.bodyHtml || "<p>(empty)</p>" }}
            />
          </li>
        ))}
        {(project.generatedContent ?? []).length === 0 ? (
          <li className="text-sm text-gcw-muted">
            Nothing generated yet — crawl, then generate.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
