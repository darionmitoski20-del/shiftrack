import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { StatusPill } from "@/components/StatusPill";
import {
  OVERTIME_WEEKLY_MINUTES,
  addDays,
  dayLabel,
  formatHours,
  isoDate,
  parseIsoDate,
  weekStart,
} from "@/lib/time";
import { requestCorrection } from "./actions";

type Entry = {
  id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  minutes: number;
  status: "pending" | "approved" | "rejected";
  manager_comment: string | null;
  projects: { name: string } | null;
  correction_requests: { id: string; status: string }[];
};

export default async function HoursPage({ searchParams }: PageProps<"/hours">) {
  const { week } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const monday = weekStart(parseIsoDate(typeof week === "string" ? week : undefined) ?? new Date());
  const sunday = addDays(monday, 6);

  const { data } = await supabase
    .from("time_entries")
    .select("id, work_date, start_time, end_time, break_minutes, minutes, status, manager_comment, projects(name), correction_requests(id, status)")
    .eq("user_id", profile.id)
    .gte("work_date", isoDate(monday))
    .lte("work_date", isoDate(sunday))
    .order("work_date", { ascending: false })
    .returns<Entry[]>();
  const entries = data ?? [];

  const total = entries.reduce((s, e) => s + e.minutes, 0);
  const approved = entries.filter((e) => e.status === "approved").reduce((s, e) => s + e.minutes, 0);
  const overtime = Math.max(0, total - OVERTIME_WEEKLY_MINUTES);
  const range = `${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <>
      <h1 className="font-display text-[28px] font-bold">My hours</h1>
      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-1">
        <Link aria-label="Previous week" href={`/hours?week=${isoDate(addDays(monday, -7))}`} className="flex h-11 w-11 items-center justify-center text-xl">‹</Link>
        <span className="text-[15px] font-bold">{range}</span>
        <Link aria-label="Next week" href={`/hours?week=${isoDate(addDays(monday, 7))}`} className="flex h-11 w-11 items-center justify-center text-xl">›</Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total" value={formatHours(total)} dark />
        <Stat label="Approved" value={formatHours(approved)} />
        <Stat label="Overtime" value={formatHours(overtime)} />
      </div>

      {entries.length === 0 && <p className="card text-muted">No hours logged this week.</p>}

      {entries.map((e) => {
        const openRequest = e.correction_requests.some((r) => r.status === "open");
        return (
          <article key={e.id} className="card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold">{dayLabel(e.work_date)}</span>
              <StatusPill status={e.status} />
            </div>
            <div className="text-sm text-[#3b3f45]">{e.projects?.name}</div>
            <div className="flex justify-between text-sm text-muted">
              <span>
                {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)} · break {e.break_minutes} min
              </span>
              <b className="text-base text-ink">{formatHours(e.minutes)}</b>
            </div>
            {e.manager_comment && (
              <div className="rounded-xl bg-bad-bg px-3 py-2.5 text-sm text-bad">
                <b>Manager:</b> {e.manager_comment}
              </div>
            )}
            {e.status === "rejected" && openRequest && (
              <p className="text-sm font-semibold text-warn">Correction sent · waiting for manager</p>
            )}
            {e.status === "rejected" && !openRequest && (
              <details className="rounded-xl border border-line p-3">
                <summary className="cursor-pointer font-bold">Request correction</summary>
                <form action={requestCorrection} className="mt-3 flex flex-col gap-3">
                  <input type="hidden" name="entry" value={e.id} />
                  <div className="grid grid-cols-3 gap-2">
                    <label className="label">Start<input name="start" type="time" defaultValue={e.start_time.slice(0, 5)} className="field" required /></label>
                    <label className="label">End<input name="end" type="time" defaultValue={e.end_time.slice(0, 5)} className="field" required /></label>
                    <label className="label">Break<input name="break" type="number" min={0} max={600} step={5} defaultValue={e.break_minutes} className="field" required /></label>
                  </div>
                  <label className="label">Reason<input name="reason" className="field" required /></label>
                  <button className="h-12 rounded-xl border-[1.5px] border-ink bg-white font-bold">Send correction</button>
                </form>
              </details>
            )}
          </article>
        );
      })}
    </>
  );
}

function Stat({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? "bg-ink text-ground" : "border border-line bg-white"}`}>
      <div className={`text-xs ${dark ? "text-[#c9c7c0]" : "text-muted"}`}>{label}</div>
      <div className="font-display text-[22px] font-bold">{value}</div>
    </div>
  );
}
