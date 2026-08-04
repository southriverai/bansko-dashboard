import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The data behind this dashboard changes once an hour at most — the VPS pushes
  // stats and events on a cron. Cache Components lets the reads in src/lib be
  // cached for that hour (`use cache` + cacheLife('hours')) while the pages stay
  // dynamic, so a page view doesn't hit Postgres and the free-tier compute budget
  // isn't spent re-answering the same query. Pushes bust their tag immediately, so
  // fresh data still appears as soon as it lands rather than up to an hour later.
  cacheComponents: true,
};

export default nextConfig;
