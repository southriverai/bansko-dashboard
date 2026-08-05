import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import {
  MESSAGES_TAG,
  hasDatabase,
  insertMessages,
  upsertChannels,
  type MessageInput,
} from "@/lib/db";
import { EVENTS_TAG } from "@/lib/events";

/**
 * Ingest endpoint for filtered messages pushed from the VPS.
 *
 * This is the one endpoint that accepts message content, and it is the point where
 * the project's long-standing rule — raw messages never leave the VPS — becomes a
 * choice rather than an invariant. `body` is optional for exactly that reason: the
 * pipeline can push metadata only (who posted where and when) and keep the text on
 * the VPS, or push bodies too so extraction can read from the database instead of
 * the Tailscale-only box. Both modes work; the second one stores private
 * conversations in a hosted database, so it should be a deliberate decision.
 *
 * Auth: a bearer token (MESSAGES_PUSH_TOKEN). Fails closed if it isn't configured.
 */

/** Bound the payload so one push can't run for minutes or blow the body limit. */
const MAX_MESSAGES = 5000;

type Payload = {
  channels: { jid: string; name: string; category?: string; isListed?: boolean }[];
  messages: MessageInput[];
};

const CATEGORIES = new Set(["social", "sport", "private"]);

function isValid(body: unknown): body is Payload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.channels) || !Array.isArray(b.messages)) return false;
  if (b.messages.length > MAX_MESSAGES) return false;

  const channelsOk = b.channels.every((c) => {
    if (typeof c !== "object" || c === null) return false;
    const ch = c as Record<string, unknown>;
    return (
      typeof ch.jid === "string" &&
      ch.jid.length > 0 &&
      typeof ch.name === "string" &&
      (ch.category === undefined || (typeof ch.category === "string" && CATEGORIES.has(ch.category))) &&
      (ch.isListed === undefined || typeof ch.isListed === "boolean")
    );
  });
  if (!channelsOk) return false;

  return b.messages.every((m) => {
    if (typeof m !== "object" || m === null) return false;
    const msg = m as Record<string, unknown>;
    return (
      typeof msg.channelJid === "string" &&
      typeof msg.waId === "string" &&
      msg.waId.length > 0 &&
      typeof msg.senderName === "string" &&
      typeof msg.sentAt === "string" &&
      !Number.isNaN(Date.parse(msg.sentAt)) &&
      (msg.senderJid === undefined || msg.senderJid === null || typeof msg.senderJid === "string") &&
      (msg.body === undefined || msg.body === null || typeof msg.body === "string")
    );
  });
}

export async function POST(req: NextRequest) {
  const expected = process.env.MESSAGES_PUSH_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "MESSAGES_PUSH_TOKEN not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!isValid(body)) {
    return NextResponse.json({ error: "unexpected payload shape" }, { status: 422 });
  }

  const channelIds = await upsertChannels(
    body.channels.map((c) => ({
      jid: c.jid,
      name: c.name,
      category: c.category as "social" | "sport" | "private" | undefined,
      isListed: c.isListed,
    })),
  );

  const unknownChannels = [
    ...new Set(body.messages.map((m) => m.channelJid).filter((jid) => !channelIds.has(jid))),
  ];
  const inserted = await insertMessages(body.messages, channelIds);

  // Events are read from these rows (channel names and sender names are joined in),
  // so new messages can change what the events page shows.
  revalidateTag(EVENTS_TAG, "max");
  // Also refresh the "messages pushed x ago" stamp in the header.
  revalidateTag(MESSAGES_TAG, "max");

  return NextResponse.json({
    ok: true,
    channels: channelIds.size,
    received: body.messages.length,
    inserted,
    // Messages for channels that weren't declared in this push are skipped rather
    // than silently dropped — surfaced so a mismatch is visible in the cron log.
    skippedUnknownChannels: unknownChannels,
  });
}
