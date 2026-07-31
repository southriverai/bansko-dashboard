"use client";

import { useEffect, useState } from "react";

// Live local time in Bansko (Europe/Sofia).
export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Deliberately not seeding state in the effect body: the first paint must match
    // the server HTML (no hydration mismatch), so the clock fills in on the next
    // tick and then updates every second.
    const seed = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, []);

  if (!now) return <span className="tabular-nums text-slate-400">—</span>;

  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sofia", ...opts }).format(now);

  return (
    <span className="tabular-nums text-slate-300">
      {fmt({ weekday: "short", day: "numeric", month: "short" })} ·{" "}
      <span className="text-emerald-400">{fmt({ hour: "2-digit", minute: "2-digit" })}</span>{" "}
      <span className="text-slate-500">Bansko</span>
    </span>
  );
}
