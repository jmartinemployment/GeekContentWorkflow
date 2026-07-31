export const REFRESH_COOKIE = "gcw_refresh";
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
  clear: {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  },
};
