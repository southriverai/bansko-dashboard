import SiteHeader from "@/components/SiteHeader";
import type { RentalProvider } from "@/data/rentals";
import { firstMentioned, hasOwnOffer, lastMentioned, readRentals } from "@/lib/rentals";

export const metadata = {
  title: "Yet Another Bansko Rental Dashboard",
};

// The list is pushed out-of-band, so don't cache the render.
export const dynamic = "force-dynamic";

function shortDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** One provider, with every message that put them on the list. */
function ProviderCard({ p }: { p: RentalProvider }) {
  const first = firstMentioned(p);
  const last = lastMentioned(p);

  return (
    <article className="rounded-xl bg-white/5 p-3">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-medium text-slate-100">{p.name}</h3>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
            hasOwnOffer(p) ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
          }`}
        >
          {hasOwnOffer(p) ? "offered" : "suggested"}
        </span>
      </header>

      {(p.what || p.where) && (
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {[p.what, p.where].filter(Boolean).join(" · ")}
        </p>
      )}

      <p className="mt-1 text-[11px] text-slate-500">
        {p.mentions.length} mention{p.mentions.length === 1 ? "" : "s"}
        {first && last && first !== last && ` · ${shortDate(first)} – ${shortDate(last)}`}
        {first && last && first === last && ` · ${shortDate(first)}`}
      </p>

      <ul className="mt-2 space-y-1 border-t border-white/5 pt-2">
        {p.mentions.map((m, i) => (
          <li key={`${m.group}-${m.at}-${i}`} className="flex items-baseline gap-2 text-[11px]">
            <span aria-hidden className="text-slate-600">
              {m.kind === "offer" ? "🏠" : "👍"}
            </span>
            <span className="min-w-0 flex-1 truncate text-slate-400">
              <span className="text-slate-300">{m.group}</span>
              <span className="text-slate-600"> · by </span>
              <span className="text-slate-300">{m.by}</span>
              {m.note && <span className="text-slate-500"> · {m.note}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">{shortDate(m.at)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Bucket({ title, providers }: { title: string; providers: RentalProvider[] }) {
  if (providers.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {title} <span className="text-slate-600">· {providers.length}</span>
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <ProviderCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

export default async function Rentals() {
  const feed = await readRentals();
  const offered = feed.providers.filter(hasOwnOffer);
  const suggested = feed.providers.filter((p) => !hasOwnOffer(p));
  const mentionCount = feed.providers.reduce((n, p) => n + p.mentions.length, 0);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <SiteHeader title="Yet Another Bansko Rental Dashboard 🏠" active="/rentals" />

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <span aria-hidden>🔑</span> Rental providers
            </h2>
            <p className="text-xs text-slate-400">
              {feed.providers.length} providers · {mentionCount} mentions
            </p>
          </div>
          {feed.generatedAt && (
            <p className="text-xs text-slate-500">
              data pushed{" "}
              {new Date(feed.generatedAt).toLocaleString("en-GB", { timeZone: "Europe/Sofia" })}
            </p>
          )}
        </header>

        {feed.providers.length > 0 && (
          <div className="space-y-5">
            <Bucket title="🏠 Offered a place themselves" providers={offered} />
            <Bucket title="👍 Suggested by someone else" providers={suggested} />
          </div>
        )}
      </section>
    </main>
  );
}
