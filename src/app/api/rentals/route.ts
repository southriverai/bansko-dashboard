import { put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

import { RENTALS_BLOB_PATH, mergeProviders, readRentalsBlob } from "@/lib/rentals";

/**
 * Ingest endpoint for rental providers extracted on the VPS.
 *
 * Unlike /api/events and /api/group-stats, this one MERGES: it reads the current
 * blob, folds the incoming providers in, and writes the union back. Each push only
 * covers a recent slice of the groups, and the list is meant to be everyone who ever
 * offered — a replacing write would forget the rest.
 *
 * Auth: a bearer token (RENTALS_PUSH_TOKEN). Fails closed if it isn't configured.
 */
export const runtime = "nodejs";

function isMention(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.group === "string" &&
    typeof m.by === "string" &&
    typeof m.at === "string" &&
    (m.kind === "offer" || m.kind === "suggestion")
  );
}

function isValid(body: unknown): body is { generatedAt: string; providers: [] } {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.generatedAt !== "string" || !Array.isArray(b.providers)) return false;
  return b.providers.every((p) => {
    if (typeof p !== "object" || p === null) return false;
    const provider = p as Record<string, unknown>;
    return (
      typeof provider.id === "string" &&
      typeof provider.name === "string" &&
      Array.isArray(provider.mentions) &&
      provider.mentions.length > 0 &&
      provider.mentions.every(isMention)
    );
  });
}

export async function POST(req: NextRequest) {
  const expected = process.env.RENTALS_PUSH_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "RENTALS_PUSH_TOKEN not configured" }, { status: 503 });
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

  const existing = await readRentalsBlob();
  const merged = mergeProviders(existing?.providers ?? [], body.providers);

  await put(RENTALS_BLOB_PATH, JSON.stringify({ generatedAt: body.generatedAt, providers: merged }), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
  });

  return NextResponse.json({
    ok: true,
    received: body.providers.length,
    total: merged.length,
    added: merged.length - (existing?.providers.length ?? 0),
  });
}
