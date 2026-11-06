"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/session";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type SubmitState = { ok?: boolean; error?: string };

export async function submitHours(_: SubmitState, form: FormData): Promise<SubmitState> {
  const { supabase, profile } = await requireProfile();
  const projectId = String(form.get("project") ?? "");
  const date = String(form.get("date") ?? "");
  const start = String(form.get("start") ?? "");
  const end = String(form.get("end") ?? "");
  const breakMinutes = Number(form.get("break") ?? 0);
  const note = String(form.get("note") ?? "").trim() || null;

  if (!projectId) return { error: "Choose a project." };
  if (!DATE.test(date) || !TIME.test(start) || !TIME.test(end)) return { error: "Check the date and times." };
  if (start === end) return { error: "Start and end can't be the same." };
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 600) return { error: "Break is not valid." };

  const { error } = await supabase.from("time_entries").insert({
    company_id: profile.company_id,
    user_id: profile.id,
    project_id: projectId,
    work_date: date,
    start_time: start,
    end_time: end,
    break_minutes: breakMinutes,
    note,
  });
  if (error) return { error: error.message };
  revalidatePath("/today");
  revalidatePath("/hours");
  return { ok: true };
}
