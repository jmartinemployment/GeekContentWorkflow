import { CALENDAR_CHANNELS } from "@/lib/geek-api";

type CalendarChannel = (typeof CALENDAR_CHANNELS)[number];

/**
 * Infer a calendar channel from companion asset names produced by
 * repurpose / video SEO / visuals (e.g. "LinkedIn · …", "Visual · LinkedIn").
 */
export function inferChannelFromAssetName(name: string): CalendarChannel | null {
  const n = name.toLowerCase();
  if (/\blinkedin\b/.test(n) || /social-linkedin/.test(n)) return "linkedin";
  if (/\binstagram\b/.test(n) || /social-instagram/.test(n)) return "instagram";
  if (/\bfacebook\b/.test(n) || /\bmeta\b/.test(n) || /social-facebook/.test(n))
    return "facebook";
  if (/\byoutube\b/.test(n) || /youtube-thumbnail/.test(n)) return "youtube";
  if (/\bemail\b/.test(n)) return "email";
  if (/\bblog\b/.test(n)) return "blog";
  // X / Twitter — avoid matching words like "next"
  if (/(^|[^\w])x([^\w]|$)/.test(n) || /\btwitter\b/.test(n)) return "x";
  return null;
}

export function isCompanionLikeAsset(type: string, name: string): boolean {
  if (type === "companion") return true;
  return inferChannelFromAssetName(name) !== null;
}
