import { get } from "@vercel/blob";

import { RENTALS, type RentalProvider } from "@/data/rentals";

/**
 * Rental providers, pushed from the VPS like the events and stats. The blob is the
 * accumulated list — see mergeProviders() for why the ingest route reads before it
 * writes.
 */
export type RentalFeed = {
  providers: RentalProvider[];
  source: "push" | "static";
  generatedAt: string | null;
};

export const RENTALS_BLOB_PATH = "rentals.json";

export type RentalPayload = { generatedAt: string; providers: RentalProvider[] };

export async function readRentalsBlob(): Promise<RentalPayload | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const result = await get(RENTALS_BLOB_PATH, { access: "private" });
    if (!result) return null;
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as RentalPayload;
    return Array.isArray(parsed.providers) ? parsed : null;
  } catch {
    return null;
  }
}

export async function readRentals(): Promise<RentalFeed> {
  const blob = await readRentalsBlob();
  if (!blob || blob.providers.length === 0) {
    return { providers: RENTALS, source: "static", generatedAt: null };
  }
  return {
    providers: sortProviders(blob.providers),
    source: "push",
    generatedAt: blob.generatedAt,
  };
}

/**
 * Fold a push into the existing list. Each push only sees a recent slice of the
 * groups, so replacing wholesale would silently forget every provider mentioned
 * before that window — and "everyone who ever offered" is the whole point.
 *
 * Providers match on id; their mentions are unioned and deduped on group+at+by, so
 * re-running the extractor over an overlapping window is idempotent. Descriptive
 * fields (name/what/where) take the incoming value when it has one, on the grounds
 * that the newer extraction saw the newer message.
 */
export function mergeProviders(
  existing: RentalProvider[],
  incoming: RentalProvider[],
): RentalProvider[] {
  const byId = new Map(existing.map((p) => [p.id, p]));

  for (const next of incoming) {
    const prev = byId.get(next.id);
    if (!prev) {
      byId.set(next.id, next);
      continue;
    }
    const seen = new Set(prev.mentions.map(mentionKey));
    const mentions = [...prev.mentions, ...next.mentions.filter((m) => !seen.has(mentionKey(m)))];
    mentions.sort((a, b) => b.at.localeCompare(a.at));
    byId.set(next.id, {
      ...prev,
      name: next.name || prev.name,
      what: next.what ?? prev.what,
      where: next.where ?? prev.where,
      mentions,
    });
  }

  return sortProviders([...byId.values()]);
}

function mentionKey(m: { group: string; at: string; by: string }): string {
  return `${m.group}|${m.at}|${m.by}`;
}

/** Most recently mentioned first — that's who's most likely to still have space. */
export function sortProviders(providers: RentalProvider[]): RentalProvider[] {
  return [...providers].sort(
    (a, b) => (lastMentioned(b) ?? "").localeCompare(lastMentioned(a) ?? ""),
  );
}

export function lastMentioned(p: RentalProvider): string | null {
  return p.mentions.map((m) => m.at).sort().at(-1) ?? null;
}

export function firstMentioned(p: RentalProvider): string | null {
  return p.mentions.map((m) => m.at).sort().at(0) ?? null;
}

/** Did this provider ever post their own offer, or has it only ever been hearsay? */
export function hasOwnOffer(p: RentalProvider): boolean {
  return p.mentions.some((m) => m.kind === "offer");
}
