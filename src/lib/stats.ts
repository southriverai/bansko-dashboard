import { get } from "@vercel/blob";

/** Group posting stats, pushed from the VPS (see src/app/api/group-stats/route.ts). */
export type TopPoster = { name: string; count: number };
export type GroupStat = { group: string; total: number; top: TopPoster[] };
export type GroupStats = { generatedAt: string; windowDays: number; groups: GroupStat[] };

/**
 * Read the latest stats from the private blob. Returns null when nothing has been
 * pushed yet (or the store isn't configured) so the UI can show an honest empty
 * state instead of failing the render.
 */
export async function readGroupStats(): Promise<GroupStats | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const result = await get("group-stats.json", { access: "private" });
    if (!result) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as GroupStats;
  } catch {
    return null;
  }
}
