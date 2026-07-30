"use client";

import { useEffect, useState } from "react";

// Live local time in Bansko (Europe/Sofia).
export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
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
