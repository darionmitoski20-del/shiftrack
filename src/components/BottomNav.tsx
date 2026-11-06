"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: React.ReactNode };

const svg = (d: React.ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const ICONS = {
  today: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  hours: svg(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  approvals: svg(<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>),
  projects: svg(<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />),
  chat: svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
  team: svg(<><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-5.5" /></>),
};

export function BottomNav({ manager }: { manager: boolean }) {
  const path = usePathname();
  const items: Item[] = manager
    ? [
        { href: "/approvals", label: "Approvals", icon: ICONS.approvals },
        { href: "/projects", label: "Projects", icon: ICONS.projects },
        { href: "/chat", label: "Chat", icon: ICONS.chat },
        { href: "/team", label: "Team", icon: ICONS.team },
      ]
    : [
        { href: "/today", label: "Today", icon: ICONS.today },
        { href: "/hours", label: "My hours", icon: ICONS.hours },
        { href: "/chat", label: "Chat", icon: ICONS.chat },
      ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 border-t border-line bg-white pb-[max(env(safe-area-inset-bottom),12px)] pt-2"
      style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((it) => {
        const active = path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center gap-1 py-1.5 text-xs ${active ? "font-bold text-accent" : "font-semibold text-muted"}`}
          >
            {it.icon}
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
