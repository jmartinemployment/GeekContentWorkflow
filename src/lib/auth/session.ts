import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { REFRESH_COOKIE, cookieOpts } from "@/lib/auth/cookies";
import {
  isSessionDeadError,
  refreshAccessToken,
} from "@/lib/auth/tokens";

/**
 * Obtain a GeekOAuth access token using the httpOnly refresh cookie.
 * Access tokens are never stored in the browser.
 */
export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  try {
    const tokens = await refreshAccessToken(refresh);
    if (tokens.refresh_token) {
      jar.set(REFRESH_COOKIE, tokens.refresh_token, cookieOpts.refresh);
    }
    return tokens.access_token;
  } catch (error) {
    if (isSessionDeadError(error)) {
      jar.set(REFRESH_COOKIE, "", cookieOpts.clear);
    }
    return null;
  }
}

export async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) redirect("/api/auth/start");
  return token;
}
