import { cn } from "@/lib/utils";

export function GcwLogoMark({
  className,
  fill = "#09090b",
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 29 31"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M 11.018 4 C 12.635 4 14.101 4.965 14.757 6.462 L 16.532 10.516 L 20.234 10.516 C 22.388 10.516 24.34 11.8 25.216 13.792 L 28.499 21.258 C 29.703 23.998 27.724 27.086 24.762 27.086 L 4.023 27.086 L 0.43 19.732 C -0.916 16.979 1.062 13.752 4.095 13.752 L 14.823 13.752 C 15.207 13.752 15.6 13.725 15.936 13.537 C 16.55 13.194 17.37 12.364 16.532 10.516 L 7.433 10.516 C 5.816 10.516 4.35 9.551 3.694 8.053 L 3.194 6.911 C 2.594 5.542 3.584 4 5.063 4 Z M 16.386 17.118 L 4.403 17.118 C 4.156 17.118 3.991 17.375 4.091 17.603 L 5.654 21.171 C 6.31 22.668 7.776 23.634 9.393 23.634 L 21.901 23.634 L 20.125 19.58 C 19.469 18.083 18.004 17.118 16.386 17.118 Z"
        fill={fill}
      />
    </svg>
  );
}

export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={cn("size-3.5", className)}
      fill="currentColor"
      aria-hidden
    >
      <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-3.5", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8h10" />
      <path d="M9 4l4 4-4 4" />
    </svg>
  );
}

export function ArrowUpRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-3.5", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 11.5L11.5 4.5" />
      <path d="M5 4.5h6.5V11" />
    </svg>
  );
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3 8h10" />
    </svg>
  );
}

type IconProps = { className?: string };

export function BrandCoreIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
    </svg>
  );
}

export function StrategyMapIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="8" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8 7.5 15.5 9M8 8l3 8M16.5 10.5 13.5 16" />
    </svg>
  );
}

export function AiDraftingIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      <path d="M14.5 9.5 9 15l-1.5 3.5L11 17l5.5-5.5a1.8 1.8 0 0 0-2-2Z" />
    </svg>
  );
}

export function CmsPublishIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 16V4M8 8l4-4 4 4" />
      <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

export function SiteAnalyticsIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 19V5M4 19h16" />
      <path d="M8 16v-5M12 16V8M16 16v-3" />
    </svg>
  );
}
