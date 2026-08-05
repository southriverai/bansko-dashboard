import SiteHeader from "@/components/SiteHeader";
import { groupCategory, type GroupCategory } from "@/data/bansko";
import { normalizeChannelName, readChannelPresentation } from "@/lib/db";
import { readGroupStats, type GroupStat } from "@/lib/stats";

/** One group's top posters. */
function GroupCard({ g }: { g: GroupStat }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-100">{g.group}</p>
        <span className="shrink-0 text-[11px] text-slate-500">{g.total} msgs</span>
      </div>
      <ol className="space-y-0.5">
        {g.top.map((t, i) => (
          <li key={t.name} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-slate-300">
              <span className="mr-1 text-slate-500">{["🥇", "🥈", "🥉"][i] ?? "•"}</span>
              {t.name}
            </span>
            <span className="shrink-0 tabular-nums text-emerald-400">{t.count}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** One labelled bucket of groups. Renders nothing when empty. */
function GroupBucket({ title, groups }: { title: string; groups: GroupStat[] }) {
  if (groups.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {title} <span className="text-slate-600">· {groups.length}</span>
      </h3>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <GroupCard key={g.group} g={g} />
        ))}
      </div>
    </div>
  );
}

export const metadata = { title: "Bansko Activity" };


export default async function Activity() {
  const [stats, presentation] = await Promise.all([readGroupStats(), readChannelPresentation()]);

  // The channels table decides both questions where it knows the channel: which
  // bucket it belongs in, and whether it's shown at all. The name-derived category
  // is only the fallback for a group the database hasn't seen — which is how a
  // re-bucketing done in SQL takes effect without a deploy.
  const bucketOf = (name: string): GroupCategory =>
    presentation.get(normalizeChannelName(name))?.category ?? groupCategory(name);
  const isListed = (name: string): boolean =>
    presentation.get(normalizeChannelName(name))?.isListed ?? true;

  const groups = (stats?.groups ?? []).filter((g) => isListed(g.group));
  const hidden = (stats?.groups ?? []).length - groups.length;
  const socialGroups = groups.filter((g) => bucketOf(g.group) === "social");
  const sportGroups = groups.filter((g) => bucketOf(g.group) === "sport");
  const privateGroups = groups.filter((g) => bucketOf(g.group) === "private");

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <SiteHeader title="Bansko Activity 🏔️" active="/" updatedAt={stats?.generatedAt} />

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <span aria-hidden>🏆</span> Most active posters
            </h2>
            <p className="text-xs text-slate-400">
              Top 3 per group{stats ? ` · last ${stats.windowDays} days` : ""}
              {hidden > 0 && ` · ${hidden} group${hidden === 1 ? "" : "s"} hidden`}
            </p>
          </div>
          {stats && (
            <p className="text-xs text-slate-500">
              data pushed{" "}
              {new Date(stats.generatedAt).toLocaleString("en-GB", { timeZone: "Europe/Sofia" })}
            </p>
          )}
        </header>

        {!stats ? (
          <p className="px-1 py-2 text-sm text-slate-400">
            No stats pushed yet — the VPS posts them to{" "}
            <code className="text-slate-500">/api/group-stats</code>.
          </p>
        ) : (
          <div className="space-y-5">
            <GroupBucket title="💬 Social" groups={socialGroups} />
            <GroupBucket title="🏃 Sports, dance & yoga" groups={sportGroups} />
            <GroupBucket title="🔒 Private" groups={privateGroups} />
          </div>
        )}
      </section>
    </main>
  );
}
