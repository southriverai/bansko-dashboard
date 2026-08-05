// Bansko Dashboard — content model.
//
// The WhatsApp "invite" panel was removed deliberately: publishing community group
// invite links on a public page invites exactly the spam those groups already get.
// What's left is the event model below, plus the group posting stats which are
// pushed from the VPS at runtime (see src/lib/stats.ts).

/**
 * Group names arrive free-form from the stats feed, so which bucket a group belongs
 * in is decided by matching the name. Word boundaries keep short words from matching
 * inside longer ones ("run" in "brunch").
 */
export type GroupCategory = "sport" | "private" | "social";

/**
 * Venue and members' groups rather than open community ones — a coworking space, a
 * bar, a members' club. Checked before the sport patterns, so a venue that happens
 * to run yoga classes still counts as a venue.
 */
const PRIVATE_PATTERNS: RegExp[] = [
  /\bnestwork\b/,
  /\blounge\b/,
  /\balt\s?space\b/,
];

/**
 * Physical-activity groups. Dance and yoga live here too: they're what people
 * actually move their bodies at in Bansko, whatever the tidier taxonomy would say.
 * Note this is a different axis from the event `tag` union below, which still keeps
 * dance/wellness/sport apart — an event can be tagged "dance" while its group sits
 * in the sports bucket.
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
  // "Central BG PG Pilots" — the paragliding groups don't all spell it out.
  /\bpg\b/,
  /\bpilots\b/,
  // Cold plunge is the same kind of group as the dance and yoga ones: something
  // people turn up to and do with their bodies.
  /\bplunge\b/,
  /\bswim/,
  /\bcrossfit\b/,
  /\bgym\b/,
  /\bfitness\b/,
  /\bgolf\b/,
  // Dance & yoga
  /\bdanc(e|ing|ers)\b/,
  /\blindy\b/,
  /\bswing\b/,
  /\bbachat/,
  /\bsalsa\b/,
  /\bkizomba\b/,
  /\btango\b/,
  /\byoga\b/,
  /\bacroyoga\b/,
  /\bpilates\b/,
  /\bcontact improvisation\b/,
];

/** Which bucket a group belongs in. Private wins over sport; sport over the rest. */
export function groupCategory(name: string): GroupCategory {
  const n = name.toLowerCase();
  if (PRIVATE_PATTERNS.some((re) => re.test(n))) return "private";
  if (SPORT_PATTERNS.some((re) => re.test(n))) return "sport";
  return "social";
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
