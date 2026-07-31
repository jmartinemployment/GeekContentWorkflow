"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export type ProjectActionState = {
  ok: boolean;
  error?: string;
} | null;

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-medium",
        pending
          ? "cursor-wait opacity-70"
          : "hover:bg-gcw-surface",
      )}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ProjectActionForm({
  action,
  projectId,
  label,
  pendingLabel,
}: {
  action: (
    prev: ProjectActionState,
    formData: FormData,
  ) => Promise<ProjectActionState>;
  projectId: string;
  label: string;
  pendingLabel: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <div className="space-y-1">
      <form action={formAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <SubmitButton label={label} pendingLabel={pendingLabel} />
      </form>
      {state && !state.ok && state.error ? (
        <p className="max-w-[16rem] text-xs text-amber-800">{state.error}</p>
      ) : null}
    </div>
  );
}
