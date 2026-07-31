import { put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Ingest endpoint for WhatsApp group stats pushed from the VPS.
 *
 * Why a push endpoint: the message database lives on a Tailscale-only VPS that
 * Vercel cannot reach, and we deliberately do NOT commit the data (the repo is
 * public and this is personal data about real people). So the VPS POSTs here on a
 * schedule and we stash the JSON in a PRIVATE blob.
 *
 * Auth: a bearer token (STATS_PUSH_TOKEN). This route is excluded from the
 * dashboard's Basic Auth in middleware.ts so the VPS doesn't need those creds.
 * Fails closed if the token isn't configured.
 */
export const runtime = "nodejs";

export const STATS_BLOB_PATH = "group-stats.json";

type TopPoster = { name: string; count: number };
type GroupStat = { group: string; total: number; top: TopPoster[] };

function isValid(body: unknown): body is { generatedAt: string; windowDays: number; groups: GroupStat[] } {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.groups)) return false;
  return b.groups.every((g) => {
    if (typeof g !== "object" || g === null) return false;
    const gg = g as Record<string, unknown>;
    return (
      typeof gg.group === "string" &&
      typeof gg.total === "number" &&
      Array.isArray(gg.top) &&
      gg.top.every((t) => {
        const tt = t as Record<string, unknown>;
        return typeof tt?.name === "string" && typeof tt?.count === "number";
      })
    );
  });
}

export async function POST(req: NextRequest) {
  const expected = process.env.STATS_PUSH_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "STATS_PUSH_TOKEN not configured" }, { status: 503 });
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

  await put(STATS_BLOB_PATH, JSON.stringify(body), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
  });

  return NextResponse.json({ ok: true, groups: body.groups.length, generatedAt: body.generatedAt });
}
