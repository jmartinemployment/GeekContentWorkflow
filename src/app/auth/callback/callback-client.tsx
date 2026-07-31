"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Receives ?code= from GeekOAuth, posts to /api/auth/token (server exchange).
 * Never stores access tokens in the browser.
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const oauthError = params.get("error");
    if (oauthError) {
      setError(params.get("error_description") || oauthError);
      return;
    }
    if (!code) {
      setError("Missing authorization code");
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (cancelled) return;
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "Sign-in failed");
        return;
      }
      router.replace("/app");
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-heading text-2xl font-medium text-gcw-ink">
          Sign-in failed
        </h1>
        <p className="text-sm text-gcw-muted">{error}</p>
        <a
          href="/api/auth/start"
          className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-gcw-muted">
      Completing sign-in…
    </div>
  );
}
