import Link from "next/link";
import { requireManager } from "@/lib/session";
import { dayLabel, formatHours, isoDate } from "@/lib/time";
import { reviewCorrection, reviewEntry } from "./actions";

type Pending = {
  id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  minutes: number;
  note: string | null;
  project_id: string;
  profiles: { full_name: string } | null;
  projects: { name: string } | null;
};

type Correction = {
  id: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  reason: string;
  profiles: { full_name: string } | null;
  time_entries: { work_date: string; start_time: string; end_time: string; break_minutes: number } | null;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

export default async function ApprovalsPage({ searchParams }: PageProps<"/approvals">) {
  const { project } = await searchParams;
  const projectFilter = typeof project === "string" ? project : null;
  const { supabase, profile } = await requireManager();
  const today = isoDate(new Date());

  let pendingQuery = supabase
    .from("time_entries")
    .select("id, work_date, start_time, end_time, break_minutes, minutes, note, project_id, profiles!time_entries_user_id_fkey(full_name), projects(name)")
    .eq("status", "pending")
    .order("work_date", { ascending: false });
  if (projectFilter) pendingQuery = pendingQuery.eq("project_id", projectFilter);

  const [{ data: pending }, { data: corrections }, { data: projects }, { data: members }, { data: loggedToday }] =
    await Promise.all([
      pendingQuery.returns<Pending[]>(),
      supabase
        .from("correction_requests")
        .select("id, start_time, end_time, break_minutes, reason, profiles(full_name), time_entries(work_date, start_time, end_time, break_minutes)")
        .eq("status", "open")
        .returns<Correction[]>(),
      supabase.from("projects").select("id, name").eq("archived", false).order("name"),
      supabase.from("project_members").select("user_id, profiles(full_name, role, active)"),
      supabase.from("time_entries").select("user_id").eq("work_date", today),
    ]);

  const logged = new Set((loggedToday ?? []).map((e) => e.user_id));
  const missing = new Map<string, string>();
  for (const m of members ?? []) {
    const p = m.profiles as unknown as { full_name: string; role: string; active: boolean } | null;
    if (p?.active && (p.role === "worker" || p.role === "foreman") && !logged.has(m.user_id) && m.user_id !== profile.id) {
      missing.set(m.user_id, p.full_name);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-bold">Approvals</h1>
        <span className="flex h-11 min-w-11 items-center justify-center rounded-full bg-accent px-2.5 text-lg font-bold text-white">
          {(pending ?? []).length}
        </span>
      </div>

      {missing.size > 0 && (
        <div className="rounded-2xl bg-warn-bg px-3.5 py-3">
          <b className="text-sm text-[#5c3808]">
            {missing.size} {missing.size === 1 ? "worker has" : "workers have"} not logged today
          </b>
          <p className="text-sm text-warn">{[...missing.values()].join(", ")}</p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto">
        <FilterChip href="/approvals" active={!projectFilter} label="All projects" />
        {(projects ?? []).map((p) => (
          <FilterChip key={p.id} href={`/approvals?project=${p.id}`} active={projectFilter === p.id} label={p.name} />
        ))}
      </div>

      <div className="flex justify-end">
        <a href="/api/export" className="text-sm font-semibold underline">Export this month (Excel/CSV)</a>
      </div>

      {(corrections ?? []).map((c) => (
        <article key={c.id} className="card flex flex-col gap-2 border-warn-bg">
          <span className="text-xs font-bold uppercase text-warn">Correction request</span>
          <b>{c.profiles?.full_name} · {c.time_entries && dayLabel(c.time_entries.work_date)}</b>
          <p className="text-sm text-muted">
            {c.time_entries?.start_time.slice(0, 5)}–{c.time_entries?.end_time.slice(0, 5)} → <b className="text-ink">{c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}</b>, break {c.break_minutes} min
          </p>
          <p className="text-sm">“{c.reason}”</p>
          <form action={reviewCorrection} className="grid grid-cols-2 gap-2">
            <input type="hidden" name="id" value={c.id} />
            <button name="decision" value="decline" className="h-12 rounded-xl border-[1.5px] border-bad font-bold text-bad">Decline</button>
            <button name="decision" value="accept" className="h-12 rounded-xl bg-ok font-bold text-white">Accept</button>
          </form>
        </article>
      ))}

      {(pending ?? []).length === 0 && <p className="card text-muted">Nothing waiting for approval.</p>}

      {(pending ?? []).map((e) => {
        const name = e.profiles?.full_name || "Unnamed";
        return (
          <article key={e.id} className="card flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-line text-sm font-bold">{initials(name)}</div>
              <div className="flex flex-1 flex-col">
                <b>{name}</b>
                <span className="text-sm text-muted">{e.projects?.name}</span>
              </div>
              <b className="font-display text-xl">{formatHours(e.minutes)}</b>
            </div>
            <p className="text-sm text-[#3b3f45]">
              {dayLabel(e.work_date)} · {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)} · break {e.break_minutes} min
              {e.note && <> · “{e.note}”</>}
            </p>
            <form action={reviewEntry} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={e.id} />
              <input name="comment" className="field h-11 text-sm" placeholder="Comment (required to reject)" aria-label="Comment" />
              <div className="grid grid-cols-2 gap-2">
                <button name="decision" value="reject" className="h-12 rounded-xl border-[1.5px] border-bad font-bold text-bad">Reject</button>
                <button name="decision" value="approve" className="h-12 rounded-xl bg-ok font-bold text-white">Approve</button>
              </div>
            </form>
          </article>
        );
      })}
    </>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`flex h-10 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold ${active ? "bg-ink text-white" : "border border-[#cfcdc5] bg-white"}`}
    >
      {label}
    </Link>
  );
}
