import Clock from "@/components/Clock";
import { EVENTS, GROUPS, type EventItem, type LinkItem } from "@/data/bansko";
import { readGroupStats } from "@/lib/stats";

function LinkRow({ item }: { item: LinkItem }) {
  const inner = (
    <div className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-100">{item.name}</p>
        {item.note && <p className="truncate text-xs text-slate-400">{item.note}</p>}
      </div>
      {item.href ? (
        <span className="shrink-0 text-xs font-medium text-emerald-400">Open ↗</span>
      ) : (
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-600">
          link&nbsp;tbd
        </span>
      )}
    </div>
  );
  return item.href ? (
    <a href={item.href} target="_blank" rel="noreferrer" className="block">
      {inner}
    </a>
  ) : (
    inner
  );
}

function EventRow({ e }: { e: EventItem }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-100">{e.title}</p>
        {e.where && <p className="truncate text-xs text-slate-400">{e.where}</p>}
      </div>
      <span className="shrink-0 text-xs text-slate-300">{e.when}</span>
    </div>
  );
}

function Card({
  emoji,
  title,
  blurb,
  children,
}: {
  emoji: string;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur">
      <header className="mb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <span aria-hidden>{emoji}</span> {title}
        </h2>
        <p className="text-xs text-slate-400">{blurb}</p>
      </header>
      <div className="-mx-3 flex flex-col">{children}</div>
    </section>
  );
}

// Stats arrive out-of-band (VPS push), so don't cache the render.
export const dynamic = "force-dynamic";

export default async function Home() {
  const stats = await readGroupStats();
  // Render/build-time stamp — reflects when the dashboard content was last generated.
  const updatedAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Bansko Dashboard <span aria-hidden>🏔️</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Your nomad community hub — events & community groups.
          </p>
        </div>
        <div className="text-sm text-right">
          <Clock />
          <p className="mt-1 text-xs text-slate-500">Last updated {updatedAt}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card emoji="📅" title="Events" blurb="Meetups & what's on this week.">
          {EVENTS.map((e) => (
            <EventRow key={e.title} e={e} />
          ))}
        </Card>

        <Card emoji="💬" title="WhatsApp" blurb="Community groups worth being in.">
          {GROUPS.map((g) => (
            <LinkRow key={g.name} item={g} />
          ))}
        </Card>
      </div>

      <section className="mt-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <span aria-hidden>🏆</span> Most active posters
            </h2>
            <p className="text-xs text-slate-400">
              Top 3 per group
              {stats ? ` · last ${stats.windowDays} days` : ""}
            </p>
          </div>
          {stats && (
            <p className="text-xs text-slate-500">
              data pushed {new Date(stats.generatedAt).toLocaleString("en-GB", { timeZone: "Europe/Sofia" })}
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

      <footer className="mt-10 text-center text-xs text-slate-600">
        Bansko Dashboard · content in{" "}
        <code className="text-slate-500">src/data/bansko.ts</code> · stats pushed from the VPS
      </footer>
    </main>
  );
}
