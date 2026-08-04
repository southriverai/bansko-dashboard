-- Bansko Dashboard — initial schema.
--
-- Until now the dashboard had no database: the VPS pushed finished JSON into
-- Vercel Blobs. That works for "top 3 posters per group", but it can't answer
-- anything the extractor didn't already decide, and event provenance is stored as
-- a *copy* of (group, sender, timestamp) inside each event — copies that nothing
-- checks and that a bad extraction can invent outright.
--
-- This schema stores the filtered messages themselves, so an event's provenance
-- becomes a foreign key to the message that announced it. An announcement that
-- doesn't correspond to a real stored message can no longer be inserted.
--
-- Apply with:  psql "$DATABASE_URL" -f db/migrations/0001_init.sql

-- ---------------------------------------------------------------------------
-- channels — the WhatsApp groups the pipeline watches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channels (
  id            bigserial PRIMARY KEY,
  -- WhatsApp's own chat id ("...@g.us"). The natural key: names get edited, this
  -- doesn't, so pushes match on it.
  jid           text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  -- Which bucket the dashboard shows it in. Today this is re-derived from the
  -- name by a regex on every render; storing it means a group can be moved
  -- without a code change, and the regex only supplies the default.
  category      text        NOT NULL DEFAULT 'social'
                CHECK (category IN ('social', 'sport', 'private')),
  -- Groups deliberately kept off the dashboard stay in the table (we still want
  -- their messages for extraction) but are not listed.
  is_listed     boolean     NOT NULL DEFAULT true,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- messages — the filtered messages, one row per message
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id          bigserial   PRIMARY KEY,
  channel_id  bigint      NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  -- WhatsApp's message id. Unique per channel, so re-pushing an overlapping
  -- window is idempotent instead of duplicating rows.
  wa_id       text        NOT NULL,
  -- Display name as it appeared on the message. Denormalised on purpose: it is
  -- what the announcement actually said, and senders rename themselves.
  sender_name text        NOT NULL,
  -- Phone-number JID when known. Nullable because group senders often arrive as
  -- @lid privacy ids that can't be mapped to a number.
  sender_jid  text,
  sent_at     timestamptz NOT NULL,
  -- NULL when the push carried metadata only. The pipeline can run in either
  -- mode: with bodies (the extractor reads from here) or without (the extractor
  -- keeps reading the VPS and this table is just an index of what was seen).
  body        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, wa_id)
);

CREATE INDEX IF NOT EXISTS messages_channel_sent_idx ON messages (channel_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS messages_sent_idx         ON messages (sent_at DESC);

-- ---------------------------------------------------------------------------
-- events — what the extractor found in those messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id         bigserial   PRIMARY KEY,
  -- Stable slug from the extractor ("lindy-hop-taster"), so a re-run updates the
  -- event instead of inserting a second copy of it.
  slug       text        NOT NULL UNIQUE,
  title      text        NOT NULL,
  -- The schedule as a human reads it: "Thu 19:00", "Weekly · 19:00".
  when_text  text        NOT NULL,
  -- Set only when a message gave a concrete date AND time.
  starts_at  timestamptz,
  where_text text,
  tag        text        CHECK (tag IN ('dance', 'outdoors', 'sport', 'social',
                                        'wellness', 'music', 'work')),
  recurring  boolean     NOT NULL DEFAULT false,
  -- 0 = Sunday … 6 = Saturday. Empty when no message named a day; the dashboard
  -- resolves these against the announcement date (src/lib/events.ts).
  weekdays   smallint[]  NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekdays_in_range
    CHECK (weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[])
);

-- ---------------------------------------------------------------------------
-- event_announcements — which messages advertised which event
-- ---------------------------------------------------------------------------
-- The point of the whole schema. Provenance is a reference, not a transcription:
-- you cannot record that an event was announced by someone unless the message
-- saying so is in the messages table.
CREATE TABLE IF NOT EXISTS event_announcements (
  event_id   bigint NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  message_id bigint NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, message_id)
);

CREATE INDEX IF NOT EXISTS event_announcements_message_idx
  ON event_announcements (message_id);
