// Bansko Dashboard — content model.
//
// The WhatsApp "invite" panel was removed deliberately: publishing community group
// invite links on a public page invites exactly the spam those groups already get.
// What's left is the event model below, plus the group posting stats which are
// pushed from the VPS at runtime (see src/lib/stats.ts).

/**
 * Group names arrive free-form from the stats feed, so "is this a sports group?"
 * is decided by matching the name. Word boundaries keep short words from matching
 * inside longer ones ("run" in "brunch"). Yoga/dance/plunge groups stay on the
 * non-sport side — they're wellness and movement, matching the event tags below.
 */
const SPORT_PATTERNS: RegExp[] = [
  /\bpadel\b/,
  /\bvolleyball\b/,
  /\btennis\b/,
  /\b(foot|basket|hand)ball\b/,
  /\brun(ning|ners)?\b/,
  /\bcycl/,
  /\bbike\b/,
  /\bmtb\b/,
  /\bclimb/,
  /\bboulder/,
  /\bski(ing|ers)?\b/,
  /\bsnowboard/,
  /\bhik(e|es|ing)\b/,
  /\btrek/,
  /\bparaglid/,
  /\bswim/,
  /\bcrossfit\b/,
  /\bgym\b/,
  /\bfitness\b/,
  /\bgolf\b/,
];

/** True for groups organised around a physical sport (incl. hiking & paragliding). */
export function isSportGroup(name: string): boolean {
  const n = name.toLowerCase();
  return SPORT_PATTERNS.some((re) => re.test(n));
}

/** Where an event was advertised. This is the provenance of an event: every
 *  announcement records the group, who posted it, and when. */
export type EventAnnouncement = {
  /** WhatsApp group the announcement appeared in. */
  group: string;
  /** Display name of the person who posted it. */
  by: string;
  /** ISO-8601 timestamp of the announcement message. */
  at: string;
};

export type EventTag =
  | "dance"
  | "outdoors"
  | "sport"
  | "social"
  | "wellness"
  | "music"
  | "work";

/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A community event, with the announcements that advertised it. */
export type BanskoEvent = {
  /** Stable slug, used as a React key and for future dedupe/merging. */
  id: string;
  title: string;
  /** Human-readable schedule, e.g. "Thu 19:00" or "Most mornings". */
  when: string;
  /** ISO start time when a concrete one is known; null for recurring/vague. */
  startsAt?: string | null;
  where?: string;
  tag?: EventTag;
  /** True for standing/weekly things rather than one-offs. */
  recurring?: boolean;
  /**
   * Days of the week the event lands on, when the announcement named one
   * ("Thu & Sat", "Saturday · 18:00"). This is what makes an event placeable on
   * the calendar without a concrete `startsAt` — see src/lib/events.ts for how a
   * weekday is turned into an actual date. Omit when the announcement only says
   * "Weekly" or gives a time.
   */
  weekdays?: Weekday[];
  /** Provenance — which groups advertised it, by whom, when. Newest first. */
  announcements: EventAnnouncement[];
};

/**
 * Seeded from real announcements in the Bansko WhatsApp groups (group, poster and
 * timestamp are taken verbatim from the messages). Longer term this should be
 * generated and pushed from the VPS like the posting stats, rather than curated by
 * hand — the shape below is what such a feed should emit.
 */
export const EVENTS: BanskoEvent[] = [
  {
    id: "jazz-festival",
    title: "Bansko Jazz Festival",
    when: "From 30 Jul · several days",
    startsAt: "2026-07-30T20:00:00+03:00",
    where: "Town centre · jam sessions at midnight in Ginger",
    tag: "music",
    announcements: [
      { group: "Lindy Hop Bansko 💃🕺", by: "Tanjuscha", at: "2026-07-30T21:01:00+03:00" },
      { group: "Bansko Social 2026", by: "Tanjuscha", at: "2026-07-30T09:33:00+03:00" },
      { group: "Bansko Social 2026", by: "Bart U", at: "2026-07-29T23:24:00+03:00" },
    ],
  },
  {
    id: "lindy-hop-beginner",
    title: "Lindy Hop beginner class",
    when: "Weekly · 19:00",
    where: "Hanumam Yoga Studio",
    tag: "dance",
    recurring: true,
    announcements: [
      { group: "Lindy Hop Bansko 💃🕺", by: "Tanjuscha", at: "2026-07-30T16:18:00+03:00" },
      { group: "Good Morning Bansko Chat", by: "Tanjuscha", at: "2026-07-30T15:23:00+03:00" },
      { group: "Bansko Social 2026", by: "Tanjuscha", at: "2026-07-30T10:02:00+03:00" },
      { group: "Nestwork Community", by: "bossk", at: "2026-07-29T15:33:00+03:00" },
    ],
  },
  {
    id: "lindy-free-taster",
    title: "Free Lindy Hop taster",
    when: "Saturday · 18:00",
    where: "Hanumam Yoga Studio",
    tag: "dance",
    weekdays: [6],
    announcements: [
      { group: "Bansko Social 2026", by: "Tanjuscha", at: "2026-07-30T10:02:00+03:00" },
    ],
  },
  {
    id: "lounge-hike",
    title: "Group hike (11 people)",
    when: "08:00 · breakfast first",
    where: "Meet at The Lounge",
    tag: "outdoors",
    announcements: [
      { group: "The Lounge Bansko", by: "Maria Stoyanova", at: "2026-07-31T09:09:00+03:00" },
    ],
  },
  {
    id: "melnik-trek",
    title: "Melnik 3-day trek",
    when: "From Sunday · ~08:00",
    where: "Via Tevno Ezero",
    tag: "outdoors",
    weekdays: [0],
    announcements: [
      { group: "Bansko Hikes and Hiking", by: "Shachar Chasman", at: "2026-07-30T08:58:00+03:00" },
      { group: "Good Morning Bansko Chat", by: "Cla", at: "2026-07-29T15:06:00+03:00" },
    ],
  },
  {
    id: "coffee-and-chat",
    title: "Coffee & chat",
    when: "10:00 · bring something to share",
    where: "The Lounge",
    tag: "social",
    recurring: true,
    announcements: [
      { group: "The Lounge Bansko", by: "Tyla Train", at: "2026-07-30T21:03:00+03:00" },
    ],
  },
  {
    id: "volleyball",
    title: "Volleyball",
    when: "Thu & Sat",
    tag: "sport",
    recurring: true,
    weekdays: [4, 6],
    announcements: [
      { group: "Bansko Volleyball 🏐", by: "Oscar Gueye", at: "2026-07-30T17:14:00+03:00" },
    ],
  },
  {
    id: "padel",
    title: "Padel",
    when: "20:30",
    where: "Grand Hotel Bansko courts",
    tag: "sport",
    announcements: [
      { group: "Padel Bansko 🎾", by: "Jaap Oosterbroek", at: "2026-07-30T11:44:00+03:00" },
    ],
  },
  {
    id: "marketing-meetup",
    title: "Marketing meetup (+ dinner after)",
    when: "Today",
    tag: "work",
    announcements: [
      { group: "Events/announcements — Together Bansko", by: "Rozi", at: "2026-07-30T13:21:00+03:00" },
      { group: "Good Morning Bansko Chat", by: "Rozi", at: "2026-07-30T10:57:00+03:00" },
    ],
  },
  {
    id: "rila-monastery",
    title: "Rila Monastery day trip",
    when: "10:00 · seats in the car",
    tag: "outdoors",
    announcements: [
      { group: "The Lounge Bansko", by: "Julian", at: "2026-07-29T21:20:00+03:00" },
    ],
  },
  {
    id: "acroyoga",
    title: "AcroYoga jam & class",
    when: "Weekly",
    tag: "wellness",
    recurring: true,
    announcements: [
      { group: "AcroYoga Bansko", by: "Jorin", at: "2026-07-29T20:58:00+03:00" },
    ],
  },
  {
    id: "fusionx-party",
    title: "Dance party — free entrance",
    when: "Tonight",
    tag: "dance",
    announcements: [
      { group: "Good Morning Bansko Chat", by: "Leroy", at: "2026-07-31T08:19:00+03:00" },
    ],
  },
];

// --- Reference lists (not currently rendered; kept for future panels) ---------
export type LinkItem = { name: string; href?: string; note?: string };

export const TRANSPORT: LinkItem[] = [
  { name: "Bansko Ride-sharing (shared sheet)", note: "Coordinate lifts & costs" },
  { name: "Airport transfers — Sofia (SOF)", note: "~2.5–3 h · bus or shared car" },
  { name: "Airport transfers — Plovdiv (PDV)", note: "~2.5 h" },
  { name: "Bus: Bansko ⇄ Sofia / Plovdiv", note: "Daily; check the bus station" },
];

export const WORK: LinkItem[] = [
  { name: "Nestwork Coworking", note: "Day passes & memberships", href: "https://nestwork.bg" },
  { name: "Coliving Bansko", note: "Coworking + community events" },
];

export const FLY: LinkItem[] = [
  { name: "Bansko / Predela launch", note: "Classic local site" },
  { name: "Dobrinishte", note: "Nearby alternative" },
];
