import Link from "next/link";

import Clock from "@/components/Clock";

/** Top-level tabs. Two pages so far: the dashboard and the rental list. */
const TABS = [
  { href: "/", label: "Dashboard" },
  { href: "/rentals", label: "Rentals" },
];

export default function SiteHeader({
  title,
  blurb,
  active,
}: {
  title: string;
  blurb: string;
  /** Which tab's href is the current page. */
  active: string;
}) {
  const updatedAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <header className="mb-8">
      <nav className="mb-5 flex gap-1 text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.href === active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 ${
              tab.href === active
                ? "bg-white/10 font-medium text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{blurb}</p>
        </div>
        <div className="text-right text-sm">
          <Clock />
          <p className="mt-1 text-xs text-slate-500">Last updated {updatedAt}</p>
        </div>
      </div>
    </header>
  );
}
