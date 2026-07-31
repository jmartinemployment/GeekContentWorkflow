import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOpts,
} from "@/lib/auth/cookies";
import {
  isSessionDeadError,
  refreshAccessToken,
} from "@/lib/auth/tokens";

/**
 * Obtain a GeekOAuth access token using the httpOnly refresh cookie.
 * Access tokens are never exposed to client JS.
 *
 * Wrapped in React cache() so one RSC/request only refreshes once even if
 * many server components/actions call this.
 */
export const getAccessToken = cache(async (): Promise<string | null> => {
  const jar = await cookies();
  const existing = jar.get(ACCESS_COOKIE)?.value;
  if (existing) return existing;

  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  try {
    const tokens = await refreshAccessToken(refresh);
    if (tokens.refresh_token) {
      jar.set(REFRESH_COOKIE, tokens.refresh_token, cookieOpts.refresh);
    }
    const maxAge = Math.max(30, Math.min(tokens.expires_in - 60, 60 * 10));
    jar.set(ACCESS_COOKIE, tokens.access_token, {
      ...cookieOpts.access,
      maxAge,
    });
    return tokens.access_token;
  } catch (error) {
    if (isSessionDeadError(error)) {
      jar.set(REFRESH_COOKIE, "", cookieOpts.clear);
      jar.set(ACCESS_COOKIE, "", cookieOpts.clear);
    }
    return null;
  }
});

export async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) redirect("/api/auth/start");
  return token;
}
