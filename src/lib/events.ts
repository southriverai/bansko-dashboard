import { get } from "@vercel/blob";

import { EVENTS, type BanskoEvent, type Weekday } from "@/data/bansko";

/**
 * Events come from one of two places:
 *
 *  - a private blob the VPS pushes to (see src/app/api/events/route.ts), where an
 *    LLM extracts them from the WhatsApp message database, or
 *  - the hand-curated EVENTS array in src/data/bansko.ts, as a fallback so the
 *    page is never empty.
 *
 * Same arrangement as the group stats: the message DB is Tailscale-only and the
 * content is private, so nothing is pulled from here — it's pushed in.
 */
export type EventFeed = {
  events: BanskoEvent[];
  /** Where the events came from — surfaced in the UI so the page is honest. */
  source: "push" | "static";
  /** When the push was generated; null for the static fallback. */
  generatedAt: string | null;
};

export const EVENTS_BLOB_PATH = "events.json";

export async function readEvents(): Promise<EventFeed> {
  const fallback: EventFeed = { events: EVENTS, source: "static", generatedAt: null };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return fallback;
  try {
    const result = await get(EVENTS_BLOB_PATH, { access: "private" });
    if (!result) return fallback;
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as { generatedAt: string; events: BanskoEvent[] };
    if (!Array.isArray(parsed.events) || parsed.events.length === 0) return fallback;
    return { events: parsed.events, source: "push", generatedAt: parsed.generatedAt };
  } catch {
    return fallback;
  }
}

// --- Dates -------------------------------------------------------------------
//
// The event model carries a concrete `startsAt` only when an announcement gave
// one; most events are "Saturday · 18:00" or "Tonight". Both views need real
// dates, so the rules below turn what we do have into one. Everything is
// computed in Europe/Sofia — the dashboard is about a town, not the viewer.

export const TZ = "Europe/Sofia";

/** A calendar day, `YYYY-MM-DD`, in Sofia local time. */
export type DayKey = string;

const DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Sofia calendar day an instant falls on. */
export function sofiaDay(iso: string): DayKey {
  return DAY_FMT.format(new Date(iso));
}

export function today(): DayKey {
  return DAY_FMT.format(new Date());
}

export function weekdayOf(day: DayKey): Weekday {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}

function addDays(day: DayKey, n: number): DayKey {
  const [y, m, d] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + n));
  return next.toISOString().slice(0, 10);
}

/** Newest announcement first is the documented order, but don't trust it. */
export function announcedOn(e: BanskoEvent): DayKey | null {
  const days = e.announcements.map((a) => sofiaDay(a.at)).sort();
  return days.at(-1) ?? null;
}

/** "Today"/"Tonight" is relative to the message that said it. */
const RELATIVE_TODAY = /\b(today|tonight)\b/i;

/**
 * The single day an event happens, where that's knowable:
 *
 *  1. `startsAt` — an announcement gave a concrete time.
 *  2. a named weekday on a one-off — the first such day on or after the
 *     announcement ("Saturday · 18:00", posted Thursday → that Saturday).
 *  3. "Today"/"Tonight" — the day the announcement was posted.
 *
 * Recurring events have no single day; they're placed per weekday by
 * `occursOn()` instead. Returns null when we genuinely don't know.
 */
export function eventDay(e: BanskoEvent): DayKey | null {
  if (e.startsAt) return sofiaDay(e.startsAt);

  const announced = announcedOn(e);
  if (!announced) return null;

  if (!e.recurring && e.weekdays?.length) {
    for (let i = 0; i < 7; i++) {
      const candidate = addDays(announced, i);
      if (e.weekdays.includes(weekdayOf(candidate))) return candidate;
    }
  }

  if (RELATIVE_TODAY.test(e.when)) return announced;

  return null;
}

/** Does this event land on `day`? Recurring events repeat on their weekdays. */
export function occursOn(e: BanskoEvent, day: DayKey): boolean {
  if (eventDay(e) === day) return true;
  return Boolean(e.recurring && e.weekdays?.includes(weekdayOf(day)));
}

/** True when the event can be shown on the calendar at all. */
export function isPlaceable(e: BanskoEvent): boolean {
  return eventDay(e) !== null || Boolean(e.recurring && e.weekdays?.length);
}

/** Dated events oldest-first; the rest by most recent announcement. */
export function splitByDate(events: BanskoEvent[]) {
  const dated = events
    .filter((e) => eventDay(e) !== null)
    .sort((a, b) => (eventDay(a)! < eventDay(b)! ? -1 : 1));
  const undated = events
    .filter((e) => eventDay(e) === null)
    .sort((a, b) => (announcedOn(b) ?? "").localeCompare(announcedOn(a) ?? ""));
  return { dated, undated };
}

// --- Month grid --------------------------------------------------------------

export type Month = { year: number; month: number }; // month is 1-12

export function parseMonth(value: string | undefined): Month {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (match) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year: Number(match[1]), month };
  }
  const [y, m] = today().split("-").map(Number);
  return { year: y, month: m };
}

export function monthKey({ year, month }: Month): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth({ year, month }: Month, by: number): Month {
  const zeroBased = year * 12 + (month - 1) + by;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

export function monthLabel({ year, month }: Month): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/**
 * The days to render, Monday-first, padded with the leading/trailing blanks that
 * make a rectangular grid.
 */
export function monthGrid({ year, month }: Month): (DayKey | null)[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const lead = (firstWeekday + 6) % 7; // shift Sunday-first to Monday-first

  const cells: (DayKey | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function dayNumber(day: DayKey): number {
  return Number(day.slice(8, 10));
}

export function formatDay(day: DayKey): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayLabel(days: Weekday[]): string {
  return days.map((d) => WEEKDAY_NAMES[d]).join(" & ");
}
