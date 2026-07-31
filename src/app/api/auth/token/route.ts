import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  PKCE_COOKIE,
  REFRESH_COOKIE,
  cookieOpts,
} from "@/lib/auth/cookies";
import { exchangeAuthorizationCode } from "@/lib/auth/tokens";

/**
 * Server-side code → token exchange.
 * Persists only the refresh token in an httpOnly cookie.
 */
export async function POST(request: Request) {
  const { code } = (await request.json()) as { code?: string };
  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  const jar = await cookies();
  const verifier = jar.get(PKCE_COOKIE)?.value;
  if (!verifier) {
    return NextResponse.json({ error: "Sign-in session expired" }, { status: 400 });
  }

  try {
    const tokens = await exchangeAuthorizationCode(code, verifier);
    const res = NextResponse.json({ ok: true });
    if (tokens.refresh_token) {
      res.cookies.set(REFRESH_COOKIE, tokens.refresh_token, cookieOpts.refresh);
    }
    res.cookies.set(PKCE_COOKIE, "", cookieOpts.clear);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
