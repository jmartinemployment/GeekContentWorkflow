"use client";

import { useState } from "react";

export function CopyPostButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  if (!text.trim()) return null;

  return (
    <button
      type="button"
      className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium hover:bg-gcw-surface"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          // Fallback: select via prompt not needed — textarea path unused
        }
      }}
    >
      {copied ? "Copied" : "Copy post"}
    </button>
  );
}
