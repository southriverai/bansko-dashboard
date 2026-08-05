"use client";

import { useEffect, useState } from "react";

const ABSOLUTE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Sofia",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const RELATIVE = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.35],
  ["month", 12],
  ["year", Infinity],
];

/** "42 seconds ago", "3 minutes ago", "2 days ago". */
function relative(iso: string, now: number): string {
  let value = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, step] of UNITS) {
    if (Math.abs(value) < step) return RELATIVE.format(Math.round(value), unit);
    value /= step;
  }
  return ABSOLUTE.format(new Date(iso));
}

/**
 * Freshness stamp, rendered relative to the moment you're looking at it.
 *
 * This has to happen in the browser: pages are cached for an hour, so a relative
 * phrase computed on the server would be frozen at whatever it said when the page
 * was rendered and would confidently claim "1 minute ago" for the next 59.
 *
 * First paint (server HTML and the matching first client render) shows the absolute
 * time, so there's no hydration mismatch; the effect then switches to the relative
 * phrasing and keeps it current. The absolute time stays available on hover.
 */
export default function LastUpdated({ at, label }: { at: string; label: string }) {
  const [ago, setAgo] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setAgo(relative(at, Date.now()));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [at]);

  return (
    <span title={ABSOLUTE.format(new Date(at))}>
      {label} {ago ?? ABSOLUTE.format(new Date(at))}
    </span>
  );
}
