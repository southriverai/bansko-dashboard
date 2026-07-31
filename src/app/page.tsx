import Clock from "@/components/Clock";
import { EVENTS, type BanskoEvent } from "@/data/bansko";
import { readGroupStats } from "@/lib/stats";

const TAG_STYLES: Record<string, string> = {
  dance: "bg-fuchsia-500/15 text-fuchsia-300",
  outdoors: "bg-emerald-500/15 text-emerald-300",
  sport: "bg-sky-500/15 text-sky-300",
  social: "bg-amber-500/15 text-amber-300",
  wellness: "bg-teal-500/15 text-teal-300",
  music: "bg-violet-500/15 text-violet-300",
  work: "bg-slate-400/15 text-slate-300",
};

function shortDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** An event plus its provenance: which groups advertised it, by whom, when. */
function EventCard({ e }: { e: BanskoEvent }) {
  return (
    <article className="rounded-xl bg-white/5 p-3">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-medium text-slate-100">
          {e.title}
          {e.recurring && (
            <span className="ml-2 align-middle text-[10px] uppercase tracking-wide text-slate-500">
              recurring
            </span>
          )}
        </h3>
        <span className="shrink-0 text-xs text-slate-300">{e.when}</span>
      </header>

      <div className="mt-0.5 flex items-center gap-2">
        {e.where && <p className="min-w-0 truncate text-xs text-slate-400">{e.where}</p>}
        {e.tag && (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
              TAG_STYLES[e.tag] ?? "bg-slate-400/15 text-slate-300"
            }`}
          >
            {e.tag}
          </span>
        )}
      </div>

      <ul className="mt-2 space-y-1 border-t border-white/5 pt-2">
        {e.announcements.map((a, i) => (
          <li key={`${a.group}-${a.at}-${i}`} className="flex items-baseline gap-2 text-[11px]">
            <span aria-hidden className="text-slate-600">
              📣
            </span>
            <span className="min-w-0 flex-1 truncate text-slate-400">
              <span className="text-slate-300">{a.group}</span>
              <span className="text-slate-600"> · by </span>
              <span className="text-slate-300">{a.by}</span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">{shortDate(a.at)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

// Stats arrive out-of-band (VPS push), so don't cache the render.
export const dynamic = "force-dynamic";

export default async function Home() {
  const stats = await readGroupStats();
  const updatedAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const announcementCount = EVENTS.reduce((n, e) => n + e.announcements.length, 0);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Bansko Dashboard <span aria-hidden>🏔️</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            What the Bansko community groups are talking about.
          </p>
        </div>
        <div className="text-right text-sm">
          <Clock />
          <p className="mt-1 text-xs text-slate-500">Last updated {updatedAt}</p>
        </div>
      </header>

      {/* Group posting stats — pushed from the VPS */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <span aria-hidden>🏆</span> Most active posters
            </h2>
            <p className="text-xs text-slate-400">
              Top 3 per group{stats ? ` · last ${stats.windowDays} days` : ""}
            </p>
          </div>
          {stats && (
            <p className="text-xs text-slate-500">
              data pushed{" "}
              {new Date(stats.generatedAt).toLocaleString("en-GB", { timeZone: "Europe/Sofia" })}
            </p>
          )}
        </header>

        {!stats ? (
          <p className="px-1 py-2 text-sm text-slate-400">
            No stats pushed yet — the VPS posts them to{" "}
            <code className="text-slate-500">/api/group-stats</code>.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.groups.map((g) => (
              <div key={g.group} className="rounded-lg bg-white/5 px-3 py-2">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-100">{g.group}</p>
                  <span className="shrink-0 text-[11px] text-slate-500">{g.total} msgs</span>
                </div>
                <ol className="space-y-0.5">
                  {g.top.map((t, i) => (
                    <li key={t.name} className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate text-slate-300">
                        <span className="mr-1 text-slate-500">{["🥇", "🥈", "🥉"][i] ?? "•"}</span>
                        {t.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-emerald-400">{t.count}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Events, below the stats — each with where/when/by whom it was advertised */}
      <section className="mt-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur">
        <header className="mb-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <span aria-hidden>📅</span> Events
          </h2>
          <p className="text-xs text-slate-400">
            {EVENTS.length} events · {announcementCount} announcements across the groups
          </p>
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {EVENTS.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>
      </section>

      <footer className="mt-10 text-center text-xs text-slate-600">
        Bansko Dashboard · events in <code className="text-slate-500">src/data/bansko.ts</code> ·
        stats pushed hourly from the VPS
      </footer>
    </main>
  );
}
