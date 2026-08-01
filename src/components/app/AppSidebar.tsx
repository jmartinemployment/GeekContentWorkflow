"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GcwLogoMark } from "@/components/icons";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/app/brand-core", label: "Brand Core" },
  { href: "/app/strategy-map", label: "Strategy Map" },
  { href: "/app/research", label: "Research" },
  { href: "/app/reconciliation", label: "Reconciliation" },
  { href: "/app/pain-points", label: "Pain Points" },
  { href: "/app/strategy-briefs", label: "Strategy Briefs" },
  { href: "/app/assets", label: "Assets" },
  { href: "/app/repurpose", label: "Repurpose" },
  { href: "/app/video-seo", label: "Video SEO" },
  { href: "/app/media", label: "Media" },
  { href: "/app/reviews", label: "Reviews" },
  { href: "/app/publications", label: "Publications" },
  { href: "/app/calendar", label: "Queue" },
  { href: "/app/drafting", label: "AI Drafting" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/insights", label: "Insights" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-gcw-line bg-[#f4f4f5] px-3 py-5">
      <Link href="/app" className="mb-8 flex items-center gap-2 px-2 text-gcw-ink">
        <GcwLogoMark className="h-7 w-6" />
        <span className="font-heading text-lg font-semibold">Geek Content Workflow</span>
      </Link>

      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gcw-zinc">
        Content Engine
      </p>
      <nav className="flex flex-col gap-0.5">
        {nav.map((item) => {
          const isActive =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                isActive
                  ? "bg-gcw-ink text-white"
                  : "text-gcw-muted hover:bg-white hover:text-gcw-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 px-2 pt-8">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-gcw-muted hover:bg-white hover:text-gcw-ink"
          >
            Sign out
          </button>
        </form>
        <Link href="/" className="block text-[12px] text-gcw-zinc hover:text-gcw-ink">
          ← Marketing site
        </Link>
      </div>
    </aside>
  );
}
