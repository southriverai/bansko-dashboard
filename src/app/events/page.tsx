import Link from "next/link";

import SiteHeader from "@/components/SiteHeader";
import type { BanskoEvent } from "@/data/bansko";
import {
  dayNumber,
  eventDay,
  formatDay,
  monthGrid,
  monthKey,
  monthLabel,
  occursOn,
  parseMonth,
  readEvents,
  shiftMonth,
  splitByDate,
  splitUpcoming,
  today,
  weekdayLabel,
  type DayKey,
  type Month,
} from "@/lib/events";

export const metadata = { title: "Bansko Events" };

// Events arrive out-of-band (VPS push), so don't cache the render.
export const dynamic = "force-dynamic";

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
              {e.weekdays?.length ? weekdayLabel(e.weekdays) : "recurring"}
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

function ViewTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded px-2 py-1 ${
        active ? "bg-white/10 text-slate-100" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}

/** The chronological view: dated events oldest-first, then the ones with no date. */
function ListView({ events }: { events: BanskoEvent[] }) {
  const { dated, undated } = splitByDate(events);
  const now = today();

  if (events.length === 0) {
    return (
      <p className="px-1 py-2 text-sm text-slate-400">
        Nothing upcoming. Everything in the feed has already happened — the events
        panel needs a fresh push.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {dated.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Dated <span className="text-slate-600">· {dated.length}</span>
          </h3>
          <div className="space-y-3">
            {dated.map((e) => {
              const day = eventDay(e);
              return (
                <div key={e.id} className="flex gap-3">
                  <div
                    className={`w-24 shrink-0 pt-3 text-xs tabular-nums ${
                      day && day < now ? "text-slate-600" : "text-slate-300"
                    }`}
                  >
                    {day ? formatDay(day) : ""}
                  </div>
                  <div className="min-w-0 flex-1">
                    <EventCard e={e} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {undated.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            No date given <span className="text-slate-600">· {undated.length}</span>
          </h3>
          <p className="mb-2 text-xs text-slate-500">
            The announcement gave a time but not a day — ask in the group.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {undated.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** A month grid. Events with no placeable date are listed underneath it. */
function CalendarView({ events, month }: { events: BanskoEvent[]; month: Month }) {
  const cells = monthGrid(month);
  const now = today();
  const placed = new Set<string>();

  const byDay = new Map<DayKey, BanskoEvent[]>();
  for (const day of cells) {
    if (!day) continue;
    // Past days stay blank — a recurring event's earlier occurrences are history.
    const onDay = day < now ? [] : events.filter((e) => occursOn(e, day));
    onDay.forEach((e) => placed.add(e.id));
    if (onDay.length > 0) byDay.set(day, onDay);
  }
  const unplaced = events.filter((e) => !placed.has(e.id));

  return (
    <div className="space-y-4">
      <nav className="flex items-center justify-between gap-2 text-sm">
        <Link
          href={`/events?view=calendar&month=${monthKey(shiftMonth(month, -1))}`}
          className="rounded px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
        >
          ← {monthLabel(shiftMonth(month, -1))}
        </Link>
        <span className="font-medium text-slate-100">{monthLabel(month)}</span>
        <Link
          href={`/events?view=calendar&month=${monthKey(shiftMonth(month, 1))}`}
          className="rounded px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
        >
          {monthLabel(shiftMonth(month, 1))} →
        </Link>
      </nav>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-white/10 text-[11px]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-slate-900 px-2 py-1 text-center text-slate-500">
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={day ?? `blank-${i}`}
            className={`min-h-20 bg-slate-900/80 p-1 ${day === now ? "ring-1 ring-inset ring-emerald-500/40" : ""}`}
          >
            {day && (
              <>
                <div
                  className={`mb-1 text-right tabular-nums ${
                    day === now ? "text-emerald-400" : "text-slate-600"
                  }`}
                >
                  {dayNumber(day)}
                </div>
                <ul className="space-y-0.5">
                  {(byDay.get(day) ?? []).map((e) => (
                    <li
                      key={e.id}
                      title={`${e.title}${e.where ? ` · ${e.where}` : ""} · ${e.when}`}
                      className={`truncate rounded px-1 py-0.5 ${
                        TAG_STYLES[e.tag ?? ""] ?? "bg-slate-400/15 text-slate-300"
                      }`}
                    >
                      {e.title}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>

      {unplaced.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Not on the calendar <span className="text-slate-600">· {unplaced.length}</span>
          </h3>
          <p className="mb-2 text-xs text-slate-500">
            No occurrence left in {monthLabel(month)}, or the announcement never named a day.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {unplaced.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function Events({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string }>;
}) {
  const { view: rawView, month: rawMonth } = await searchParams;
  const view = rawView === "calendar" ? "calendar" : "list";
  const month = parseMonth(rawMonth);

  const feed = await readEvents();
  // Only what's still ahead of us. The count of what got dropped is shown, so an
  // empty page reads as "the feed is stale" rather than "the page is broken".
  const { upcoming: events, past } = splitUpcoming(feed.events);
  const announcementCount = events.reduce((n, e) => n + e.announcements.length, 0);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <SiteHeader title="Bansko Events 📅" active="/events" />

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <span aria-hidden>🗓️</span> What’s on
            </h2>
            <p className="text-xs text-slate-400">
              {events.length} upcoming · {announcementCount} announcements
              {past.length > 0 && ` · ${past.length} past hidden`}
            </p>
          </div>
          {/* Plain links, not a client toggle: the page is server-rendered anyway. */}
          <div className="flex gap-1 text-xs">
            <ViewTab href="/events?view=list" label="List" active={view === "list"} />
            <ViewTab
              href={`/events?view=calendar&month=${monthKey(month)}`}
              label="Calendar"
              active={view === "calendar"}
            />
          </div>
        </header>

        {view === "calendar" ? (
          <CalendarView events={events} month={month} />
        ) : (
          <ListView events={events} />
        )}
      </section>
    </main>
  );
}
