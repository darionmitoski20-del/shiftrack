import { requireProfile } from "@/lib/session";
import { addDays, formatHours, isoDate, weekStart } from "@/lib/time";
import { StatusPill } from "@/components/StatusPill";
import { HoursForm } from "./HoursForm";

export default async function TodayPage() {
  const { supabase, profile } = await requireProfile();
  const now = new Date();
  const today = isoDate(now);
  const monday = weekStart(now);

  const [{ data: memberships }, { data: week }] = await Promise.all([
    supabase
      .from("project_members")
      .select("projects(id, name, archived)")
      .eq("user_id", profile.id),
    supabase
      .from("time_entries")
      .select("id, work_date, minutes, status, projects(name)")
      .eq("user_id", profile.id)
      .gte("work_date", isoDate(monday))
      .lte("work_date", isoDate(addDays(monday, 6)))
      .order("work_date"),
  ]);

  const projects = (memberships ?? [])
    .map((m) => m.projects as unknown as { id: string; name: string; archived: boolean } | null)
    .filter((p): p is { id: string; name: string; archived: boolean } => !!p && !p.archived);

  const todays = (week ?? []).filter((e) => e.work_date === today);
  const weekMinutes = (week ?? []).reduce((s, e) => s + e.minutes, 0);

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-[28px] font-bold">Today</h1>
        <span className="text-sm text-muted">
          {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        </span>
      </div>

      {todays.map((e) => (
        <div key={e.id} className="card flex items-center justify-between">
          <div className="flex flex-col">
            <b>{(e.projects as unknown as { name: string } | null)?.name}</b>
            <span className="text-sm text-muted">{formatHours(e.minutes)}</span>
          </div>
          <StatusPill status={e.status} />
        </div>
      ))}

      <HoursForm projects={projects} date={today} />

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">This week</h2>
          <span className="text-sm text-muted">
            <b className="text-ink">{formatHours(weekMinutes)}</b> of 40 h
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-line">
          <div className="h-2 bg-ink" style={{ width: `${Math.min(100, (weekMinutes / 2400) * 100)}%` }} />
        </div>
      </section>
    </>
  );
}
