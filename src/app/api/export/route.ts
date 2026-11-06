import { NextResponse, type NextRequest } from "next/server";
import { isManager, requireProfile } from "@/lib/session";
import { OVERTIME_WEEKLY_MINUTES, isoDate, parseIsoDate, weekStart } from "@/lib/time";

type Row = {
  user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  minutes: number;
  status: string;
  profiles: { full_name: string; hourly_rate: number; pay_period: string } | null;
  projects: { name: string } | null;
};

const cell = (v: string | number) => {
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of approved hours with pay per worker. Opens in Excel. ?from=YYYY-MM-DD&to=YYYY-MM-DD, default this month. */
export async function GET(request: NextRequest) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile.role)) return new NextResponse("Forbidden", { status: 403 });

  const now = new Date();
  const from = parseIsoDate(request.nextUrl.searchParams.get("from") ?? undefined) ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const to = parseIsoDate(request.nextUrl.searchParams.get("to") ?? undefined) ?? new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from("time_entries")
    .select("user_id, work_date, start_time, end_time, break_minutes, minutes, status, profiles!time_entries_user_id_fkey(full_name, hourly_rate, pay_period), projects(name)")
    .eq("status", "approved")
    .gte("work_date", isoDate(from))
    .lte("work_date", isoDate(to))
    .order("work_date")
    .returns<Row[]>();
  if (error) return new NextResponse(error.message, { status: 500 });

  const lines: (string | number)[][] = [["Worker", "Date", "Project", "Start", "End", "Break (min)", "Hours"]];
  const perWorker = new Map<string, { name: string; rate: number; period: string; minutes: number; weeks: Map<string, number> }>();

  for (const r of data ?? []) {
    const name = r.profiles?.full_name ?? "";
    lines.push([name, r.work_date, r.projects?.name ?? "", r.start_time.slice(0, 5), r.end_time.slice(0, 5), r.break_minutes, (r.minutes / 60).toFixed(2)]);
    const w = perWorker.get(r.user_id) ?? { name, rate: Number(r.profiles?.hourly_rate ?? 0), period: r.profiles?.pay_period ?? "", minutes: 0, weeks: new Map() };
    w.minutes += r.minutes;
    const wk = isoDate(weekStart(parseIsoDate(r.work_date)!));
    w.weeks.set(wk, (w.weeks.get(wk) ?? 0) + r.minutes);
    perWorker.set(r.user_id, w);
  }

  lines.push([], ["Summary"], ["Worker", "Paid", "Total hours", "Overtime hours (>40 h/week)", "Hourly rate", "Pay (hours × rate)"]);
  for (const w of perWorker.values()) {
    const overtime = [...w.weeks.values()].reduce((s, m) => s + Math.max(0, m - OVERTIME_WEEKLY_MINUTES), 0);
    lines.push([w.name, w.period, (w.minutes / 60).toFixed(2), (overtime / 60).toFixed(2), w.rate.toFixed(2), ((w.minutes / 60) * w.rate).toFixed(2)]);
  }

  const csv = "﻿" + lines.map((l) => l.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shifttracks-${isoDate(from)}-${isoDate(to)}.csv"`,
    },
  });
}
