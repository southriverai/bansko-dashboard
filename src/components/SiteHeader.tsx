import Link from "next/link";

import Clock from "@/components/Clock";

/** Top-level tabs. Two pages so far: the dashboard and the rental list. */
const TABS = [
  { href: "/", label: "Dashboard" },
  { href: "/rentals", label: "Rentals" },
];

const MAINTAINER = "Sofie Georgieva";

/**
 * Where suggestions go. Set NEXT_PUBLIC_FEEDBACK_WHATSAPP to either a phone number
 * (any formatting — the digits are extracted) or a full wa.me / chat.whatsapp.com
 * URL. It lives in the environment rather than the repo because this is a public
 * page and a personal number in git history is forever.
 *
 * Unset means the note still names the maintainer, just without a link — better than
 * shipping a dead href.
 */
function feedbackHref(): string | null {
  const raw = process.env.NEXT_PUBLIC_FEEDBACK_WHATSAPP?.trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

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

  const feedback = feedbackHref();

  return (
    <header className="mb-8">
      <p className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-slate-300">
        <span aria-hidden className="mr-1.5">
          👋
        </span>
        This dashboard is managed by <span className="font-medium text-white">{MAINTAINER}</span>.
        {feedback ? (
          <>
            {" "}
            Suggestions or comments?{" "}
            <a
              href={feedback}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-400 underline decoration-emerald-400/40 underline-offset-2 hover:decoration-emerald-400"
            >
              Message her on WhatsApp
            </a>
            .
          </>
        ) : (
          " Suggestions or comments are welcome — message her on WhatsApp."
        )}
      </p>

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
