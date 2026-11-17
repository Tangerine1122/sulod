"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { BarsIcon, BriefcaseIcon, HomeIcon, ListIcon, TargetIcon } from "./icons";

const tabs = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/activity", label: "Activity", Icon: ListIcon },
  { href: "/gigs", label: "Gigs", Icon: BriefcaseIcon },
  { href: "/insights", label: "Insights", Icon: BarsIcon },
  { href: "/goals", label: "Goals", Icon: TargetIcon },
] as const;

/** The nav paints immediately; the active tab is filled in once the path is known. */
export function BottomNav() {
  return (
    <Suspense fallback={<NavBar pathname={null} />}>
      <ActiveNavBar />
    </Suspense>
  );
}

function ActiveNavBar() {
  return <NavBar pathname={usePathname()} />;
}

function NavBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-10 grid grid-cols-5 border-t-2 border-ink bg-slip px-1 pt-1.5 pb-[max(14px,env(safe-area-inset-bottom))]"
    >
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-xs ${
              active ? "font-bold text-ink" : "font-medium text-muted"
            }`}
          >
            <Icon className={active ? "fill-mango" : undefined} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
