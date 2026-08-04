import { put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

import { EVENTS_BLOB_PATH } from "@/lib/events";

/**
 * Ingest endpoint for events extracted from the WhatsApp groups on the VPS.
 *
 * Same arrangement as /api/group-stats, and for the same reason: the message
 * database is on a Tailscale-only VPS that Vercel cannot reach, and the raw
 * messages are personal data we deliberately do not ship anywhere. So the
 * extraction — an LLM pass over recent group messages — runs ON the VPS, and
 * only the structured result (title, when, where, and the group/poster/timestamp
 * of each announcement) is POSTed here and stashed in a PRIVATE blob.
 *
 * Auth: a bearer token (EVENTS_PUSH_TOKEN). Fails closed if it isn't configured.
 */
export const runtime = "nodejs";

type Announcement = { group: string; by: string; at: string };

function isAnnouncement(value: unknown): value is Announcement {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Record<string, unknown>;
  return typeof a.group === "string" && typeof a.by === "string" && typeof a.at === "string";
}

function isWeekdayList(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every((d) => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6))
  );
}

function isValid(body: unknown): body is { generatedAt: string; events: unknown[] } {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.generatedAt !== "string" || !Array.isArray(b.events)) return false;
  return b.events.every((e) => {
    if (typeof e !== "object" || e === null) return false;
    const ev = e as Record<string, unknown>;
    return (
      typeof ev.id === "string" &&
      typeof ev.title === "string" &&
      typeof ev.when === "string" &&
      isWeekdayList(ev.weekdays) &&
      Array.isArray(ev.announcements) &&
      ev.announcements.length > 0 &&
      ev.announcements.every(isAnnouncement)
    );
  });
}

export async function POST(req: NextRequest) {
  const expected = process.env.EVENTS_PUSH_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "EVENTS_PUSH_TOKEN not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  await put(EVENTS_BLOB_PATH, JSON.stringify(body), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
  });

  return NextResponse.json({ ok: true, events: body.events.length, generatedAt: body.generatedAt });
}
