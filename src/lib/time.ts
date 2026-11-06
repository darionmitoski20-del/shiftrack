/** Worked minutes between two "HH:MM" times minus a break; end before start crosses midnight. */
export function workedMinutes(start: string, end: string, breakMinutes: number) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const span = (toMin(end) - toMin(start) + 1440) % 1440;
  return Math.max(0, span - breakMinutes);
}

export function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} h`;
}

export function formatHM(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** Local date as YYYY-MM-DD. */
export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d`. */
export function weekStart(d: Date) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function parseIsoDate(s: string | undefined) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayLabel(iso: string) {
  const d = parseIsoDate(iso)!;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export const OVERTIME_WEEKLY_MINUTES = 40 * 60;
