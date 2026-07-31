export const REFRESH_COOKIE = "gcw_refresh";
export const ACCESS_COOKIE = "gcw_access";
export const PKCE_COOKIE = "gcw_pkce_verifier";

const secure = process.env.NODE_ENV === "production";

export const cookieOpts = {
  pkce: {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  },
  refresh: {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  },
  access: {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    // overwritten per-token with expires_in
    maxAge: 60 * 5,
  },
  clear: {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  },
};
