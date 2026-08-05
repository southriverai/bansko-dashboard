import { cacheLife, cacheTag } from "next/cache";
import postgres from "postgres";

import { groupCategory, type BanskoEvent, type EventTag, type GroupCategory, type Weekday } from "@/data/bansko";

/** Cache tag /api/messages revalidates, so a push updates the freshness stamp. */
export const MESSAGES_TAG = "messages";

/**
 * Postgres access. Provider-agnostic — any DATABASE_URL will do (Neon, Supabase,
 * a box you own); the schema is in db/migrations.
 *
 * Everything here is optional at runtime: with no DATABASE_URL set, hasDatabase()
 * is false and the callers fall back to the pushed blob and then to the static
 * seed, exactly as before. That keeps the site up while the database is being
 * provisioned, and means there is never a half-configured state that 500s.
 */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

let client: postgres.Sql | null = null;

export function db(): postgres.Sql {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — guard calls with hasDatabase()");
  }
  // One lazily-created client per server instance. `prepare: false` keeps it
  // working through a connection pooler (Neon/Supabase pgBouncer), which rejects
  // prepared statements.
  client ??= postgres(process.env.DATABASE_URL, { prepare: false, max: 3 });
  return client;
}

// --- Row types — one per table, mirroring db/migrations/0001_init.sql ---------

export type ChannelRow = {
  id: number;
  /** WhatsApp chat id, "…@g.us". The natural key pushes match on. */
  jid: string;
  name: string;
  category: GroupCategory;
  /** False for groups kept off the dashboard whose messages we still store. */
  is_listed: boolean;
  first_seen_at: Date;
  last_seen_at: Date | null;
};

export type MessageRow = {
  id: number;
  channel_id: number;
  /** WhatsApp message id; unique per channel, so re-pushes are idempotent. */
  wa_id: string;
  sender_name: string;
  /** Null when the sender only ever appeared as an @lid privacy id. */
  sender_jid: string | null;
  sent_at: Date;
  /** Null when the push carried metadata only. */
  body: string | null;
  created_at: Date;
};

export type EventRow = {
  id: number;
  /** Stable slug from the extractor; a re-run updates rather than duplicates. */
  slug: string;
  title: string;
  when_text: string;
  starts_at: Date | null;
  where_text: string | null;
  tag: EventTag | null;
  recurring: boolean;
  weekdays: Weekday[];
  created_at: Date;
  updated_at: Date;
};

/** Join row: an event was announced by a message. Provenance as a reference. */
export type EventAnnouncementRow = {
  event_id: number;
  message_id: number;
};

// --- Writes ------------------------------------------------------------------

export type ChannelInput = { jid: string; name: string };

/**
 * Upsert channels by jid, returning their ids keyed by jid.
 *
 * `category` and `is_listed` are presentation decisions and belong to this backend,
 * not to whatever is pushing messages: the pusher reports which channels it saw, the
 * dashboard decides which bucket they go in and whether they're shown at all. So a
 * new channel gets its category derived from its name (groupCategory), and on
 * conflict only `name` and `last_seen_at` are touched — a category or is_listed set
 * by hand in the database is never overwritten by a later push.
 */
export async function upsertChannels(channels: ChannelInput[]): Promise<Map<string, number>> {
  if (channels.length === 0) return new Map();
  const sql = db();
  const rows = channels.map((c) => ({
    jid: c.jid,
    name: c.name,
    category: groupCategory(c.name),
    is_listed: true,
  }));

  const saved = await sql<{ id: number; jid: string }[]>`
    INSERT INTO channels ${sql(rows)}
    ON CONFLICT (jid) DO UPDATE
      SET name = EXCLUDED.name, last_seen_at = now()
    RETURNING id, jid
  `;
  return new Map(saved.map((r) => [r.jid, r.id]));
}

export type MessageInput = {
  channelJid: string;
  waId: string;
  senderName: string;
  senderJid?: string | null;
  sentAt: string;
  body?: string | null;
};

/**
 * Insert messages, ignoring ones already stored. Returns how many were new, which
 * is what the push endpoint reports back so a run can be seen to have done work.
 */
export async function insertMessages(
  messages: MessageInput[],
  channelIds: Map<string, number>,
): Promise<number> {
  const rows = messages
    .filter((m) => channelIds.has(m.channelJid))
    .map((m) => ({
      channel_id: channelIds.get(m.channelJid)!,
      wa_id: m.waId,
      sender_name: m.senderName,
      sender_jid: m.senderJid ?? null,
      sent_at: m.sentAt,
      body: m.body ?? null,
    }));
  if (rows.length === 0) return 0;

  const sql = db();
  const inserted = await sql<{ id: number }[]>`
    INSERT INTO messages ${sql(rows)}
    ON CONFLICT (channel_id, wa_id) DO NOTHING
    RETURNING id
  `;
  return inserted.length;
}

// --- Reads -------------------------------------------------------------------

/**
 * Events with their announcements, shaped as the UI's BanskoEvent so the views
 * don't care whether the data came from the database, a blob, or the static seed.
 *
 * The announcement fields come from the joined message and channel rows — so what
 * the page shows as provenance is the stored message, not a claim about one.
 *
 * Unlisted channels are excluded, and the joins are inner joins on purpose: naming
 * a private group as the source of an announcement would publish the group's
 * existence and a member's name on a public page. So an event announced only in
 * unlisted channels doesn't appear at all, and one announced in both shows only the
 * listed announcements. An event with no surviving provenance is dropped rather than
 * shown bare — provenance is the point of the model.
 */
export async function readEventsFromDb(): Promise<BanskoEvent[]> {
  const sql = db();
  const rows = await sql<
    {
      slug: string;
      title: string;
      when_text: string;
      starts_at: Date | null;
      where_text: string | null;
      tag: EventTag | null;
      recurring: boolean;
      weekdays: Weekday[];
      announcements: { group: string; by: string; at: string }[] | null;
    }[]
  >`
    SELECT e.slug, e.title, e.when_text, e.starts_at, e.where_text, e.tag,
           e.recurring, e.weekdays,
           json_agg(
             json_build_object('group', c.name, 'by', m.sender_name, 'at', m.sent_at)
             ORDER BY m.sent_at DESC
           ) AS announcements
      FROM events e
      JOIN event_announcements ea ON ea.event_id = e.id
      JOIN messages m            ON m.id = ea.message_id
      JOIN channels c            ON c.id = m.channel_id AND c.is_listed
     GROUP BY e.id
     ORDER BY e.starts_at NULLS LAST, e.title
  `;

  return rows.map((r) => ({
    id: r.slug,
    title: r.title,
    when: r.when_text,
    startsAt: r.starts_at ? r.starts_at.toISOString() : null,
    ...(r.where_text ? { where: r.where_text } : {}),
    ...(r.tag ? { tag: r.tag } : {}),
    recurring: r.recurring,
    ...(r.weekdays.length > 0 ? { weekdays: r.weekdays } : {}),
    announcements: (r.announcements ?? []).map((a) => ({
      group: a.group,
      by: a.by,
      at: typeof a.at === "string" ? a.at : new Date(a.at).toISOString(),
    })),
  }));
}

/** Channels as the dashboard lists them, most recently active first. */
export async function readListedChannels(): Promise<ChannelRow[]> {
  const sql = db();
  return sql<ChannelRow[]>`
    SELECT * FROM channels
     WHERE is_listed
     ORDER BY last_seen_at DESC NULLS LAST, name
  `;
}

/**
 * When the VPS last pushed to /api/messages — the pipeline's heartbeat, and the
 * most honest "is this dashboard current?" signal there is.
 *
 * Two sources, whichever is later: channels.last_seen_at moves on every push (the
 * upsert touches it even when nothing new arrives), messages.created_at moves only
 * when rows are actually inserted. Taking the max means a push that found no new
 * messages still counts as contact, which is what "last push" should mean.
 *
 * Cached like the rest — the value only changes when a push happens, and the push
 * revalidates MESSAGES_TAG, so there's no staleness to worry about. The "x minutes
 * ago" phrasing is computed in the browser (see src/components/LastUpdated.tsx)
 * precisely because this string is cached and would otherwise freeze.
 */
export async function readLastMessagePush(): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(MESSAGES_TAG);

  if (!hasDatabase()) return null;
  try {
    const sql = db();
    const [row] = await sql<{ at: Date | null }[]>`
      SELECT GREATEST(
               (SELECT max(last_seen_at) FROM channels),
               (SELECT max(created_at)   FROM messages)
             ) AS at
    `;
    return row?.at ? row.at.toISOString() : null;
  } catch (err) {
    console.error("readLastMessagePush failed", err);
    return null;
  }
}

/**
 * Group names in the stats feed carry emoji and punctuation the database rows don't
 * ("Padel Bansko 🎾" vs "Padel Bansko"), so matching the two needs a normal form.
 *
 * Keycap sequences are stripped before anything else: "2️⃣0️⃣2️⃣6️⃣" is four ASCII
 * digits each followed by a variation selector and a combining keycap, so treating
 * those as punctuation would split the year into "2 0 2 6" and fail to match the
 * plain "2026" in the database. That mattered — a name that doesn't match is a name
 * whose is_listed flag can't hide it.
 */
export function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[️⃣]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export type ChannelPresentation = { category: GroupCategory; isListed: boolean };

/**
 * How each known channel should be presented, keyed by normalized name.
 *
 * This is what makes the `category` and `is_listed` columns load-bearing rather than
 * decorative: the pages consult it instead of re-deriving a bucket from the name on
 * every render, so moving a group is a row update.
 *
 * Cached for minutes rather than the hour used for the feeds: re-bucketing happens by
 * hand in SQL, which can't revalidate a tag, and waiting an hour to see whether you
 * hid the right group is miserable. It's a 21-row query and revalidation only happens
 * when someone visits, so this costs nothing measurable.
 */
export async function readChannelPresentation(): Promise<Map<string, ChannelPresentation>> {
  "use cache";
  cacheLife("minutes");
  cacheTag(MESSAGES_TAG);

  if (!hasDatabase()) return new Map();
  try {
    const sql = db();
    const rows = await sql<{ name: string; category: GroupCategory; is_listed: boolean }[]>`
      SELECT name, category, is_listed FROM channels
    `;
    return new Map(
      rows.map((r) => [
        normalizeChannelName(r.name),
        { category: r.category, isListed: r.is_listed },
      ]),
    );
  } catch (err) {
    console.error("readChannelPresentation failed", err);
    return new Map();
  }
}
